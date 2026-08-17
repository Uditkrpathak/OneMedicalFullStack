import mongoose from 'mongoose';

const ChannelDeliverySchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'sent', 'failed', 'skipped', 'logged_dev'],
    default: 'pending',
  },
  deliveredAt: { type: Date },
  sentAt: { type: Date },
  provider: { type: String, enum: ['expo', 'fcm', 'nodemailer', 'twilio', 'socket.io', null], default: null },
  providerMessageId: { type: String },
  error: { type: String },
  latencyMs: { type: Number },
}, { _id: false });

const NotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  eventId: {
    type: String,
    required: true,
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
    required: true,
    index: true,
  },
  event: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['auth', 'appointment', 'telehealth', 'chat', 'clinical', 'payment', 'system', 'admin'],
    required: true,
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    route: { type: String },
    appointmentId: { type: String },
    callId: { type: String },
    conversationId: { type: String },
    patientId: { type: String },
    therapistId: { type: String },
    invoiceUrl: { type: String },
    extra: { type: mongoose.Schema.Types.Mixed },
  },
  channels: {
    inApp: {
      type: ChannelDeliverySchema,
      default: () => ({ enabled: true, status: 'delivered', deliveredAt: new Date() }),
    },
    push: {
      type: ChannelDeliverySchema,
      default: () => ({ enabled: false, status: 'pending' }),
    },
    email: {
      type: ChannelDeliverySchema,
      default: () => ({ enabled: false, status: 'pending' }),
    },
    sms: {
      type: ChannelDeliverySchema,
      default: () => ({ enabled: false, status: 'skipped' }),
    },
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  aggregationKey: {
    type: String,
    index: true,
  },
  aggregationCount: {
    type: Number,
    default: 1,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  nextRetryAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Default 90 days
    index: { expires: 0 }, // MongoDB TTL index
  },
}, { timestamps: true });

// Compound index for idempotency per recipient & event
NotificationSchema.index({ eventId: 1, recipientId: 1 }, { unique: true });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
