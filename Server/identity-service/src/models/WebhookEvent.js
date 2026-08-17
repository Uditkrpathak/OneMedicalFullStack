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
    required: true,
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
    enum: ['processed', 'failed', 'ignored'],
    default: 'processed',
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
  // Auto-expire webhook logs after 90 days
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 90 * 24 * 60 * 60,
  }
});

const WebhookEvent = mongoose.model('WebhookEvent', WebhookEventSchema);
export default WebhookEvent;
