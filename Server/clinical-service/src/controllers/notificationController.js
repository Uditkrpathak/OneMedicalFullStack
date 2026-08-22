import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog.js';
import { metricsService } from '../notifications/metricsService.js';
import { resolveTherapistIds } from '../utils/therapistHelper.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const toObjectId = (id) => {
  if (!id) return null;
  return mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null;
};

export const getRecipientFilter = async (userId, userRole) => {
  if (!userId) return null;
  if (userRole === 'therapist') {
    const tIds = await resolveTherapistIds(userId);
    const validObjIds = tIds
      .filter(id => mongoose.isValidObjectId(id))
      .map(id => new mongoose.Types.ObjectId(String(id)));

    if (validObjIds.length > 0) {
      return { recipientId: { $in: validObjIds } };
    }
  }

  const objId = toObjectId(userId);
  return { recipientId: objId || String(userId) };
};

const ALLOWED_ADMIN_ROLES = ['clinic_admin', 'super_admin', 'admin'];

export const isAuthorizedAdmin = (userRole) => {
  return ALLOWED_ADMIN_ROLES.includes(userRole);
};

// ─── 1. LIST NOTIFICATIONS ───────────────────────────────────────────────────
export const listNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const isAdmin = isAuthorizedAdmin(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const {
      page = 1,
      limit = 20,
      type,
      unreadOnly,
      priority,
      all
    } = req.query;

    const query = {};

    if (all === 'true') {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin privileges required for global notifications view.' } });
      }
      // Admin global view (no recipientId filter)
    } else {
      const recipientFilter = await getRecipientFilter(userId, userRole);
      if (recipientFilter) {
        Object.assign(query, recipientFilter);
      }
    }

    if (type && type !== 'all') {
      query.type = type;
    }
    if (unreadOnly === 'true' || unreadOnly === true) {
      query.isRead = false;
    }
    if (priority) {
      query.priority = priority;
    }

    const pageNum = Math.max(1, Math.min(Number.parseInt(page, 10) || 1, 10000));
    const limitNum = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 100));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      userId ? Notification.countDocuments({ ...query, isRead: false }) : 0,
    ]);

    return res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[NotificationController Error] listNotifications:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list notifications' } });
  }
};

// ─── 2. GET UNREAD COUNT ──────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const recipientFilter = await getRecipientFilter(userId, userRole);
    const count = await Notification.countDocuments({
      ...recipientFilter,
      isRead: false,
    });

    return res.json({ success: true, count });
  } catch (err) {
    console.error('[NotificationController Error] getUnreadCount:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get unread count' } });
  }
};

// ─── 3. MARK NOTIFICATION READ ────────────────────────────────────────────────
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const isAdmin = isAuthorizedAdmin(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const objId = toObjectId(id);
    const query = {
      $or: [
        { _id: objId || null },
        { notificationId: id },
      ].filter(Boolean),
    };

    const recipientFilter = await getRecipientFilter(userId, userRole);
    if (!isAdmin && recipientFilter) {
      Object.assign(query, recipientFilter);
    }

    const updated = await Notification.findOneAndUpdate(
      query,
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }

    const remainingUnread = recipientFilter
      ? await Notification.countDocuments({ ...recipientFilter, isRead: false })
      : 0;

    return res.json({ success: true, data: updated, unreadCount: remainingUnread });
  } catch (err) {
    console.error('[NotificationController Error] markNotificationRead:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' } });
  }
};

// ─── 4. MARK ALL READ ─────────────────────────────────────────────────────────
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const recipientFilter = await getRecipientFilter(userId, userRole);
    await Notification.updateMany(
      { ...recipientFilter, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.json({ success: true, message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    console.error('[NotificationController Error] markAllRead:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read' } });
  }
};

// ─── 5. DELETE NOTIFICATION ───────────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const isAdmin = isAuthorizedAdmin(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const objId = toObjectId(id);
    const query = {
      $or: [
        { _id: objId || null },
        { notificationId: id },
      ].filter(Boolean),
    };

    const recipientFilter = await getRecipientFilter(userId, userRole);
    if (!isAdmin && recipientFilter) {
      Object.assign(query, recipientFilter);
    }

    const deleted = await Notification.deleteOne(query);
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }

    return res.json({ success: true, message: 'Notification removed' });
  } catch (err) {
    console.error('[NotificationController Error] deleteNotification:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete notification' } });
  }
};

