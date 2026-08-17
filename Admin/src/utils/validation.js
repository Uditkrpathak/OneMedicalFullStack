/**
 * One Medical Comprehensive Form Validation & Sanitization Engine
 */

export const sanitizeInput = (val) => {
  if (typeof val !== 'string') return val;
  return val.trim();
};

export const validateName = (name, label = 'Full Name') => {
  const clean = sanitizeInput(name);
  if (!clean) return `${label} is required.`;
  if (clean.length < 2) return `${label} must be at least 2 characters.`;
  if (clean.length > 70) return `${label} must be under 70 characters.`;
  if (!/^[a-zA-Z\s.'\-]+$/.test(clean)) {
    return `${label} can only contain letters, spaces, dots, and hyphens.`;
  }
  return null;
};

export const validatePhone = (phone, required = true) => {
  const clean = sanitizeInput(phone);
  if (!clean) {
    return required ? 'Phone number is required.' : null;
  }
  // Remove spaces, hyphens, parentheses
  const digitsOnly = clean.replace(/[\s\-\(\)]/g, '');
  if (!/^\+?[0-9]{10,15}$/.test(digitsOnly)) {
    return 'Enter a valid 10-15 digit phone number (e.g. +91 9876543210).';
  }
  return null;
};

export const validateEmail = (email, required = false) => {
  const clean = sanitizeInput(email);
  if (!clean) {
    return required ? 'Email address is required.' : null;
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return 'Please enter a valid email address (e.g. doctor@onemedical.in).';
  }
  return null;
};

export const validateDOB = (dob, required = false) => {
  const clean = sanitizeInput(dob);
  if (!clean) return required ? 'Date of birth is required.' : null;
  const d = new Date(clean);
  if (isNaN(d.getTime())) return 'Invalid date format.';
  const now = new Date();
  if (d > now) return 'Date of birth cannot be in the future.';
  const age = (now - d) / (365.25 * 24 * 60 * 60 * 1000);
  if (age > 120) return 'Please enter a valid date of birth (age < 120 yrs).';
  return null;
};

export const validateFee = (fee, required = true) => {
  if (fee === undefined || fee === null || fee === '') {
    return required ? 'Consultation fee is required.' : null;
  }
  const num = Number(fee);
  if (isNaN(num)) return 'Consultation fee must be a number.';
  if (num < 100) return 'Minimum consultation fee is ₹100.';
  if (num > 25000) return 'Maximum consultation fee is ₹25,000.';
  return null;
};

export const validateExperience = (exp, required = true) => {
  if (exp === undefined || exp === null || exp === '') {
    return required ? 'Experience is required.' : null;
  }
  const num = Number(exp);
  if (isNaN(num) || !Number.isInteger(num)) return 'Experience must be a whole number in years.';
  if (num < 0) return 'Experience cannot be negative.';
  if (num > 60) return 'Experience must be under 60 years.';
  return null;
};

export const validateNumberInRange = (val, min, max, label = 'Field', required = true) => {
  if (val === undefined || val === null || val === '') {
    return required ? `${label} is required.` : null;
  }
  const num = Number(val);
  if (isNaN(num)) return `${label} must be a number.`;
  if (num < min) return `${label} must be at least ${min}.`;
  if (num > max) return `${label} cannot exceed ${max}.`;
  return null;
};

export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let clean = phone.trim().replace(/[\s\-\(\)]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.length === 10) clean = '+91' + clean;
    else if (clean.length === 12 && clean.startsWith('91')) clean = '+' + clean;
    else clean = '+91' + clean;
  }
  return clean;
};
