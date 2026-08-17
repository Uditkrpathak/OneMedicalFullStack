import mongoose from 'mongoose';

const ExerciseSchema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true },
  title:              { type: String }, // alias for name
  description:        { type: String },
  bodyPart:           { type: String }, // e.g. "Lower Back", "Knee"
  bodyRegion:         { type: String, enum: ['spine', 'knee', 'shoulder', 'hip', 'ankle', 'neck', 'general'], default: 'general' },
  category:           { type: String, enum: ['mobility', 'strengthening', 'stretching', 'stability', 'aerobic'], default: 'mobility' },
  difficulty:         { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  targetMuscles:      [{ type: String }],
  mediaUrl:           { type: String }, // S3 image/video URL
  videoUrl:           { type: String },
  thumbnailUrl:       { type: String },
  instructions:       [{ type: String }],
  mistakesToAvoid:    [{ type: String }],
  precautions:        [{ type: String }],
  defaultSets:        { type: Number, default: 3 },
  defaultReps:        { type: Number, default: 10 },
  defaultHoldSeconds: { type: Number, default: 5 },
  defaultRestSeconds: { type: Number, default: 30 },
  defaultDurationSec: { type: Number, default: 30 },
  createdBy:          { type: String, default: 'system' }, // therapistId or 'system'
  isPublic:           { type: Boolean, default: true },
  isActive:           { type: Boolean, default: true },
  isDeleted:          { type: Boolean, default: false },
}, { timestamps: true });

ExerciseSchema.index({ bodyPart: 1 });
ExerciseSchema.index({ bodyRegion: 1 });
ExerciseSchema.index({ category: 1 });
ExerciseSchema.index({ difficulty: 1 });

const Exercise = mongoose.model('Exercise', ExerciseSchema);
export default Exercise;
