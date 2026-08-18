import IdempotencyRecord from '../models/IdempotencyRecord.js';

/**
 * Reusable Idempotency Middleware.
 * Intercepts requests carrying 'Idempotency-Key' or 'X-Idempotency-Key'.
 * If previously processed, returns the exact cached response with 'X-Cache-Lookup: HIT'.
 */
export const requireIdempotency = (options = {}) => async (req, res, next) => {
  const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.idempotencyKey;
  if (!rawKey) {
    return next();
  }

  const actorId = req.user?._id || req.user?.id || 'anonymous';
  const idempotencyKey = `${actorId}:${req.baseUrl || ''}${req.path}:${rawKey}`;

  try {
    const existing = await IdempotencyRecord.findOne({ key: idempotencyKey });
    if (existing) {
      res.setHeader('X-Idempotency-Hit', 'true');
      return res.status(existing.statusCode).json(existing.responseBody);
    }

    // Intercept res.json to capture response body
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        IdempotencyRecord.create({
          key: idempotencyKey,
          actorId,
          endpoint: `${req.method} ${req.originalUrl || req.path}`,
          statusCode: res.statusCode,
          responseBody: body,
        }).catch((err) => {
          console.warn('[Idempotency] Failed to store response key:', err.message);
        });
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.warn('[Idempotency] Interceptor error:', err.message);
    next();
  }
};
