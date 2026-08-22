import mongoose from 'mongoose';

const WebhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  gateway: {
    type: String,
    enum: ['razorpay', 'stripe'],
    default: 'razorpay',
  },
  eventName: {
    type: String,
    default: 'payment.captured',
  },
  eventType: {
    type: String,
  },
  entityId: {
    type: String,
    index: true,
  },
  appointmentId: {
    type: String,
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'processed', 'failed', 'ignored'],
    default: 'RECEIVED',
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastError: {
    type: String,
    default: null,
  },
  processedAt: {
    type: Date,
  },
  failedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 90 * 24 * 60 * 60,
  }
}, { timestamps: true });

const WebhookEvent = mongoose.model('WebhookEvent', WebhookEventSchema);
export default WebhookEvent;
