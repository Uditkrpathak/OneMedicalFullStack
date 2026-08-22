import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  familyId: {
    type: String,
    required: true,
    index: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  replacedByTokenId: {
    type: String,
    default: null,
  },
}, { timestamps: true });

// TTL index to auto-clean expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
export default RefreshToken;
