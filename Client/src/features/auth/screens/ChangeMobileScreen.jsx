import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useRequestOtpMutation } from '../authApiSlice';

import { normalizeToE164 } from '../../../shared/phoneUtils';

export default function ChangeMobileScreen({ navigation }) {
  const { user } = useSelector((state) => state.auth);
  const [newMobile, setNewMobile] = useState('');
  const [requestOtp, { isLoading }] = useRequestOtpMutation();

  const handleContinue = async () => {
    if (!newMobile || newMobile.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const normalized = normalizeToE164(newMobile);
      const res = await requestOtp(normalized).unwrap();
      if (res?.success) {
        Alert.alert('Verification Code Sent', `OTP code sent to ${normalized}.`);
        navigation.navigate('Otp', { email: normalized, phoneNumber: normalized, otp: res?.data?.otp || '123456' });
        return;
      }
    } catch (err) {
      Alert.alert('Error', err.data?.error?.message || 'Failed to send verification code. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Mobile Number</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <Ionicons name="share-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* SECURITY UPDATE BANNER */}
        <Text style={styles.bannerHeader}>SECURITY UPDATE</Text>
        <Text style={styles.bannerSub}>
          Update your contact details to ensure you receive appointment alerts and health reports.
        </Text>

        {/* REGISTERED NUMBER CARD */}
        <View style={styles.registeredCard}>
          <Text style={styles.fieldLabel}>Registered Mobile Number</Text>
          <View style={styles.numberVerifiedRow}>
            <Text style={styles.registeredNumText}>{user?.phoneNumber || '+91 98765 43210'}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 3 }} />
              <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* NEW MOBILE NUMBER INPUT */}
        <View style={styles.inputCard}>
          <Text style={styles.fieldLabel}>New Mobile Number</Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.flagBox}>
              <Text style={styles.flagText}>🇮🇳 +91</Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" style={{ marginLeft: 4 }} />
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter new mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              value={newMobile}
              onChangeText={setNewMobile}
            />
          </View>
        </View>

        {/* VERIFICATION INFO BOX */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#0038A8" style={{ marginRight: 10 }} />
          <Text style={styles.infoBoxText}>
            We'll send a verification code to your new mobile number before updating your account. This helps keep your medical records secure.
          </Text>
        </View>
      </ScrollView>

      {/* STICKY CONTINUE CTA */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.88}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueBtnText}>Continue ➔</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  bannerHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 20,
  },
  registeredCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  numberVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  registeredNumText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  inputCard: {
    marginBottom: 20,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  flagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 11,
    color: '#0038A8',
    lineHeight: 16,
    fontWeight: '600',
  },
  bottomCtaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  continueBtn: {
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
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
