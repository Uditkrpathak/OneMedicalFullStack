/**
 * Normalizes any Indian / International phone number string to strict E.164 format.
 * E.g. "9876543210" -> "+919876543210"
 * E.g. "+91 98765 43210" -> "+919876543210"
 * E.g. "919876543210" -> "+919876543210"
 *
 * @param {string} phone
 * @returns {string} E.164 normalized phone string
 */
export const normalizeToE164 = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (phone.trim().startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return `+91${digits.slice(-10)}`;
};

export default {
  normalizeToE164,
};
