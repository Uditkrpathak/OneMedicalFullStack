import mongoose from 'mongoose';

const NotificationDeliveryLogSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    index: true,
  },
  eventId: {
    type: String,
    index: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  recipientRole: {
    type: String,
    enum: ['patient', 'therapist', 'clinic_admin', 'super_admin'],
  },
  channel: {
    type: String,
    enum: ['inApp', 'push', 'email', 'sms'],
    required: true,
  },
  provider: {
    type: String,
    enum: ['expo', 'fcm', 'nodemailer', 'twilio', 'socket.io', 'unknown'],
    required: true,
  },
  attempt: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'skipped', 'logged_dev'],
    required: true,
    index: true,
  },
  providerMessageId: {
    type: String,
  },
  error: {
    type: String,
  },
  latencyMs: {
    type: Number,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

NotificationDeliveryLogSchema.index({ notificationId: 1, channel: 1 });
NotificationDeliveryLogSchema.index({ createdAt: -1 });

const NotificationDeliveryLog = mongoose.model('NotificationDeliveryLog', NotificationDeliveryLogSchema);
export default NotificationDeliveryLog;
