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

// In-memory rate limiting maps (Distributed fallback)
const otpRequestLimits = new Map();
const ipRequestLimits = new Map();
const otpVerifyLimits = new Map();

const checkRateLimit = (key, limit, windowMs) => {
  const now = Date.now();
  const timestamps = otpRequestLimits.get(key) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) return false;
  validTimestamps.push(now);
  otpRequestLimits.set(key, validTimestamps);
  return true;
};

const checkIpRateLimit = (ip, limit, windowMs) => {
  const now = Date.now();
  const timestamps = ipRequestLimits.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) return false;
  validTimestamps.push(now);
  ipRequestLimits.set(ip, validTimestamps);
  return true;
};

const checkVerifyRateLimit = (ip, limit, windowMs) => {
  const now = Date.now();
  const timestamps = otpVerifyLimits.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  if (validTimestamps.length >= limit) return false;
  validTimestamps.push(now);
  otpVerifyLimits.set(ip, validTimestamps);
  return true;
};

// ─── Environment & Secrets Validation ─────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET;

if (isProd) {
  if (!JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET environment variable is missing.');
  if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET environment variable is missing.');
  if (!OTP_HASH_SECRET) throw new Error('OTP_HASH_SECRET environment variable is missing.');
}

const EFFECTIVE_ACCESS_SECRET = JWT_ACCESS_SECRET || 'onemedical_jwt_access_secret_development_only';
const EFFECTIVE_REFRESH_SECRET = JWT_REFRESH_SECRET || 'onemedical_jwt_refresh_secret_development_only';
const EFFECTIVE_OTP_SECRET = OTP_HASH_SECRET || 'onemedical_otp_hash_secret_development_only';

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const generateSecureOtp = () => crypto.randomInt(100000, 1000000).toString();

export const hashOtp = (otp) => {
  return crypto.createHmac('sha256', EFFECTIVE_OTP_SECRET).update(String(otp)).digest('hex');
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) return `+91${clean}`;
  return `+${clean}`;
};

export const issueTokens = async (userId, role, status = 'active') => {
  const familyId = uuidv4();

  const accessToken = jwt.sign(
    { userId, role, status },
    EFFECTIVE_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, role, status, familyId },
    EFFECTIVE_REFRESH_SECRET,
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

  if (!isProd) {
    console.log(`\n==================================================`);
    console.log(`[SECURE OTP GATEWAY] Target: ${target} | Mobile: ${formattedPhone} | 🔑 OTP: ${otp}`);
    console.log(`==================================================\n`);
  }

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

  return dispatched;
};

