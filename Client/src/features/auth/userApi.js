import { API_BASE_URL } from '../../shared/config';

const USER_URL = `${API_BASE_URL}/users`;

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

export const userApi = {
  getMyProfile: async (token) => {
    const response = await fetch(`${USER_URL}/me`, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to fetch user profile.');
  },

  updatePatientProfile: async (token, profileData) => {
    const response = await fetch(`${USER_URL}/patients/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(profileData)
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to update patient profile.');
  },

  updateTherapistProfile: async (token, profileData) => {
    const response = await fetch(`${USER_URL}/therapists/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(profileData)
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to update therapist profile.');
  },

  getSavedTherapists: async (token) => {
    const response = await fetch(`${USER_URL}/me/saved-therapists`, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to fetch saved specialists.');
  },

  saveTherapist: async (therapistId, token) => {
    const response = await fetch(`${USER_URL}/me/saved-therapists/${therapistId}`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to bookmark specialist.');
  },

  removeSavedTherapist: async (therapistId, token) => {
    const response = await fetch(`${USER_URL}/me/saved-therapists/${therapistId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to remove saved specialist.');
  },

  getNotifications: async (token) => {
    const response = await fetch(`${USER_URL}/me/notifications`, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to fetch notification preferences.');
  },

  updateNotifications: async (preferences, token) => {
    const response = await fetch(`${USER_URL}/me/notifications`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(preferences)
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to update notifications.');
  },

  requestAccountDeletion: async (reason, token) => {
    const response = await fetch(`${USER_URL}/me/delete-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ reason })
    });
    const data = await safeJsonParse(response);
    if (response.ok && data?.success !== false) return data;
    throw new Error(data?.error?.message || 'Failed to submit account deletion request.');
  }
};

export default userApi;
