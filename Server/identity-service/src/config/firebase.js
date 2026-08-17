/**
 * Firebase Identity Toolkit & Admin Helper for Phone OTP Verification
 * Uses Firebase REST API for 10,000 FREE SMS/month globally
 */

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

/**
 * Send real SMS OTP to mobile number via Firebase Identity Toolkit API
 * @param {string} phoneNumber Format: +919876543210
 * @returns {Promise<{ success: boolean, sessionInfo?: string, error?: string }>}
 */
export const sendFirebaseSmsOtp = async (phoneNumber) => {
  if (!FIREBASE_API_KEY) {
    return { success: false, error: 'FIREBASE_API_KEY is not configured in .env' };
  }

  // Format phone number with country code +91 if missing
  let formattedPhone = phoneNumber.replace(/[^0-9+]/g, '');
  if (!formattedPhone.startsWith('+')) {
    const cleanDigits = formattedPhone.replace(/[^0-9]/g, '');
    const mobile = cleanDigits.length === 10 ? cleanDigits : cleanDigits.slice(-10);
    formattedPhone = `+91${mobile}`;
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        recaptchaToken: 'dev-token',
      }),
    });

    const data = await res.json();
    console.log('[Firebase SMS Provider Response]:', data);

    if (data.sessionInfo) {
      return { success: true, sessionInfo: data.sessionInfo };
    }

    return {
      success: false,
      error: data.error?.message || 'Failed to send Firebase SMS OTP.',
    };
  } catch (err) {
    console.error('[Firebase SMS Error]:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Verify SMS OTP code via Firebase Identity Toolkit API
 * @param {string} sessionInfo 
 * @param {string} code 6-digit OTP code
 * @returns {Promise<{ success: boolean, phoneNumber?: string, error?: string }>}
 */
export const verifyFirebaseSmsOtp = async (sessionInfo, code) => {
  if (!FIREBASE_API_KEY) {
    return { success: false, error: 'FIREBASE_API_KEY is not configured in .env' };
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionInfo,
        code,
      }),
    });

    const data = await res.json();
    console.log('[Firebase OTP Verification Response]:', data);

    if (data.phoneNumber || data.idToken) {
      return { success: true, phoneNumber: data.phoneNumber, idToken: data.idToken };
    }

    return {
      success: false,
      error: data.error?.message || 'Invalid Firebase OTP verification code.',
    };
  } catch (err) {
    console.error('[Firebase Verify Error]:', err.message);
    return { success: false, error: err.message };
  }
};
