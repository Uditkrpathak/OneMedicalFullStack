import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';
import { getDoctorAvatarSource } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

export default function ChoosePaymentScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const appointmentId = route.params?.appointmentId;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentType, setPaymentType] = useState('online'); // 'online' | 'clinic'
  const [onlineMethod, setOnlineMethod] = useState('upi');

  // Fetch backend-authoritative appointment data
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await appointmentApi.getAppointmentById(appointmentId, token);
        if (res.success) setAppointment(res.data);
      } catch (err) {
        console.error('Failed to fetch appointment:', err.message);
      } finally {
        setLoading(false);
      }
    };
    if (appointmentId) fetchAppointment();
    else setLoading(false);
  }, [appointmentId, token]);

  // Backend-authoritative amount (paise → rupees)
  const amountRupees = appointment?.amount ? Math.round(appointment.amount / 100) : 0;
  const therapistName = appointment?.therapistName || 'Your Therapist';
  const dateStr = appointment?.startTime
    ? new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })
    : '';
  const timeStr = appointment?.startTime
    ? new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    : '';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading appointment details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Payment</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* DOCTOR & SLOT SUMMARY HEADER CARD */}
        <View style={styles.summaryCard}>
          <Image
            source={getDoctorAvatarSource(appointment?.therapistAvatarUrl || appointment?.avatarUrl || therapistName)}
            style={styles.summaryAvatar}
          />
          <View style={styles.summaryTextContent}>
            <Text style={styles.summaryDocName}>{therapistName}</Text>
            <Text style={styles.summaryDocSub}>{appointment?.serviceType?.replace(/_/g, ' ') || 'Physiotherapy'}</Text>
            <View style={styles.summaryMetaRow}>
              <Ionicons name="calendar-outline" size={14} color="#003D9B" style={{ marginRight: 4 }} />
              <Text style={styles.summaryMetaText}>{dateStr} • {timeStr}</Text>
            </View>
            <View style={[styles.summaryMetaRow, { marginTop: 3 }]}>
              <Ionicons name="location-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.summaryMetaTextGray}>{appointment?.appointmentPlace || 'Clinic'}</Text>
            </View>
          </View>
        </View>

        {/* PAYMENT METHOD SELECTION */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Select UPI Payment Option</Text>

        {/* OPTION 1: INSTANT UPI (ONLINE) */}
        <TouchableOpacity
          style={[styles.optionCard, paymentType === 'online' && styles.optionCardSelected]}
          activeOpacity={0.9}
          onPress={() => setPaymentType('online')}
        >
          <View style={styles.optionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.optionTitleBadgeRow}>
                <Text style={styles.optionTitle}>Pay via UPI (Instant)</Text>
                <View style={styles.recBadge}>
                  <Text style={styles.recBadgeText}>FAST & SECURE</Text>
                </View>
              </View>
              <Text style={styles.optionSub}>Zero convenience fee via Google Pay, PhonePe, Paytm, or BHIM.</Text>
            </View>
            <View style={[styles.radioCircle, paymentType === 'online' && styles.radioCircleActive]}>
              {paymentType === 'online' && <View style={styles.radioInner} />}
            </View>
          </View>

          {/* EXPANDED UPI APPS */}
          {paymentType === 'online' && (
            <View style={styles.methodsSubContainer}>
              <TouchableOpacity
                style={[styles.methodRow, onlineMethod === 'gpay' && styles.methodRowSelected]}
                onPress={() => setOnlineMethod('gpay')}
              >
                <Ionicons name="logo-google" size={20} color="#003D9B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>Google Pay</Text>
                  <Text style={styles.methodDesc}>Instant 1-Tap UPI</Text>
                </View>
                {onlineMethod === 'gpay' && <Ionicons name="checkmark-circle" size={18} color="#003D9B" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodRow, onlineMethod === 'phonepe' && styles.methodRowSelected]}
                onPress={() => setOnlineMethod('phonepe')}
              >
                <Ionicons name="phone-portrait-outline" size={20} color="#003D9B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>PhonePe</Text>
                  <Text style={styles.methodDesc}>Direct UPI Autopay</Text>
                </View>
                {onlineMethod === 'phonepe' && <Ionicons name="checkmark-circle" size={18} color="#003D9B" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodRow, onlineMethod === 'paytm' && styles.methodRowSelected]}
                onPress={() => setOnlineMethod('paytm')}
              >
                <Ionicons name="wallet-outline" size={20} color="#003D9B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>Paytm UPI</Text>
                  <Text style={styles.methodDesc}>Direct Bank Transfer</Text>
                </View>
                {onlineMethod === 'paytm' && <Ionicons name="checkmark-circle" size={18} color="#003D9B" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodRow, (onlineMethod === 'upi' || onlineMethod === 'bhim') && styles.methodRowSelected]}
                onPress={() => setOnlineMethod('upi')}
              >
                <Ionicons name="qr-code-outline" size={20} color="#003D9B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodName}>BHIM / Any UPI App / QR</Text>
                  <Text style={styles.methodDesc}>Scan QR or Enter UPI ID (VPA)</Text>
                </View>
                {(onlineMethod === 'upi' || onlineMethod === 'bhim') && <Ionicons name="checkmark-circle" size={18} color="#003D9B" />}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* OPTION 2: PAY VIA UPI AT CLINIC RECEPTION (IN-CLINIC VISITS ONLY) */}
        {appointment?.appointmentPlace === 'telehealth' || appointment?.serviceType === 'online_consultation' ? (
          <View style={[styles.optionCard, { opacity: 0.6, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }]}>
            <View style={styles.optionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: '#64748b' }]}>Pay at Clinic (Disabled for Telehealth)</Text>
                <Text style={styles.optionSub}>
                  Online video sessions require upfront UPI confirmation to connect with the specialist.
                </Text>
              </View>
              <Ionicons name="lock-closed" size={18} color="#94a3b8" />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.optionCard, paymentType === 'clinic' && styles.optionCardSelected]}
            activeOpacity={0.9}
            onPress={() => setPaymentType('clinic')}
          >
            <View style={styles.optionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Pay via UPI at Clinic Reception</Text>
                <Text style={styles.optionSub}>
                  Scan the Dynamic Clinic UPI QR at reception when arriving for your session.
                </Text>
              </View>
              <View style={[styles.radioCircle, paymentType === 'clinic' && styles.radioCircleActive]}>
                {paymentType === 'clinic' && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* PAYMENT SUMMARY */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Payment Summary</Text>

        <View style={styles.billBox}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Consultation Fee</Text>
            <Text style={styles.billValue}>₹{amountRupees}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Service Tax</Text>
            <Text style={[styles.billValue, { color: '#16a34a' }]}>Included</Text>
          </View>

          <View style={styles.billDivider} />

          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmountText}>₹{amountRupees}</Text>
          </View>
        </View>

        {/* SECURITY CALLOUT */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#003D9B" style={{ marginRight: 8 }} />
          <Text style={styles.securityText}>
            Your payment is encrypted and securely processed using industry-standard protocols.
          </Text>
        </View>
      </ScrollView>

      {/* STICKY PAYMENT CTA */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={styles.payBtn}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('PaymentProcessing', {
              appointmentId,
              paymentType,
            })
          }
        >
          <Text style={styles.payBtnText}>
            {paymentType === 'online' ? `Pay ₹${amountRupees} Securely ➤` : 'Confirm Booking ➤'}
          </Text>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  summaryAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 12,
  },
  summaryTextContent: {
    flex: 1,
  },
  summaryDocName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryDocSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  summaryMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  summaryMetaTextGray: {
    fontSize: 11,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: '#003D9B',
    backgroundColor: '#f0f6ff',
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  recBadge: {
    backgroundColor: '#003D9B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  optionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#003D9B',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#003D9B',
  },
  methodsSubContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 8,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  methodRowSelected: {
    borderColor: '#003D9B',
    backgroundColor: '#e6f0ff',
    borderWidth: 1.5,
  },
  methodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  methodDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  billBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalAmountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003D9B',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f6ff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 15,
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
  payBtn: {
    backgroundColor: '#003D9B',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
