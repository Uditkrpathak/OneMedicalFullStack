import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const OtpSchema = new mongoose.Schema({
  codeHash:  { type: String },
  expiresAt: { type: Date },
  attempts:  { type: Number, default: 0 },
  lockedUntil: { type: Date },
  requestedAt: { type: Date },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['patient', 'therapist', 'clinic_admin', 'super_admin'],
    required: true,
  },
  name:          { type: String, trim: true },
  email:         { type: String, trim: true, lowercase: true },
  phoneNumber:   { type: String, trim: true },
  profileImageUrl: { type: String },
  passwordHash:  { type: String },          // staff/therapist/admin only
  otp:           { type: OtpSchema, default: {} },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive:      { type: Boolean, default: true },
  status:        { type: String, enum: ['active', 'pending', 'rejected', 'suspended'], default: 'active' },
  isProfileCompleted: { type: Boolean, default: false },
  savedTherapists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notificationPreferences: {
    upcomingAppointment: { type: Boolean, default: true },
    appointmentConfirmation: { type: Boolean, default: true },
    appointmentRescheduled: { type: Boolean, default: true },
    appointmentCancelled: { type: Boolean, default: true },
    todayExercise: { type: Boolean, default: true },
    recoveryProgramUpdates: { type: Boolean, default: true },
    weeklyProgressSummary: { type: Boolean, default: true },
    achievementNotifications: { type: Boolean, default: true },
    newMedicalReports: { type: Boolean, default: true },
    paymentConfirmation: { type: Boolean, default: true },
    invoiceAvailable: { type: Boolean, default: true },
    healthTips: { type: Boolean, default: false },
    newFeatures: { type: Boolean, default: false },
    promotions: { type: Boolean, default: false },
  },
  deletionRequest: {
    requestedAt: { type: Date },
    reason: { type: String },
    status: { type: String, enum: ['none', 'pending', 'processed'], default: 'none' },
  },
  lastLoginAt:   { type: Date },
  isDeleted:     { type: Boolean, default: false },
  deletedAt:     { type: Date },
}, { timestamps: true });

// Explicit schema indexes
UserSchema.index({ phoneNumber: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never return sensitive fields
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otp;
  return obj;
};

const User = mongoose.model('User', UserSchema);
export default User;
