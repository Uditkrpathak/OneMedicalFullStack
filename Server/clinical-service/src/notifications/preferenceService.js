import NotificationPreference from '../models/NotificationPreference.js';
import { EVENT_POLICIES } from './notificationEvents.js';

/**
 * Maps an event type or domain to the user's category key in NotificationPreference
 */
const mapEventToCategory = (event, type) => {
  if (event.includes('reminder')) return 'appointmentReminders';
  if (event.startsWith('appointment.')) return 'appointmentUpdates';
  if (event.startsWith('payment.')) return 'paymentUpdates';
  if (event.startsWith('clinical.high_pain') || event.startsWith('clinical.pain')) return 'clinicalAlerts';
  if (event.startsWith('clinical.') || type === 'recovery') return 'recoveryUpdates';
  if (event.startsWith('chat.')) return 'chatMessages';
  if (event.startsWith('marketing')) return 'marketing';
  return 'appointmentUpdates';
};

/**
 * Checks if the current local time falls within configured quiet hours
 */
export const isInQuietHours = (quietHours) => {
  if (!quietHours?.enabled || !quietHours.start || !quietHours.end) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Single-day span e.g. 13:00 to 15:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight span e.g. 22:00 to 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
};

/**
 * Resolves final active channels for an event and recipient taking into account:
 * 1. Central Event Policy
 * 2. Recipient Role
 * 3. User's Personal Channel & Category Preferences
 * 4. Quiet Hours (Delayed or Skipped for non-critical)
 * 5. CRITICAL PRIORITY BYPASS (Safety-critical clinical alerts override quiet hours & opt-outs)
 */
export const resolveRecipientChannels = async ({
  userId,
  userRole,
  event,
  priority = 'normal',
}) => {
  const policy = EVENT_POLICIES[event];
  const rolePolicy = policy?.channels?.[userRole] || policy?.channels?.patient || { inApp: true, push: false, email: false, sms: false };

  // Fetch or construct default preference
  let pref = null;
  try {
    pref = await NotificationPreference.findOne({ userId });
  } catch (err) {
    console.warn(`[PreferenceService] Failed to load preferences for user ${userId}:`, err.message);
  }

  if (!pref) {
    pref = {
      channels: { inApp: true, push: true, email: true, sms: false },
      categories: {
        appointmentReminders: true,
        appointmentUpdates: true,
        paymentUpdates: true,
        recoveryUpdates: true,
        clinicalAlerts: true,
        chatMessages: true,
        marketing: false,
      },
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
      deviceTokens: [],
    };
  }

  const isCritical = priority === 'critical';
  const categoryKey = mapEventToCategory(event, policy?.type);
  const categoryAllowed = isCritical || (pref.categories?.[categoryKey] !== false);
  const quietHoursActive = !isCritical && isInQuietHours(pref.quietHours);

  const resolved = {
    inApp: {
      enabled: Boolean(rolePolicy.inApp && (pref.channels?.inApp !== false) && categoryAllowed),
    },
    push: {
      enabled: Boolean(rolePolicy.push && (isCritical || pref.channels?.push !== false) && categoryAllowed && !quietHoursActive),
      quietHoursDelayed: Boolean(rolePolicy.push && quietHoursActive),
    },
    email: {
      enabled: Boolean(rolePolicy.email && (isCritical || pref.channels?.email !== false) && categoryAllowed && !quietHoursActive),
      quietHoursDelayed: Boolean(rolePolicy.email && quietHoursActive),
    },
    sms: {
      enabled: Boolean(rolePolicy.sms && (isCritical || pref.channels?.sms === true) && categoryAllowed),
    },
    deviceTokens: (pref.deviceTokens || []).filter(t => t.isActive !== false),
    quietHoursActive,
    isCriticalBypass: isCritical,
  };

  return resolved;
};
