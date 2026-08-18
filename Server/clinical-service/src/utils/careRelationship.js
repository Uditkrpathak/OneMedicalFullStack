import Appointment from '../models/Appointment.js';
import PatientProgram from '../models/PatientProgram.js';
import { logAudit } from './audit.js';
import { resolveTherapistIds } from './therapistHelper.js';

/**
 * Checks whether an active or valid care relationship exists between a therapist and a patient.
 */
export const hasActiveCareRelationship = async (therapistId, patientId) => {
  if (!therapistId || !patientId) return false;

  const therapistIds = await resolveTherapistIds(therapistId);

  // 1. Check if the therapist has any booked/confirmed/completed appointment with this patient
  const appointment = await Appointment.findOne({
    therapistId: { $in: therapistIds },
    patientId: patientId.toString(),
    status: { $in: ['CONFIRMED', 'HELD', 'COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'confirmed', 'completed', 'scheduled', 'in_progress', 'rescheduled', 'hold'] },
    isDeleted: false
  });

  if (appointment) return true;

  // 2. Check if therapist has an active or assigned PatientProgram for this patient
  const patientProgram = await PatientProgram.findOne({
    $or: [
      { therapistId: { $in: therapistIds } },
      { assignedBy: { $in: therapistIds } }
    ],
    patientId: patientId.toString(),
    isDeleted: false
  });

  if (patientProgram) return true;

  return false;
};

/**
 * Express middleware to enforce care relationship or patient ownership.
 */
export const requireCareRelationship = (paramKey = 'patientId') => {
  return async (req, res, next) => {
    try {
      const requesterId = req.user?.userId;
      const role = req.user?.role;
      const targetPatientId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey] || (role === 'patient' ? requesterId : null);

      if (!targetPatientId) {
        return res.status(400).json({
          success: false,
          error: { code: 'PATIENT_ID_REQUIRED', message: `Target patient identifier '${paramKey}' is required.` }
        });
      }

      // Admins are allowed with audit logging
      if (role === 'clinic_admin' || role === 'super_admin') {
        await logAudit({
          userId: requesterId,
          action: `ADMIN_ACCESS_${req.method}_${req.baseUrl}${req.path}`,
          resourceType: 'Patient',
          resourceId: targetPatientId,
          ip: req.ip
        });
        return next();
      }

      // Patient accessing their own records
      if (role === 'patient') {
        if (requesterId && requesterId.toString() === targetPatientId.toString()) {
          return next();
        }
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only access your own patient records.' }
        });
      }

      // Therapist accessing an assigned patient's records
      if (role === 'therapist') {
        const hasRelationship = await hasActiveCareRelationship(requesterId, targetPatientId);
        if (hasRelationship) {
          return next();
        }
        return res.status(403).json({
          success: false,
          error: {
            code: 'CARE_RELATIONSHIP_REQUIRED',
            message: 'Access denied: No active care relationship exists between therapist and patient.'
          }
        });
      }

      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied.' }
      });
    } catch (err) {
      console.error('[CareRelationship Middleware Error]:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message }
      });
    }
  };
};
