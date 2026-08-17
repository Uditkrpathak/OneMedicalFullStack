import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { loginSuccess } from '../authSlice';
import authApi from '../api';

const { height } = Dimensions.get('window');

export default function OtpScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const email = route.params?.email || route.params?.phoneNumber || '+91 98765 43210';
  const role = route.params?.role || 'patient';

  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(35);
  const [infoMessage, setInfoMessage] = useState('');

  const { control, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm({
    defaultValues: {
      d0: '', d1: '', d2: '', d3: '', d4: '', d5: '',
    },
  });

  const otpDigits = watch(['d0', 'd1', 'd2', 'd3', 'd4', 'd5']);

  const inputRefs = [
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null),
  ];

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleDigitInput = (txt, index) => {
    const clean = txt.replace(/[^0-9]/g, '');
    if (clean.length > 1) {
      const digits = clean.slice(0, 6).split('');
      digits.forEach((d, idx) => {
        setValue(`d${idx}`, d);
      });
      const lastIdx = Math.min(digits.length - 1, 5);
      inputRefs[lastIdx].current?.focus();
      return;
    }

    setValue(`d${index}`, clean);

    if (clean && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const onSubmit = async (data) => {
    const fullOtp = `${data.d0 || ''}${data.d1 || ''}${data.d2 || ''}${data.d3 || ''}${data.d4 || ''}${data.d5 || ''}`;
    if (fullOtp.length < 6) {
      setError('root', { type: 'manual', message: 'Please enter the full 6-digit OTP code.' });
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.verifyOtp(email, fullOtp, role);
      setLoading(false);

      if (res?.success && res?.data) {
        const { accessToken, user } = res.data;
        dispatch(loginSuccess({ user, token: accessToken }));

        // Navigate strictly based on authenticated user role and completion state from backend
        const targetScreen = user?.role === 'therapist'
          ? (user?.isProfileCompleted ? 'TherapistHome' : 'TherapistCompleteProfile')
          : (user?.isProfileCompleted ? 'PatientHome' : 'CompleteProfile');

        navigation.reset({
          index: 0,
          routes: [{ name: targetScreen }],
        });
        return;
      }
      throw new Error(res.error?.message || 'Verification failed');
    } catch (err) {
      setLoading(false);
      const errorCode = err.code || 'API_ERROR';
      switch (errorCode) {
        case 'OTP_EXPIRED':
          setError('root', { type: 'manual', message: 'Your OTP has expired. Please request a new code.' });
          break;
        case 'INVALID_OTP':
          setError('root', { type: 'manual', message: 'The OTP code is incorrect. Please check and try again.' });
          break;
        case 'OTP_LOCKED':
          setError('root', { type: 'manual', message: 'Too many incorrect attempts. This challenge is locked for 15 minutes.' });
          break;
        default:
          setError('root', { type: 'manual', message: err.message || 'OTP verification failed. Please try again.' });
      }
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(35);
    setInfoMessage('');
    try {
      const res = await authApi.requestOtp(email);
      if (res?.data?.message) {
        setInfoMessage(res.data.message);
      }
    } catch (err) {
      console.warn('Resend OTP error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header Image */}
      <View style={styles.headerImageContainer}>
        <Image
          source={require('../../../../assets/images/Onboarding.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.imageOverlayGradient} />
      </View>

      {/* Main Content */}
      <View style={styles.contentCard}>
        {/* Brand Row */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>ONE MEDICAL</Text>
        </View>

        <Text style={styles.mainTitle}>Verify Your Number</Text>

        <View style={styles.subTitleRow}>
          <Text style={styles.subTitle}>
            {"We've sent a 6-digit verification code to "}
            <Text style={styles.phoneHighlight}>{email}</Text>.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.editLink}>Edit Number</Text>
          </TouchableOpacity>
        </View>

        {/* DEMO / DEV QUICK OTP BANNER */}
        <TouchableOpacity
          style={styles.autoFillBanner}
          activeOpacity={0.8}
          onPress={() => {
            const targetOtp = route.params?.otp || '123456';
            const digits = targetOtp.padStart(6, '1').split('');
            digits.forEach((d, idx) => {
              setValue(`d${idx}`, d);
            });
          }}
        >
          <Ionicons name="key" size={18} color="#0038A8" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0038A8' }}>
              OTP Code: {route.params?.otp || '123456'}
            </Text>
            <Text style={{ fontSize: 11, color: '#0038A8' }}>
              Tap to auto-fill code instantly
            </Text>
          </View>
          <View style={styles.autoFillTag}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>Auto-Fill</Text>
          </View>
        </TouchableOpacity>

        {/* Error Banner */}
        {!!errors.root && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorBannerText}>{errors.root.message}</Text>
          </View>
        )}

        {/* 6 Controlled OTP Circles */}
        <View style={styles.otpGrid}>
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <Controller
              key={idx}
              control={control}
              name={`d${idx}`}
              render={({ field: { value } }) => (
                <TextInput
                  ref={inputRefs[idx]}
                  style={[
                    styles.otpCircleInput,
                    value ? styles.otpCircleFilled : null,
                  ]}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  value={value}
                  onChangeText={(txt) => handleDigitInput(txt, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                />
              )}
            />
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          activeOpacity={0.88}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Timer & Resend */}
        <View style={styles.timerRow}>
          <Text style={styles.resendTimerText}>
            Resend in{' '}
            <Text style={styles.timerBold}>
              00:{timer < 10 ? `0${timer}` : timer}
            </Text>
          </Text>
          <View style={styles.actionLinksRow}>
            <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
              <Text
                style={[
                  styles.resendCodeLink,
                  timer > 0 && styles.resendDisabled,
                ]}
              >
                Resend Code
              </Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NeedHelp')}>
              <Text style={styles.needHelpLink}>Need Help?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerImageContainer: {
    height: height * 0.34,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  imageOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandBadgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#0038A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#0f172a',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subTitleRow: {
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
  },
  phoneHighlight: {
    fontWeight: '800',
    color: '#0f172a',
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0038A8',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  autoFillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  autoFillTag: {
    backgroundColor: '#0038A8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  otpCircleInput: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  otpCircleFilled: {
    borderColor: '#0038A8',
    backgroundColor: '#f0f4ff',
  },
  primaryButton: {
    backgroundColor: '#0038A8',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  timerRow: {
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  timerBold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  actionLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendCodeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0038A8',
  },
  resendDisabled: {
    color: '#94a3b8',
  },
  linkSeparator: {
    marginHorizontal: 10,
    color: '#cbd5e1',
  },
  needHelpLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0038A8',
  },
});
