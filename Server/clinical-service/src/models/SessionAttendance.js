import mongoose from 'mongoose';

const SessionAttendanceSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    index: true,
    unique: true, // Idempotency: One attendance audit record per appointment
  },
  patientId: {
    type: String,
    required: true,
    index: true,
  },
  therapistId: {
    type: String,
    required: true,
    index: true,
  },

  // Timing
  scheduledStart: { type: Date, required: true },
  scheduledEnd:   { type: Date, required: true },
  durationMin:    { type: Number, default: 30 },

  // Check-In & Join Timestamps
  patientCheckedInAt: { type: Date },
  patientJoinedAt:    { type: Date },
  therapistJoinedAt:  { type: Date },
  patientDisconnectedAt:   { type: Date },
  therapistDisconnectedAt: { type: Date },

  // Attendance Status
  patientAttendance: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE'],
    default: 'ABSENT',
  },
  therapistAttendance: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE'],
    default: 'ABSENT',
  },

  // Authoritative Outcome
  outcome: {
    type: String,
    enum: [
      'COMPLETED',
      'PROVIDER_NO_SHOW',
      'PATIENT_NO_SHOW',
      'NO_ATTENDANCE',
      'TECHNICAL_FAILURE',
      'IN_PROGRESS',
      'PENDING_RECONCILIATION',
    ],
    required: true,
    index: true,
  },

  detectedAt: { type: Date, default: Date.now },
  reason:     { type: String },
  connectionFailureReason: { type: String },

  // Provider Escalation (1: Warning, 2: Admin Review, 3: Schedule Restriction)
  providerIncidentLogged: { type: Boolean, default: false },
  escalationLevel:        { type: Number, default: 0 },

  // Payment Protection
  paymentOutcome: {
    status: {
      type: String,
      enum: ['NOT_REQUIRED', 'REFUND_PENDING', 'REFUNDED', 'CREDIT_ISSUED', 'PROCESSED'],
      default: 'NOT_REQUIRED',
    },
    refundId:    { type: String },
    processedAt: { type: Date },
    idempotencyKey: { type: String, index: true },
  },

  // Metadata
  isResolvedByAdmin: { type: Boolean, default: false },
  adminNotes:        { type: String },
  resolvedAt:        { type: Date },
  resolvedBy:        { type: String },

}, { timestamps: true });

SessionAttendanceSchema.index({ therapistId: 1, outcome: 1, createdAt: -1 });
SessionAttendanceSchema.index({ patientId: 1, createdAt: -1 });

const SessionAttendance = mongoose.model('SessionAttendance', SessionAttendanceSchema);
export default SessionAttendance;
