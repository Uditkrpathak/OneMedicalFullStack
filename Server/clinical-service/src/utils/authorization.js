export const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' }
      });
    }
    next();
  };
};

export const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  if (userRole !== 'clinic_admin' && userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'ADMIN_REQUIRED', message: 'Administrative access required.' }
    });
  }
  next();
};

export const requirePatientOwnership = (paramKey = 'patientId') => {
  return (req, res, next) => {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const targetPatientId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];

    if (requesterRole === 'clinic_admin' || requesterRole === 'super_admin') {
      return next();
    }

    if (requesterRole === 'patient' && requesterId === targetPatientId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only access your own patient records.' }
    });
  };
};
