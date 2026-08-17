import express from 'express';
import {
  createHold,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  getMyAppointments,
  getAppointmentById,
  getSlotAvailability,
  rescheduleAppointment,
  requestDoctorReschedule,
  respondToReschedule,
  getOutageImpact,
  getAppointmentsDashboard,
  updateAppointmentStatus,
} from '../controllers/bookingController.js';

const router = express.Router();

// ─── Authoritative Dashboard Aggregator ─────────────────────────────────────────
router.get('/appointments/dashboard',              getAppointmentsDashboard);

// ─── Appointments ─────────────────────────────────────────────────────────────
router.post('/appointments/hold',                  createHold);           // Create HELD slot
router.get('/appointments',                        getMyAppointments);    // ?view=upcoming|past|cancelled
router.get('/appointments/outage-impact',          getOutageImpact);      // Outage impact analysis
router.get('/appointments/outage/impact',          getOutageImpact);
router.get('/appointments/:id',                    getAppointmentById);   // Single appointment (RBAC enforced)

router.patch('/appointments/:id/status',           updateAppointmentStatus); // Strict state machine transition
router.post('/appointments/:id/cancel',            cancelAppointment);    // Cancellation policy enforced
router.post('/appointments/:id/reschedule',        rescheduleAppointment);// Hold-swap pattern
router.post('/appointments/:id/reschedule/request', requestDoctorReschedule); // Doctor/Admin propose slot
router.post('/appointments/:id/reschedule/respond', respondToReschedule);     // Patient accept/reject
router.patch('/appointments/:id/confirm',          confirmAppointment);   // Internal & Admin confirm
router.post('/appointments/:id/confirm',           confirmAppointment);
router.patch('/appointments/:id/complete',         completeAppointment);  // Therapist/admin: mark completed

// ─── Availability ─────────────────────────────────────────────────────────────
router.get('/availability/:therapistId',           getSlotAvailability);  // ?date=YYYY-MM-DD → ISO-8601 slots

export default router;


