import mongoose from 'mongoose';

const NotificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  },
  userRole: {
    type: String,
    enum: ['patient', 'therapist', 'clinic_admin', 'super_admin'],
    default: 'patient',
  },
  channels: {
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  categories: {
    appointmentReminders: { type: Boolean, default: true },
    appointmentUpdates: { type: Boolean, default: true },
    paymentUpdates: { type: Boolean, default: true },
    recoveryUpdates: { type: Boolean, default: true },
    clinicalAlerts: { type: Boolean, default: true }, // Clinical alerts cannot be disabled for critical events
    chatMessages: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' }, // 24h format HH:mm
    end: { type: String, default: '07:00' },
  },
  deviceTokens: [{
    token: { type: String, required: true },
    provider: { type: String, enum: ['expo', 'fcm'], default: 'expo' },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'android' },
    deviceId: { type: String },
    appVersion: { type: String },
    lastUsed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

const NotificationPreference = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
export default NotificationPreference;
