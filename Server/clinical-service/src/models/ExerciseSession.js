import mongoose from 'mongoose';

const ExerciseSessionSchema = new mongoose.Schema({
  patientId:              { type: String, required: true, index: true },
  programId:              { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProgram', required: true, index: true },
  programExerciseId:      { type: mongoose.Schema.Types.ObjectId, ref: 'TreatmentProgramExercise' },
  exerciseId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  
  date:                   { type: Date, default: Date.now, index: true },
  
  prescribedSets:         { type: Number, required: true },
  prescribedReps:         { type: Number, required: true },
  
  completedSets:          { type: Number, required: true },
  completedReps:          { type: Number, required: true },
  completionPercentage:   { type: Number, default: 100 },
  durationSeconds:        { type: Number, default: 0 },
  
  // Clinical Biofeedback
  painBefore:             { type: Number, min: 0, max: 10 },
  painAfter:              { type: Number, min: 0, max: 10 },
  difficultyRating:       { type: String, enum: ['too_easy', 'optimal', 'too_hard'], default: 'optimal' },
  patientFeedback:        { type: String },
}, { timestamps: true });

ExerciseSessionSchema.index({ patientId: 1, date: -1 });
ExerciseSessionSchema.index({ programId: 1, date: -1 });
ExerciseSessionSchema.index({ exerciseId: 1, date: -1 });

const ExerciseSession = mongoose.model('ExerciseSession', ExerciseSessionSchema);
export default ExerciseSession;
