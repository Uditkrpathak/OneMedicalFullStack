import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import paymentApi from '../api';
import appointmentApi from '../../appointments/api';

import { useNotification } from '../../../context/NotificationContext';

const { width } = Dimensions.get('window');

export default function PaymentMockScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const { showInAppNotification } = useNotification() || {};
  const appointmentId = route.params?.appointmentId;
  const gatewayOrderId = route.params?.gatewayOrderId;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('upi');

  useEffect(() => {
    const fetchAppt = async () => {
      if (!appointmentId) {
        setLoading(false);
        return;
      }
      try {
        const res = await appointmentApi.getAppointmentById(appointmentId, token);
        if (res.success && res.data) {
          setAppointment(res.data);
        }
      } catch (err) {
        console.warn('Failed to load appointment:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAppt();
  }, [appointmentId, token]);

  const amountRupees = appointment?.amount ? Math.round(appointment.amount / 100) : 500;

  const handleSimulatePayment = async (statusToSimulate) => {
    if (processing) return;
    setProcessing(true);

    try {
      if (statusToSimulate === 'success') {
        const verifyRes = await paymentApi.verifyPayment({
          appointmentId,
          gatewayOrderId: gatewayOrderId || `order_sim_${Date.now()}`,
          paymentId: `pay_sim_${Date.now()}`,
          paymentMethod: selectedMethod,
        }, token);

        if (verifyRes.success) {
          if (showInAppNotification) {
            showInAppNotification({
              title: 'Payment Confirmed & Verified',
              message: `₹${amountRupees} payment captured. GST Tax Invoice issued.`,
              type: 'payment.paid',
              category: 'PAYMENT SUCCESS',
              data: { appointmentId },
            });
          }

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
        } else {
          alert(verifyRes.error?.message || 'Payment simulation verification failed.');
        }
      } else {
        alert('Payment was cancelled by user.');
        navigation.goBack();
      }
    } catch (err) {
      alert(err.message || 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Loading checkout gateway...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Razorpay Sandbox</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.orderSummaryCard}>
          <Text style={styles.merchantTitle}>ONE MEDICAL HEALTHCARE</Text>
          <Text style={styles.orderSubtitle}>Consultation Fee for {appointment?.therapistName || 'Specialist'}</Text>
          <Text style={styles.amountDisplay}>₹{amountRupees}.00</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Test Payment Mode</Text>
        {['upi', 'card', 'netbanking'].map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.methodRow, selectedMethod === method && styles.methodRowActive]}
            onPress={() => setSelectedMethod(method)}
          >
            <Ionicons
              name={method === 'upi' ? 'qr-code-outline' : method === 'card' ? 'card-outline' : 'business-outline'}
              size={20}
              color={selectedMethod === method ? '#003D9B' : '#64748b'}
              style={{ marginRight: 12 }}
            />
            <Text style={[styles.methodText, selectedMethod === method && styles.methodTextActive]}>
              {method === 'upi' ? 'UPI (Google Pay / PhonePe)' : method === 'card' ? 'Credit / Debit Card' : 'Net Banking'}
            </Text>
            {selectedMethod === method && <Ionicons name="checkmark-circle" size={20} color="#003D9B" />}
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />

        {processing ? (
          <ActivityIndicator size="large" color="#003D9B" style={{ marginBottom: 20 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.payBtn} activeOpacity={0.85} onPress={() => handleSimulatePayment('success')}>
              <Text style={styles.payBtnText}>Simulate Successful Payment (₹{amountRupees})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.failBtn} activeOpacity={0.85} onPress={() => handleSimulatePayment('failure')}>
              <Text style={styles.failBtnText}>Simulate Payment Failure</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeBtn: { padding: 4, marginRight: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  content: { flex: 1, padding: 20 },
  orderSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  merchantTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', letterSpacing: 0.8 },
  orderSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  amountDisplay: { fontSize: 32, fontWeight: '800', color: '#003D9B', marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  methodRowActive: { borderColor: '#003D9B', backgroundColor: '#e6f0ff', borderWidth: 1.5 },
  methodText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#334155' },
  methodTextActive: { color: '#003D9B', fontWeight: '700' },
  payBtn: {
    backgroundColor: '#16a34a',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  payBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  failBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  failBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
