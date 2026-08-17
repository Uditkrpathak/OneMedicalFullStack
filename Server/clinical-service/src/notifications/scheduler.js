import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import { publishEvent } from '../utils/rabbitmq.js';

/**
 * Background Scheduler for 24-hour and 1-hour appointment reminders
 */
export const checkScheduledAppointmentReminders = async () => {
  try {
    const now = new Date();
    const in24HoursMin = new Date(now.getTime() + (23 * 60 + 30) * 60 * 1000);
    const in24HoursMax = new Date(now.getTime() + (24 * 60 + 30) * 60 * 1000);

    const in1HourMin = new Date(now.getTime() + 50 * 60 * 1000);
    const in1HourMax = new Date(now.getTime() + 70 * 60 * 1000);

    // Find confirmed upcoming appointments
    const upcomingAppointments = await Appointment.find({
      status: { $in: ['confirmed', 'booked'] },
      scheduledAt: { $gte: in1HourMin, $lte: in24HoursMax },
    }).lean();

    for (const appt of upcomingAppointments) {
      const apptTime = new Date(appt.scheduledAt).getTime();
      const apptId = String(appt._id);

      // Check 24-hour reminder window
      if (apptTime >= in24HoursMin.getTime() && apptTime <= in24HoursMax.getTime()) {
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
              { id: String(appt.patientId), role: 'patient' },
              { id: String(appt.therapistId), role: 'therapist' },
            ],
            data: {
              appointmentId: apptId,
              patientId: String(appt.patientId),
              therapistId: String(appt.therapistId),
              appointmentDate: new Date(appt.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              appointmentTime: new Date(appt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              serviceName: appt.serviceName || 'Physical Therapy Session',
              route: `/appointments/${apptId}`,
            },
          });
        }
      }

      // Check 1-hour reminder window
      if (apptTime >= in1HourMin.getTime() && apptTime <= in1HourMax.getTime()) {
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
              { id: String(appt.patientId), role: 'patient' },
              { id: String(appt.therapistId), role: 'therapist' },
            ],
            data: {
              appointmentId: apptId,
              patientId: String(appt.patientId),
              therapistId: String(appt.therapistId),
              appointmentDate: 'Today',
              appointmentTime: new Date(appt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              serviceName: appt.serviceName || 'Physical Therapy Session',
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

let schedulerInterval = null;

export const startNotificationScheduler = (intervalMs = 5 * 60 * 1000) => {
  if (schedulerInterval) return;
  console.log('[Notification Scheduler] Started reminder background scanner.');
  checkScheduledAppointmentReminders();
  schedulerInterval = setInterval(checkScheduledAppointmentReminders, intervalMs);
};
