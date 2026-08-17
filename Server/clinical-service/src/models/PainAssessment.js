import mongoose from 'mongoose';

const CoordinatesSchema = new mongoose.Schema({
  x:    { type: Number, min: 0, max: 100 },
  y:    { type: Number, min: 0, max: 100 },
  side: { type: String, enum: ['front', 'back'], default: 'front' }
}, { _id: false });

const PainAssessmentSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  patientProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProgram', index: true },
  bodyRegion: {
    type: String,
    required: true,
  },
  painScore: {
    type: Number,
    min: 0,
    max: 10,
    required: true,
  },
  painLevel: {
    type: Number,
    min: 0,
    max: 10,
  }, // alias for painScore
  painType: {
    type: String,
    enum: ['sharp', 'dull', 'aching', 'burning', 'throbbing', 'radiating', 'stiffness', 'stiff', 'tingling', 'other'],
    default: 'dull',
  },
  sensation: {
    type: String,
  }, // alias for painType
  coordinates: CoordinatesSchema,
  triggers: [{ type: String }],
  relievers: [{ type: String }],
  notes: { type: String },
  source: {
    type: String,
    enum: ['body_map', 'session', 'consultation', 'assessment'],
    default: 'body_map',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  recordedAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Schema Virtuals / Pre-save to align aliases
PainAssessmentSchema.pre('save', function (next) {
  if (this.painScore !== undefined && this.painLevel === undefined) {
    this.painLevel = this.painScore;
  } else if (this.painLevel !== undefined && this.painScore === undefined) {
    this.painScore = this.painLevel;
  }

  if (this.painType && !this.sensation) {
    this.sensation = this.painType;
  } else if (this.sensation && !this.painType) {
    this.painType = this.sensation;
  }

  if (this.date && !this.recordedAt) {
    this.recordedAt = this.date;
  } else if (this.recordedAt && !this.date) {
    this.date = this.recordedAt;
  }

  next();
});

PainAssessmentSchema.index({ patientId: 1, date: -1 });
PainAssessmentSchema.index({ patientId: 1, bodyRegion: 1 });
PainAssessmentSchema.index({ patientProgramId: 1, date: -1 });

const PainAssessment = mongoose.model('PainAssessment', PainAssessmentSchema);
export default PainAssessment;
