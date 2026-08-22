import mongoose from 'mongoose';

const AvailabilitySlotSchema = new mongoose.Schema({
  dayOfWeek:       { type: Number, min: 0, max: 6, required: true }, // 0=Sun ... 6=Sat
  startTime:       { type: String, required: true }, // "09:00"
  endTime:         { type: String, required: true }, // "17:00"
  slotDurationMin: { type: Number, default: 30 },
}, { _id: false });

const LeaveExceptionSchema = new mongoose.Schema({
  date:   { type: Date, required: true },
  reason: { type: String },
}, { _id: false });

const ClinicLocationSchema = new mongoose.Schema({
  address: { type: String },
  lat:     { type: Number },
  lng:     { type: Number },
}, { _id: false });

const TherapistProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  specializations:   [{ type: String }],  // dynamic from DB — e.g. "Back Pain", "Neck Pain"
  qualifications:    [{ type: String }],
  experienceYears:   { type: Number, default: 0 },
  languages:         [{ type: String }],
  bio:               { type: String },
  profileImageUrl:   { type: String },
  clinicName:        { type: String },
  clinicLocation:    {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ address: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 }),
    set: (v) => {
      if (typeof v === 'string') return { address: v, lat: 12.9716, lng: 77.5946 };
      if (typeof v === 'object' && v !== null) {
        return { address: v.address || 'Bengaluru, Karnataka', lat: Number(v.lat || 12.9716), lng: Number(v.lng || 77.5946) };
      }
      return { address: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 };
    }
  },
  consultationFee:   { type: Number, default: 0 },  // in paise (smallest INR unit)
  availabilityTemplate: [AvailabilitySlotSchema],
  leaveExceptions:      [LeaveExceptionSchema],
  appointmentBuffer:    { type: Number, default: 10 }, // minutes between appointments
  ratingAvg:         { type: Number, default: 0 },
  isVerified:        { type: Boolean, default: false }, // verified by clinic admin
  verificationStatus: { type: String, enum: ['pending', 'under_review', 'verified', 'rejected', 'suspended'], default: 'pending' },
  verifiedAt:        { type: Date },
  verifiedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationNotes: { type: String },
  rejectionReason:   { type: String },
  registrationNumber: { type: String },
  registrationAuthority: { type: String },
  credentialDocuments: [{ type: String }],
  isDeleted:         { type: Boolean, default: false },
}, { timestamps: true });

TherapistProfileSchema.index({ userId: 1 }, { unique: true });
TherapistProfileSchema.index({ specializations: 1 });
TherapistProfileSchema.index({ verificationStatus: 1 });
TherapistProfileSchema.index({ 'clinicLocation.lat': 1, 'clinicLocation.lng': 1 });

const TherapistProfile = mongoose.model('TherapistProfile', TherapistProfileSchema);
export default TherapistProfile;
