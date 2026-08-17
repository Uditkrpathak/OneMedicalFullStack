import mongoose from 'mongoose';

const TelehealthSessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    therapistId: {
      type: String,
      required: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'connected', 'completed', 'missed', 'rejected', 'failed', 'busy'],
      default: 'initiated',
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    endReason: {
      type: String,
      enum: ['user_ended', 'timeout', 'network_dropped', 'rejected', 'busy', 'error'],
      default: 'user_ended',
    },
    soapNotes: {
      subjective: { type: String, default: '' },
      objective: { type: String, default: '' },
      assessment: { type: String, default: '' },
      plan: { type: String, default: '' },
      rangeOfMotionScore: { type: Number, default: null },
      recordedAt: { type: Date },
    },
    qualityMetrics: {
      iceConnectionType: { type: String, enum: ['relay', 'srflx', 'prflx', 'host', 'unknown'], default: 'unknown' },
      packetLossPercent: { type: Number, default: 0 },
      reconnectionAttempts: { type: Number, default: 0 },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

TelehealthSessionSchema.index({ therapistId: 1, createdAt: -1 });
TelehealthSessionSchema.index({ patientId: 1, createdAt: -1 });

const TelehealthSession = mongoose.model('TelehealthSession', TelehealthSessionSchema);
export default TelehealthSession;
