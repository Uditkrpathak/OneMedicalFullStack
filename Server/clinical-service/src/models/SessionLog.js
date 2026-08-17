import mongoose from 'mongoose';

const ExerciseCompletionSchema = new mongoose.Schema({
  exerciseId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  name:                 { type: String },
  setsCompleted:        { type: Number, default: 0, min: 0 },
  setsDone:             { type: Number, default: 0, min: 0 }, // backward compat
  repsCompleted:        { type: Number, default: 0, min: 0 },
  repsDone:             { type: Number, default: 0, min: 0 }, // backward compat
  holdSecondsCompleted: { type: Number, default: 0, min: 0 },
  durationSec:          { type: Number, default: 0, min: 0 },
  completed:            { type: Boolean, default: true },
}, { _id: false });

const SessionLogSchema = new mongoose.Schema({
  patientId:            { type: String, required: true, index: true },
  patientProgramId:     { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProgram', index: true },
  programId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  idempotencyKey:       { type: String, index: true },
  clientSessionId:      { type: String, index: true },  // alias for idempotencyKey
  date:                 { type: String, required: true }, // "YYYY-MM-DD"
  durationSeconds:      { type: Number, default: 0, min: 0 },
  perceivedExertionRPE: { type: Number, min: 1, max: 10, default: 4 }, // Borg RPE Scale 1–10
  rpeScore:             { type: Number, min: 1, max: 10 },             // alias
  painLevel:            { type: Number, min: 0, max: 10, default: 0 }, // Pain 0–10
  postSessionPain:      { type: Number, min: 0, max: 10 },             // alias
  status:               { type: String, enum: ['completed', 'abandoned', 'paused'], default: 'completed' },
  exercisesCompleted:   [ExerciseCompletionSchema],
  notes:                { type: String },
  completedOffline:     { type: Boolean, default: false },
  startedAt:            { type: Date },
  completedAt:          { type: Date, default: Date.now },
  isDeleted:            { type: Boolean, default: false },
}, { timestamps: true });

// Compound Unique Indexes with Partial Filter Expression for Race-Safe Idempotency
SessionLogSchema.index(
  { patientId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
SessionLogSchema.index(
  { patientId: 1, clientSessionId: 1 },
  { unique: true, partialFilterExpression: { clientSessionId: { $type: 'string' } } }
);
SessionLogSchema.index({ patientId: 1, date: -1 });

const SessionLog = mongoose.model('SessionLog', SessionLogSchema);
export default SessionLog;
