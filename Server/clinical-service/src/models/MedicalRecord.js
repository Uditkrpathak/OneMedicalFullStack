import mongoose from 'mongoose';

const MedicalRecordSchema = new mongoose.Schema({
  patientId:        { type: String, required: true, index: true },
  title:            { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: [
      'CONSULTATION_REPORT',
      'TREATMENT_PLAN',
      'EXERCISE_PROGRAM',
      'MRI_SCAN',
      'X_RAY',
      'PRESCRIPTION',
      'DISCHARGE_SUMMARY',
      'LAB_REPORT',
      'INVOICE_RECEIPT',
      'OTHER'
    ],
    default: 'OTHER',
    index: true,
  },
  recordType:       { type: String }, // alias for category
  type:             { type: String }, // legacy alias
  doctorName:       { type: String, trim: true },
  hospitalName:     { type: String, trim: true },
  recordDate:       { type: Date, default: Date.now },
  
  // Storage layer abstraction
  storageProvider:    { type: String, enum: ['cloudinary', 'local', 'supabase', 'r2', 's3'], default: 'cloudinary' },
  storageKey:         { type: String, required: true, index: true },
  cloudinaryPublicId: { type: String },
  resourceType:       { type: String },
  s3Key:              { type: String }, // backward compatibility alias for storageKey
  fileKey:            { type: String }, // alias
  
  originalFileName: { type: String },
  fileName:         { type: String, required: true },
  fileSizeBytes:    { type: Number, default: 0 },
  sizeBytes:        { type: Number }, // alias
  mimeType:         { type: String, default: 'application/pdf' },
  checksum:         { type: String }, // SHA-256 checksum for integrity validation
  
  // Clinical linkages
  consultationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalConsultation', default: null, index: true },
  appointmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null, index: true },
  isGenerated:      { type: Boolean, default: false }, // true for auto-generated consultation reports
  version:          { type: Number, default: 1 },
  
  tags:             [{ type: String }],
  notes:            { type: String },
  uploadedBy:       { type: String, enum: ['patient', 'therapist', 'admin', 'clinic_admin', 'system'], default: 'patient' },
  uploadedByRole:   { type: String, default: 'patient' },
  uploaderId:       { type: String },
  visibility:       { type: String, enum: ['PATIENT_AND_CARE_TEAM', 'CARE_TEAM_ONLY', 'PRIVATE'], default: 'PATIENT_AND_CARE_TEAM' },
  visibleToPatient: { type: Boolean, default: true },
  
  verifiedBy:       { type: String, default: null },
  verifiedAt:       { type: Date, default: null },
  isDeleted:        { type: Boolean, default: false },
}, { timestamps: true });

// Pre-save to align field aliases
MedicalRecordSchema.pre('save', function (next) {
  if (this.category && !this.recordType) {
    this.recordType = this.category;
  }
  if (this.storageKey && !this.s3Key) {
    this.s3Key = this.storageKey;
    this.fileKey = this.storageKey;
  } else if (this.s3Key && !this.storageKey) {
    this.storageKey = this.s3Key;
    this.fileKey = this.s3Key;
  }
  if (this.fileSizeBytes && !this.sizeBytes) {
    this.sizeBytes = this.fileSizeBytes;
  } else if (this.sizeBytes && !this.fileSizeBytes) {
    this.fileSizeBytes = this.sizeBytes;
  }
  next();
});

MedicalRecordSchema.index({ patientId: 1, category: 1, recordDate: -1 });
MedicalRecordSchema.index({ patientId: 1, isDeleted: 1 });

const MedicalRecord = mongoose.model('MedicalRecord', MedicalRecordSchema);
export default MedicalRecord;
