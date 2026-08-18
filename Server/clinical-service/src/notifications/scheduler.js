import Appointment from '../models/Appointment.js';
import SessionAttendance from '../models/SessionAttendance.js';
import Notification from '../models/Notification.js';
import { publishEvent } from '../utils/rabbitmq.js';

// Format helper in Indian Standard Time (Asia/Kolkata)
const formatISTDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return 'Today';
  }
};

const formatISTTime = (date) => {
  try {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return '10:00 AM';
  }
};

/**
 * 1. Background Scanner for 24h, 1h, and 15m/Starting Now Appointment Reminders
 */
export const checkScheduledAppointmentReminders = async () => {
  try {
    const now = new Date();
    const nowMs = now.getTime();

    // 24h window: 23h30m to 24h30m ahead
    const in24HoursMin = new Date(nowMs + (23 * 60 + 30) * 60 * 1000);
    const in24HoursMax = new Date(nowMs + (24 * 60 + 30) * 60 * 1000);

    // 1h window: 50m to 70m ahead
    const in1HourMin = new Date(nowMs + 50 * 60 * 1000);
    const in1HourMax = new Date(nowMs + 70 * 60 * 1000);

    // Starting Now window: -2m to +15m
    const startingMin = new Date(nowMs - 2 * 60 * 1000);
    const startingMax = new Date(nowMs + 15 * 60 * 1000);

    // Find confirmed upcoming appointments (using startTime schema field)
    const upcomingAppointments = await Appointment.find({
      status: { $in: ['CONFIRMED', 'confirmed', 'SCHEDULED', 'scheduled', 'CHECKED_IN'] },
      startTime: { $gte: startingMin, $lte: in24HoursMax },
      isDeleted: false,
    }).lean();

    for (const appt of upcomingAppointments) {
      const apptStartTime = new Date(appt.startTime).getTime();
      const apptId = String(appt._id);
      const patientId = String(appt.patientId);
      const therapistId = String(appt.therapistId);
      const formattedDate = formatISTDate(appt.startTime);
      const formattedTime = formatISTTime(appt.startTime);

      // A. Check 24-hour reminder window
      if (apptStartTime >= in24HoursMin.getTime() && apptStartTime <= in24HoursMax.getTime()) {
        const reminder24Key = `reminder_24h_${apptId}`;
        const alreadySent = await Notification.exists({ eventId: reminder24Key });

        if (!alreadySent) {
          console.log(`[Scheduler] Dispatching 24h reminder for Appointment ${apptId}`);
          await publishEvent('appointment.reminder_24h', {
            eventId: reminder24Key,
            event: 'appointment.reminder_24h',
            version: 1,
            timestamp: new Date().toISOString(),
            recipients: [
              { id: patientId, role: 'patient' },
              { id: therapistId, role: 'therapist' },
            ],
            data: {
              appointmentId: apptId,
              patientId,
              therapistId,
              patientName: appt.patientName || 'Patient',
              therapistName: appt.therapistName || 'Specialist',
              appointmentDate: formattedDate,
              appointmentTime: formattedTime,
              serviceName: appt.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Session',
              route: `/appointments/${apptId}`,
            },
          });
        }
      }

      // B. Check 1-hour reminder window
      if (apptStartTime >= in1HourMin.getTime() && apptStartTime <= in1HourMax.getTime()) {
        const reminder1Key = `reminder_1h_${apptId}`;
        const alreadySent = await Notification.exists({ eventId: reminder1Key });

        if (!alreadySent) {
          console.log(`[Scheduler] Dispatching 1h reminder for Appointment ${apptId}`);
          await publishEvent('appointment.reminder_1h', {
            eventId: reminder1Key,
            event: 'appointment.reminder_1h',
            version: 1,
            timestamp: new Date().toISOString(),
            recipients: [
              { id: patientId, role: 'patient' },
              { id: therapistId, role: 'therapist' },
            ],
            data: {
              appointmentId: apptId,
              patientId,
              therapistId,
              patientName: appt.patientName || 'Patient',
              therapistName: appt.therapistName || 'Specialist',
              appointmentDate: 'Today',
              appointmentTime: formattedTime,
              serviceName: appt.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Session',
              route: `/appointments/${apptId}`,
            },
          });
        }
      }

      // C. Check Starting Now reminder window (T - 2m to T + 15m)
      if (apptStartTime >= startingMin.getTime() && apptStartTime <= startingMax.getTime()) {
        const startingKey = `reminder_starting_${apptId}`;
        const alreadySent = await Notification.exists({ eventId: startingKey });

        if (!alreadySent) {
          console.log(`[Scheduler] Dispatching Starting Now reminder for Appointment ${apptId}`);
          await publishEvent('appointment.reminder_starting', {
            eventId: startingKey,
            event: 'appointment.reminder_starting',
            version: 1,
            timestamp: new Date().toISOString(),
            recipients: [
              { id: patientId, role: 'patient' },
              { id: therapistId, role: 'therapist' },
            ],
            data: {
              appointmentId: apptId,
              patientId,
              therapistId,
              patientName: appt.patientName || 'Patient',
              therapistName: appt.therapistName || 'Specialist',
              appointmentDate: 'Today',
              appointmentTime: formattedTime,
              serviceName: appt.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Session',
              route: `/appointments/${apptId}`,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[Notification Scheduler Error]:', err.message);
  }
};

/**
 * 2. Background Reconciler for Provider No-Show & Attendance Lifecycles (Every 2 minutes)
 * Ensures:
 * - Patient is never falsely marked as No-Show when provider misses session
 * - Provider No-Shows are detected after grace period (T + 15m) and zero-charge protected
 * - Expired sessions are reconciled into PROVIDER_NO_SHOW, PATIENT_NO_SHOW, or NO_ATTENDANCE
 * - Idempotency: Atomic findOneAndUpdate prevents duplicate execution or duplicate events
 */
export const reconcileSessionAttendance = async () => {
  try {
    const now = new Date();
    const nowMs = now.getTime();
    const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

    // ─── CASE A: Early Provider No-Show Check (T + 15m reached) ───────────────────
    // Patient checked in or waiting, but therapist has not joined within T + 15m
    const providerNoShowCandidates = await Appointment.find({
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'RESCHEDULED', 'confirmed', 'checked_in'] },
      reconciliationStatus: { $ne: 'PROCESSED' },
      startTime: { $lte: new Date(nowMs - GRACE_PERIOD_MS) },
      isDeleted: false,
      therapistJoinedAt: null,
      $or: [
        { patientCheckedInAt: { $ne: null } },
        { patientJoinedAt: { $ne: null } },
        { sessionStatus: 'WAITING' },
      ],
    });

    for (const appt of providerNoShowCandidates) {
      // Atomic claim to guarantee idempotency across multiple workers
      const claimed = await Appointment.findOneAndUpdate(
        {
          _id: appt._id,
          reconciliationStatus: { $ne: 'PROCESSED' },
        },
        {
          $set: {
            status: 'PROVIDER_NO_SHOW',
            sessionStatus: 'ENDED',
            attendanceOutcome: 'PROVIDER_NO_SHOW',
            reconciliationStatus: 'PROCESSED',
            reconciledAt: now,
            refundProtected: true,
          },
        },
        { new: true }
      );

      if (claimed) {
        console.log(`[Reconciler] Provider No-Show detected for Appointment #${appt._id}. Protecting patient payment.`);

        // Count previous provider no-shows for therapist to determine escalation level
        const prevIncidentCount = await SessionAttendance.countDocuments({
          therapistId: appt.therapistId,
          outcome: 'PROVIDER_NO_SHOW',
        });
        const escalationLevel = prevIncidentCount >= 2 ? 3 : prevIncidentCount >= 1 ? 2 : 1;

        // Create authoritative audit attendance record
        await SessionAttendance.findOneAndUpdate(
          { appointmentId: appt._id },
          {
            $set: {
              appointmentId: appt._id,
              patientId: appt.patientId,
              therapistId: appt.therapistId,
              scheduledStart: appt.startTime,
              scheduledEnd: appt.endTime || new Date(new Date(appt.startTime).getTime() + (appt.durationMin || 30) * 60000),
              durationMin: appt.durationMin || 30,
              patientCheckedInAt: appt.patientCheckedInAt || appt.patientJoinedAt || now,
              therapistJoinedAt: null,
              patientAttendance: 'PRESENT',
              therapistAttendance: 'ABSENT',
              outcome: 'PROVIDER_NO_SHOW',
              detectedAt: now,
              reason: 'Therapist failed to join within the allowed 15-minute attendance window.',
              providerIncidentLogged: true,
              escalationLevel,
              paymentOutcome: {
                status: 'REFUND_PENDING',
                idempotencyKey: `provider-noshow:${appt._id}`,
                processedAt: now,
              },
            },
          },
          { upsert: true, new: true }
        );

        // Publish event for notifications & payment refund/credit
        await publishEvent('appointment.provider_no_show', {
          eventId: `evt_prov_noshow_${appt._id}`,
          event: 'appointment.provider_no_show',
          version: 1,
          timestamp: now.toISOString(),
          recipients: [
            { id: String(appt.patientId), role: 'patient' },
            { id: String(appt.therapistId), role: 'therapist' },
            { id: 'admin_broadcast', role: 'clinic_admin' },
          ],
          data: {
            appointmentId: String(appt._id),
            patientId: String(appt.patientId),
            therapistId: String(appt.therapistId),
            patientName: appt.patientName || 'Patient',
            therapistName: appt.therapistName || 'Specialist',
            scheduledAt: appt.startTime,
            appointmentDate: formatISTDate(appt.startTime),
            appointmentTime: formatISTTime(appt.startTime),
            detectedAt: now.toISOString(),
            escalationLevel,
            refundProtected: true,
            route: `/appointments/${appt._id}`,
          },
        });
      }
    }

    // ─── CASE B: Final Window Expired Reconciliation (T + duration + 15m reached) ─
    const windowExpiredCandidates = await Appointment.find({
      status: { $in: ['CONFIRMED', 'CHECKED_IN', 'HELD', 'confirmed', 'checked_in', 'held'] },
      reconciliationStatus: { $ne: 'PROCESSED' },
      endTime: { $lte: new Date(nowMs - GRACE_PERIOD_MS) },
      isDeleted: false,
    });

    for (const appt of windowExpiredCandidates) {
      if (appt.status === 'HELD' || appt.status === 'held') {
        // Expire unconfirmed holds
        await Appointment.findByIdAndUpdate(appt._id, {
          status: 'EXPIRED',
          sessionStatus: 'ENDED',
          reconciliationStatus: 'PROCESSED',
          reconciledAt: now,
        });
        continue;
      }

      // Determine attendance outcome
      const patientPresent = !!(appt.patientCheckedInAt || appt.patientJoinedAt);
      const therapistPresent = !!appt.therapistJoinedAt;

      let outcome = 'NO_ATTENDANCE';
      let newStatus = 'NO_ATTENDANCE';
      let patientAtt = 'ABSENT';
      let therapistAtt = 'ABSENT';
      let eventName = 'appointment.no_attendance';
      let refundProtected = false;

      if (patientPresent && !therapistPresent) {
        outcome = 'PROVIDER_NO_SHOW';
        newStatus = 'PROVIDER_NO_SHOW';
        patientAtt = 'PRESENT';
        eventName = 'appointment.provider_no_show';
        refundProtected = true;
      } else if (!patientPresent && therapistPresent) {
        outcome = 'PATIENT_NO_SHOW';
        newStatus = 'PATIENT_NO_SHOW';
        therapistAtt = 'PRESENT';
        eventName = 'appointment.patient_no_show';
      } else if (patientPresent && therapistPresent) {
        outcome = 'COMPLETED';
        newStatus = 'COMPLETED';
        patientAtt = 'PRESENT';
        therapistAtt = 'PRESENT';
        eventName = 'appointment.completed';
      }

      const claimed = await Appointment.findOneAndUpdate(
        {
          _id: appt._id,
          reconciliationStatus: { $ne: 'PROCESSED' },
        },
        {
          $set: {
            status: newStatus,
            sessionStatus: 'ENDED',
            attendanceOutcome: outcome,
            reconciliationStatus: 'PROCESSED',
            reconciledAt: now,
            refundProtected,
          },
        },
        { new: true }
      );

      if (claimed) {
        console.log(`[Reconciler] Reconciled Appointment #${appt._id} -> ${outcome}`);

        await SessionAttendance.findOneAndUpdate(
          { appointmentId: appt._id },
          {
            $set: {
              appointmentId: appt._id,
              patientId: appt.patientId,
              therapistId: appt.therapistId,
              scheduledStart: appt.startTime,
              scheduledEnd: appt.endTime || now,
              durationMin: appt.durationMin || 30,
              patientCheckedInAt: appt.patientCheckedInAt,
              patientJoinedAt: appt.patientJoinedAt,
              therapistJoinedAt: appt.therapistJoinedAt,
              patientAttendance: patientAtt,
              therapistAttendance: therapistAtt,
              outcome,
              detectedAt: now,
              reason: `Final session window expired. Outcome determined as ${outcome}.`,
              providerIncidentLogged: outcome === 'PROVIDER_NO_SHOW',
              paymentOutcome: {
                status: refundProtected ? 'REFUND_PENDING' : 'NOT_REQUIRED',
                idempotencyKey: `${outcome.toLowerCase()}:${appt._id}`,
                processedAt: now,
              },
            },
          },
          { upsert: true, new: true }
        );

        await publishEvent(eventName, {
          eventId: `evt_reconcile_${outcome.toLowerCase()}_${appt._id}`,
          event: eventName,
          version: 1,
          timestamp: now.toISOString(),
          recipients: [
            { id: String(appt.patientId), role: 'patient' },
            { id: String(appt.therapistId), role: 'therapist' },
          ],
          data: {
            appointmentId: String(appt._id),
            patientId: String(appt.patientId),
            therapistId: String(appt.therapistId),
            patientName: appt.patientName || 'Patient',
            therapistName: appt.therapistName || 'Specialist',
            outcome,
            appointmentDate: formatISTDate(appt.startTime),
            appointmentTime: formatISTTime(appt.startTime),
            refundProtected,
            route: `/appointments/${appt._id}`,
          },
        });
      }
    }

    // D. SCAN AND EXPIRE UNPAID CLINIC APPOINTMENTS PAST ALLOWED WINDOW
    const expiredClinicBookings = await Appointment.find({
      isDeleted: false,
      paymentStatus: 'PENDING',
      status: { $in: ['HELD', 'CONFIRMED'] },
      endTime: { $lt: new Date(now.getTime() - 15 * 60 * 1000) },
      reconciliationStatus: { $ne: 'PROCESSED' },
    });

    for (const appt of expiredClinicBookings) {
      const claimed = await Appointment.findOneAndUpdate(
        {
          _id: appt._id,
          paymentStatus: 'PENDING',
          reconciliationStatus: { $ne: 'PROCESSED' },
        },
        {
          $set: {
            status: 'PAYMENT_EXPIRED',
            sessionStatus: 'ENDED',
            reconciliationStatus: 'PROCESSED',
            reconciledAt: now,
          },
        },
        { new: true }
      );

      if (claimed) {
        console.log(`[Reconciler] Unpaid clinic booking expired for Appointment #${appt._id}`);
        await publishEvent('appointment.payment_expired', {
          eventId: `evt_pay_expired_${appt._id}`,
          event: 'appointment.payment_expired',
          version: 1,
          timestamp: now.toISOString(),
          recipients: [
            { id: String(appt.patientId), role: 'patient' },
            { id: String(appt.therapistId), role: 'therapist' },
          ],
          data: {
            appointmentId: String(appt._id),
            patientId: String(appt.patientId),
            therapistId: String(appt.therapistId),
            patientName: appt.patientName || 'Patient',
            therapistName: appt.therapistName || 'Specialist',
            appointmentDate: formatISTDate(appt.startTime),
            appointmentTime: formatISTTime(appt.startTime),
            reason: 'Payment was not completed within the allowed clinic attendance window.',
            route: `/appointments/${appt._id}`,
          },
        });
      }
    }
  } catch (err) {
    console.error('[Reconcile Session Attendance Error]:', err.message);
  }
};

let reminderInterval = null;
let reconcilerInterval = null;

export const startNotificationScheduler = (intervalMs = 2 * 60 * 1000) => {
  if (reminderInterval) return;
  console.log('[Notification & Attendance Scheduler] Started reminder and reconciliation background scanner.');

  // Run on start
  checkScheduledAppointmentReminders();
  reconcileSessionAttendance();

  // Run every 2 minutes
  reminderInterval = setInterval(checkScheduledAppointmentReminders, intervalMs);
  reconcilerInterval = setInterval(reconcileSessionAttendance, intervalMs);
};
