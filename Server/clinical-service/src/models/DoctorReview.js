import mongoose from 'mongoose';

const DoctorReviewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientAvatarUrl: {
      type: String,
      default: null,
    },
    therapistId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    explanationRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    waitTimeRating: {
      type: String,
      default: '< 15 mins',
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    npsScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 10,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isVerifiedConsultation: {
      type: Boolean,
      default: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['PUBLISHED', 'FLAGGED', 'HIDDEN'],
      default: 'PUBLISHED',
      index: true,
    },
    moderationReason: {
      type: String,
      default: null,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce invariant: Exactly one review per appointment
DoctorReviewSchema.index({ appointmentId: 1 }, { unique: true });
DoctorReviewSchema.index({ therapistId: 1, status: 1, createdAt: -1 });
DoctorReviewSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.models.DoctorReview || mongoose.model('DoctorReview', DoctorReviewSchema);
