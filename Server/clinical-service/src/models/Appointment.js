import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
  // ─── Participants ──────────────────────────────────────────────────────────
  patientId:   { type: String, required: true, index: true },
  therapistId: { type: String, required: true, index: true },

  // Denormalized for read performance — avoids cross-service joins on list queries
  therapistName: { type: String },
  patientName:   { type: String },

  // ─── Scheduling (UTC Date objects) ────────────────────────────────────────
  // Stored as UTC; display layer converts to Asia/Kolkata for rendering
  startTime:   { type: Date, required: true },
  endTime:     { type: Date, required: true },
  durationMin: { type: Number, default: 30 },

  // ─── Service Classification ───────────────────────────────────────────────
  serviceType: {
    type: String,
    enum: [
      'INITIAL_ASSESSMENT',
      'FOLLOW_UP',
      'PHYSIOTHERAPY_SESSION',
      'VIDEO_CONSULTATION',
      'HOME_VISIT',
      'BACK_PAIN',
      'NECK_PAIN',
      'SPORTS_INJURY',
      'POST_SURGERY',
      'KNEE_PAIN',
      'GENERAL_CONSULTATION',
    ],
    required: true,
  },
  appointmentPlace: {
    type: String,
    enum: ['CLINIC', 'HOME', 'VIDEO'],
    default: 'CLINIC',
  },

  // ─── Lifecycle Status ─────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      'HELD',
      'CONFIRMED',
      'RESCHEDULE_REQUESTED',
      'RESCHEDULED',
      'EN_ROUTE',
      'ARRIVED',
      'CHECKED_IN',
      'IN_PROGRESS',
      'DOCUMENTATION_PENDING',
      'DOCUMENTED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
      'PATIENT_NO_SHOW',
      'PROVIDER_NO_SHOW',
      'NO_ATTENDANCE',
    ],
    default: 'HELD',
    index: true,
  },

  // ─── Clinical Session Dimension ──────────────────────────────────────────
  sessionStatus: {
    type: String,
    enum: ['NOT_STARTED', 'WAITING', 'IN_PROGRESS', 'ENDED'],
    default: 'NOT_STARTED',
    index: true,
  },

  // ─── Clinical Attendance Dimension ───────────────────────────────────────
  attendanceOutcome: {
    type: String,
    enum: [
      'PATIENT_PRESENT',
      'PROVIDER_PRESENT',
      'PROVIDER_NO_SHOW',
      'PATIENT_NO_SHOW',
      'NO_ATTENDANCE',
      'TECHNICAL_FAILURE',
      'COMPLETED',
    ],
    default: null,
    index: true,
  },

  // ─── Attendance Timestamps ───────────────────────────────────────────────
  patientCheckedInAt:      { type: Date },
  patientJoinedAt:         { type: Date },
  therapistJoinedAt:       { type: Date },
  patientDisconnectedAt:   { type: Date },
  therapistDisconnectedAt: { type: Date },

  // ─── Reconciliation & Idempotency ────────────────────────────────────────
  reconciliationStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSED'],
    default: 'PENDING',
    index: true,
  },
  reconciledAt:            { type: Date },
  refundProtected:         { type: Boolean, default: false },

  // ─── Reschedule Tracking ──────────────────────────────────────────────────
  rescheduleCount:     { type: Number, default: 0 },
  rescheduledAt:       { type: Date },
  rescheduledBy:       { type: String },
  proposedReschedule: {
    newTherapistId:   { type: String },
    newTherapistName: { type: String },
    newStartTime:     { type: Date },
    newEndTime:       { type: Date },
    proposedBy:       { type: String },
    reason:           { type: String },
    proposedAt:       { type: Date },
  },

  // ─── Hold Management ─────────────────────────────────────────────────────
  holdExpiresAt: { type: Date },  // cleared (set to null) once CONFIRMED/CANCELLED/EXPIRED

  // ─── Payment Fields (ALL set by backend only — client values are ignored) ──
  // amount is in paise: ₹499 = 49900 paise
  amount:        { type: Number },   // fetched from TherapistProfile.consultationFee at hold-time
  currency:      { type: String, default: 'INR' },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'NOT_APPLICABLE'],
    default: 'PENDING',
  },
  paymentOrderId: { type: String },   // Razorpay order ID
  paymentId:      { type: String },   // Razorpay payment ID

  // ─── Cancellation ─────────────────────────────────────────────────────────
  cancellationReason: { type: String },
  cancellationPolicy: {
    type: String,
    enum: ['REFUND_ELIGIBLE', 'NO_REFUND', 'NOT_APPLICABLE'],
  },

  // ─── Lifecycle Timestamps ────────────────────────────────────────────────
  confirmedAt: { type: Date },
  startedAt:   { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },

  // ─── Concurrency & Versioning ──────────────────────────────────────────
  version: { type: Number, default: 1 },

  // ─── Home Visit Address Snapshot (Immutable Historical Truth) ────────────
  patientAddressSnapshot: {
    addressLine1: { type: String },
    addressLine2: { type: String },
    landmark:     { type: String },
    city:         { type: String },
    state:        { type: String },
    postalCode:   { type: String },
    country:      { type: String, default: 'India' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(val) {
            if (!val || val.length === 0) return true;
            if (val.length !== 2) return false;
            const [lng, lat] = val;
            return (
              Number.isFinite(lng) && Number.isFinite(lat) &&
              lng >= -180 && lng <= 180 &&
              lat >= -90 && lat <= 90
            );
          },
          message: 'coordinates must be [longitude (-180..180), latitude (-90..90)]'
        }
      },
    },
    latitude:     { type: Number },
    longitude:    { type: Number },
    capturedAt:   { type: Date, default: Date.now },
  },

  // ─── Home Visit Arrival & Check-In Verification ───────────────────────────
  arrivalLocation: {
    latitude:   { type: Number },
    longitude:  { type: Number },
    capturedAt: { type: Date },
  },

  // ─── Session ──────────────────────────────────────────────────────────────
  sessionSummary: { type: String },

  // ─── Audit ────────────────────────────────────────────────────────────────
  createdBy: {
    type: String,
    enum: ['patient', 'therapist', 'clinic_admin', 'super_admin'],
    default: 'patient',
  },
  isDeleted: { type: Boolean, default: false },

}, { timestamps: true, optimisticConcurrency: false });

// ─── Indexes ──────────────────────────────────────────────────────────────────
AppointmentSchema.index({ therapistId: 1, startTime: -1 });
AppointmentSchema.index({ patientId: 1, startTime: -1 });
AppointmentSchema.index({ status: 1, startTime: 1 });
AppointmentSchema.index({ paymentStatus: 1, startTime: 1 });
AppointmentSchema.index({ reconciliationStatus: 1, startTime: 1 });
AppointmentSchema.index({ status: 1, holdExpiresAt: 1 });  // used by expiry cron

const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;
