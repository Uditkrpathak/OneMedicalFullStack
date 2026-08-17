export const paymentSuccessTemplate = ({
  patientName = 'Patient',
  amount = '0.00',
  currency = 'INR',
  transactionId = '',
  appointmentId = '',
  invoiceNumber = '',
}) => ({
  subject: `🧾 Payment Received: ₹${amount} - OneMedical Receipt`,
  text: `Hello ${patientName}, your payment of ₹${amount} (Txn: ${transactionId}) has been successfully received.`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #16a34a; margin-top: 0;">Payment Successful</h2>
      <p style="color: #334155; font-size: 14px;">Thank you for your payment. Here is your receipt summary:</p>
      <div style="background: #f0fdf4; border: 1px solid #dcfce7; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #166534; font-size: 20px; font-weight: 800;">₹${amount}</p>
        <p style="margin: 6px 0 0; color: #334155; font-size: 13px;"><strong>Transaction ID:</strong> ${transactionId}</p>
        ${invoiceNumber ? `<p style="margin: 4px 0 0; color: #334155; font-size: 13px;"><strong>Invoice No:</strong> ${invoiceNumber}</p>` : ''}
        ${appointmentId ? `<p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Linked Booking: #${appointmentId}</p>` : ''}
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">OneMedical Healthcare Billing &copy; ${new Date().getFullYear()}</p>
    </div>
  `,
});

export const clinicalPainAlertTemplate = ({
  therapistName = 'Therapist',
  patientName = 'Patient',
  painScore = 10,
  sessionCount = 2,
  patientId = '',
}) => ({
  subject: `⚠️ CRITICAL CLINICAL ALERT: High Pain Score (${painScore}/10) - ${patientName}`,
  text: `CRITICAL ALERT: Patient ${patientName} reported a pain score of ${painScore}/10 for ${sessionCount} consecutive sessions. Immediate clinical review recommended.`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 2px solid #ef4444; border-radius: 12px; background: #ffffff;">
      <div style="background: #ef4444; color: #ffffff; padding: 10px 14px; border-radius: 6px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
        Critical Clinical Safety Alert
      </div>
      <h3 style="color: #991b1b; margin: 16px 0 8px;">High Pain Intensity Detected</h3>
      <p style="color: #334155; font-size: 14px;">Hello ${therapistName}, patient <strong>${patientName}</strong> has logged a severe pain intensity score of <strong>${painScore}/10</strong> across ${sessionCount} consecutive assessments.</p>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #7f1d1d; font-size: 14px; font-weight: 700;">Patient ID: ${patientId}</p>
        <p style="margin: 4px 0 0; color: #991b1b; font-size: 13px;">Action Required: Please evaluate pain notes and consider protocol adjustment or urgent outreach.</p>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://onemedical.app/therapist/patients/${patientId}/clinical-suite" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Open Clinical Chart & Adjust Plan</a>
      </div>
    </div>
  `,
});
