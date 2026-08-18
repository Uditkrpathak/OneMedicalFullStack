import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  patientId:        { type: String, required: true, index: true },
  appointmentId:    { type: String, required: true, index: true },
  therapistId:      { type: String, index: true },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  gatewayOrderId:   { type: String },
  gatewayPaymentId: { type: String },
  idempotencyKey:   { type: String },
  amountPaise:      { type: Number, required: true },  // smallest INR unit (e.g. 49900 = ₹499)
  currency:         { type: String, default: 'INR' },
  gateway:          { type: String, default: 'razorpay' },
  status: {
    type: String,
    enum: ['created', 'pending', 'authorized', 'captured', 'PAID', 'failed', 'refund_pending', 'refund_processing', 'refunded', 'partially_refunded', 'expired'],
    default: 'created',
  },
  failureCode:      { type: String },
  failureReason:    { type: String },
  version:          { type: Number, default: 1 },
  paymentMethod:    { type: String, default: 'UPI' },   // Strictly 'UPI'
  upiApp:           { type: String, default: 'upi' },   // 'gpay', 'phonepe', 'paytm', 'bhim', 'qr', 'upi_id'
  upiVpa:           { type: String },
  qrPayload:        { type: String },
  paymentPlace:     { type: String, enum: ['online', 'clinic'], default: 'online' },
  verificationSource: {
    type: String,
    enum: ['WEBHOOK', 'SERVER_VERIFY', 'GATEWAY_SYNC', 'CLINIC_QR_VERIFY', 'RECONCILER'],
    default: 'SERVER_VERIFY'
  },
  verifiedAt:       { type: Date },
  capturedAt:       { type: Date },
  invoiceId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber:    { type: String },
  refundId:         { type: String },
  refundAmountPaise: { type: Number },
  refundedAt:       { type: Date },
  statusHistory: [{
    status:    { type: String },
    timestamp: { type: Date, default: Date.now },
    note:      { type: String },
  }],
  isDeleted:        { type: Boolean, default: false },
}, { timestamps: true });

// Unique sparse indexes to guarantee payment attempt idempotency and prevent duplicates
TransactionSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ gatewayOrderId: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;