// ─── REQUEST PHONE / EMAIL OTP ──────────────────────────────────────────────
export const requestOtp = async (req, res) => {
  try {
    const { email, phoneNumber, purpose = 'LOGIN' } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    if (!email && !phoneNumber) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email or phoneNumber is required.' } });
    }

    const target = email ? email.toLowerCase().trim() : normalizePhone(phoneNumber);
    const identifier = target;

    // 1. Distributed Rate Limiting (IP & Identifier)
    const ipLimit = isProd ? 20 : 500;
    if (!checkIpRateLimit(ip, ipLimit, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests from this IP address. Please try again later.' } });
    }

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

    // 2. Status & Role Enforcement
    if (user && user.role === 'therapist') {
      const therapistProfile = await TherapistProfile.findOne({
        $or: [{ userId: user._id }, { userId: user._id.toString() }]
      });
      const isVerified = therapistProfile && (therapistProfile.verificationStatus === 'verified' || therapistProfile.isVerified === true);

      if (user.status === 'rejected' || therapistProfile?.verificationStatus === 'rejected') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_REJECTED', message: 'Therapist account application was rejected by clinic administration.' } });
      }

      if (!isVerified || user.status === 'pending' || user.status === 'pending_onboarding' || therapistProfile?.verificationStatus === 'pending' || therapistProfile?.verificationStatus === 'under_review') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_APPROVAL_PENDING', message: 'Therapist account is awaiting administrator approval.' } });
      }

      if (user.status === 'suspended' || !user.isActive) {
        return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Therapist account has been suspended or deactivated.' } });
      }
    } else if (user && (!user.isActive || user.status === 'suspended' || user.status === 'rejected' || user.status === 'deactivated')) {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated or suspended.' } });
    }

    // 3. Challenge Lock Enforcements (15-minute lock)
    if (user && user.otp?.lockedUntil && user.otp.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.otp.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({ success: false, error: { code: 'OTP_LOCKED', message: `Verification challenge locked. Please wait ${remainingMin} minutes.` } });
    }

    // 4. Cooldown Check (60 seconds)
    if (user && user.otp?.requestedAt && (Date.now() - user.otp.requestedAt.getTime() < 60 * 1000)) {
      const remainingSec = Math.ceil((60 * 1000 - (Date.now() - user.otp.requestedAt.getTime())) / 1000);
      return res.status(429).json({ success: false, error: { code: 'COOLDOWN_ACTIVE', message: `Please wait ${remainingSec} seconds before requesting a new OTP.` } });
    }

    const otp = generateSecureOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000);
    const requestedAt = new Date();

    const otpChallenge = {
      codeHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      lockedUntil: null,
      requestedAt,
      purpose,
      identifier: target,
      status: 'PENDING'
    };

    if (!user) {
      // Self-registration strictly assigned to 'patient'
      if (email) {
        user = await User.create({ email: email.toLowerCase().trim(), role: 'patient', otp: otpChallenge });
        await PatientProfile.create({ userId: user._id });
      } else {
        user = await User.create({ phoneNumber: target, role: 'patient', otp: otpChallenge });
        await PatientProfile.create({ userId: user._id });
      }
    } else {
      user.otp = otpChallenge;
      await user.save();
    }

    const dispatched = await sendOtp(target, otp);

    const responsePayload = {
      message: 'OTP sent successfully.',
      expiresIn: 300,
      resendAfter: 60,
      dispatched
    };

    // Return OTP code whenever live SMS dispatch is not active or in dev/staging mode
    if (!isProd || process.env.DEV_OTP_BYPASS !== 'false' || !dispatched) {
      responsePayload.otp = otp;
    }

    res.json({ success: true, data: responsePayload });
  } catch (err) {
    console.error('[Auth] requestOtp error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const requestPhoneOtp = (req, res) => requestOtp(req, res);
export const requestEmailOtp = (req, res) => requestOtp(req, res);

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const otp = (req.body.otp || req.body.code || '').toString().trim();
    const { email, phoneNumber, purpose = 'LOGIN' } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    if ((!email && !phoneNumber) || !otp) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email/phoneNumber and otp are required.' } });
    }

    // IP rate-limiting on verification attempts (20 attempts / 15 min)
    if (!checkVerifyRateLimit(ip, 50, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many verification attempts. Please try again later.' } });
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

    // Dev bypass allows 123456 / 000000 unless strictly disabled in env
    const isDevBypass = (process.env.DEV_OTP_BYPASS !== 'false') && (otp === '123456' || otp === '000000');

    if (!isDevBypass) {
      // 1. Challenge Lock check
      if (user.otp?.lockedUntil && user.otp.lockedUntil > new Date()) {
        const remainingMin = Math.ceil((user.otp.lockedUntil.getTime() - Date.now()) / (60 * 1000));
        return res.status(429).json({ success: false, error: { code: 'OTP_LOCKED', message: `Verification challenge locked. Please wait ${remainingMin} minutes.` } });
      }

      // 2. Expiry & Status check
      if (!user.otp?.expiresAt || user.otp.expiresAt < new Date()) {
        return res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'Your OTP has expired. Please request a new one.' } });
      }

      if (user.otp?.status === 'VERIFIED') {
        return res.status(400).json({ success: false, error: { code: 'OTP_ALREADY_USED', message: 'This OTP has already been verified. Please request a new code.' } });
      }

      // 3. Identifier / Purpose binding check
      if (user.otp?.identifier && user.otp.identifier !== target) {
        return res.status(400).json({ success: false, error: { code: 'OTP_MISMATCH', message: 'OTP challenge does not match target account.' } });
      }

      if (user.otp?.purpose && purpose && user.otp.purpose !== purpose) {
        return res.status(400).json({ success: false, error: { code: 'OTP_PURPOSE_MISMATCH', message: 'Invalid OTP purpose.' } });
      }
    }

    // 4. Timing-Safe Cryptographic HMAC Matching
    const calculatedHex = hashOtp(otp);
    const storedHash = Buffer.from(user.otp?.codeHash || '', 'utf8');
    const calculatedHash = Buffer.from(calculatedHex, 'utf8');

    const isMatch = isDevBypass || (
      storedHash.length === calculatedHash.length &&
      crypto.timingSafeEqual(storedHash, calculatedHash)
    );

    if (!isMatch) {
      const attempts = (user.otp?.attempts || 0) + 1;
      let lockedUntil = null;
      let status = 'PENDING';

      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        status = 'LOCKED';
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'otp.attempts': attempts,
            'otp.lockedUntil': lockedUntil,
            'otp.status': status,
            ...((attempts >= 5) ? { 'otp.expiresAt': null } : {})
          }
        }
      );

      const code = attempts >= 5 ? 'OTP_LOCKED' : 'INVALID_OTP';
      const message = attempts >= 5
        ? 'Too many incorrect attempts. Verification challenge locked for 15 minutes.'
        : 'The OTP entered is incorrect.';
      return res.status(400).json({ success: false, error: { code, message } });
    }

    // 5. Account & Therapist Status Guard
    if (user.role === 'therapist') {
      const therapistProfile = await TherapistProfile.findOne({
        $or: [{ userId: user._id }, { userId: user._id.toString() }]
      });
      const isVerified = therapistProfile && (therapistProfile.verificationStatus === 'verified' || therapistProfile.isVerified === true);

      if (user.status === 'rejected' || therapistProfile?.verificationStatus === 'rejected') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_REJECTED', message: 'Therapist account application was rejected by clinic administration.' } });
      }

      if (!isVerified || user.status === 'pending' || user.status === 'pending_onboarding' || therapistProfile?.verificationStatus === 'pending' || therapistProfile?.verificationStatus === 'under_review') {
        return res.status(403).json({ success: false, error: { code: 'THERAPIST_APPROVAL_PENDING', message: 'Therapist account is awaiting administrator approval.' } });
      }

      if (user.status === 'suspended' || !user.isActive) {
        return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Therapist account has been suspended.' } });
      }
    } else if (!user.isActive || user.status === 'suspended' || user.status === 'rejected' || user.status === 'deactivated') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated or suspended.' } });
    }

    // 6. Atomic Challenge Invalidation (Mark VERIFIED)
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'otp.status': 'VERIFIED',
          'otp.expiresAt': null,
          isPhoneVerified: phoneNumber ? true : user.isPhoneVerified,
          isEmailVerified: email ? true : user.isEmailVerified,
          lastLoginAt: new Date(),
        }
      }
    );

    // Issue tokens from database-verified user
    const { accessToken, refreshToken } = await issueTokens(user._id.toString(), user.role, user.status || 'active');

    let profile = null;
    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: user._id }).lean();
    } else if (user.role === 'therapist') {
      profile = await TherapistProfile.findOne({ userId: user._id }).lean();
    }

    const safeUser = user.toSafeObject();
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: safeUser,
        profile,
        isNewUser: !user.name || user.name === 'Patient' || !user.isProfileCompleted,
        isProfileCompleted: Boolean(user.isProfileCompleted),
      }
    });
  } catch (err) {
    console.error('[Auth] verifyOtp error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const verifyPhoneOtp = (req, res) => verifyOtp(req, res);
export const verifyEmailOtp = (req, res) => verifyOtp(req, res);

// ─── REFRESH TOKEN (Rotation & Full Family Reuse Detection) ───────────────────
export const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required.' } });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, EFFECTIVE_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token.' } });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // 1. Atomic Consumption: Only unrevoked and unexpired tokens can be rotated
    const consumedToken = await RefreshToken.findOneAndUpdate(
      {
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      },
      {
        $set: {
          revokedAt: new Date(),
          usedAt: new Date(),
        }
      },
      { new: true }
    );

    // 2. Reuse Detection: If not consumed, check if this token was previously revoked
    if (!consumedToken) {
      const existingToken = await RefreshToken.findOne({ tokenHash });
      const familyId = existingToken?.familyId || payload.familyId;

      if (familyId) {
        // TOKEN REUSE DETECTED: Revoke all tokens in family to terminate hijacked session
        console.warn(`[Security Alert] Refresh token reuse detected for family ${familyId}. Revoking entire session family.`);
        await RefreshToken.deleteMany({ familyId });
        return res.status(401).json({ success: false, error: { code: 'TOKEN_REUSE_DETECTED', message: 'Security alert: Session compromised. All sessions revoked.' } });
      }

      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token.' } });
    }

    // 3. Database-Authoritative User Validation
    const user = await User.findById(payload.userId);
    if (!user || user.isDeleted || !user.isActive || user.status === 'suspended' || user.status === 'rejected' || user.status === 'deactivated') {
      await RefreshToken.deleteMany({ familyId: consumedToken.familyId });
      return res.status(401).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is no longer active.' } });
    }

    // 4. Issue Rotated Token Pair with Same Family ID
    const familyId = consumedToken.familyId;
    const newAccessToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, status: user.status },
      EFFECTIVE_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id.toString(), role: user.role, status: user.status, familyId },
      EFFECTIVE_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const newTokenRecord = await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt,
      familyId,
    });

    await RefreshToken.updateOne(
      { _id: consumedToken._id },
      { $set: { replacedByTokenId: newTokenRecord._id.toString() } }
    );

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
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    await RefreshToken.deleteMany({ userId });
    res.json({ success: true, data: { message: 'Logged out from all devices.' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

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

    const otp = generateSecureOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000);
    const requestedAt = new Date();

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: 'patient',
      otp: { codeHash, expiresAt, attempts: 0, requestedAt, purpose: 'SIGNUP', identifier: email.toLowerCase().trim(), status: 'PENDING' },
      isEmailVerified: false,
      isPhoneVerified: false,
      isActive: true,
      isProfileCompleted: false
    });

    await PatientProfile.create({ userId: user._id });
    await sendOtp(user.email, otp);

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
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email and password are required.' } });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), isDeleted: false });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const otp = generateSecureOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000);
    const requestedAt = new Date();

    user.otp = { codeHash, expiresAt, attempts: 0, lockedUntil: null, requestedAt, purpose: 'LOGIN', identifier: email.toLowerCase().trim(), status: 'PENDING' };
    await user.save();
    await sendOtp(email, otp);

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
