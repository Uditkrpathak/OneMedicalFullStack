import crypto from 'crypto';
import AuditLog from '../models/AuditLog.js';

let latestHash = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Record an immutable, tamper-evident audit log entry asynchronously.
 */
export const logAudit = async ({
  actorId,
  actorRole = 'system',
  action,
  resourceType,
  resourceId,
  beforeState,
  afterState,
  reason,
  req,
}) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'internal';
    const requestId = req?.headers['x-request-id'] || req?.requestId || `req_${Date.now()}`;
    const timestamp = new Date();
    const resolvedActorId = String(actorId || req?.user?._id || req?.user?.id || 'system');
    const resolvedResourceId = String(resourceId);

    // Compute SHA-256 block hash for tamper evidence
    const currentHash = crypto
      .createHash('sha256')
      .update(`${latestHash}:${resolvedActorId}:${action}:${resourceType}:${resolvedResourceId}:${timestamp.toISOString()}`)
      .digest('hex');

    const previousHash = latestHash;
    latestHash = currentHash;

    await AuditLog.create({
      actorId: resolvedActorId,
      actorRole: actorRole || req?.user?.role || 'system',
      action,
      resourceType,
      resourceId: resolvedResourceId,
      beforeState,
      afterState,
      reason,
      requestId,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      previousHash,
      currentHash,
      timestamp,
    });
  } catch (err) {
    console.warn(`[AuditLogger Warning] Failed to persist audit log for ${action}:`, err.message);
  }
};
