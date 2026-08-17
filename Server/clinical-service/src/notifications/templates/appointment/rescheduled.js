export const appointmentRescheduledTemplate = ({
  patientName = 'Patient',
  therapistName = 'Therapist',
  oldDate = '',
  oldTime = '',
  newDate = '',
  newTime = '',
  serviceName = 'Consultation',
  appointmentId = '',
  isTherapist = false,
}) => ({
  subject: `🔄 Appointment Rescheduled: ${serviceName} - OneMedical`,
  text: `Hello ${isTherapist ? therapistName : patientName}, your appointment (#${appointmentId}) has been rescheduled to ${newDate} at ${newTime}.`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #d97706; margin-top: 0;">Appointment Rescheduled</h2>
      <p style="color: #334155; font-size: 14px;">Your session has been successfully moved to the new slot:</p>
      <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>New Time:</strong> ${newDate} at ${newTime}</p>
        ${oldDate ? `<p style="margin: 4px 0 0; color: #b45309; font-size: 12px; text-decoration: line-through;">Previous: ${oldDate} at ${oldTime}</p>` : ''}
        <p style="margin: 4px 0 0; color: #475569; font-size: 13px;">${isTherapist ? `Patient: ${patientName}` : `Specialist: ${therapistName}`}</p>
      </div>
      <p style="font-size: 13px; color: #64748b;">If this new time does not work for you, please open the app to select an alternative slot.</p>
    </div>
  `,
});

export const appointmentCancelledTemplate = ({
  patientName = 'Patient',
  therapistName = 'Therapist',
  appointmentDate = '',
  appointmentTime = '',
  serviceName = 'Consultation',
  reason = 'Cancelled by user',
  appointmentId = '',
  isTherapist = false,
}) => ({
  subject: `❌ Appointment Cancelled: #${appointmentId} - OneMedical`,
  text: `Hello ${isTherapist ? therapistName : patientName}, your appointment (#${appointmentId}) scheduled for ${appointmentDate} at ${appointmentTime} has been cancelled. Reason: ${reason}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #dc2626; margin-top: 0;">Appointment Cancelled</h2>
      <p style="color: #334155; font-size: 14px;">The following session has been cancelled:</p>
      <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 4px 0 0; color: #475569; font-size: 13px;"><strong>Date:</strong> ${appointmentDate} at ${appointmentTime}</p>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;"><strong>Reason:</strong> ${reason}</p>
      </div>
      <p style="font-size: 13px; color: #64748b;">If a refund is applicable, it will be automatically processed to your original payment method.</p>
    </div>
  `,
});

export const appointmentReminderTemplate = ({
  patientName = 'Patient',
  therapistName = 'Therapist',
  appointmentDate = '',
  appointmentTime = '',
  serviceName = 'Consultation',
  appointmentId = '',
  timeWindow = '24 hours',
}) => ({
  subject: `⏰ Reminder: Upcoming Session in ${timeWindow} - OneMedical`,
  text: `Hello ${patientName}, your session with ${therapistName} is scheduled in ${timeWindow} on ${appointmentDate} at ${appointmentTime}.`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #0038A8; margin-top: 0;">Session Reminder</h2>
      <p style="color: #334155; font-size: 14px;">Your scheduled consultation is starting in <strong>${timeWindow}</strong>.</p>
      <div style="background: #f0f7ff; border: 1px solid #dbeafe; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 600;">${serviceName}</p>
        <p style="margin: 4px 0 0; color: #334155; font-size: 14px;">Specialist: ${therapistName}</p>
        <p style="margin: 4px 0 0; color: #334155; font-size: 14px;">When: ${appointmentDate} at ${appointmentTime}</p>
      </div>
      <p style="font-size: 13px; color: #64748b;">Please join 5 minutes early in a quiet, well-lit room for video evaluation.</p>
    </div>
  `,
});
