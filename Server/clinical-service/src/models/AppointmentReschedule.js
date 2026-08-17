import mongoose from 'mongoose';

const AppointmentRescheduleSchema = new mongoose.Schema({
  appointmentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
  patientId:      { type: String, required: true, index: true },
  
  // Previous State
  oldTherapistId:   { type: String, required: true },
  oldTherapistName: { type: String },
  oldStartTime:     { type: Date, required: true },
  oldEndTime:       { type: Date, required: true },
  
  // Target / Proposed State
  newTherapistId:   { type: String, required: true },
  newTherapistName: { type: String },
  newStartTime:     { type: Date, required: true },
  newEndTime:       { type: Date, required: true },
  
  requestedBy: {
    type: String,
    enum: ['PATIENT', 'DOCTOR', 'CLINIC_ADMIN', 'SYSTEM'],
    required: true,
  },
  reason: { type: String },
  status: {
    type: String,
    enum: ['PENDING_PATIENT_APPROVAL', 'ACCEPTED', 'REJECTED', 'APPLIED', 'CANCELLED'],
    default: 'APPLIED',
  },
  feeAdjustment: {
    originalFee:   { type: Number, default: 0 },
    newFee:        { type: Number, default: 0 },
    difference:    { type: Number, default: 0 }, // in paise
    paymentStatus: { type: String, enum: ['PAID', 'REFUNDED', 'ZERO_DIFF', 'PENDING'], default: 'ZERO_DIFF' },
  },
  acceptedAt: { type: Date },
}, { timestamps: true });

AppointmentRescheduleSchema.index({ appointmentId: 1, createdAt: -1 });
AppointmentRescheduleSchema.index({ patientId: 1, createdAt: -1 });
AppointmentRescheduleSchema.index({ oldTherapistId: 1, oldStartTime: 1 });

const AppointmentReschedule = mongoose.model('AppointmentReschedule', AppointmentRescheduleSchema);
export default AppointmentReschedule;
