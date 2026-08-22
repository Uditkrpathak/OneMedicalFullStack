import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  actorId:      { type: String, required: true, index: true },
  actorRole:    { type: String, enum: ['patient', 'therapist', 'admin', 'system'], required: true },
  action:       { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId:   { type: String, required: true, index: true },
  beforeState:  { type: mongoose.Schema.Types.Mixed },
  afterState:   { type: mongoose.Schema.Types.Mixed },
  reason:       { type: String },
  requestId:    { type: String, index: true },
  ipAddress:    { type: String },
  userAgent:    { type: String },
  previousHash: { type: String, default: '0000000000000000000000000000000000000000000000000000000000000000' },
  currentHash:  { type: String, index: true },
  timestamp:    { type: Date, default: Date.now, index: true }
}, {
  timestamps: false,
  versionKey: false
});

AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });

export default mongoose.model('AuditLog', AuditLogSchema);
