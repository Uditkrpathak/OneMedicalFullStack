import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import paymentApi from '../../payments/api';

const { width } = Dimensions.get('window');

export default function PaymentProcessingScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const appointmentId = route.params?.appointmentId;
  const paymentType = route.params?.paymentType || 'online';

  const [statusText, setStatusText] = useState('Initiating secure payment order...');
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const processPaymentFlow = async () => {
      try {
        if (!appointmentId) throw new Error('Missing appointmentId — cannot process payment.');
        const isClinic = paymentType === 'clinic';
        if (isMounted) setStatusText(isClinic ? 'Initiating booking transaction...' : 'Initiating secure payment order...');

        // Backend reads amount from DB — never pass amount from client
        const orderRes = await paymentApi.createOrder(appointmentId, token);
        if (!orderRes?.data?.gatewayOrderId) throw new Error(orderRes?.error?.message || 'Failed to create payment order.');

        const gatewayOrderId = orderRes.data.gatewayOrderId;
        const simPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        if (isMounted) setStatusText(isClinic ? 'Confirming appointment...' : 'Verifying payment...');
        const verifyRes = await paymentApi.verifyPayment({
          gatewayOrderId,
          appointmentId,
          paymentId: simPaymentId,
          razorpayPaymentId: simPaymentId,
          signature: `sig_${gatewayOrderId}_${simPaymentId}`,
          razorpaySignature: `sig_${gatewayOrderId}_${simPaymentId}`,
        }, token);
        if (!verifyRes?.success) throw new Error(verifyRes?.error?.message || 'Payment verification failed.');

        if (isMounted) {
          setStatusText('Payment confirmed!');
          setTimeout(() => {
            navigation.replace('AppointmentConfirmed', {
              appointmentId,
              appointment: route.params?.appointment,
              doctor: route.params?.doctor,
              doctorName: route.params?.doctor?.name || route.params?.doctorName,
              serviceName: route.params?.serviceName,
              clinicName: route.params?.clinicName,
              dateTimeStr: route.params?.dateTimeStr,
              dateStr: route.params?.dateStr,
              timeStr: route.params?.timeStr,
              consultMode: route.params?.consultMode,
              paymentStatus: 'PAID',
            });
          }, 1000);
        }
      } catch (err) {
        // Critical: payment errors must NOT redirect to AppointmentConfirmed.
        // Show real failure UI — user must retry or cancel.
        console.error('Payment processing error:', err.message);
        if (isMounted) {
          setPaymentFailed(true);
          setFailureMessage(err.message || 'Payment could not be processed.');
        }
      }
    };

    processPaymentFlow();

    return () => { isMounted = false; };
  }, [navigation, token, appointmentId, paymentType]);

  if (paymentFailed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={[styles.pulseOuterCircle, { backgroundColor: '#fff1f2' }]}>
            <View style={[styles.pulseInnerCircle]}>
              <Ionicons name="close-circle" size={40} color="#ef4444" />
            </View>
          </View>
          <Text style={[styles.processingTitle, { color: '#ef4444', marginTop: 24 }]}>Payment Failed</Text>
          <Text style={styles.processingSub}>{failureMessage}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#003D9B', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24, marginBottom: 12 }}
            onPress={() => { setPaymentFailed(false); setStatusText('Retrying...'); }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingVertical: 12 }}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 14 }}>Cancel & Return to Bookings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.headerBackBtn}>
          <Ionicons name="lock-closed" size={18} color="#003D9B" />
        </View>
        <Text style={styles.headerTitle}>ONE MEDICAL</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* CENTERED PROCESSING GRAPHIC & LOADER */}
      <View style={styles.centerContent}>
        <View style={styles.pulseOuterCircle}>
          <View style={styles.pulseInnerCircle}>
            <Ionicons name="card" size={40} color="#003D9B" />
          </View>
        </View>

        <ActivityIndicator size="large" color="#003D9B" style={{ marginVertical: 24 }} />

        <Text style={styles.processingTitle}>Confirming Your Appointment</Text>
        <Text style={styles.processingSub}>{statusText}</Text>

        <View style={styles.detailsBadge}>
          <Text style={styles.detailsBadgeText}>Securely processing your payment</Text>
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  pulseOuterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  processingSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsBadge: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
});
