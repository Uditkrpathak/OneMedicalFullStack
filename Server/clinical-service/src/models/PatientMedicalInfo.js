import mongoose from 'mongoose';

const PatientMedicalInfoSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true, index: true },
  medicalConditions: [{ type: String }],
  allergies: [{ type: String }],
  currentMedications: [{
    name: { type: String, required: true },
    dosage: { type: String },
    frequency: { type: String },
  }],
  pastSurgeries: [{
    procedure: { type: String, required: true },
    year: { type: Number },
    notes: { type: String },
  }],
  clinicalNotes: [{
    text: { type: String, required: true },
    author: { type: String },
    authorRole: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  clinicalFlags: [{ type: String }], // e.g. 'High Fall Risk', 'Recent ACL Surgery'
  bloodGroup: { type: String },
  updatedBy: { type: String }, // user ID of updater (therapist/admin/patient)
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

const PatientMedicalInfo = mongoose.model('PatientMedicalInfo', PatientMedicalInfoSchema);
export default PatientMedicalInfo;
