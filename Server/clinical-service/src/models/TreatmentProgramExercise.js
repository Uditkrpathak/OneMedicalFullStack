import mongoose from 'mongoose';

const PrescriptionVersionSchema = new mongoose.Schema({
  version:       { type: Number, required: true },
  sets:          { type: Number, required: true },
  reps:          { type: Number, required: true },
  holdSeconds:   { type: Number, default: 0 },
  restSeconds:   { type: Number, default: 30 },
  frequency:     { type: String, default: 'Daily' }, // 'Daily', '2x Daily', '3x Weekly'
  durationWeeks: { type: Number, default: 4 },
  instructions:  { type: String },
  prescribedBy:  { type: String, required: true }, // therapistId
  prescribedAt:  { type: Date, default: Date.now },
  changeReason:  { type: String }, // e.g. "Progression to next stage", "Patient discomfort"
}, { _id: false });

const TreatmentProgramExerciseSchema = new mongoose.Schema({
  programId:    { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProgram', required: true, index: true },
  patientId:    { type: String, required: true, index: true },
  exerciseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  
  // Exercise Clinical Lifecycle
  clinicalStatus: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'SKIPPED', 'REPLACED', 'DISCONTINUED'],
    default: 'ACTIVE',
    index: true,
  },
  replacedByExerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  
  currentPrescription:  { type: PrescriptionVersionSchema, required: true },
  prescriptionHistory:  [PrescriptionVersionSchema],
}, { timestamps: true });

TreatmentProgramExerciseSchema.index({ programId: 1, clinicalStatus: 1 });
TreatmentProgramExerciseSchema.index({ patientId: 1, clinicalStatus: 1 });

const TreatmentProgramExercise = mongoose.model('TreatmentProgramExercise', TreatmentProgramExerciseSchema);
export default TreatmentProgramExercise;
