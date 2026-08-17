import Redis from 'ioredis';

let redisClient = null;

export const getRedis = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    redisClient.on('connect', () => console.log('[Clinical] Redis connected'));
    redisClient.on('error',   (err) => {
      // Suppress spammy disconnect errors
    });
  }
  return redisClient;
};

// Lock key format: therapistId + startTime ISO string
// Fallback to true if Redis is unreachable (DB conflict check still runs)
export const acquireSlotLock = async (therapistId, startTimeISO, requestId) => {
  try {
    const redis = getRedis();
    const key = `lock:slot:${therapistId}:${startTimeISO}`;
    const ttl = parseInt(process.env.SLOT_LOCK_TTL_SECONDS) || 5;
    const result = await redis.set(key, requestId, 'NX', 'EX', ttl);
    return result === 'OK';
  } catch (err) {
    console.warn('[Clinical] Redis lock bypass (Redis unreachable):', err.message);
    return true;  // Fallback: DB conflict check still provides protection
  }
};

export const releaseSlotLock = async (therapistId, startTimeISO, requestId) => {
  try {
    const redis = getRedis();
    const key = `lock:slot:${therapistId}:${startTimeISO}`;
    const current = await redis.get(key);
    if (current === requestId) await redis.del(key);
  } catch (err) {
    // Ignore release errors if Redis is down
  }
};

// Helper: check if a slot is currently locked (used by availability queries)
export const checkSlotLocked = async (therapistId, startTimeISO) => {
  try {
    const redis = getRedis();
    const key = `lock:slot:${therapistId}:${startTimeISO}`;
    return (await redis.exists(key)) === 1;
  } catch (err) {
    return false;
  }
};

