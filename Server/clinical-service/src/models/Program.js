import mongoose from 'mongoose';

const ProgramExerciseSchema = new mongoose.Schema({
  exerciseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  name:         { type: String },
  title:        { type: String },
  dayOfWeek:    { type: Number, min: 0, max: 6, default: 1 }, // 0=Sun
  weekNumber:   { type: Number, default: 1 },
  sets:         { type: Number, default: 3 },
  reps:         { type: Number, default: 10 },
  holdSeconds:  { type: Number, default: 5 },
  restSeconds:  { type: Number, default: 30 },
  durationSec:  { type: Number, default: 30 },
  restSec:      { type: Number, default: 30 },
  frequency:    { type: String, default: 'Daily' },
  notes:        { type: String },
}, { _id: false });

const ProgramPhaseSchema = new mongoose.Schema({
  week:         { type: Number, required: true },
  phaseName:    { type: String, default: 'Phase 1' },
  exercises:    [ProgramExerciseSchema]
}, { _id: false });

const RecoveryProgramSchema = new mongoose.Schema({
  title:                 { type: String, required: true, trim: true },
  name:                  { type: String }, // alias for title
  description:           { type: String },
  condition:             { type: String }, // e.g. "Post ACL Rehabilitation", "Lower Back Pain"
  targetCondition:       { type: String }, // alias
  durationWeeks:         { type: Number, required: true, default: 4 },
  targetSessionsPerWeek: { type: Number, default: 3 },
  totalSessionsTarget:   { type: Number, default: 12 },
  difficulty:            { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  createdBy:             { type: String, default: 'system' }, // therapistId or 'system'
  phases:                [ProgramPhaseSchema],
  exercises:             [ProgramExerciseSchema],
  precautions:           [{ type: String }],
  equipment:             [{ type: String }],
  isTemplate:            { type: Boolean, default: true },
  isActive:              { type: Boolean, default: true },
  isDeleted:             { type: Boolean, default: false },
}, { timestamps: true });

RecoveryProgramSchema.index({ createdBy: 1 });
RecoveryProgramSchema.index({ targetCondition: 1 });
RecoveryProgramSchema.index({ condition: 1 });
RecoveryProgramSchema.index({ isActive: 1 });

const Program = mongoose.model('Program', RecoveryProgramSchema);
export default Program;
