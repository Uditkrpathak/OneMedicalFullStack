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
  const routeParams = route.params || {};
  const appointmentId = routeParams.appointmentId || routeParams.appointment?._id || routeParams.appointment?.id;
  const initialAppt = routeParams.appointment || routeParams.booking || {};

  const [appointment, setAppointment] = useState(initialAppt);
  const [loading, setLoading] = useState(!!appointmentId && !initialAppt.startTime);

  useEffect(() => {
    const fetchConfirmedDetails = async () => {
      if (!appointmentId) return;
      try {
        const res = await appointmentApi.getAppointmentById(appointmentId, token);
        if (res.success && res.data) {
          const apptData = res.data.appointment || res.data;
          // Confirmation Invariant Guard: If appointment is cancelled/expired, prevent false confirmed UI
          if (apptData.status === 'CANCELLED' || apptData.status === 'EXPIRED' || apptData.status === 'PAYMENT_EXPIRED') {
            navigation.replace('AppointmentDetail', { appointmentId, booking: apptData });
            return;
          }
          setAppointment(apptData);
        }
      } catch (e) {
        console.warn('[AppointmentConfirmed] Fetch error:', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfirmedDetails();
  }, [appointmentId, token]);

  const rawId = appointment?._id || appointment?.id || appointmentId || 'APT-NEW';
  const displayId = `#APT-${String(rawId).slice(-8).toUpperCase()}`;
  
  const doctorName = appointment?.therapistName || routeParams.doctorName || routeParams.doctor?.name || 'Dr. Arjun Mehta';
  const serviceName = (appointment?.serviceType || routeParams.serviceName || routeParams.service || 'Physiotherapy Session')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const isVideo = appointment?.appointmentPlace === 'VIDEO' || routeParams.consultMode === 'online' || routeParams.consultMode === 'telehealth' || appointment?.appointmentType === 'telehealth';
  const isHome = appointment?.appointmentPlace === 'HOME' || routeParams.consultMode === 'home';

  const clinicName = isHome
    ? 'Home Visit Consultation'
    : isVideo
    ? 'Online Video Consultation'
    : (appointment?.clinicName || routeParams.clinicName || 'ONE MEDICAL Central Hub');

  const modeStr = isHome
    ? 'Home Visit'
    : isVideo
    ? 'Video Consultation'
    : 'In-Clinic Consultation';

  const formatIST = (isoDate) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    const datePart = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
    return `${datePart} • ${timePart} (30 mins)`;
  };

  const dateTimeStr = formatIST(appointment?.startTime) ||
    routeParams.dateTimeStr ||
    (routeParams.dateStr ? `${routeParams.dateStr} • ${routeParams.timeStr || '10:00 AM'}` : 'Scheduled Slot');

  const isPaid = appointment?.paymentStatus === 'PAID' || routeParams.paymentStatus === 'PAID';
  const paymentStatusText = isPaid ? 'Paid Online' : 'Payment at Clinic';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.navigate('PatientHome')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ONE MEDICAL</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* CELEBRATORY CHECKMARK BADGE */}
        <View style={styles.successIconOuter}>
          <View style={styles.successIconInner}>
            <Ionicons name="checkmark" size={32} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.titleText}>Appointment Confirmed!</Text>
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
            <View style={[styles.paidBadge, !isPaid && styles.pendingBadge]}>
              <Text style={[styles.paidBadgeText, !isPaid && styles.pendingBadgeText]}>
                {paymentStatusText}
              </Text>
            </View>
          </View>
        </View>

        {/* IMPORTANT INSTRUCTIONS BOX (CONTEXT-AWARE) */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>IMPORTANT INSTRUCTIONS</Text>

          {isVideo ? (
            <>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="videocam-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Join video consultation 5 minutes prior.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="wifi-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Ensure strong internet connection & quiet room.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="notifications-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Video room link sent via SMS & notification.</Text>
              </View>
            </>
          ) : isHome ? (
            <>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="home-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Prepare an open 6x6 ft area for assessment.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="body-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Wear comfortable, loose athletic clothing.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="document-text-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Keep recent doctor prescriptions ready.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="location-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Arrive 10 minutes early at clinic reception.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="document-text-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Bring previous MRI, X-ray or medical reports.</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionIconBox}>
                  <Ionicons name="notifications-outline" size={16} color="#003D9B" />
                </View>
                <Text style={styles.instructionText}>Automated SMS reminder will be sent.</Text>
              </View>
            </>
          )}
        </View>

        {/* ACTION BUTTONS */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('MyBookings')}
        >
          <Text style={styles.primaryBtnText}>View My Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.invoiceBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('InvoiceDetails', {
            transactionId: rawId,
            appointmentId: rawId,
            receiptId: displayId,
            doctorName,
            serviceName,
            clinicName,
            dateStr: dateTimeStr,
            amount: appointment?.amount ? (appointment.amount > 5000 ? Math.round(appointment.amount / 100) : appointment.amount) : 750,
          })}
        >
          <Ionicons name="receipt-outline" size={16} color="#003D9B" style={{ marginRight: 6 }} />
          <Text style={styles.invoiceBtnText}>View & Download Tax Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryLinkBtn}
          onPress={() => navigation.navigate('PatientHome')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  ticketHeaderId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#003D9B',
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  ticketDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 105,
  },
  ticketValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  ticketValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  paidBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  pendingBadgeText: {
    color: '#b45309',
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
    letterSpacing: 0.8,
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
    flex: 1,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#003D9B',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  invoiceBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  invoiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003D9B',
  },
  secondaryLinkBtn: {
    paddingVertical: 10,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
