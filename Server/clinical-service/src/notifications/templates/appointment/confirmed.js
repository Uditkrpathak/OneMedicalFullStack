export const appointmentConfirmedTemplate = ({
  patientName = 'Patient',
  therapistName = 'Therapist',
  appointmentDate = 'Upcoming Date',
  appointmentTime = 'Upcoming Time',
  serviceName = 'Consultation',
  appointmentId = '',
  isTherapist = false,
}) => {
  if (isTherapist) {
    return {
      subject: `🗓️ New Appointment Booked: ${patientName} - OneMedical`,
      text: `Hello ${therapistName}, a new appointment (#${appointmentId}) has been booked by ${patientName} on ${appointmentDate} at ${appointmentTime} for ${serviceName}.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0038A8; font-size: 22px; margin: 0;">OneMedical Clinical</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">New Appointment Notification</p>
          </div>
          <div style="background: #f0f7ff; border-left: 4px solid #0038A8; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 600;">Patient: ${patientName}</p>
            <p style="margin: 4px 0 0; color: #475569; font-size: 14px;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 4px 0 0; color: #475569; font-size: 14px;"><strong>Date & Time:</strong> ${appointmentDate} at ${appointmentTime}</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Booking ID: #${appointmentId}</p>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">Please review your schedule in the Therapist Portal before the session starts.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://onemedical.app/therapist/appointments/${appointmentId}" style="background: #0038A8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open Patient Chart</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 12px;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">OneMedical Healthcare Systems &copy; ${new Date().getFullYear()}</p>
        </div>
      `,
    };
  }

  return {
    subject: `✅ Booking Confirmed with ${therapistName} - OneMedical`,
    text: `Hello ${patientName}, your session (#${appointmentId}) with ${therapistName} for ${serviceName} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0038A8; font-size: 22px; margin: 0;">OneMedical</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Appointment Confirmation</p>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 700;">Your Appointment is Confirmed!</p>
          <p style="margin: 6px 0 0; color: #1e293b; font-size: 14px;"><strong>Specialist:</strong> ${therapistName}</p>
          <p style="margin: 4px 0 0; color: #1e293b; font-size: 14px;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin: 4px 0 0; color: #1e293b; font-size: 14px;"><strong>Date & Time:</strong> ${appointmentDate} at ${appointmentTime}</p>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Booking Ref: #${appointmentId}</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">We will send you a reminder 1 hour before the session starts. You can join your telehealth consultation directly from the OneMedical mobile app.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://onemedical.app/appointments/${appointmentId}" style="background: #0038A8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">View Appointment Details</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 12px;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">OneMedical Healthcare Systems &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  };
};
