import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import clinicalRoutes from './src/routes/clinical.routes.js';
import appointmentRoutes from './src/routes/appointment.routes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import telehealthRoutes from './src/routes/telehealthRoutes.js';
import consultationRoutes from './src/routes/consultationRoutes.js';
import connectDB from './src/utils/db.js';
import { connectRabbitMQ } from './src/utils/rabbitmq.js';
import notificationRoutes from './src/routes/notification.routes.js';
import { initNotifications } from './src/notifications/index.js';
import { authenticate } from './src/utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'onemedical_jwt_access_secret_production_2026';
}

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global Authentication except health checks and public routes
app.use((req, res, next) => {
  if (
    req.path === '/health' ||
    req.path === '/healthz' ||
    req.path === '/health/ready' ||
    req.path.startsWith('/availability') ||
    req.path.startsWith('/api/v1/availability') ||
    req.path === '/services' ||
    req.path === '/api/v1/services'
  ) {
    return next();
  }
  // Internal service calls bypass JWT — verified by INTERNAL_API_KEY header
  if (req.headers['x-internal-key'] === (process.env.INTERNAL_API_KEY || '')) {
    req.headers['x-user-role'] = req.headers['x-user-role'] || 'clinic_admin';
    req.headers['x-user-id']   = req.headers['x-user-id']   || 'system';
    return next();
  }
  authenticate(req, res, next);
});

// ROUTE REGISTRATION
app.use('/api/v1/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/telehealth', telehealthRoutes);
app.use('/api/v1', consultationRoutes);
app.use('/api/v1', appointmentRoutes);
app.use('/api/v1', clinicalRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/scheduling', appointmentRoutes);
app.use('/chat', chatRoutes);
app.use('/telehealth', telehealthRoutes);
app.use('/', consultationRoutes);
app.use('/', appointmentRoutes);
app.use('/', clinicalRoutes);

// Health checks
app.get('/health', (req, res) => {
  res.json({ service: 'clinical-service', status: 'healthy', port: PORT, dbConnected: mongoose.connection.readyState === 1, timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    service: 'clinical-service',
    status: ready ? 'ready' : 'not ready',
    database: ready ? 'connected' : 'disconnected',
  });
});

app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'clinical-service', timestamp: new Date().toISOString() }));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Clinical] Unhandled error:', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});

const start = async () => {
  await connectDB();
  await connectRabbitMQ();
  await initNotifications();

  app.listen(PORT, () => console.log(`🚀 [Clinical Service] Running on port ${PORT}`));
};

start().catch(err => { console.error(err); process.exit(1); });
