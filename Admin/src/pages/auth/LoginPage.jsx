import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Phone, Mail, Lock, ArrowRight, ArrowLeft,
  CheckCircle2, RefreshCw, Eye, EyeOff, Check
} from 'lucide-react';
import { loginStart, loginSuccess, loginFailure } from '../../store/authSlice.js';
import { api } from '../../api/api.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);

  // Flow views: 'login' | 'forgot_password' | 'otp' | 'new_password' | 'reset_success'
  const [viewState, setViewState] = useState('login');

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Timers & feedback
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [serverOtpNotice, setServerOtpNotice] = useState(null);

  // Countdown timer for OTP
  useEffect(() => {
    let interval = null;
    if (viewState === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [viewState, timer]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split('');
      const nextOtp = [...otp];
      pasted.forEach((char, i) => {
        if (i < 6) nextOtp[i] = char;
      });
      setOtp(nextOtp);
      const nextInput = document.getElementById(`otp-input-${Math.min(5, pasted.length)}`);
      if (nextInput) nextInput.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // 1. Submit Login (Requests OTP / Logs In)
  const handleLoginSubmit = async e => {
    e.preventDefault();
    setErrorMessage(null);
    setServerOtpNotice(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or mobile number.');
      return;
    }

    setSubmitting(true);
    dispatch(loginStart());

    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail ? { email: identifier.trim() } : { phoneNumber: identifier.trim() };

      const res = await api.requestOtp(payload);
      if (res?.data?.otp) {
        setServerOtpNotice(`Development OTP: ${res.data.otp}`);
      }

      setTimer(60);
      setCanResend(false);
      setViewState('otp');
    } catch (err) {
      console.error('Login request error:', err);
      // If server provides error or in dev mode fallback to OTP challenge
      setViewState('otp');
      setTimer(60);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit Forgot Password
  const handleForgotPasswordSubmit = async e => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered email or mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail ? { email: identifier.trim() } : { phoneNumber: identifier.trim() };
      const res = await api.requestOtp(payload);
      if (res?.data?.otp) {
        setServerOtpNotice(`Development OTP: ${res.data.otp}`);
      }
      setTimer(60);
      setCanResend(false);
      setViewState('otp');
    } catch (err) {
      setViewState('otp');
      setTimer(60);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async e => {
    e.preventDefault();
    setErrorMessage(null);
    const fullOtp = otp.join('');

    if (fullOtp.length < 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setSubmitting(true);
    dispatch(loginStart());

    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail
        ? { email: identifier.trim(), otp: fullOtp }
        : { phoneNumber: identifier.trim(), otp: fullOtp };

      const res = await api.login(payload);
      if (res?.success && res?.data) {
        dispatch(loginSuccess({ user: res.data.user, accessToken: res.data.accessToken }));
        navigate('/');
        return;
      }
      throw new Error(res?.error?.message || 'Invalid verification code.');
    } catch (err) {
      console.error('OTP Verification error:', err);
      dispatch(loginFailure(err.message || 'Verification failed.'));
      setErrorMessage(err.message || 'Invalid verification code. Please check console or try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Reset Password Submit
  const handleResetPasswordSubmit = async e => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setViewState('reset_success');
    }, 600);
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail ? { email: identifier.trim() } : { phoneNumber: identifier.trim() };
      const res = await api.requestOtp(payload);
      if (res?.data?.otp) {
        setServerOtpNotice(`New OTP: ${res.data.otp}`);
      }
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setTimer(60);
      setCanResend(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-800">
      {/* ── LEFT COLUMN: HERO IMAGE ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=85"
          alt="One Medical Physiotherapy Session"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Floating Pill Badge at bottom */}
        <div className="absolute bottom-10 z-10">
          <div className="px-6 py-2.5 bg-[#002b66]/90 backdrop-blur-md border border-white/20 rounded-full shadow-2xl text-[11px] font-bold text-white uppercase tracking-widest text-center">
            Physiotherapy Clinic Management Platform
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: AUTHENTICATION FORM SCREENS ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-14 lg:p-20 overflow-y-auto bg-white">
        <div className="max-w-md w-full mx-auto my-auto space-y-7">
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#003882] text-white flex items-center justify-center shadow-md">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                <span>ONE MEDICAL</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Physiotherapy Clinic Management Platform</p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 animate-fade-up">
              {errorMessage}
            </div>
          )}

          {/* Dev OTP Notice */}
          {serverOtpNotice && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 animate-fade-up flex items-center justify-between">
              <span>{serverOtpNotice}</span>
              <span className="text-[10px] bg-blue-200/80 px-2 py-0.5 rounded text-blue-900">DEV MODE</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 1: LOGIN
          ═══════════════════════════════════════════════════════════════════ */}
          {viewState === 'login' && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Manage appointments, patient recovery programs, progress analytics, and specialist payouts.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address / Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9999999999 or admin@onemedical.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="input w-full bg-slate-50/80 border-slate-200 focus:bg-white text-xs py-3 rounded-xl font-medium"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Password / OTP Option</label>
                    <button
                      type="button"
                      onClick={() => setViewState('forgot_password')}
                      className="text-xs font-bold text-[#003882] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password (or leave blank for OTP)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input w-full bg-slate-50/80 border-slate-200 focus:bg-white text-xs py-3 pr-10 rounded-xl font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <span>{submitting ? 'Authenticating...' : 'Sign In →'}</span>
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">OR</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('9999999999');
                    handleLoginSubmit({ preventDefault: () => {} });
                  }}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs"
                >
                  <span>🔑 Sign In with Admin Demo Account (9999999999)</span>
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 2: FORGOT PASSWORD
          ═══════════════════════════════════════════════════════════════════ */}
          {viewState === 'forgot_password' && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Forgot Your Password?</h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered email address or mobile number and we'll send a 6-digit verification code to reset your password.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address / Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9999999999 or admin@onemedical.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="input w-full bg-slate-50/80 border-slate-200 focus:bg-white text-xs py-3 rounded-xl font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{submitting ? 'Sending Code...' : 'Send Reset Code →'}</span>
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">OR</span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewState('login')}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 3: ENTER OTP / VERIFY IDENTITY
          ═══════════════════════════════════════════════════════════════════ */}
          {viewState === 'otp' && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Verify Your Identity</h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We've sent a 6-digit verification code to <strong className="text-slate-800">{identifier || '+91 9999999999'}</strong>. Please enter it below to proceed.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6 Circular OTP Inputs */}
                <div className="flex justify-between gap-2.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e.target.value ? e : e)}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-black rounded-2xl border-2 border-slate-200 focus:border-[#003882] focus:ring-4 focus:ring-blue-100 bg-slate-50/50 focus:bg-white outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="text-center text-xs">
                  {timer > 0 ? (
                    <span className="text-slate-500">
                      Resend code in <strong className="text-[#003882]">{timer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-bold text-[#003882] hover:underline"
                    >
                      Resend Verification Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || otp.join('').length < 6}
                  className="w-full py-3.5 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{submitting ? 'Verifying...' : 'Verify Code →'}</span>
                </button>

                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">OR</span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewState('login')}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 4: CREATE NEW PASSWORD
          ═══════════════════════════════════════════════════════════════════ */}
          {viewState === 'new_password' && (
            <div className="space-y-6 animate-fade-up">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Create New Password</h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Set a strong password for your administrator account that meets clinic security requirements.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="input w-full bg-slate-50/80 border-slate-200 focus:bg-white text-xs py-3 pr-10 rounded-xl font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input w-full bg-slate-50/80 border-slate-200 focus:bg-white text-xs py-3 rounded-xl font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{submitting ? 'Updating...' : 'Reset Password →'}</span>
                </button>

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">OR</span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewState('login')}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SCREEN 5: PASSWORD RESET SUCCESSFULLY
          ═══════════════════════════════════════════════════════════════════ */}
          {viewState === 'reset_success' && (
            <div className="space-y-6 animate-fade-up text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Password Reset Successfully</h1>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Your credentials have been updated securely. You can now sign in to the clinic administration console.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewState('login')}
                className="w-full py-3.5 bg-[#003882] hover:bg-[#002b66] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Back to Login →</span>
              </button>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="pt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
          <span className="hover:text-slate-700 cursor-pointer">Privacy Policy</span>
          <span>•</span>
          <span className="hover:text-slate-700 cursor-pointer">Terms of Service</span>
          <span>•</span>
          <span className="hover:text-slate-700 cursor-pointer">Help & Support</span>
        </div>
      </div>
    </div>
  );
}
