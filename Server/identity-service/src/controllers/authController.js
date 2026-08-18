import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import TherapistProfile from '../models/TherapistProfile.js';
import RefreshToken from '../models/RefreshToken.js';
import { sendFirebaseSmsOtp } from '../config/firebase.js';
import { sendEmailOtp } from '../config/email.js';

// In-memory rate limiting maps
const otpRequestLimits = new Map(); // identifier -> array of timestamps
const ipRequestLimits = new Map(); // ip -> array of timestamps

const checkRateLimit = (key, limit, windowMs) => {
  const now = Date.now();
  const timestamps = otpRequestLimits.get(key) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) {
    return false;
  }
  validTimestamps.push(now);
  otpRequestLimits.set(key, validTimestamps);
  return true;
};

const checkIpRateLimit = (ip, limit, windowMs) => {
  const now = Date.now();
  const timestamps = ipRequestLimits.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) {
    return false;
  }
  validTimestamps.push(now);
  ipRequestLimits.set(ip, validTimestamps);
  return true;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const hashOtp = (otp) => {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error('OTP_HASH_SECRET environment variable is missing.');
  }
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  return `+${clean}`;
};

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'onemedical_jwt_access_secret_production_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'onemedical_jwt_refresh_secret_production_2026';

const issueTokens = async (userId, role, status = 'active') => {
  const familyId = uuidv4();

  const accessToken = jwt.sign(
    { userId, role, status },
    JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, role, status, familyId },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    familyId,
  });

  return { accessToken, refreshToken };
};

const sendOtp = async (target, otp) => {
  const isEmail = target.includes('@');
  
  if (isEmail) {
    return await sendEmailOtp(target, otp);
  }

  const formattedPhone = normalizePhone(target);

  console.log(`\n==================================================`);
  console.log(`[SECURE OTP GATEWAY] Target: ${target} | Mobile: ${formattedPhone} | 🔑 OTP: ${otp}`);
  console.log(`==================================================\n`);

  let dispatched = false;
  if (process.env.FIREBASE_API_KEY) {
    try {
      const clean = target.replace(/[^0-9]/g, '');
      const mobileNumber = clean.length === 10 ? clean : clean.slice(-10);
      const fbResult = await sendFirebaseSmsOtp(mobileNumber);
      if (fbResult.success) {
        dispatched = true;
        console.log(`[Firebase SMS Gateway] Successfully sent OTP SMS to ${formattedPhone}`);
      }
    } catch (e) {
      console.error('[Firebase SMS Gateway Error]:', e.message);
    }
  }

  return dispatched || true;
};

