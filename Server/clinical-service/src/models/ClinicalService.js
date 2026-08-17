import mongoose from 'mongoose';

const clinicalServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    basePricePaise: {
      type: Number,
      default: 50000,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

clinicalServiceSchema.index({ category: 1, isActive: 1 });

const ClinicalService = mongoose.models.ClinicalService || mongoose.model('ClinicalService', clinicalServiceSchema);
export default ClinicalService;
