import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification.js';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog.js';
import { EVENT_POLICIES } from './notificationEvents.js';
import { resolveRecipientChannels } from './preferenceService.js';
import { checkAndAggregateNotification } from './aggregationService.js';
import { renderNotificationContent } from './templateService.js';
import { sendPushNotification } from './providers/pushProvider.js';
import { sendEmailNotification } from './providers/emailProvider.js';
import { sendSmsNotification } from './providers/smsProvider.js';
import { sendRealtimeNotification } from './providers/realtimeProvider.js';
import { scheduleRetry } from './retryManager.js';
import { metricsService } from './metricsService.js';

/**
 * Fetches basic contact details (email, phone, name) for a user from Identity Service or headers
 */
const fetchUserDetails = async (userId) => {
  const identityUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
  try {
    const res = await fetch(`${identityUrl}/api/v1/users/internal/users?ids=${userId}`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
    });
    if (res.ok) {
      const data = await res.json();
      return data?.data?.[0] || null;
    }
  } catch (err) {
    // Non-fatal if offline
  }
  return null;
};

/**
 * Core Notification Processing Pipeline
 */
export const processNotificationEvent = async (eventEnvelope) => {
  const startTime = Date.now();
  const {
    eventId = `evt_${Date.now()}_${uuidv4().substring(0, 8)}`,
    event,
    priority: eventPriority,
    recipients = [],
    data = {},
  } = eventEnvelope;

  if (!event || !Array.isArray(recipients) || recipients.length === 0) {
    console.warn('[NotificationManager] Invalid event envelope discarded:', eventEnvelope);
    return;
  }

  const policy = EVENT_POLICIES[event];
  const priority = eventPriority || policy?.priority || 'normal';
  const retentionDays = policy?.retentionDays || (priority === 'critical' ? 365 : priority === 'low' ? 30 : 90);
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  console.log(`\n[NotificationManager] Processing Event: ${event} (${eventId}) | Priority: ${priority} | Recipients: ${recipients.length}`);
  metricsService.increment('notifications.created', recipients.length);

  for (const recipient of recipients) {
    const recipientId = recipient.recipientId || recipient.id || recipient._id || recipient.userId;
    const recipientRole = recipient.role || 'patient';

    if (!recipientId) continue;

    try {
      // 1. Idempotency check: Skip if already processed for this recipient
      const alreadyProcessed = await Notification.findOne({ eventId, recipientId });
      if (alreadyProcessed) {
        console.log(`[NotificationManager] Idempotent skip: ${eventId} already delivered to ${recipientId}`);
        continue;
      }

      // 2. Intelligent Aggregation check (e.g. rapid chat messages)
      const aggResult = await checkAndAggregateNotification({
        recipientId,
        event,
        data,
        senderName: data.senderName,
      });

      if (aggResult.aggregated) {
        console.log(`[NotificationManager] Notification aggregated into #${aggResult.notification.notificationId}`);
        // Send realtime socket update for aggregated count
        await sendRealtimeNotification({
          userId: recipientId,
          notification: aggResult.notification,
        });
        continue;
      }

      // 3. Generate unique notification ID
      const notificationId = `notif_${recipientRole.substring(0, 4)}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // 4. Resolve Channels & User Preferences
      const channelResolution = await resolveRecipientChannels({
        userId: recipientId,
        userRole: recipientRole,
        event,
        priority,
      });

      // 5. Fetch Recipient Details (Email, Phone)
      const userDetails = await fetchUserDetails(recipientId);
      const recipientEmail = recipient.email || userDetails?.email || data.email;
      const recipientPhone = recipient.phoneNumber || userDetails?.phoneNumber || data.phone;
      const recipientName = recipient.name || userDetails?.name || (recipientRole === 'therapist' ? 'Therapist' : 'Patient');

      // 6. Render Content & Templates
      const content = renderNotificationContent({
        event,
        recipientRole,
        data: {
          ...data,
          recipientName,
          email: recipientEmail,
          phone: recipientPhone,
        },
        priority,
      });

      // 7. Initialize Notification DB Record
      const notification = new Notification({
        notificationId,
        eventId,
        recipientId: new mongoose.Types.ObjectId(String(recipientId)),
        recipientRole,
        event,
        type: policy?.type || 'system',
        priority,
        title: content.title,
        message: content.message,
        data: {
          route: data.route || (data.appointmentId ? `/appointments/${data.appointmentId}` : '/notifications'),
          appointmentId: data.appointmentId,
          callId: data.callId,
          conversationId: data.conversationId,
          patientId: data.patientId,
          therapistId: data.therapistId,
          extra: data,
        },
        channels: {
          inApp: {
            enabled: channelResolution.inApp.enabled,
            status: channelResolution.inApp.enabled ? 'delivered' : 'skipped',
            deliveredAt: channelResolution.inApp.enabled ? new Date() : null,
          },
          push: {
            enabled: channelResolution.push.enabled,
            status: channelResolution.push.enabled ? 'pending' : (channelResolution.push.quietHoursDelayed ? 'skipped' : 'skipped'),
          },
          email: {
            enabled: channelResolution.email.enabled,
            status: channelResolution.email.enabled ? 'pending' : 'skipped',
          },
          sms: {
            enabled: channelResolution.sms.enabled,
            status: channelResolution.sms.enabled ? 'pending' : 'skipped',
          },
        },
        aggregationKey: aggResult.aggregationKey,
        expiresAt,
      });

      // Save initial record to DB
      await notification.save();

      // 8. Execute Multi-Channel Delivery
      const deliveryPromises = [];

      // A. Push Notification
      if (channelResolution.push.enabled) {
        deliveryPromises.push(
          sendPushNotification({
            deviceTokens: channelResolution.deviceTokens,
            title: content.title,
            body: content.message,
            data: {
              notificationId,
              route: notification.data?.route,
              appointmentId: data.appointmentId,
              priority,
            },
            priority,
            userId: recipientId,
          }).then(async (res) => {
            notification.channels.push.status = res.status;
            notification.channels.push.provider = res.provider;
            notification.channels.push.providerMessageId = res.providerMessageId;
            notification.channels.push.error = res.error;
            notification.channels.push.latencyMs = res.latencyMs;
            if (res.status === 'delivered') notification.channels.push.deliveredAt = new Date();

            await NotificationDeliveryLog.create({
              notificationId,
              eventId,
              recipientId,
              recipientRole,
              channel: 'push',
              provider: res.provider || 'expo',
              attempt: 1,
              status: res.status,
              providerMessageId: res.providerMessageId,
              error: res.error,
              latencyMs: res.latencyMs,
            });

            if (res.status === 'delivered') metricsService.increment('push.sent');
            if (res.status === 'failed') {
              metricsService.increment('push.failed');
              // Trigger retry
              scheduleRetry({
                notification,
                channel: 'push',
                attempt: 1,
                recipientEmail,
                deviceTokens: channelResolution.deviceTokens,
              });
            }
          })
        );
      }

      // B. Email Notification
      if (channelResolution.email.enabled && content.email && recipientEmail) {
        deliveryPromises.push(
          sendEmailNotification({
            to: recipientEmail,
            subject: content.email.subject || content.title,
            text: content.email.text || content.message,
            html: content.email.html,
          }).then(async (res) => {
            notification.channels.email.status = res.status;
            notification.channels.email.provider = res.provider;
            notification.channels.email.providerMessageId = res.providerMessageId;
            notification.channels.email.error = res.error;
            notification.channels.email.latencyMs = res.latencyMs;
            if (res.status === 'sent' || res.status === 'logged_dev') notification.channels.email.sentAt = new Date();

            await NotificationDeliveryLog.create({
              notificationId,
              eventId,
              recipientId,
              recipientRole,
              channel: 'email',
              provider: res.provider || 'nodemailer',
              attempt: 1,
              status: res.status,
              providerMessageId: res.providerMessageId,
              error: res.error,
              latencyMs: res.latencyMs,
            });

            if (res.status === 'sent' || res.status === 'logged_dev') metricsService.increment('email.sent');
            if (res.status === 'failed') metricsService.increment('email.failed');
          })
        );
      }

      // C. SMS Notification
      if (channelResolution.sms.enabled && content.sms && recipientPhone) {
        deliveryPromises.push(
          sendSmsNotification({
            phone: recipientPhone,
            message: content.sms,
          }).then(async (res) => {
            notification.channels.sms.status = res.status;
            notification.channels.sms.provider = res.provider;
            notification.channels.sms.providerMessageId = res.providerMessageId;
            notification.channels.sms.latencyMs = res.latencyMs;
            if (res.status === 'sent' || res.status === 'logged_dev') notification.channels.sms.sentAt = new Date();

            await NotificationDeliveryLog.create({
              notificationId,
              eventId,
              recipientId,
              recipientRole,
              channel: 'sms',
              provider: res.provider || 'twilio',
              attempt: 1,
              status: res.status,
              providerMessageId: res.providerMessageId,
              error: res.error,
              latencyMs: res.latencyMs,
            });

            if (res.status === 'sent' || res.status === 'logged_dev') metricsService.increment('sms.sent');
            if (res.status === 'failed') metricsService.increment('sms.failed');
          })
        );
      }

      // D. Real-Time In-App Socket.IO Broadcast
      const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });
      deliveryPromises.push(
        sendRealtimeNotification({
          userId: recipientId,
          notification,
          unreadCount,
        }).then(() => metricsService.increment('realtime.emitted'))
      );

      // Wait for all channel dispatches
      await Promise.allSettled(deliveryPromises);

      // Update final channel state in Notification document
      await notification.save();
      metricsService.increment('notifications.delivered');

      const totalLatencyMs = Date.now() - startTime;
      metricsService.recordLatency(totalLatencyMs);
      metricsService.recordTrace({
        eventId,
        event,
        notificationId,
        recipientId,
        recipientRole,
        priority,
        channels: {
          inApp: notification.channels.inApp.status,
          push: notification.channels.push.status,
          email: notification.channels.email.status,
          sms: notification.channels.sms.status,
        },
        latencyMs: totalLatencyMs,
      });

      console.log(`[NotificationManager] Completed ${notificationId} in ${totalLatencyMs}ms (InApp: ${notification.channels.inApp.status}, Push: ${notification.channels.push.status}, Email: ${notification.channels.email.status})`);
    } catch (err) {
      console.error(`[NotificationManager Error] Recipient ${recipientId} processing error:`, err.message);
      metricsService.increment('notifications.failed');
    }
  }
};

export default {
  processEvent: processNotificationEvent,
  processNotificationEvent,
};
