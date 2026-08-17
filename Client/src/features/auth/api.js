import { API_BASE_URL } from '../../shared/config';
import { normalizeToE164 } from '../../shared/phoneUtils';

const BASE_URL = `${API_BASE_URL}/auth`;
const USERS_URL = `${API_BASE_URL}/users`;

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
    return { success: false, error: { code: 'NON_JSON', message: `Server returned non-JSON response (${response.status}): ${text.slice(0, 80)}` } };
  } catch (err) {
    return { success: false, error: { code: 'PARSE_ERROR', message: err.message } };
  }
};

export const authApi = {
  // ─── Unified Mobile OTP Pipeline (E.164 Normalization) ──────────────
  requestOtp: async (phoneNumber) => {
    const normalizedPhone = normalizeToE164(phoneNumber);
    const response = await fetch(`${BASE_URL}/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: normalizedPhone })
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || data?.message || 'Failed to request OTP');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  verifyOtp: async (emailOrPhone, otp) => {
    const isEmail = typeof emailOrPhone === 'string' && emailOrPhone.includes('@');
    const identifier = isEmail ? emailOrPhone.toLowerCase().trim() : normalizeToE164(emailOrPhone);
    const payload = isEmail ? { email: identifier, otp } : { phoneNumber: identifier, otp };

    const response = await fetch(`${BASE_URL}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) {
      return data;
    }
    const err = new Error(data?.error?.message || data?.message || 'Invalid OTP verification');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  // ─── Staff / Email Authentication ──────────────────────────────────
  loginWithEmailPassword: async (email, password) => {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email?.toLowerCase()?.trim(), password })
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || data?.message || 'Login failed');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  register: async (name, email, password) => {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name?.trim(), email: email?.toLowerCase()?.trim(), password, role: 'patient' })
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || data?.message || 'Registration failed');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  // ─── Token Rotation & Session Revocation ───────────────────────────
  logout: async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await safeJsonParse(response);
    } catch (e) {
      return { success: true };
    }
  },

  logoutAll: async (token) => {
    const response = await fetch(`${BASE_URL}/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || 'Failed to logout from all devices');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  // ─── Profile & Account Lifecycle ────────────────────────────────────
  updateNotificationPreferences: async (prefs, token) => {
    const response = await fetch(`${USERS_URL}/me/notifications`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(prefs)
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || 'Failed to update preferences');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  requestAccountDeletion: async (reason, token) => {
    const response = await fetch(`${USERS_URL}/me/delete-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || 'Failed to submit deletion request');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  },

  getMyProfile: async (token) => {
    const response = await fetch(`${USERS_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await safeJsonParse(response);
    if (response && response.ok && data?.success) return data;
    const err = new Error(data?.error?.message || 'Failed to fetch profile');
    err.code = data?.error?.code || 'API_ERROR';
    throw err;
  }
};

export default authApi;
