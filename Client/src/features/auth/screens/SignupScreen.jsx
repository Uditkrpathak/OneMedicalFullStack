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
import { colors } from '../../../theme/colors';

const { height } = Dimensions.get('window');

export default function SignupScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
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
        navigation.navigate('Otp', { email: phone, otp: res?.data?.otp });
        return;
      }

      setError('phoneNumber', {
        type: 'manual',
        message: res.error?.message || 'Failed to send OTP.',
      });
    } catch (err) {
      setLoading(false);
      setError('phoneNumber', {
        type: 'manual',
        message: err.message || 'An error occurred during registration.',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header Image with Back Button */}
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
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.imageOverlayGradient} />
      </View>

      {/* Main Form */}
      <ScrollView style={styles.contentCard} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Row */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="add-sharp" size={16} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>ONE MEDICAL</Text>
        </View>

        {/* Title */}
        <Text style={styles.mainTitle}>Create Account 🚀</Text>
        <Text style={styles.subTitle}>
          Enter your mobile number to receive a 6-digit OTP code.
        </Text>

        {/* Error Banner */}
        {!!errors.phoneNumber && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorBannerText}>{errors.phoneNumber.message}</Text>
          </View>
        )}

        {/* Mobile Number Input with +91 Country Code */}
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={styles.inputWrapper}>
          <View style={styles.countryCodeBadge}>
            <Text style={styles.flagEmoji}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" style={{ marginLeft: 2 }} />
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

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          activeOpacity={0.85}
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
        <TouchableOpacity
          style={styles.helpLinkRow}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <Ionicons name="help-circle-outline" size={16} color="#003D9B" style={{ marginRight: 4 }} />
          <Text style={styles.helpLinkText}>Need Help?</Text>
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
    height: height * 0.48,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    height: 40,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  brandBadgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primary || '#0047AB',
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    backgroundColor: '#003D9B',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary || '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  loginLinkRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  loginText: {
    fontSize: 13,
    color: '#64748b',
  },
  loginLinkBold: {
    fontWeight: '700',
    color: '#003D9B',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  termsLink: {
    fontWeight: '600',
    color: '#003D9B',
    textDecorationLine: 'underline',
  },
  helpLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  helpLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
});
