require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { initSocket } = require('./socket');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const therapistRoutes = require('./routes/therapists');
const roomRoutes = require('./routes/rooms');
const sessionRoutes = require('./routes/sessions');
const transactionRoutes = require('./routes/transactions');
const evaluationRoutes = require('./routes/evaluations');
const militaryRequestRoutes = require('./routes/militaryRequests');
const financeRoutes = require('./routes/finance');
const travelOrderRoutes = require('./routes/travelOrders');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('combined'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use('/api/auth', authLimiter, authRoutes);
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
