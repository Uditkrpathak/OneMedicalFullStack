import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const internalKey = req.headers['x-internal-key'];
  if (internalKey && internalKey === (process.env.INTERNAL_API_KEY || 'onemedical_internal_key_change_in_prod')) {
    req.user = { userId: 'internal_service', role: 'super_admin' };
    req.headers['x-user-role'] = 'super_admin';
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'onemedical_jwt_access_secret_production_2026';
    const decoded = jwt.verify(token, accessSecret);
    req.user = decoded; // { userId, role }
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    next();
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const message = isProd
      ? (err.name === 'TokenExpiredError' ? 'Your session has expired.' : 'Access token is invalid.')
      : err.message;
    return res.status(401).json({ success: false, error: { code, message } });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden: Insufficient privileges.' } });
    }
    next();
  };
};

export const requireOwnershipOrAdmin = () => {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const targetUserId = req.params.userId || req.params.id;
    
    if (req.user?.role === 'clinic_admin' || req.user?.role === 'super_admin') {
      return next();
    }
    
    if (userId !== targetUserId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden: You do not own this resource.' } });
    }
    next();
  };
};
