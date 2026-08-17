import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useForm, Controller } from 'react-hook-form';
import authApi from '../api';

const { height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phoneNumber: '',
    },
  });

  const onSubmit = async (data) => {
    const phone = data.phoneNumber.trim();
    if (!phone || phone.length < 10) {
      setError('phoneNumber', { type: 'manual', message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.requestOtp(phone);
      setLoading(false);

      if (res?.success) {
        navigation.navigate('Otp', { 
          email: phone, 
          phoneNumber: phone, 
          otp: res?.data?.otp || '123456' 
        });
        return;
      }

      setError('phoneNumber', {
        type: 'manual',
        message: res.error?.message || 'Failed to send OTP. Please try again.',
      });
    } catch (err) {
      setLoading(false);
      setError('phoneNumber', {
        type: 'manual',
        message: err.message || 'An error occurred. Please try again.',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Hero Banner Image */}
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

      {/* Login Card */}
      <ScrollView style={styles.contentCard} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Logo Row */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>ONE MEDICAL</Text>
        </View>

        {/* Title */}
        <Text style={styles.mainTitle}>Welcome Back 👋</Text>
        <Text style={styles.subTitle}>
          Enter your registered mobile number to receive a verification code.
        </Text>

        {/* Error Banner */}
        {!!errors.phoneNumber && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorBannerText}>{errors.phoneNumber.message}</Text>
          </View>
        )}

        {/* Mobile Number Input with +91 Country Code */}
        <View style={styles.inputWrapper}>
          <View style={styles.countryCodeBadge}>
            <Text style={styles.flagEmoji}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" style={{ marginLeft: 4 }} />
          </View>
          <View style={styles.divider} />
          <Controller
            control={control}
            name="phoneNumber"
            rules={{
              required: 'Mobile number is required',
              pattern: { value: /^[0-9]{10}$/, message: 'Enter a valid 10-digit mobile number' }
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Enter your mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
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

        {/* Terms Disclaimer */}
        <Text style={styles.termsText}>
          By continuing you agree to the{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>

        {/* Need Help Link */}
        <TouchableOpacity style={styles.helpRow} onPress={() => navigation.navigate('NeedHelp')}>
          <Ionicons name="help-circle-outline" size={16} color="#0038A8" style={{ marginRight: 4 }} />
          <Text style={styles.helpText}>Need Help?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerImageContainer: {
    height: height * 0.36,
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
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 14,
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
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#cbd5e1',
    marginRight: 12,
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
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
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
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  termsText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  termsLink: {
    fontWeight: '600',
    color: '#0038A8',
    textDecorationLine: 'underline',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0038A8',
  },
});
