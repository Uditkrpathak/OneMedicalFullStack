import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import PatientProgram from '../models/PatientProgram.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
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

export const requireOwnershipOrAssignedTherapist = () => {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;
    let patientId = req.params.patientId || req.params.id || req.query.patientId || req.query.queryPatientId;

    if (!patientId && userRole === 'patient') {
      patientId = userId;
    }

    // Resolve patientId from patientProgramId if needed
    if (!patientId && req.params.patientProgramId) {
      try {
        const patientProg = await PatientProgram.findById(req.params.patientProgramId);
        if (patientProg) {
          patientId = patientProg.patientId;
        }
      } catch (err) {
        // invalid object ID
      }
    }

    // Resolve patientId from medical record ID if needed
    if (!patientId && req.params.id && req.path.includes('medical-records')) {
      try {
        const MedicalRecord = mongoose.model('MedicalRecord');
        const record = await MedicalRecord.findById(req.params.id);
        if (record) {
          patientId = record.patientId;
        }
      } catch (err) {
        // invalid ID
      }
    }

    if (userRole === 'clinic_admin' || userRole === 'super_admin') {
      return next();
    }

    if (userRole === 'patient') {
      if (userId !== patientId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden: You do not own this resource.' } });
      }
      return next();
    }

    if (userRole === 'therapist') {
      if (!patientId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'patientId is required for authorization.' } });
      }

      // Check if therapist has an active treatment assignment or appointment booking
      const programAssigned = await PatientProgram.findOne({
        patientId,
        assignedBy: userId,
        status: 'active',
        isDeleted: false,
      });

      if (programAssigned) {
        return next();
      }

      const activeAppointment = await Appointment.findOne({
        patientId,
        therapistId: userId,
        status: { $in: ['confirmed', 'completed', 'pending_payment'] },
        isDeleted: false,
      });

      if (activeAppointment) {
        return next();
      }

      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden: You are not assigned to this patient.' } });
    }

    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden: Invalid role claims.' } });
  };
};
