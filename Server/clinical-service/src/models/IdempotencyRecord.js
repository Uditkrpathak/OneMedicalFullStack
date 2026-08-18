import mongoose from 'mongoose';

const IdempotencyRecordSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true, index: true },
  actorId:     { type: String, required: true, index: true },
  endpoint:    { type: String, required: true },
  statusCode:  { type: Number, required: true },
  responseBody:{ type: mongoose.Schema.Types.Mixed, required: true },
  createdAt:   { type: Date, default: Date.now, expires: 86400 } // Auto-expire after 24 hours
}, {
  timestamps: false,
  versionKey: false
});

export default mongoose.model('IdempotencyRecord', IdempotencyRecordSchema);
