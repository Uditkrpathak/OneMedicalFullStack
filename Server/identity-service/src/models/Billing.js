import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber:    { type: String, required: true }, // e.g. "INV-000042"
  transactionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  appointmentId:    { type: String, required: true, index: true },
  patientId:        { type: String, required: true, index: true },
  therapistId:      { type: String, index: true },
  consultationFee:  { type: Number, required: true }, // in paise
  taxes:            { type: Number, default: 0 },     // in paise
  discount:         { type: Number, default: 0 },     // in paise
  totalAmount:      { type: Number, required: true }, // in paise
  currency:         { type: String, default: 'INR' },
  gstin:            { type: String, default: '29AABCU9603R1ZM' },
  status:           { type: String, enum: ['PAID', 'REFUNDED', 'VOID'], default: 'PAID' },
  pdfKey:           { type: String },
  generatedAt:      { type: Date, default: Date.now },
  isDeleted:        { type: Boolean, default: false },
}, { timestamps: true });

InvoiceSchema.index({ transactionId: 1 }, { unique: true });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ patientId: 1, createdAt: -1 });

const RefundSchema = new mongoose.Schema({
  transactionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  amountPaise:      { type: Number, required: true },
  reason:           { type: String },
  status:           { type: String, enum: ['initiated', 'processed', 'failed'], default: 'initiated' },
  gatewayRefundId:  { type: String },
  isManualReview:   { type: Boolean, default: false },
}, { timestamps: true });

const PayoutSchema = new mongoose.Schema({
  therapistId:      { type: String, required: true, index: true },
  periodStart:      { type: Date, required: true },
  periodEnd:        { type: Date, required: true },
  grossAmountPaise: { type: Number, default: 0 },
  commissionPaise:  { type: Number, default: 0 },
  netAmountPaise:   { type: Number, default: 0 },
  status:           { type: String, enum: ['pending', 'processed'], default: 'pending' },
  processedAt:      { type: Date },
  appointmentIds:   [{ type: String }],
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
export const Refund  = mongoose.model('Refund',  RefundSchema);
export const Payout  = mongoose.model('Payout',  PayoutSchema);
