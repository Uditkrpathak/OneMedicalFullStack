/**
 * Firebase Cloud Messaging (FCM) Provider
 * Handles direct native FCM device tokens using Firebase Admin or FCM HTTP v1 / Legacy API.
 */
export const sendFcmNotification = async ({
  tokens,
  title,
  body,
  data = {},
  priority = 'normal',
}) => {
  const startTime = Date.now();
  if (!tokens || tokens.length === 0) {
    return {
      status: 'skipped',
      provider: 'fcm',
      message: 'No FCM tokens provided.',
      latencyMs: Date.now() - startTime,
    };
  }

  // If Firebase Admin SDK or FCM server key is available in environment
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.log(`[FCM DEV] → ${tokens.length} token(s) | Title: "${title}" | Body: "${body}"`);
    return {
      status: 'logged_dev',
      provider: 'fcm',
      providerMessageId: `fcm_dev_${Date.now()}`,
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body, sound: 'default' },
        data,
        priority: priority === 'critical' || priority === 'high' ? 'high' : 'normal',
      }),
    });

    const resData = await response.json();
    const latencyMs = Date.now() - startTime;

    if (resData.success > 0) {
      return {
        status: 'delivered',
        provider: 'fcm',
        providerMessageId: resData.results?.[0]?.message_id || String(resData.multicast_id),
        latencyMs,
      };
    } else {
      return {
        status: 'failed',
        provider: 'fcm',
        error: resData.results?.[0]?.error || 'FCM dispatch failure',
        latencyMs,
      };
    }
  } catch (err) {
    return {
      status: 'failed',
      provider: 'fcm',
      error: err.message,
      latencyMs: Date.now() - startTime,
    };
  }
};
