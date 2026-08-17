import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';
import { getDoctorAvatarSource } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

const REASONS = [
  'Feeling Better',
  'Need Another Time',
  'Personal Emergency',
  'Booked by Mistake',
  'Found Another Clinic',
  'Other',
];

export default function CancelAppointmentScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const appointmentId = route.params?.appointmentId || route.params?.booking?._id;
  const bookingFallback = route.params?.booking || {};

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Need Another Time');

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

  const doctorName = appointment?.therapistName || bookingFallback.doctorName || 'Your Therapist';
  const amountRupees = appointment?.amount ? Math.round(appointment.amount / 100) : (bookingFallback.refundAmount || 0);
  const doctorAvatarSource = getDoctorAvatarSource(
    appointment?.therapistAvatarUrl ||
    appointment?.avatarUrl ||
    bookingFallback.avatar ||
    bookingFallback.avatarUrl ||
    doctorName
  );

  const handleConfirmCancellation = async () => {
    setCancelling(true);
    try {
      const res = await appointmentApi.cancelAppointment(appointmentId, selectedReason, token);
      if (res.success) {
        Alert.alert(
          'Appointment Cancelled',
          appointment?.paymentStatus === 'PAID'
            ? `Your appointment has been cancelled. A refund of ₹${amountRupees} will be processed within 3-5 business days.`
            : 'Your appointment has been cancelled.',
          [{ text: 'OK', onPress: () => navigation.navigate('MyBookings') }]
        );
      } else {
        Alert.alert('Cancellation Failed', res.error?.message || 'Could not cancel appointment. Please try again.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to server. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
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
        <Text style={styles.headerTitle}>Cancel Appointment</Text>
        <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* DOCTOR & ORIGINAL SLOT BANNER */}
        <View style={styles.originalCard}>
          <Image source={doctorAvatarSource} style={styles.originalAvatar} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.originalDocName}>{doctorName}</Text>
            <Text style={styles.originalDocSub}>{appointment?.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Session'}</Text>
            <View style={styles.originalSlotBadge}>
              <Ionicons name="calendar-outline" size={12} color="#003D9B" style={{ marginRight: 4 }} />
              <Text style={styles.originalSlotText}>
                ORIGINAL: {appointment?.startTime ? new Date(appointment.startTime).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase() : (bookingFallback.originalSlot || 'TODAY')}
              </Text>
            </View>
          </View>
        </View>

        {/* FREE CANCELLATION POLICY BANNER */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeaderRow}>
            <View style={styles.policyIconCircle}>
              <Ionicons name="calendar" size={18} color="#003D9B" />
            </View>
            <Text style={styles.policyHeaderTitle}>Cancellation Policy</Text>
          </View>
          <Text style={styles.policyBodyText}>
            {appointment?.paymentStatus === 'PAID'
              ? `Cancellations >24 hours prior to appointment time are eligible for a 100% refund of ₹${amountRupees} to your original payment method within 3-5 business days.`
              : 'Free cancellation is available for all reserved consultations before the scheduled appointment time.'}
          </Text>
        </View>

        {/* REASON FOR CANCELLATION */}
        <Text style={styles.sectionTitle}>Why are you cancelling?</Text>

        <View style={styles.reasonsWrapRow}>
          {REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.8}
                style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text style={[styles.reasonChipText, isSelected && styles.reasonChipTextSelected]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* STICKY CONFIRM CANCELLATION CTA */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.88}
          onPress={handleConfirmCancellation}
        >
          <Text style={styles.cancelBtnText}>Confirm Cancellation</Text>
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  originalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  originalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: '#e2e8f0',
  },
  originalDocName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  originalDocSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  originalSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  originalSlotText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003D9B',
  },
  policyCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 24,
  },
  policyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  policyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  policyHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003D9B',
    flex: 1,
  },
  policyBodyText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  reasonsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  reasonChipSelected: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  reasonChipTextSelected: {
    color: '#ffffff',
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
  cancelBtn: {
    backgroundColor: '#ef4444',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
