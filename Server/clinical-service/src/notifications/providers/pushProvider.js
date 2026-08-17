import { sendExpoPushNotification } from './expoProvider.js';
import { sendFcmNotification } from './fcmProvider.js';

/**
 * Unified Push Provider Router
 * Segregates device tokens into Expo and FCM buckets and dispatches to appropriate provider.
 */
export const sendPushNotification = async ({
  deviceTokens = [],
  title,
  body,
  data = {},
  priority = 'normal',
  userId,
}) => {
  const activeTokens = deviceTokens.filter(t => t.isActive !== false);

  if (activeTokens.length === 0) {
    return {
      status: 'skipped',
      provider: 'expo',
      message: 'No active device tokens registered.',
      latencyMs: 0,
    };
  }

  const expoTokens = activeTokens
    .filter(t => t.provider === 'expo' || t.token.startsWith('Expo') || t.token.startsWith('Exponent'))
    .map(t => t.token);

  const fcmTokens = activeTokens
    .filter(t => t.provider === 'fcm' && !t.token.startsWith('Expo') && !t.token.startsWith('Exponent'))
    .map(t => t.token);

  // Dispatch Expo tokens
  if (expoTokens.length > 0) {
    return await sendExpoPushNotification({
      tokens: expoTokens,
      title,
      body,
      data,
      priority,
      userId,
    });
  }

  // Dispatch FCM tokens
  if (fcmTokens.length > 0) {
    return await sendFcmNotification({
      tokens: fcmTokens,
      title,
      body,
      data,
      priority,
    });
  }

  return {
    status: 'skipped',
    provider: 'expo',
    message: 'No supported tokens found.',
    latencyMs: 0,
  };
};
