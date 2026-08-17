let twilioClient = null;

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    try {
      import('twilio').then(twilioPkg => {
        twilioClient = twilioPkg.default(sid, token);
      }).catch(() => {});
    } catch (e) {}
  }
  return twilioClient;
};

/**
 * Twilio SMS Notification Provider
 */
export const sendSmsNotification = async ({
  phone,
  message,
}) => {
  const startTime = Date.now();
  if (!phone) {
    return {
      status: 'skipped',
      provider: 'twilio',
      message: 'No recipient phone number provided.',
      latencyMs: 0,
    };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.log(`\n[SMS DEV DISPATCH] → ${phone}: "${message}"`);
    return {
      status: 'logged_dev',
      provider: 'twilio',
      providerMessageId: `sms_dev_${Date.now()}`,
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const twilioPkg = await import('twilio');
    const client = twilioPkg.default(sid, token);
    const result = await client.messages.create({
      body: message,
      from,
      to: phone,
    });

    return {
      status: 'sent',
      provider: 'twilio',
      providerMessageId: result.sid,
      latencyMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error(`[SmsProvider Error] Failed to send SMS to ${phone}:`, err.message);
    return {
      status: 'failed',
      provider: 'twilio',
      error: err.message,
      latencyMs: Date.now() - startTime,
    };
  }
};
