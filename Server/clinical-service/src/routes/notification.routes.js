import express from 'express';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  registerDeviceToken,
  getPreferences,
  updatePreferences,
  getDeliveryLogs,
  getNotificationMetrics,
} from '../controllers/notificationController.js';

const router = express.Router();

// User notification endpoints
router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

// Push token registration
router.post('/device-token', registerDeviceToken);

// User notification preferences & quiet hours
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);

// Admin delivery observability & metrics
router.get('/admin/delivery-logs', getDeliveryLogs);
router.get('/admin/metrics', getNotificationMetrics);

export default router;
