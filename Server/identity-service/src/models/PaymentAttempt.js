import mongoose from 'mongoose';

const PaymentAttemptSchema = new mongoose.Schema({
  appointmentId:    { type: String, required: true, index: true },
  patientId:        { type: String, required: true, index: true },
  therapistId:      { type: String, index: true },
  transactionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', index: true },
  gatewayOrderId:   { type: String, index: true },
  gatewayPaymentId: { type: String, index: true },
  method:           { type: String, default: 'UPI' },
  upiApp:           { type: String, enum: ['GPAY', 'PHONEPE', 'PAYTM', 'BHIM', 'DYNAMIC_QR', 'OTHER'], default: 'OTHER' },
  upiVpa:           { type: String },
  amountPaise:      { type: Number, required: true },
  currency:         { type: String, default: 'INR' },
  status:           {
    type: String,
    enum: ['ATTEMPTED', 'SUCCESS', 'FAILED', 'USER_CANCELLED', 'TIMED_OUT'],
    default: 'ATTEMPTED',
    index: true
  },
  failureCode:      { type: String },
  failureReason:    { type: String },
  requestId:        { type: String, index: true },
  ipAddress:        { type: String },
  userAgent:        { type: String },
  startedAt:        { type: Date, default: Date.now },
  completedAt:      { type: Date },
}, {
  timestamps: true,
});

PaymentAttemptSchema.index({ appointmentId: 1, createdAt: -1 });
PaymentAttemptSchema.index({ gatewayOrderId: 1, gatewayPaymentId: 1 });

export default mongoose.model('PaymentAttempt', PaymentAttemptSchema);
