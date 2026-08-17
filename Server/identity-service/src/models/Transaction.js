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
  amountPaise:      { type: Number, required: true },  // smallest INR unit (e.g. 50000 = ₹500)
  currency:         { type: String, default: 'INR' },
  gateway:          { type: String, default: 'razorpay' },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'created',
  },
  paymentMethod:    { type: String, default: 'upi' },   // 'upi', 'card', 'netbanking', 'wallet', 'clinic'
  paymentPlace:     { type: String, enum: ['online', 'clinic'], default: 'online' },
  capturedAt:       { type: Date },
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
