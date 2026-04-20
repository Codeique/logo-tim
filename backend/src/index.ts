import './config/env'; // Must be first — validates env vars before anything else loads

import { randomUUID } from 'crypto';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import client from 'prom-client';

import cookieParser from 'cookie-parser';
import { initSocket } from './socket';
import errorHandler from './middleware/errorHandler';
import logger from './lib/logger';
import prisma from './lib/prisma';
import env from './config/env';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import patientRoutes from './modules/patients/patients.routes';
import therapistRoutes from './modules/therapists/therapists.routes';
import roomRoutes from './modules/rooms/rooms.routes';
import sessionRoutes from './modules/sessions/sessions.routes';
import transactionRoutes from './modules/transactions/transactions.routes';
import evaluationRoutes from './modules/evaluations/evaluations.routes';
import militaryRequestRoutes from './modules/militaryRequests/militaryRequests.routes';
import financeRoutes from './modules/finance/finance.routes';
import travelOrderRoutes from './modules/travelOrders/travelOrders.routes';
import auditLogRoutes from './modules/auditLogs/auditLogs.routes';

const app = express();
const server = http.createServer(app);

initSocket(server);

// MON-02: Prometheus default metrics (process CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Request ID for log correlation — must come before HTTP logger
app.use((req, _res, next) => { req.requestId = randomUUID(); next(); });

// LOG-01: winston HTTP logger (replaces morgan — single log system, includes requestId)
// MON-02: also records Prometheus http_request_duration_seconds histogram
app.use((req, res, next) => {
  const start = Date.now();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const ms = Date.now() - start;
    end({ method: req.method, route: req.path, status: String(res.statusCode) });
    logger.info('HTTP', { method: req.method, path: req.path, status: res.statusCode, ms, requestId: req.requestId });
  });
  next();
});

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/military-requests', militaryRequestRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/travel-orders', travelOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// MON-01: liveness — no DB check, no sensitive info, fast response
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// MON-01: readiness — DB check + uptime; should be restricted to internal access in production
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

// MON-02: Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

app.use(errorHandler);

server.listen(env.PORT, () => logger.info(`Server running on port ${env.PORT}`));

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));
process.on('uncaughtException', (err) => { logger.error('Uncaught exception', { err }); process.exit(1); });
