import express from 'express';
import { 
  requestOtp, 
  verifyOtp, 
  requestPhoneOtp, 
  verifyPhoneOtp, 
  requestEmailOtp, 
  verifyEmailOtp, 
  staffLogin, 
  register, 
  refreshTokens, 
  logout,
  logoutAll
} from '../controllers/authController.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// OTP rate limiter: relaxed max for dev testing, returning JSON format
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many OTP requests. Please try again later.' } }
});

// Unified & Fallback OTP Endpoints
router.post('/otp/request',      otpLimiter, requestOtp);
router.post('/otp/verify',       otpLimiter, verifyOtp);
router.post('/otp/phone',        otpLimiter, requestPhoneOtp);
router.post('/otp/email',        otpLimiter, requestEmailOtp);

router.post('/send-phone-otp',   otpLimiter, requestPhoneOtp);
router.post('/verify-phone-otp', otpLimiter, verifyPhoneOtp);
router.post('/send-email-otp',   otpLimiter, requestEmailOtp);
router.post('/verify-email-otp', otpLimiter, verifyEmailOtp);

router.post('/login',            staffLogin);   // email + password login
router.post('/register',         register);     // email + password + name registration
router.post('/refresh',          refreshTokens);
router.post('/logout',           logout);
router.post('/logout-all',       logoutAll);

export default router;

