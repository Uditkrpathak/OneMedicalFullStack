import { appointmentConfirmedTemplate } from './templates/appointment/confirmed.js';
import {
  appointmentRescheduledTemplate,
  appointmentCancelledTemplate,
  appointmentReminderTemplate,
} from './templates/appointment/rescheduled.js';
import {
  paymentSuccessTemplate,
  clinicalPainAlertTemplate,
} from './templates/clinical/painAlert.js';

/**
 * Universal Template Engine
 * Generates subject, HTML, SMS/text message, and push notification content for any event.
 */
export const renderNotificationContent = ({
  event,
  recipientRole,
  data = {},
  priority = 'normal',
}) => {
  const isTherapist = recipientRole === 'therapist';
  const isAdmin = recipientRole === 'clinic_admin' || recipientRole === 'super_admin';

  switch (event) {
    case 'appointment.booking_requested':
      return {
        title: isTherapist ? 'New Booking Request' : 'Booking Request Submitted',
        message: isTherapist
          ? `Patient ${data.patientName || 'Someone'} requested an appointment on ${data.appointmentDate || 'upcoming date'} at ${data.appointmentTime || ''}.`
          : `Your request for ${data.serviceName || 'Consultation'} with ${data.therapistName || 'Specialist'} has been submitted.`,
        email: appointmentConfirmedTemplate({ ...data, isTherapist }),
        sms: `OneMedical: ${isTherapist ? `New booking request from ${data.patientName}` : `Booking request received for ${data.appointmentDate}`}`,
      };

    case 'appointment.confirmed':
      return {
        title: isTherapist ? 'Appointment Confirmed' : 'Booking Confirmed! ✅',
        message: isTherapist
          ? `Appointment with ${data.patientName || 'Patient'} on ${data.appointmentDate || ''} at ${data.appointmentTime || ''} is confirmed.`
          : `Your session with ${data.therapistName || 'Specialist'} is confirmed for ${data.appointmentDate || ''} at ${data.appointmentTime || ''}.`,
        email: appointmentConfirmedTemplate({ ...data, isTherapist }),
        sms: `OneMedical: Booking confirmed for ${data.appointmentDate} at ${data.appointmentTime} with ${isTherapist ? data.patientName : data.therapistName}. Ref: #${data.appointmentId}`,
      };

    case 'appointment.rescheduled':
      return {
        title: 'Appointment Rescheduled 🔄',
        message: `Session moved to ${data.newDate || data.appointmentDate} at ${data.newTime || data.appointmentTime}.`,
        email: appointmentRescheduledTemplate({ ...data, isTherapist }),
        sms: `OneMedical: Your appointment has been rescheduled to ${data.newDate || data.appointmentDate} at ${data.newTime || data.appointmentTime}.`,
      };

    case 'appointment.cancelled':
      return {
        title: 'Appointment Cancelled ❌',
        message: `Booking #${data.appointmentId} scheduled for ${data.appointmentDate} has been cancelled.`,
        email: appointmentCancelledTemplate({ ...data, isTherapist }),
        sms: `OneMedical: Appointment #${data.appointmentId} cancelled. Reason: ${data.reason || 'User request'}`,
      };

    case 'appointment.reminder_24h':
      return {
        title: 'Appointment Tomorrow ⏰',
        message: `Reminder: Session with ${isTherapist ? data.patientName : data.therapistName} is scheduled tomorrow at ${data.appointmentTime}.`,
        email: appointmentReminderTemplate({ ...data, timeWindow: '24 hours' }),
        sms: `OneMedical Reminder: Your session with ${isTherapist ? data.patientName : data.therapistName} is tomorrow at ${data.appointmentTime}.`,
      };

    case 'appointment.reminder_1h':
      return {
        title: 'Session Starts in 1 Hour 🚨',
        message: `Your appointment with ${isTherapist ? data.patientName : data.therapistName} begins in 1 hour.`,
        email: appointmentReminderTemplate({ ...data, timeWindow: '1 hour' }),
        sms: `OneMedical: Your session starts in 1 hour at ${data.appointmentTime}. Open app to join.`,
      };

    case 'appointment.reminder_starting':
      return {
        title: 'Session Starting Now 🩺',
        message: isTherapist
          ? `Your consultation with ${data.patientName || 'Patient'} is starting now. Please join the session.`
          : `Your session with ${data.therapistName || 'Specialist'} is starting now. Tap to enter consultation.`,
        email: null,
        sms: `OneMedical: Your consultation with ${isTherapist ? data.patientName : data.therapistName} starts now. Tap to join: ${data.route || 'Open app'}`,
      };

    case 'appointment.provider_no_show':
      return {
        title: isTherapist ? '⚠️ Missed Consultation Incident' : 'Appointment Reschedule Protected 🛡️',
        message: isTherapist
          ? `You did not start the scheduled consultation with ${data.patientName || 'Patient'} within the allowed attendance window. An incident has been logged.`
          : `Your session was missed because the specialist was unavailable. You have not been charged. Tap to reschedule at zero cost.`,
        email: {
          subject: isTherapist ? 'Incident Logged: Missed Session — OneMedical' : 'Your Session Has Been Protected — OneMedical',
          text: isTherapist
            ? `Hello Dr. ${data.therapistName || ''},\n\nYou did not conduct scheduled appointment #${data.appointmentId} with ${data.patientName} within the allowed attendance window.\n\nPlease submit an explanation in your specialist portal.`
            : `Hello ${data.patientName || ''},\n\nYour appointment #${data.appointmentId} with ${data.therapistName} could not take place because the specialist was unavailable.\n\nYour payment is fully protected and you will not be charged. You can reschedule your session for free in the OneMedical app.`,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #0f172a;"><h2 style="color: ${isTherapist ? '#dc2626' : '#003D9B'};">OneMedical Care Notice</h2><p>${isTherapist ? `You missed scheduled appointment #${data.appointmentId} with ${data.patientName}.` : `Your appointment with <strong>${data.therapistName}</strong> was missed because the therapist was unavailable.`}</p><p><strong>Status:</strong> ${isTherapist ? 'Provider No-Show Recorded' : 'Zero-Charge Protected — Free Reschedule Available'}</p></div>`,
        },
        sms: isTherapist
          ? `OneMedical Alert: You missed session #${data.appointmentId} with ${data.patientName}. Incident recorded.`
          : `OneMedical: Your session was missed by the specialist. You will not be charged. Tap to reschedule: ${data.route || 'Open app'}`,
      };

    case 'appointment.patient_no_show':
      return {
        title: isTherapist ? 'Patient Missed Session' : 'Missed Consultation',
        message: isTherapist
          ? `Patient ${data.patientName || 'Patient'} did not attend the scheduled consultation #${data.appointmentId}.`
          : `You missed your scheduled session with ${data.therapistName || 'Specialist'}.`,
        email: null,
        sms: `OneMedical: Appointment #${data.appointmentId} was marked as missed.`,
      };

    case 'appointment.no_attendance':
      return {
        title: 'Unattended Session Expired',
        message: `Consultation #${data.appointmentId} expired as neither party attended the session.`,
        email: null,
        sms: `OneMedical: Session #${data.appointmentId} expired due to no attendance.`,
      };

    case 'appointment.technical_failure':
      return {
        title: 'Session Disconnected (Technical Issue)',
        message: `We detected a connection issue during your consultation #${data.appointmentId}. Our care team will assist you with rescheduling.`,
        email: null,
        sms: `OneMedical: Technical connection issue recorded for session #${data.appointmentId}. Support team notified.`,
      };

    case 'clinical.high_pain_alert':
      return {
        title: '⚠️ CRITICAL PAIN ALERT',
        message: `Patient ${data.patientName || 'Patient'} reported severe pain (${data.painScore || data.painLevel || 10}/10).`,
        email: clinicalPainAlertTemplate(data),
        sms: `CRITICAL ALERT: Patient ${data.patientName || 'Patient'} logged pain score ${data.painScore || 10}/10. Please review immediately.`,
      };

    case 'clinical.exercise_assigned':
      return {
        title: 'New Exercise Plan Assigned 🏋️',
        message: `${data.therapistName || 'Your therapist'} updated your daily rehabilitation routine.`,
        email: null,
        sms: `OneMedical: Your therapist assigned a new exercise routine. Open the app to start today's program.`,
      };

    case 'clinical.recovery_milestone':
      return {
        title: 'Milestone Unlocked! 🏆',
        message: `Congratulations! You've achieved your recovery milestone: ${data.milestoneName || 'Goal Reached'}!`,
        email: null,
        sms: null,
      };

    case 'chat.message_received':
      return {
        title: `Message from ${data.senderName || 'Specialist'}`,
        message: data.text ? (data.text.length > 80 ? data.text.substring(0, 77) + '...' : data.text) : 'Sent an attachment',
        email: null,
        sms: null,
      };

    case 'payment.succeeded':
      const amt = data.amountPaise ? (data.amountPaise / 100).toFixed(2) : (data.amount || '0.00');
      return {
        title: `Payment Successful (₹${amt}) 💳`,
        message: `Payment of ₹${amt} received for ${data.serviceName || 'Session'}. Transaction: ${data.transactionId || ''}`,
        email: paymentSuccessTemplate({ ...data, amount: amt }),
        sms: `OneMedical: Payment of ₹${amt} received. Txn: ${data.transactionId}`,
      };

    case 'payment.failed':
      return {
        title: isTherapist ? '⚠️ Patient Payment Failed' : 'Payment Failed ⚠️',
        message: isTherapist
          ? `Payment for consultation #${data.appointmentId || ''} with ${data.patientName || 'Patient'} failed. Slot hold will be released.`
          : `Payment for booking #${data.appointmentId || ''} could not be processed (${data.reason || 'Declined'}). Please retry.`,
        email: {
          subject: isTherapist ? 'Notice: Patient Payment Failed — OneMedical' : 'Payment Failed — OneMedical',
          text: isTherapist
            ? `Hello Dr. ${data.therapistName || ''},\n\nPayment for appointment #${data.appointmentId} with ${data.patientName} failed (${data.reason || 'Declined'}). The appointment hold has been released.`
            : `Hello ${data.patientName || ''},\n\nYour payment for booking #${data.appointmentId} was unsuccessful. Please retry payment in the OneMedical app.`,
          html: `<p>${isTherapist ? `Payment for appointment #${data.appointmentId} with ${data.patientName} failed.` : `Your payment for booking #${data.appointmentId} was unsuccessful.`}</p>`,
        },
        sms: isTherapist
          ? `OneMedical Alert: Payment for appointment #${data.appointmentId} with ${data.patientName} failed.`
          : `OneMedical Alert: Payment failed for booking #${data.appointmentId}. Please open app to complete booking.`,
      };

    case 'telehealth.call_starting':
      return {
        title: 'Incoming Video Consultation 📞',
        message: `${data.callerName || 'Your therapist'} is waiting for you in the telehealth room.`,
        email: null,
        sms: `OneMedical: Your video consultation is starting now. Tap to join: ${data.roomUrl || 'Open OneMedical app'}`,
      };

    case 'medical_record.added_to_vault':
      return {
        title: 'New Clinical Report in Vault 📋',
        message: `Your consultation report from ${data.doctorName || 'your treating therapist'} is now available in your Medical Records Vault.`,
        email: {
          subject: 'New Consultation Report Available in Your Vault — OneMedical',
          text: `Hello ${data.patientName || 'Patient'},\n\nYour clinical consultation report from ${data.doctorName || 'your specialist'} has been verified and deposited into your secure Medical Records Vault.\n\nOpen your OneMedical app to view and download your verified report.`,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #0f172a;"><h2 style="color: #003D9B;">OneMedical Vault</h2><p>Your clinical consultation report from <strong>${data.doctorName || 'your therapist'}</strong> is now sealed and available in your secure Medical Records Vault.</p><p style="color: #64748b; font-size: 13px;">For your privacy and security, clinical documents are accessible only within your authenticated patient vault.</p></div>`,
        },
        sms: `OneMedical: Your consultation report from ${data.doctorName || 'your therapist'} is now available in your Vault. Log in to view.`,
      };

    case 'medical_record.uploaded':
      return {
        title: 'New Medical Document Uploaded 📁',
        message: `Patient ${data.patientName || 'Patient'} uploaded a new ${data.category || 'medical record'} for clinical review.`,
        email: null,
        sms: null,
      };

    case 'medical_record.verified':
      return {
        title: 'Medical Record Verified ✅',
        message: `Your uploaded record (${data.recordTitle || 'Document'}) was reviewed and verified by your care team.`,
        email: null,
        sms: null,
      };

    case 'clinical.consultation_started':
      return {
        title: 'Consultation Session Started 🩺',
        message: `Your clinical encounter with ${data.doctorName || 'your specialist'} is in progress.`,
        email: null,
        sms: null,
      };

    case 'clinical.consultation_amended':
      return {
        title: 'Consultation Addendum Recorded 📝',
        message: `A clinical amendment (v${data.version || 2}) was recorded by ${data.doctorName || 'your therapist'}.`,
        email: null,
        sms: null,
      };

    default:
      return {
        title: data.title || 'OneMedical Notification',
        message: data.message || 'You have an update regarding your care plan.',
        email: null,
        sms: null,
      };
  }
};
