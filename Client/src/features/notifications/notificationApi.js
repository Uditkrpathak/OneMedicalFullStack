import { API_BASE_URL } from '../../shared/config';

const NOTIFICATIONS_URL = `${API_BASE_URL}/notifications`;

const safeJsonParse = async (response) => {
  if (!response) return null;
  try {
    const contentType = response?.headers?.get
      ? response.headers.get('content-type')
      : (response?.headers?.['content-type'] || response?.headers?.['Content-Type']);
    if (contentType && typeof contentType === 'string' && contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    return { success: false, error: { message: `Server (${response.status}): ${text.slice(0, 100)}` } };
  } catch (err) {
    return { success: false, error: { message: err.message } };
  }
};

export const notificationApi = {
  getNotifications: async (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${NOTIFICATIONS_URL}?${query}` : NOTIFICATIONS_URL;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to fetch notifications.');
  },

  getUnreadCount: async (token) => {
    const response = await fetch(`${NOTIFICATIONS_URL}/unread-count`, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data?.count || 0;
    return 0;
  },

  markRead: async (id, token) => {
    const response = await fetch(`${NOTIFICATIONS_URL}/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to mark notification as read.');
  },

  markAllRead: async (token) => {
    const response = await fetch(`${NOTIFICATIONS_URL}/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to mark all as read.');
  },

  registerDeviceToken: async (tokenData, token) => {
    const response = await fetch(`${NOTIFICATIONS_URL}/device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(tokenData),
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to register push token.');
  },
};
