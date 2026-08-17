import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({
  userId,
  action,
  resourceType,
  resourceId,
  details = {},
  ip = ''
}) => {
  try {
    if (!AuditLog) return;
    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId: resourceId?.toString(),
      details,
      ip,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[AuditLog Error]:', err.message);
  }
};
