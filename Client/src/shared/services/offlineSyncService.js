import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const MUTATION_QUEUE_KEY = '@onemedical_offline_mutation_queue';

export const offlineSyncService = {
  /**
   * Queue any write mutation locally when network is offline or service unavailable
   * @param {string} endpoint e.g., '/appointments/book', '/sessions', '/emergency-triage'
   * @param {string} method 'POST' | 'PUT' | 'DELETE' | 'PATCH'
   * @param {object} body payload
   * @param {object} metadata extra context (e.g. actionType, description)
   */
  async queueMutation(endpoint, method = 'POST', body = {}, metadata = {}) {
    try {
      const existingStr = await AsyncStorage.getItem(MUTATION_QUEUE_KEY);
      const queue = existingStr ? JSON.parse(existingStr) : [];

      const mutationId = 'MUT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const payload = {
        mutationId,
        endpoint,
        method,
        body,
        metadata: {
          queuedAt: new Date().toISOString(),
          ...metadata,
        },
        attempts: 0,
      };

      queue.push(payload);
      await AsyncStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
      console.log(`[OfflineSync] Queued local write mutation [${method} ${endpoint}] (Pending: ${queue.length})`);
      return payload;
    } catch (err) {
      console.error('[OfflineSync] Failed to queue mutation:', err);
      throw err;
    }
  },

  /**
   * Queue helper specifically for session logs
   */
  async queueSessionLog(sessionData) {
    return this.queueMutation('/sessions', 'POST', sessionData, { actionType: 'LOG_SESSION', description: 'Daily Recovery Session' });
  },

  /**
   * Queue helper for appointment bookings
   */
  async queueAppointmentBooking(bookingData) {
    return this.queueMutation('/appointments/book', 'POST', bookingData, { actionType: 'BOOK_APPOINTMENT', description: 'Doctor Appointment Booking' });
  },

  /**
   * Attempt to sync all pending local mutations with the backend
   */
  async syncPendingQueue(token = null) {
    try {
      const queueStr = await AsyncStorage.getItem(MUTATION_QUEUE_KEY);
      if (!queueStr) return { syncedCount: 0, remainingCount: 0 };

      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 };

      console.log(`[OfflineSync] Attempting sync for ${queue.length} pending mutation(s)...`);
      const remaining = [];
      let syncedCount = 0;

      for (const item of queue) {
        try {
          const url = `${API_BASE_URL}${item.endpoint}`;
          const headers = {
            'Content-Type': 'application/json',
          };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(url, {
            method: item.method,
            headers,
            body: JSON.stringify(item.body),
          });

          if (res.ok) {
            syncedCount++;
            console.log(`[OfflineSync] Successfully synced mutation [${item.mutationId}] -> ${item.endpoint}`);
          } else {
            item.attempts = (item.attempts || 0) + 1;
            console.warn(`[OfflineSync] Failed sync [${item.mutationId}], status: ${res.status}`);
            remaining.push(item);
          }
        } catch (err) {
          item.attempts = (item.attempts || 0) + 1;
          console.warn(`[OfflineSync] Network error syncing [${item.mutationId}]: ${err.message}`);
          remaining.push(item);
        }
      }

      await AsyncStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(remaining));
      console.log(`[OfflineSync] Sync complete. Synced: ${syncedCount}, Remaining: ${remaining.length}`);
      return { syncedCount, remainingCount: remaining.length };
    } catch (err) {
      console.error('[OfflineSync] Error executing queue sync:', err);
      return { syncedCount: 0, remainingCount: -1 };
    }
  },

  /**
   * Get total count of pending mutations
   */
  async getPendingCount() {
    try {
      const queueStr = await AsyncStorage.getItem(MUTATION_QUEUE_KEY);
      if (!queueStr) return 0;
      const queue = JSON.parse(queueStr);
      return queue.length;
    } catch {
      return 0;
    }
  },

  /**
   * Get full list of pending queued items (for UI status display)
   */
  async getPendingQueue() {
    try {
      const queueStr = await AsyncStorage.getItem(MUTATION_QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch {
      return [];
    }
  }
};
