import { startNotificationWorker } from './notificationWorker.js';
import { startNotificationScheduler } from './scheduler.js';
import { processNotificationEvent } from './notificationManager.js';
import { metricsService } from './metricsService.js';
import { EVENT_TYPES } from './notificationEvents.js';

/**
 * Initializes notification worker and reminder scheduler on service boot
 */
export const initNotifications = async () => {
  console.log('[Notification System] Initializing complete multi-channel notification engine...');
  await startNotificationWorker();
  startNotificationScheduler();
};

export {
  processNotificationEvent,
  metricsService,
  EVENT_TYPES,
};
