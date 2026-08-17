import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';

const { width } = Dimensions.get('window');

export default function AppointmentConfirmedScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const appointmentId = route.params?.appointmentId;
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(!!appointmentId);

  useEffect(() => {
    const fetchConfirmedDetails = async () => {
      if (!appointmentId) return;
      try {
        const res = await appointmentApi.getAppointmentById(appointmentId, token);
        if (res.success && res.data) {
          setAppointment(res.data);
        }
      } catch (e) {
        console.warn('[AppointmentConfirmed] Fetch error:', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfirmedDetails();
  }, [appointmentId, token]);

  const displayId = appointment?._id ? `#${appointment._id.slice(-8).toUpperCase()}` : (appointmentId || '#APT-2024-8842');
  const doctorName = appointment?.therapistName || route.params?.doctorName || 'Dr. Specialist';
  const serviceName = appointment?.serviceType?.replace(/_/g, ' ') || route.params?.serviceName || 'Physiotherapy Session';
  const clinicName = appointment?.appointmentPlace === 'HOME' ? 'Home Visit' : appointment?.appointmentPlace === 'VIDEO' ? 'Online Video Consultation' : (route.params?.clinicName || 'One Medical Hub');
  const dateTimeStr = appointment?.startTime
    ? `${new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} (${new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} / ${appointment.durationMin || 30} mins)`
    : (route.params?.dateTimeStr || 'Confirmed Slot');
  const modeStr = appointment?.appointmentPlace === 'HOME' ? 'Home Visit' : appointment?.appointmentPlace === 'VIDEO' ? 'Video Consultation' : 'Clinic Visit';
  const paymentStatus = appointment?.paymentStatus === 'PAID' ? 'Paid Online' : appointment?.paymentStatus === 'PENDING' ? 'Pay at Clinic' : 'Confirmed';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.navigate('PatientHome')}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ONE MEDICAL</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* CELEBRATORY CHECKMARK BADGE */}
        <View style={styles.successIconOuter}>
          <View style={styles.successIconInner}>
            <Ionicons name="checkmark" size={36} color="#ffffff" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Text style={styles.titleText}>Appointment Confirmed</Text>
          <Ionicons name="sparkles" size={22} color="#003D9B" />
        </View>
        <Text style={styles.subText}>
          Your appointment has been successfully booked. We've sent the confirmation to your registered mobile number and email.
        </Text>

        {/* APPOINTMENT TICKET CARD */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeaderRow}>
            <Text style={styles.ticketHeaderLabel}>APPOINTMENT ID</Text>
            <Text style={styles.ticketHeaderId}>{displayId}</Text>
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketLabel}>Physiotherapist</Text>
            <Text style={styles.ticketValueBold}>{doctorName}</Text>
          </View>

          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketLabel}>Service</Text>
            <Text style={styles.ticketValue}>{serviceName}</Text>
          </View>

          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketLabel}>Clinic</Text>
            <Text style={styles.ticketValue}>{clinicName}</Text>
          </View>

          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketLabel}>Date & Time</Text>
            <Text style={styles.ticketValue}>{dateTimeStr}</Text>
          </View>

          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketLabel}>Mode</Text>
            <Text style={styles.ticketValue}>{modeStr}</Text>
          </View>

          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketLabel}>Payment Status</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>{paymentStatus}</Text>
            </View>
          </View>
        </View>

        {/* IMPORTANT INSTRUCTIONS BOX */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>IMPORTANT INSTRUCTIONS</Text>

          <View style={styles.instructionItem}>
            <View style={styles.instructionIconBox}>
              <Ionicons name="location-outline" size={16} color="#003D9B" />
            </View>
            <Text style={styles.instructionText}>Arrive 10 minutes early.</Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionIconBox}>
              <Ionicons name="document-text-outline" size={16} color="#003D9B" />
            </View>
            <Text style={styles.instructionText}>Bring previous medical reports.</Text>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionIconBox}>
              <Ionicons name="notifications-outline" size={16} color="#003D9B" />
            </View>
            <Text style={styles.instructionText}>Reminder will be sent.</Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('MyBookings')}
        >
          <Text style={styles.primaryBtnText}>View My Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryLinkBtn}
          onPress={() => navigation.navigate('PatientHome')}
        >
          <Text style={styles.secondaryLinkText}>Back to Home</Text>
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
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  ticketHeaderId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003D9B',
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  ticketDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ticketLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  ticketValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
  },
  ticketValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  paidBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: '#f0f6ff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 1,
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#003D9B',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryLinkBtn: {
    paddingVertical: 8,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
