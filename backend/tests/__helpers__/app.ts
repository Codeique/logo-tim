import express from 'express';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import errorHandler from '../../src/middleware/errorHandler';
import authRoutes from '../../src/modules/auth/auth.routes';
import patientRoutes from '../../src/modules/patients/patients.routes';
import sessionRoutes from '../../src/modules/sessions/sessions.routes';
import transactionRoutes from '../../src/modules/transactions/transactions.routes';
import therapistRoutes from '../../src/modules/therapists/therapists.routes';
import roomRoutes from '../../src/modules/rooms/rooms.routes';
import militaryRequestRoutes from '../../src/modules/militaryRequests/militaryRequests.routes';
import evaluationRoutes from '../../src/modules/evaluations/evaluations.routes';
import financeRoutes from '../../src/modules/finance/finance.routes';
import auditLogRoutes from '../../src/modules/auditLogs/auditLogs.routes';
import userRoutes from '../../src/modules/users/users.routes';

/** Builds a minimal Express app with all routes for supertest. Auth is mocked by the calling test. */
export function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => { req.requestId = randomUUID(); next(); });

  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/therapists', therapistRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/military-requests', militaryRequestRoutes);
  app.use('/api/evaluations', evaluationRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/audit-logs', auditLogRoutes);
  app.use('/api/users', userRoutes);

  app.use(errorHandler);
  return app;
}
