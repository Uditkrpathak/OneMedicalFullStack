import Notification from '../models/Notification.js';

/**
 * Intelligent Aggregation Engine:
 * Prevents notification flooding by grouping repetitive events (e.g. rapid chat messages or recovery milestones).
 */
export const checkAndAggregateNotification = async ({
  recipientId,
  event,
  data = {},
  senderName = 'Someone',
}) => {
  if (event === 'chat.message_received') {
    const aggregationKey = `chat:${data.conversationId || data.senderId}:${recipientId}`;
    const windowMs = 60 * 1000; // 1-minute aggregation window

    const existingNotif = await Notification.findOne({
      recipientId,
      aggregationKey,
      isRead: false,
      createdAt: { $gte: new Date(Date.now() - windowMs) },
    }).sort({ createdAt: -1 });

    if (existingNotif) {
      const newCount = (existingNotif.aggregationCount || 1) + 1;
      existingNotif.aggregationCount = newCount;
      existingNotif.title = `New Messages (${newCount})`;
      existingNotif.message = `${senderName} sent you ${newCount} new messages.`;
      existingNotif.data = { ...existingNotif.data, ...data };
      await existingNotif.save();

      return {
        aggregated: true,
        notification: existingNotif,
      };
    }

    return {
      aggregated: false,
      aggregationKey,
    };
  }

  return {
    aggregated: false,
    aggregationKey: null,
  };
};
