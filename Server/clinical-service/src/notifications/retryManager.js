import Notification from '../models/Notification.js';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog.js';
import { sendPushNotification } from './providers/pushProvider.js';
import { sendEmailNotification } from './providers/emailProvider.js';
import { metricsService } from './metricsService.js';

const RETRY_DELAYS_MS = [
  30 * 1000,       // 30 sec
  2 * 60 * 1000,   // 2 min
  10 * 60 * 1000,  // 10 min
  30 * 60 * 1000,  // 30 min
];

/**
 * Schedules or executes retry attempts for notifications with failed channel deliveries.
 */
export const scheduleRetry = async ({
  notification,
  channel,
  attempt = 1,
  recipientEmail,
  deviceTokens = [],
}) => {
  if (attempt > RETRY_DELAYS_MS.length) {
    console.warn(`[RetryManager] Notification ${notification.notificationId} reached max retry limit for channel ${channel}. Marking failed permanently.`);
    metricsService.increment('notifications.failed');
    return;
  }

  const delayMs = RETRY_DELAYS_MS[attempt - 1];
  const nextRetryDate = new Date(Date.now() + delayMs);

  await Notification.updateOne(
    { _id: notification._id },
    {
      $set: {
        retryCount: attempt,
        nextRetryAt: nextRetryDate,
        [`channels.${channel}.status`]: 'pending',
      },
    }
  );

  console.log(`[RetryManager] Scheduled attempt #${attempt} for ${notification.notificationId} (${channel}) in ${delayMs / 1000}s`);

  setTimeout(async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return; // Process or test runner has already closed database connection
      }
      metricsService.increment('notifications.retried');
      console.log(`[RetryManager] Executing retry attempt #${attempt} for ${notification.notificationId}`);

      if (channel === 'push') {
        const pushResult = await sendPushNotification({
          deviceTokens,
          title: notification.title,
          body: notification.message,
          data: notification.data,
          priority: notification.priority,
          userId: notification.recipientId,
        });

        await NotificationDeliveryLog.create({
          notificationId: notification.notificationId,
          eventId: notification.eventId,
          recipientId: notification.recipientId,
          recipientRole: notification.recipientRole,
          channel: 'push',
          provider: pushResult.provider || 'expo',
          attempt: attempt + 1,
          status: pushResult.status,
          providerMessageId: pushResult.providerMessageId,
          error: pushResult.error,
          latencyMs: pushResult.latencyMs,
        });

        if (pushResult.status === 'delivered') {
          await Notification.updateOne(
            { _id: notification._id },
            {
              $set: {
                'channels.push.status': 'delivered',
                'channels.push.deliveredAt': new Date(),
                'channels.push.providerMessageId': pushResult.providerMessageId,
              },
            }
          );
        } else if (notification.priority === 'critical' && recipientEmail) {
          // Critical fallback: If push failed repeatedly on critical alert, send urgent fallback email
          console.warn(`[RetryManager] Push failed on critical alert. Triggering Email Fallback for ${notification.notificationId}`);
          await sendEmailNotification({
            to: recipientEmail,
            subject: `🚨 URGENT CLINICAL FALLBACK: ${notification.title}`,
            text: notification.message,
          });
        }
      }
    } catch (err) {
      console.error(`[RetryManager Error] Retry failed for ${notification.notificationId}:`, err.message);
    }
  }, delayMs);
};
