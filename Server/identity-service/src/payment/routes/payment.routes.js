import express from 'express';
import {
  createOrder,
  verifyPayment,
  generateClinicDynamicQr,
  verifyClinicPayment,
  getMyTransactions,
  getInvoices,
  getInvoiceById,
  getPaymentStatus,
  getPaymentHealth,
  getTransactionInternal,
  listRefunds,
  approveRefund,
  initiateRefund,
  listPayouts,
  computePayout,
} from '../controllers/paymentController.js';
import { razorpayWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook (raw body verification)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);
router.post('/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// Payment Diagnostics & Health & Internal Verification
router.get('/health',                   getPaymentHealth);
router.get('/internal/transactions/:id', getTransactionInternal);
router.get('/status/:id',               getPaymentStatus);
router.get('/:id/status',               getPaymentStatus);

// Authenticated Payment Orders & Verification (UPI Exclusive)
router.post('/orders',              createOrder);
router.post('/payments/orders',     createOrder);

router.post('/verify',              verifyPayment);
router.post('/payments/verify',     verifyPayment);

// Clinic Dynamic UPI QR & Verification
router.post('/clinic/dynamic-qr',   generateClinicDynamicQr);
router.post('/clinic/verify',       verifyClinicPayment);

// Authenticated History & Invoices
router.get('/transactions/my',      getMyTransactions);
router.get('/history',              getMyTransactions);
router.get('/payments/history',     getMyTransactions);
router.get('/',                     getMyTransactions);

router.get('/invoices',             getInvoices);
router.get('/invoices/:id',         getInvoiceById);

// Refunds & Payouts (Admin & Automated)
router.get('/refunds',              listRefunds);
router.post('/refunds',             initiateRefund);
router.patch('/refunds/:id/approve', approveRefund);

router.get('/payouts',              listPayouts);
router.post('/payouts/compute',     computePayout);

export default router;
