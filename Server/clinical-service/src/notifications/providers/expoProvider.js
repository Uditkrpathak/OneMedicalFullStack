import mongoose from 'mongoose';
import NotificationPreference from '../../models/NotificationPreference.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Expo Push Notification Provider
 * Directly dispatches push notifications to Expo Push Tokens (Android, iOS, Web).
 */
export const sendExpoPushNotification = async ({
  tokens,
  title,
  body,
  data = {},
  priority = 'default',
  badge = 1,
  sound = 'default',
  userId,
}) => {
  const startTime = Date.now();
  if (!tokens || tokens.length === 0) {
    return {
      status: 'skipped',
      provider: 'expo',
      message: 'No active Expo push tokens found for recipient.',
      latencyMs: Date.now() - startTime,
    };
  }

  // Filter valid Expo Push tokens (ExponentPushToken[...] or ExpoPushToken[...])
  const validTokens = tokens.filter(t => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')));

  if (validTokens.length === 0) {
    return {
      status: 'skipped',
      provider: 'expo',
      message: 'No tokens matched Expo Push Token format.',
      latencyMs: Date.now() - startTime,
    };
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound,
    title,
    body,
    data,
    badge,
    priority: priority === 'critical' || priority === 'high' ? 'high' : 'default',
    channelId: priority === 'critical' ? 'critical-alerts' : 'default',
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const latencyMs = Date.now() - startTime;

    // Check individual tickets for DeviceNotRegistered and mark inactive
    if (result?.data && Array.isArray(result.data)) {
      result.data.forEach(async (ticket, idx) => {
        if (ticket.status === 'error' && (ticket.details?.error === 'DeviceNotRegistered' || ticket.message?.includes('DeviceNotRegistered'))) {
          const deadToken = validTokens[idx];
          console.warn(`[ExpoProvider] Token expired/unregistered (${deadToken}). Deactivating in user preferences.`);
          try {
            if (mongoose.connection?.readyState === 1 && userId) {
              await NotificationPreference.updateOne(
                { userId, 'deviceTokens.token': deadToken },
                { $set: { 'deviceTokens.$.isActive': false } }
              );
            }
          } catch (e) {
            console.error('[ExpoProvider] Failed to deactivate dead token:', e.message);
          }
        }
      });
    }

    const firstTicket = result?.data?.[0];
    if (firstTicket?.status === 'ok') {
      return {
        status: 'delivered',
        provider: 'expo',
        providerMessageId: firstTicket.id,
        latencyMs,
      };
    } else if (firstTicket?.status === 'error') {
      return {
        status: 'failed',
        provider: 'expo',
        error: firstTicket.message || firstTicket.details?.error || 'Expo push error',
        latencyMs,
      };
    }

    return {
      status: 'delivered',
      provider: 'expo',
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'failed',
      provider: 'expo',
      error: err.message,
      latencyMs: Date.now() - startTime,
    };
  }
};
