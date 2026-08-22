import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  targetDate: { type: Date },
  achieved:   { type: Boolean, default: false },
  achievedAt: { type: Date },
}, { _id: false });

const PatientExerciseOverrideSchema = new mongoose.Schema({
  exerciseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  sets:         { type: Number },
  reps:         { type: Number },
  holdSeconds:  { type: Number },
  restSeconds:  { type: Number },
  durationSec:  { type: Number },
  notes:        { type: String },
}, { _id: false });

const PatientProgramSchema = new mongoose.Schema({
  patientId:              { type: String, required: true, index: true },
  therapistId:            { type: String, default: 'system', index: true }, // current treating therapist
  assignedBy:             { type: String, default: 'system' },              // prescribing therapist
  sourceEncounterId:      { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalConsultation', index: true },
  version:                { type: Number, default: 1 },
  programId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: false },
  programTemplateId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Program' }, // alias for programId
  title:                  { type: String },
  appointmentId:          { type: String },                              // linked appointment
  startDate:              { type: Date, required: true, default: Date.now },
  targetWeeks:            { type: Number, default: 4 },
  targetSessionsPerWeek:  { type: Number, default: 3 },
  currentWeek:            { type: Number, default: 1 },
  completedSessionsCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active',
    index: true,
  },
  recoveryScore:          { type: Number, default: 0 },
  adherencePercent:       { type: Number, default: 0 },
  painTrendScore:         { type: Number, default: 0 },
  milestoneScore:         { type: Number, default: 0 },
  milestones:             [MilestoneSchema],
  exerciseOverrides:      [PatientExerciseOverrideSchema],
  prescribedExercises:    [
    {
      exerciseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
      name:         { type: String, required: true },
      sets:         { type: Number, default: 3 },
      reps:         { type: Number, default: 10 },
      holdSec:      { type: Number, default: 10 },
      frequency:    { type: String, default: '2x Daily' },
      videoUrl:     { type: String, default: '' },
      thumbnailUrl: { type: String, default: '' },
      instructions: { type: String, default: '' },
    }
  ],
  activityRestrictions:   { type: mongoose.Schema.Types.Mixed },
  patientGoals:           { type: mongoose.Schema.Types.Mixed },
  assignedAt:             { type: Date, default: Date.now },
  isDeleted:              { type: Boolean, default: false },
}, { timestamps: true });

PatientProgramSchema.index({ patientId: 1, status: 1 });
PatientProgramSchema.index({ therapistId: 1, status: 1 });
PatientProgramSchema.index({ patientId: 1, sourceEncounterId: 1 }, { sparse: true });

const PatientProgram = mongoose.model('PatientProgram', PatientProgramSchema);
export default PatientProgram;
