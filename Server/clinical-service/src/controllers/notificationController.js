import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import NotificationDeliveryLog from '../models/NotificationDeliveryLog.js';
import { metricsService } from '../notifications/metricsService.js';
import { resolveTherapistIds } from '../utils/therapistHelper.js';

/**
 * List in-app notifications for authenticated user
 */
export const listNotifications = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';
    const isAdmin = userRole === 'clinic_admin' || userRole === 'super_admin';

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    const {
      page = 1,
      limit = 20,
      type,
      unreadOnly,
      priority,
    } = req.query;

    const query = {};

    if (isAdmin && req.query.all === 'true') {
      // Admin global view
    } else if (userId) {
      if (userRole === 'therapist') {
        const tIds = await resolveTherapistIds(userId);
        const objIds = tIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(String(id)));
        query.recipientId = { $in: objIds };
      } else {
        query.recipientId = mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(String(userId)) : userId;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
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
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[NotificationController Error] listNotifications:', err.message);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Get unread notification badge count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';
    if (!userId) {
      return res.json({ success: true, count: 0 });
    }

    let recipientFilter = { recipientId: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(String(userId)) : userId };
    if (userRole === 'therapist') {
      const tIds = await resolveTherapistIds(userId);
      const objIds = tIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(String(id)));
      recipientFilter = { recipientId: { $in: objIds } };
    }

    const count = await Notification.countDocuments({
      ...recipientFilter,
      isRead: false,
    });

    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';

    const query = {
      $or: [
        { _id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null },
        { notificationId: id },
      ].filter(Boolean),
    };

    if (userId) {
      if (userRole === 'therapist') {
        const tIds = await resolveTherapistIds(userId);
        const objIds = tIds.filter(tid => mongoose.isValidObjectId(tid)).map(tid => new mongoose.Types.ObjectId(String(tid)));
        query.recipientId = { $in: objIds };
      } else {
        query.recipientId = mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(String(userId)) : userId;
      }
    }

    const updated = await Notification.findOneAndUpdate(
      query,
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }

    const remainingUnread = userId
      ? await Notification.countDocuments({ recipientId: new mongoose.Types.ObjectId(String(userId)), isRead: false })
      : 0;

    return res.json({ success: true, data: updated, unreadCount: remainingUnread });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Mark all notifications for authenticated user as read
 */
export const markAllRead = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    await Notification.updateMany(
      { recipientId: new mongoose.Types.ObjectId(String(userId)), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.json({ success: true, message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete / dismiss notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.userId;

    const query = {
      $or: [
        { _id: mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null },
        { notificationId: id },
      ].filter(Boolean),
    };

    if (userId) {
      query.recipientId = new mongoose.Types.ObjectId(String(userId));
    }

    await Notification.deleteOne(query);
    return res.json({ success: true, message: 'Notification removed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Register mobile device push token (Expo or FCM)
 */
export const registerDeviceToken = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';
    const { token, provider = 'expo', platform = 'android', deviceId, appVersion } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }
    if (!token) {
      return res.status(400).json({ success: false, error: { message: 'Device push token is required' } });
    }

    let pref = await NotificationPreference.findOne({ userId });
    if (!pref) {
      pref = new NotificationPreference({
        userId: new mongoose.Types.ObjectId(String(userId)),
        userRole,
        deviceTokens: [],
      });
    }

    // Check if token already exists in deviceTokens list
    const existingIndex = pref.deviceTokens.findIndex(d => d.token === token);
    if (existingIndex >= 0) {
      pref.deviceTokens[existingIndex].lastUsed = new Date();
      pref.deviceTokens[existingIndex].isActive = true;
      if (deviceId) pref.deviceTokens[existingIndex].deviceId = deviceId;
      if (appVersion) pref.deviceTokens[existingIndex].appVersion = appVersion;
    } else {
      pref.deviceTokens.push({
        token,
        provider,
        platform,
        deviceId,
        appVersion,
        lastUsed: new Date(),
        isActive: true,
      });
    }

    await pref.save();
    return res.json({ success: true, message: 'Device push token registered successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Get notification preferences & quiet hours
 */
export const getPreferences = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    let pref = await NotificationPreference.findOne({ userId }).lean();
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
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update notification preferences & quiet hours
 */
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';
    const { channels, categories, quietHours } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }

    let pref = await NotificationPreference.findOne({ userId });
    if (!pref) {
      pref = new NotificationPreference({
        userId: new mongoose.Types.ObjectId(String(userId)),
        userRole,
      });
    }

    if (channels) pref.channels = { ...pref.channels.toObject(), ...channels };
    if (categories) pref.categories = { ...pref.categories.toObject(), ...categories };
    if (quietHours) pref.quietHours = { ...pref.quietHours.toObject(), ...quietHours };

    await pref.save();
    return res.json({ success: true, data: pref });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Admin: Get Notification Delivery Logs
 */
export const getDeliveryLogs = async (req, res) => {
  try {
    const { notificationId, channel, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (notificationId) query.notificationId = notificationId;
    if (channel) query.channel = channel;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      NotificationDeliveryLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      NotificationDeliveryLog.countDocuments(query),
    ]);

    return res.json({ success: true, data: logs, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Admin: Get Notification Metrics & Latency Observability
 */
export const getNotificationMetrics = async (req, res) => {
  try {
    const metrics = metricsService.getMetrics();
    return res.json({ success: true, data: metrics });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
};