// ─── 6. REGISTER PUSH TOKEN (VALIDATED PROVIDER/PLATFORM) ─────────────────────
export const registerDeviceToken = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const { token, provider = 'expo', platform = 'android', deviceId, appVersion } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (!token || typeof token !== 'string' || token.trim().length === 0 || token.length > 500) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid device push token string is required (max 500 chars).' } });
    }

    const normalizedProvider = String(provider).toLowerCase();
    const normalizedPlatform = String(platform).toLowerCase();

    if (!['expo', 'fcm'].includes(normalizedProvider)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PROVIDER', message: 'Provider must be expo or fcm.' } });
    }
    if (!['android', 'ios'].includes(normalizedPlatform)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLATFORM', message: 'Platform must be android or ios.' } });
    }

    const userObjId = toObjectId(userId);
    let pref = await NotificationPreference.findOne({ userId: userObjId || String(userId) });
    if (!pref) {
      pref = new NotificationPreference({
        userId: userObjId || String(userId),
        userRole,
        deviceTokens: [],
      });
    }

    const existingIndex = pref.deviceTokens.findIndex(d => d.token === token);
    if (existingIndex >= 0) {
      pref.deviceTokens[existingIndex].lastUsed = new Date();
      pref.deviceTokens[existingIndex].isActive = true;
      if (deviceId) pref.deviceTokens[existingIndex].deviceId = String(deviceId).slice(0, 100);
      if (appVersion) pref.deviceTokens[existingIndex].appVersion = String(appVersion).slice(0, 50);
    } else {
      pref.deviceTokens.push({
        token,
        provider: normalizedProvider,
        platform: normalizedPlatform,
        deviceId: deviceId ? String(deviceId).slice(0, 100) : undefined,
        appVersion: appVersion ? String(appVersion).slice(0, 50) : undefined,
        lastUsed: new Date(),
        isActive: true,
      });
    }

    await pref.save();
    return res.json({ success: true, message: 'Device push token registered successfully' });
  } catch (err) {
    console.error('[NotificationController Error] registerDeviceToken:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register device token' } });
  }
};

// ─── 7. GET PREFERENCES ───────────────────────────────────────────────────────
export const getPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const userObjId = toObjectId(userId);
    let pref = await NotificationPreference.findOne({ userId: userObjId || String(userId) }).lean();
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
      };
    }

    return res.json({ success: true, data: pref });
  } catch (err) {
    console.error('[NotificationController Error] getPreferences:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get preferences' } });
  }
};

// ─── 8. UPDATE PREFERENCES (WHITELIST VALIDATED) ──────────────────────────────
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const { channels, categories, quietHours } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const userObjId = toObjectId(userId);
    let pref = await NotificationPreference.findOne({ userId: userObjId || String(userId) });
    if (!pref) {
      pref = new NotificationPreference({
        userId: userObjId || String(userId),
        userRole,
      });
    }

    // Whitelist channels
    if (channels && typeof channels === 'object') {
      const allowedChannels = ['inApp', 'push', 'email', 'sms'];
      for (const ch of allowedChannels) {
        if (typeof channels[ch] === 'boolean') {
          pref.channels[ch] = channels[ch];
        }
      }
    }

    // Whitelist categories
    if (categories && typeof categories === 'object') {
      const allowedCategories = [
        'appointmentReminders',
        'appointmentUpdates',
        'paymentUpdates',
        'recoveryUpdates',
        'clinicalAlerts',
        'chatMessages',
        'marketing'
      ];
      for (const cat of allowedCategories) {
        if (typeof categories[cat] === 'boolean') {
          pref.categories[cat] = categories[cat];
        }
      }
    }

    // Validate quiet hours format (HH:mm)
    if (quietHours && typeof quietHours === 'object') {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (typeof quietHours.enabled === 'boolean') {
        pref.quietHours.enabled = quietHours.enabled;
      }
      if (typeof quietHours.start === 'string' && timeRegex.test(quietHours.start)) {
        pref.quietHours.start = quietHours.start;
      }
      if (typeof quietHours.end === 'string' && timeRegex.test(quietHours.end)) {
        pref.quietHours.end = quietHours.end;
      }
    }

    await pref.save();
    return res.json({ success: true, data: pref });
  } catch (err) {
    console.error('[NotificationController Error] updatePreferences:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences' } });
  }
};

// ─── 9. ADMIN: DELIVERY LOGS (RBAC ENFORCED) ──────────────────────────────────
export const getDeliveryLogs = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAuthorizedAdmin(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { notificationId, channel, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (notificationId) query.notificationId = notificationId;
    if (channel) query.channel = channel;
    if (status) query.status = status;

    const pageNum = Math.max(1, Math.min(Number.parseInt(page, 10) || 1, 10000));
    const limitNum = Math.max(1, Math.min(Number.parseInt(limit, 10) || 50, 100));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      NotificationDeliveryLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      NotificationDeliveryLog.countDocuments(query),
    ]);

    return res.json({ success: true, data: logs, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error('[NotificationController Error] getDeliveryLogs:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get delivery logs' } });
  }
};

// ─── 10. ADMIN: NOTIFICATION METRICS (RBAC ENFORCED) ──────────────────────────
export const getNotificationMetrics = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAuthorizedAdmin(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const metrics = metricsService.getMetrics();
    return res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('[NotificationController Error] getNotificationMetrics:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get notification metrics' } });
  }
};