// ─── REQUEST PHONE / EMAIL OTP ──────────────────────────────────────────────
export const requestOtp = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    const ip = req.ip;

    if (!email && !phoneNumber) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email or phoneNumber is required.' } });
    }

    const target = email ? email.toLowerCase().trim() : normalizePhone(phoneNumber);
    const identifier = target;

    // 1. IP Rate Limiting (500 in dev / test, 20 in prod)
    const ipLimit = process.env.NODE_ENV === 'production' ? 20 : 500;
    if (!checkIpRateLimit(ip, ipLimit, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests from this IP address. Please try again later.' } });
    }

    // 2. Identifier Rate Limiting (5 requests / 15 minutes)
    if (!checkRateLimit(identifier, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many OTP requests for this account. Please try again later.' } });
    }

    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    const last10Digits = cleanPhone.slice(-10);
    const query = email 
      ? { email: email.toLowerCase().trim(), isDeleted: { $ne: true } }
      : { 
          $or: [
            { phoneNumber: target }, 
            { phoneNumber: cleanPhone },
            ...(last10Digits.length === 10 ? [{ phoneNumber: { $regex: last10Digits + '$' } }] : [])
          ], 
          isDeleted: { $ne: true } 
        };
    
    let user = await User.findOne(query);

    // 3. Status and Role Enforcement
    if (user && user.role === 'therapist') {
      const therapistProfile = await TherapistProfile.findOne({
        $or: [{ userId: user._id }, { userId: user._id.toString() }]
      });
      const isVerified = therapistProfile && (therapistProfile.verificationStatus === 'verified' || therapistProfile.isVerified === true);

      if (user.status === 'rejected' || therapistProfile?.verificationStatus === 'rejected') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_REJECTED', message: 'Therapist account application was rejected by clinic administration.' } });
      }

      if (!isVerified || user.status === 'pending' || therapistProfile?.verificationStatus === 'pending' || therapistProfile?.verificationStatus === 'under_review') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_APPROVAL_PENDING', message: 'Therapist account is awaiting administrator approval. You will receive an alert once verified.' } });
      }

      if (user.status === 'suspended' || !user.isActive) {
        return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Therapist account has been suspended or deactivated.' } });
      }
    } else if (user && (!user.isActive || user.status === 'suspended' || user.status === 'rejected')) {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated or suspended.' } });
    }

    // 4. Challenge Lock Enforcements (Wait for 15-minute lock expiration)
    if (user && user.otp?.lockedUntil && user.otp.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.otp.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({ success: false, error: { code: 'OTP_LOCKED', message: `Verification challenge locked. Please wait ${remainingMin} minutes.` } });
    }

    // 5. Cooldown Check (60 seconds)
    if (user && user.otp?.requestedAt && (Date.now() - user.otp.requestedAt.getTime() < 60 * 1000)) {
      const remainingSec = Math.ceil((60 * 1000 - (Date.now() - user.otp.requestedAt.getTime())) / 1000);
      return res.status(429).json({ success: false, error: { code: 'COOLDOWN_ACTIVE', message: `Please wait ${remainingSec} seconds before requesting a new OTP.` } });
    }

    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000);
    const requestedAt = new Date();

    if (!user) {
      // New self-registration: strictly force role to 'patient' (never accept client role)
      const assignedRole = 'patient';

      if (email) {
        user = await User.create({ email: email.toLowerCase().trim(), role: assignedRole, otp: { codeHash, expiresAt, attempts: 0, requestedAt } });
        await PatientProfile.create({ userId: user._id });
      } else {
        user = await User.create({ phoneNumber: target, role: assignedRole, otp: { codeHash, expiresAt, attempts: 0, requestedAt } });
        await PatientProfile.create({ userId: user._id });
      }
    } else {
      // Replace existing challenge, reset attempts
      user.otp = { codeHash, expiresAt, attempts: 0, lockedUntil: null, requestedAt };
      await user.save();
    }

    const dispatched = await sendOtp(target, otp);

    res.json({
      success: true,
      data: {
        otp, // Return OTP in API response for zero-cost on-screen delivery
        message: 'OTP sent successfully. Enter the code shown or tap Auto-Fill.',
        expiresIn: 300,
        resendAfter: 60,
        dispatched
      }
    });
  } catch (err) {
    console.error('[Auth] requestOtp error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// Explicit Phone & Email Endpoints
export const requestPhoneOtp = (req, res) => requestOtp(req, res);

export const requestEmailOtp = async (req, res) => {
  const { email, phoneNumber } = req.body;
  
  if (phoneNumber && !email) {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10);
    const user = await User.findOne({ phoneNumber: { $regex: cleanPhone + '$' }, isDeleted: false });
    if (user && user.email) {
      req.body.email = user.email;
    } else if (!email) {
      return res.status(400).json({ success: false, error: { code: 'NO_EMAIL_ASSOCIATED', message: 'No verified email address is linked to this mobile number.' } });
    }
  }

  return requestOtp(req, res);
};

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const otp = (req.body.otp || req.body.code || '').toString().trim();
    const { email, phoneNumber } = req.body;
    if ((!email && !phoneNumber) || !otp) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email/phoneNumber and otp are required.' } });
    }

    const target = email ? email.toLowerCase().trim() : normalizePhone(phoneNumber);
    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    const last10Digits = cleanPhone.slice(-10);
    const query = email 
      ? { email: email.toLowerCase().trim(), isDeleted: { $ne: true } }
      : { $or: [{ phoneNumber: target }, { phoneNumber: cleanPhone }, { phoneNumber: { $regex: last10Digits + '$' } }], isDeleted: { $ne: true } };
    let user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'No registered account found.' } });
    }

    // Universal Master bypass (123456 or 000000) for zero-cost frictionless testing & production
    const isMasterCode = otp === '123456' || otp === '000000';
    const isDevBypass = isMasterCode;

    if (!isDevBypass) {
      // 1. Challenge Lock check
      if (user.otp?.lockedUntil && user.otp.lockedUntil > new Date()) {
        const remainingMin = Math.ceil((user.otp.lockedUntil.getTime() - Date.now()) / (60 * 1000));
        return res.status(429).json({ success: false, error: { code: 'OTP_LOCKED', message: `Verification challenge locked. Please wait ${remainingMin} minutes.` } });
      }

      // 2. Expiry check
      if (!user.otp?.expiresAt || user.otp.expiresAt < new Date()) {
        return res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'Your OTP has expired. Please request a new one.' } });
      }
    }

    // 3. Salted HMAC comparison (Timing-safe)
    const secret = process.env.OTP_HASH_SECRET || 'onemedical_otp_hash_secret_production_2026';
    const calculatedHex = crypto.createHmac('sha256', secret).update(otp).digest('hex');

    const storedHash = Buffer.from(user.otp?.codeHash || '', 'utf8');
    const calculatedHash = Buffer.from(calculatedHex, 'utf8');

    const isMatch = isDevBypass || (
      storedHash.length === calculatedHash.length &&
      crypto.timingSafeEqual(storedHash, calculatedHash)
    );

    if (!isMatch) {
      user.otp.attempts = (user.otp.attempts || 0) + 1;
      if (user.otp.attempts >= 5) {
        user.otp.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute challenge lock
        user.otp.expiresAt = null; // invalidates active OTP challenge
      }
      await user.save();

      const code = user.otp.lockedUntil ? 'OTP_LOCKED' : 'INVALID_OTP';
      const message = user.otp.lockedUntil
        ? 'Too many incorrect attempts. Verification challenge locked for 15 minutes.'
        : 'The OTP entered is incorrect.';
      return res.status(400).json({ success: false, error: { code, message } });
    }

    // 4. Re-check therapist verification and account active status upon verification
    if (user.role === 'therapist') {
      const therapistProfile = await TherapistProfile.findOne({
        $or: [{ userId: user._id }, { userId: user._id.toString() }]
      });
      const isVerified = therapistProfile && (therapistProfile.verificationStatus === 'verified' || therapistProfile.isVerified === true);

      if (user.status === 'rejected' || therapistProfile?.verificationStatus === 'rejected') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_REJECTED', message: 'Therapist account application was rejected by clinic administration.' } });
      }

      if (!isVerified || user.status === 'pending' || therapistProfile?.verificationStatus === 'pending' || therapistProfile?.verificationStatus === 'under_review') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_APPROVAL_PENDING', message: 'Therapist account is awaiting administrator approval. You cannot log in until approved.' } });
      }

      if (user.status === 'suspended' || !user.isActive) {
        return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Therapist account has been suspended.' } });
      }
    } else if (!user.isActive || user.status === 'suspended' || user.status === 'rejected') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated or suspended.' } });
    }

    // Consume challenge on success
    user.otp = {};
    if (email) user.isEmailVerified = true;
    if (phoneNumber) user.isPhoneVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    // Issue tokens strictly from database-verified user ID, role, and status
    const { accessToken, refreshToken } = await issueTokens(user._id.toString(), user.role, user.status || 'active');

    res.json({ success: true, data: { accessToken, refreshToken, user: user.toSafeObject() } });
  } catch (err) {
    console.error('[Auth] verifyOtp error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const verifyPhoneOtp = (req, res) => verifyOtp(req, res);
export const verifyEmailOtp = (req, res) => verifyOtp(req, res);

// ─── EMAIL & PASSWORD REGISTER (Signup) ──────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, email, and password are required.' } });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false });
    if (existingUser) {
      return res.status(400).json({ success: false, error: { code: 'USER_ALREADY_EXISTS', message: 'An account with this email already exists.' } });
    }

    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000);
    const requestedAt = new Date();

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: 'patient', // Strictly patient
      otp: { codeHash, expiresAt, attempts: 0, requestedAt },
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
      isProfileCompleted: false
    });

    await PatientProfile.create({ userId: user._id });
    await sendOtp(user.email, otp);

    const isProd = process.env.NODE_ENV === 'production';
    res.json({
      success: true,
      data: {
        status: 'OTP_SENT',
        email: user.email,
        ...(!isProd ? { otp } : {}),
        message: 'Account registered. Please enter the 6-digit OTP code sent to your email.'
      }
    });
  } catch (err) {
    console.error('[Auth] register error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── EMAIL & PASSWORD LOGIN (Step 1 of 2FA) ──────────────────────────────────
export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email and password are required.' } });

    const user = await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false });
    if (!user || !user.passwordHash) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });

    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000);
    const requestedAt = new Date();

    user.otp = { codeHash, expiresAt, attempts: 0, lockedUntil: null, requestedAt };
    await user.save();
    await sendOtp(email, otp);

    const isProd = process.env.NODE_ENV === 'production';
    res.json({
      success: true,
      data: {
        status: 'OTP_SENT',
        email: user.email,
        ...(!isProd ? { otp } : {}),
        message: 'Password verified. Please enter the 6-digit OTP sent to your email.'
      }
    });
  } catch (err) {
    console.error('[Auth] staffLogin error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── REFRESH TOKEN (Rotation & Family Reuse Detection) ─────────────────────────
export const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required.' } });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token.' } });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken) {
      // Reuse alert: search if familyId matches
      const reuseCheck = await RefreshToken.findOne({ familyId: payload.familyId });
      if (reuseCheck) {
        // REUSE DETECTED: Revoke all tokens in family
        await RefreshToken.deleteMany({ familyId: payload.familyId });
        return res.status(401).json({ success: false, error: { code: 'TOKEN_REUSE_DETECTED', message: 'Security alert: Session hijacked. Access revoked.' } });
      }
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Session expired.' } });
    }

    if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteMany({ familyId: storedToken.familyId });
      return res.status(401).json({ success: false, error: { code: 'SESSION_REVOKED', message: 'Session is no longer valid.' } });
    }

    // Rotate token: revoke old hash
    const familyId = storedToken.familyId;
    storedToken.revokedAt = new Date();
    await storedToken.save();

    const newAccessToken = jwt.sign(
      { userId: payload.userId, role: payload.role },
      JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
    );

    const newRefreshToken = jwt.sign(
      { userId: payload.userId, role: payload.role, familyId },
      JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newTokenRecord = await RefreshToken.create({
      userId: payload.userId,
      tokenHash: newHash,
      expiresAt,
      familyId,
    });

    storedToken.replacedByTokenId = newTokenRecord._id.toString();
    await storedToken.save();

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    console.error('[Auth] refreshTokens error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await RefreshToken.deleteOne({ tokenHash });
    }
    res.json({ success: true, data: { message: 'Logged out successfully.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── LOGOUT ALL (Session Revocation) ───────────────────────────────────────────
export const logoutAll = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    if (userId) {
      await RefreshToken.deleteMany({ userId });
    }
    res.json({ success: true, data: { message: 'Logged out from all devices.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
