import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/utils/db.js';
import { connectRabbitMQ } from './src/utils/rabbitmq.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import paymentRoutes from './src/payment/routes/payment.routes.js';

dotenv.config();

if (!process.env.OTP_HASH_SECRET) {
  console.warn('[Identity] OTP_HASH_SECRET was not set in env. Using default hash secret.');
  process.env.OTP_HASH_SECRET = 'onemedical_otp_hash_secret_change_in_prod';
}

import { authenticate } from './src/utils/auth.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
// Raw body needed for webhook signature verification
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Global Authentication except public paths
const isIdentityPublicPath = (reqPath) => {
  const p = (reqPath || '').toLowerCase();
  if (p.startsWith('/health') || p.startsWith('/healthz')) return true;
  if (p.includes('/webhook')) return true;
  if (p.includes('/therapists') && !p.includes('/schedule') && !p.includes('/payouts')) return true;
  // All auth routes except /logout and /me
  if ((p.startsWith('/api/v1/auth') || p.startsWith('/auth') || p.startsWith('/otp') || p.startsWith('/login') || p.startsWith('/register') || p.startsWith('/send-') || p.startsWith('/verify-') || p.startsWith('/refresh')) &&
      !p.includes('/logout') && !p.includes('/me')) {
    return true;
  }
  return false;
};

app.use((req, res, next) => {
  if (isIdentityPublicPath(req.path)) {
    return next();
  }
  authenticate(req, res, next);
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patients', userRoutes);
app.use('/api/v1/therapists', userRoutes);
app.use('/api/v1/admin', userRoutes);
app.use('/admin', userRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/payments', paymentRoutes);
app.use('/api/v1/refunds', paymentRoutes);
app.use('/refunds', paymentRoutes);
app.use('/api/v1/payouts', paymentRoutes);
app.use('/payouts', paymentRoutes);
app.use('/api/v1/invoices', paymentRoutes);
app.use('/invoices', paymentRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', userRoutes);
app.use('/users', userRoutes);
app.use('/', paymentRoutes);
app.use('/', userRoutes);
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'identity-service', port: PORT, dbConnected: true, timestamp: new Date().toISOString() }));
app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'identity-service', timestamp: new Date().toISOString() }));

app.use('/patients', userRoutes);
app.use('/therapists', userRoutes);
app.use('/admin', userRoutes);
app.use('/', userRoutes);
app.use('/', authRoutes);
app.use('/', paymentRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Identity] Unhandled error:', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});

// ─── Start ────────────────────────────────────────────────────────────────────
import { startPaymentReconciliationScheduler } from './src/payment/services/paymentReconciler.js';

const start = async () => {
  await connectDB();
  await connectRabbitMQ();
  startPaymentReconciliationScheduler();
  app.listen(PORT, () => console.log(`🚀 [Identity Service] Running on port ${PORT}`));
};

start().catch(err => { console.error(err); process.exit(1); });
