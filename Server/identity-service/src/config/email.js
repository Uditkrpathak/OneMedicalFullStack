import nodemailer from 'nodemailer';

/**
 * Send HTML Email OTP via Nodemailer
 * @param {string} toEmail Recipient Email Address
 * @param {string} otp 6-digit OTP Code
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export const sendEmailOtp = async (toEmail, otp) => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || '"OneMedical Healthcare" <noreply@onemedical.com>';

  console.log(`\n==================================================`);
  console.log(`[EMAIL OTP GENERATED] Target: ${toEmail} | 🔑 OTP: ${otp}`);
  console.log(`==================================================\n`);

  if (!host || !user || !pass) {
    console.log(`[Nodemailer Warning]: SMTP credentials not set in .env. OTP printed to terminal console.`);
    return { success: true, message: 'SMTP not configured; OTP logged to server console for testing.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
        <h2 style="color: #00766c; text-align: center;">OneMedical Security</h2>
        <p>Hello,</p>
        <p>Your 6-digit verification code is:</p>
        <div style="background-color: #f4fbfb; font-size: 32px; font-weight: bold; color: #00766c; letter-spacing: 6px; text-align: center; padding: 15px; border-radius: 6px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">&copy; ${new Date().getFullYear()} OneMedical Healthcare Systems. All rights reserved.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `🔑 ${otp} is your OneMedical verification code`,
      html: htmlContent,
    });

    console.log(`[Nodemailer Success] Email OTP sent to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Nodemailer Error]:', err.message);
    return { success: false, error: err.message };
  }
};
