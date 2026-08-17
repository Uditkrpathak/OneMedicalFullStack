import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
};

/**
 * Nodemailer Email Provider
 */
export const sendEmailNotification = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
}) => {
  const startTime = Date.now();
  if (!to) {
    return {
      status: 'skipped',
      provider: 'nodemailer',
      message: 'No recipient email address provided.',
      latencyMs: 0,
    };
  }

  const client = getTransporter();
  const from = process.env.EMAIL_FROM || '"OneMedical Healthcare" <noreply@onemedical.com>';

  if (!client) {
    // Development fallback
    console.log(`\n==================================================`);
    console.log(`[EMAIL DEV DISPATCH] → To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || '(HTML content rendered)'}`);
    console.log(`==================================================\n`);

    return {
      status: 'logged_dev',
      provider: 'nodemailer',
      providerMessageId: `email_dev_${Date.now()}`,
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const info = await client.sendMail({
      from,
      to,
      subject,
      text: text || '',
      html: html || text,
      attachments,
    });

    return {
      status: 'sent',
      provider: 'nodemailer',
      providerMessageId: info.messageId,
      latencyMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error(`[EmailProvider Error] Failed to send email to ${to}:`, err.message);
    return {
      status: 'failed',
      provider: 'nodemailer',
      error: err.message,
      latencyMs: Date.now() - startTime,
    };
  }
};
