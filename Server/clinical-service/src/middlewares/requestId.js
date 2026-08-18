import crypto from 'crypto';

export const requestIdMiddleware = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  req.requestId = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
};
