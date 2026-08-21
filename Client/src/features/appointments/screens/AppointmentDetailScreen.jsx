import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';
import { getDoctorAvatarSource, getDoctorImageUri } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

export default function AppointmentDetailScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const initialBooking = route.params?.booking || {};
  const appointmentId = route.params?.appointmentId || initialBooking._id || initialBooking.id;

  const [loading, setLoading] = useState(Boolean(appointmentId && !initialBooking.startTime));
  const [booking, setBooking] = useState({
    id: appointmentId ? `#APT-${String(appointmentId).slice(-8).toUpperCase()}` : '#APT-CONSULT',
    _id: appointmentId,
    doctorName: initialBooking.doctorName || initialBooking.therapistName || 'Attending Specialist',
    specialty: initialBooking.specialty || 'Physiotherapist',
    status: initialBooking.status || 'CONFIRMED',
    startTime: initialBooking.startTime || null,
    date: initialBooking.date || 'Scheduled Consultation',
    service: initialBooking.service || initialBooking.serviceType || 'Physiotherapy Consultation',
    duration: initialBooking.duration || '30 mins',
    clinic: initialBooking.clinic || 'ONE MEDICAL Rehabilitation Clinic',
    address: initialBooking.address || 'ONE MEDICAL Center, Indiranagar, Bangalore',
    receiptId: initialBooking.receiptId || (appointmentId ? `#RC-${String(appointmentId).slice(-8).toUpperCase()}` : '—'),
    amount: initialBooking.amount || 0,
    paymentStatus: initialBooking.paymentStatus || 'PAID',
    therapistPhone: initialBooking.therapistPhone || '+91 80 4965 2100',
    ratingAvg: initialBooking.ratingAvg || 4.9,
    avatar: getDoctorImageUri(initialBooking.avatar || initialBooking.doctorName),
    ...initialBooking,
  });

  const [therapistInfo, setTherapistInfo] = useState(null);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

  const computeCountdown = (isoStartTime, status) => {
    const s = (status || '').toUpperCase();
    if (s === 'CANCELLED') return 'Appointment Cancelled';
    if (s === 'EXPIRED' || s === 'PAYMENT_EXPIRED') return 'Booking Expired';
    if (s === 'COMPLETED') return 'Session Completed';
    if (s === 'IN_PROGRESS') return 'Session In Progress';
    if (s === 'RESCHEDULED') return 'Session Rescheduled';
    if (s === 'NO_ATTENDANCE' || s === 'PROVIDER_NO_SHOW' || s === 'PATIENT_NO_SHOW') return 'Missed Consultation (No Attendance)';

    if (!isoStartTime) return 'Scheduled Consultation';
    const apptTime = new Date(isoStartTime).getTime();
    const now = Date.now();
    const diffMs = apptTime - now;

    if (diffMs <= 0) {
      const hoursAgo = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
      if (hoursAgo < 2) return 'In Progress (Ready to Join)';
      return 'Completed Session';
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours <= 1) return 'Starts in less than 1 hour';
      return `Starts today in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }
    if (diffDays === 1) return 'Starts tomorrow';
    return `Starts in ${diffDays} days`;
  };

  useEffect(() => {
    if (!appointmentId) return;
    const fetchAppt = async () => {
      try {
        const res = await appointmentApi.getAppointmentById(appointmentId, token);
        if (res.success && res.data) {
          const a = res.data.appointment || res.data;
          const sDate = a.startTime ? new Date(a.startTime) : null;
          const dateStr = sDate
            ? `${sDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} • ${sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}`
            : (a.dateString || a.date || 'Scheduled Consultation');

          const serviceClean = (a.serviceName || a.serviceType || 'Physiotherapy Consultation')
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());

          const clinicClean = a.appointmentPlace === 'HOME'
            ? 'Home Visit Consultation'
            : (a.appointmentPlace === 'VIDEO' || a.appointmentType === 'telehealth')
            ? 'Virtual Telehealth Consultation'
            : 'In-Clinic Rehabilitation';

          let therapistData = null;
          if (a.therapistId) {
            try {
              const therRes = await appointmentApi.getTherapistById(a.therapistId, token);
              if (therRes.success && therRes.data) {
                therapistData = therRes.data;
                setTherapistInfo(therapistData);
              }
            } catch (err) {
              console.warn('[AppointmentDetail] therapist fetch err:', err.message);
            }
          }

          const resolvedDoctorName = therapistData?.user?.name || therapistData?.name || a.therapistName || booking.doctorName;
          const resolvedPhone = therapistData?.phoneNumber || therapistData?.user?.phoneNumber || a.therapistPhone || '+91 80 4965 2100';
          const resolvedRating = therapistData?.ratingAvg && therapistData.ratingAvg > 0 ? therapistData.ratingAvg : (a.ratingAvg || 4.9);
          const resolvedClinicLocation = (typeof therapistData?.clinicLocation === 'string' && therapistData.clinicLocation.trim())
            ? therapistData.clinicLocation
            : (a.clinicLocation || 'ONE MEDICAL Center, Indiranagar, Bangalore');

          const isVideo = a.appointmentPlace === 'VIDEO' || a.appointmentType === 'telehealth';
          const isHome = a.appointmentPlace === 'HOME';

          let dynamicChecklist = [];
          if (isVideo) {
            dynamicChecklist = [
              { id: 1, text: 'Ensure high-speed internet connection and quiet, well-lit room', checked: false },
              { id: 2, text: 'Position camera at full-body height for posture & movement examination', checked: false },
              { id: 3, text: 'Keep exercise mat or resistance band nearby if recommended', checked: false },
            ];
          } else if (isHome) {
            dynamicChecklist = [
              { id: 1, text: 'Prepare an open 6x6 ft floor area for therapist evaluation drills', checked: false },
              { id: 2, text: 'Wear comfortable athletic attire allowing full joint extension', checked: false },
              { id: 3, text: 'Keep past surgery summaries and doctor prescriptions ready', checked: false },
            ];
          } else {
            dynamicChecklist = [
              { id: 1, text: 'Arrive 10 mins prior for range-of-motion & vitals assessment', checked: false },
              { id: 2, text: 'Wear comfortable, loose athletic clothing for physical evaluation', checked: false },
              { id: 3, text: 'Bring recent MRI, X-ray scans or prescription records', checked: false },
            ];
          }
          setChecklist(dynamicChecklist);

          const rawAmount = a.amount || 0;
          const cleanAmount = rawAmount > 5000 ? Math.round(rawAmount / 100) : rawAmount;

          setBooking(prev => ({
            ...prev,
            ...a,
            _id: a._id,
            id: `#APT-${String(a._id).slice(-8).toUpperCase()}`,
            doctorName: resolvedDoctorName,
            status: (a.status || 'CONFIRMED').toUpperCase(),
            startTime: a.startTime,
            date: dateStr,
            service: serviceClean,
            duration: `${a.durationMin || 30} mins`,
            clinic: clinicClean,
            address: isVideo ? 'Online Secure Video Consultation Room' : (isHome ? (user?.address || 'Patient Registered Residence') : resolvedClinicLocation),
            receiptId: a.paymentId ? `#RC-${String(a.paymentId).slice(-8).toUpperCase()}` : `#RC-${String(a._id).slice(-8).toUpperCase()}`,
            amount: cleanAmount,
            paymentStatus: a.paymentStatus || 'PAID',
            therapistPhone: resolvedPhone,
            ratingAvg: resolvedRating,
            avatar: getDoctorImageUri(therapistData || resolvedDoctorName),
          }));
        }
      } catch (e) {
        console.warn('Error fetching appointment:', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAppt();
  }, [appointmentId, token]);

  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Arrive 10 mins prior for range-of-motion assessment', checked: false },
    { id: 2, text: 'Wear comfortable, loose athletic clothing for physical evaluation', checked: false },
    { id: 3, text: 'Keep recent medical scans / doctor prescriptions accessible', checked: false },
  ]);

  const doctorAvatarSource = getDoctorAvatarSource(booking.avatar || booking.doctorName);

  const toggleCheck = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleCall = () => {
    const phone = booking.therapistPhone || '+91 80 4965 2100';
    Alert.alert(
      'Call Specialist',
      `Connect with ${booking.doctorName} at ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
              Alert.alert('Unable to place call', `Please dial ${phone} manually.`);
            });
          }
        }
      ]
    );
  };

  const handleMessage = () => {
    if (booking.therapistId) {
      navigation.navigate('Chat', {
        recipientId: booking.therapistId,
        recipientName: booking.doctorName,
      });
    } else {
      Alert.alert('Direct Message', `Connecting to ${booking.doctorName}'s clinical desk...`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '600' }}>
          Loading appointment details...
        </Text>
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
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* STATUS & COUNTDOWN HERO CARD */}
        <View style={styles.heroStatusCard}>
          <View style={styles.heroHeaderRow}>
            <View style={[
              styles.upcomingBadge,
              booking.status === 'COMPLETED' && { backgroundColor: '#dcfce7' },
              booking.status === 'CANCELLED' && { backgroundColor: '#fee2e2' },
              (booking.status === 'NO_ATTENDANCE' || booking.status === 'PROVIDER_NO_SHOW' || booking.status === 'PATIENT_NO_SHOW') && { backgroundColor: '#fef3c7' },
            ]}>
              <Text style={[
                styles.upcomingBadgeText,
                booking.status === 'COMPLETED' && { color: '#16a34a' },
                booking.status === 'CANCELLED' && { color: '#dc2626' },
                (booking.status === 'NO_ATTENDANCE' || booking.status === 'PROVIDER_NO_SHOW' || booking.status === 'PATIENT_NO_SHOW') && { color: '#b45309' },
              ]}>
                {booking.status}
              </Text>
            </View>
            <Text style={styles.heroIdText}>{booking.id}</Text>
          </View>

          <View style={styles.countdownRow}>
            <Ionicons
              name={
                booking.status === 'CANCELLED' ? 'close-circle' :
                booking.status === 'COMPLETED' ? 'checkmark-circle' :
                (booking.status === 'NO_ATTENDANCE' || booking.status === 'PROVIDER_NO_SHOW' || booking.status === 'PATIENT_NO_SHOW' || booking.status === 'EXPIRED' || booking.status === 'PAYMENT_EXPIRED') ? 'alert-circle' :
                'time-outline'
              }
              size={24}
              color={
                booking.status === 'CANCELLED' ? '#ef4444' :
                booking.status === 'COMPLETED' ? '#16a34a' :
                (booking.status === 'NO_ATTENDANCE' || booking.status === 'PROVIDER_NO_SHOW' || booking.status === 'PATIENT_NO_SHOW' || booking.status === 'EXPIRED' || booking.status === 'PAYMENT_EXPIRED') ? '#f59e0b' :
                '#003D9B'
              }
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.countdownTitle,
                booking.status === 'CANCELLED' && { color: '#ef4444' },
                booking.status === 'COMPLETED' && { color: '#16a34a' },
                (booking.status === 'NO_ATTENDANCE' || booking.status === 'PROVIDER_NO_SHOW' || booking.status === 'PATIENT_NO_SHOW' || booking.status === 'EXPIRED' || booking.status === 'PAYMENT_EXPIRED') && { color: '#d97706' },
              ]}>
                {computeCountdown(booking.startTime, booking.status)}
              </Text>
              <Text style={styles.countdownSub}>
                {booking.status === 'CANCELLED'
                  ? `Cancelled • ${booking.date}`
                  : booking.date
                }
              </Text>
            </View>
          </View>
        </View>

        {/* DOCTOR CARD WITH CALL & MESSAGE */}
        <View style={styles.doctorCard}>
          <View style={styles.docHeaderRow}>
            <Image source={doctorAvatarSource} style={styles.docAvatar} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{booking.doctorName}</Text>
              <Text style={styles.docSpecialty}>{booking.specialty || 'Orthopedic Physiotherapy Specialist'}</Text>
              <Text style={styles.docMeta}>★ {booking.ratingAvg || 4.9} • ONE MEDICAL Hub</Text>
            </View>
          </View>

          <View style={styles.contactButtonsRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleCall} activeOpacity={0.85}>
              <Ionicons name="call-outline" size={16} color="#003D9B" style={{ marginRight: 6 }} />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleMessage} activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#003D9B" style={{ marginRight: 6 }} />
              <Text style={styles.contactBtnText}>Message</Text>
            </TouchableOpacity>
          </View>

          {booking.status === 'COMPLETED' ? (
            <TouchableOpacity
              style={[styles.rateDoctorBtn, { backgroundColor: '#fef3c7', borderColor: '#fde047', marginTop: 10 }]}
              onPress={() =>
                navigation.navigate('WriteDoctorReview', {
                  doctor: {
                    name: booking.doctorName,
                    specialty: booking.specialty,
                    clinic: booking.clinic,
                    rating: booking.ratingAvg || 4.9,
                    reviewsCount: 128,
                  },
                  booking,
                })
              }
            >
              <Ionicons name="star" size={16} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={[styles.contactBtnText, { color: '#b45309', fontWeight: '700' }]}>Rate Consultation</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* APPOINTMENT INFO GRID */}
        <View style={styles.infoGridCard}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>SERVICE</Text>
              <Text style={styles.infoValue}>{booking.service}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>DURATION</Text>
              <Text style={styles.infoValue}>{booking.duration}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View>
            <Text style={styles.infoLabel}>MODE & ADDRESS</Text>
            <Text style={styles.infoValueBold}>{booking.clinic}</Text>
            <Text style={styles.infoValueSub}>{booking.address}</Text>
          </View>

          {/* MAP PREVIEW & GET DIRECTIONS */}
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' }}
              style={styles.mapPhoto}
            />
            <TouchableOpacity
              style={styles.getDirectionsBtn}
              activeOpacity={0.85}
              onPress={() => {
                const query = encodeURIComponent(booking.address || 'ONE MEDICAL Center Bangalore');
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {
                  Alert.alert('Opening Maps', 'Navigating to ' + (booking.address || 'ONE MEDICAL Hub'));
                });
              }}
            >
              <Ionicons name="navigate-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.getDirectionsBtnText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PREPARATION CHECKLIST */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Preparation Checklist</Text>
          {checklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checkItemRow}
              onPress={() => toggleCheck(item.id)}
            >
              <Ionicons
                name={item.checked ? 'checkbox' : 'square-outline'}
                size={20}
                color={item.checked ? '#003D9B' : '#94a3b8'}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.checkItemText, item.checked && styles.checkItemTextChecked]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PAYMENT STATUS & RECEIPT */}
        <View style={styles.paymentStatusCard}>
          <View style={styles.paymentGridRow}>
            <View style={styles.paymentCol}>
              <Text style={styles.paymentFieldLabel}>PAYMENT STATUS</Text>
              {(() => {
                const isRefunded = booking.paymentStatus === 'REFUNDED';
                const isRefundPending = booking.paymentStatus === 'REFUND_PENDING';
                const isCancelledNoCharge = booking.status === 'CANCELLED' && (booking.paymentStatus === 'NOT_APPLICABLE' || !booking.paymentStatus);
                const isPaid = booking.paymentStatus === 'PAID';
                const amtFormatted = (booking.amount ? (booking.amount > 5000 ? Math.round(booking.amount / 100) : booking.amount) : 800).toLocaleString('en-IN');

                let badgeBg = '#fef3c7';
                let textColor = '#b45309';
                let iconName = 'time-outline';
                let label = 'Pay at Clinic';

                if (isRefunded) {
                  badgeBg = '#dcfce7';
                  textColor = '#15803d';
                  iconName = 'checkmark-circle';
                  label = `Refund Settled (₹${amtFormatted})`;
                } else if (isRefundPending) {
                  badgeBg = '#fef3c7';
                  textColor = '#b45309';
                  iconName = 'time-outline';
                  label = `Refund Processing (₹${amtFormatted})`;
                } else if (isCancelledNoCharge) {
                  badgeBg = '#f1f5f9';
                  textColor = '#475569';
                  iconName = 'close-circle-outline';
                  label = 'Cancelled (No Charge)';
                } else if (isPaid) {
                  badgeBg = '#dcfce7';
                  textColor = '#15803d';
                  iconName = 'checkmark-circle';
                  label = `Paid Online (₹${amtFormatted})`;
                }

                return (
                  <View style={[styles.statusBadgePill, { backgroundColor: badgeBg }]}>
                    <Ionicons name={iconName} size={13} color={textColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusBadgeText, { color: textColor }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.receiptCol}>
              <Text style={styles.paymentFieldLabelRight}>RECEIPT ID</Text>
              <View style={styles.receiptBadgePill}>
                <Text style={styles.receiptBadgeText} numberOfLines={1}>
                  {booking.receiptId || '—'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.downloadInvoiceBtn}
            onPress={() => navigation.navigate('InvoiceDetails', {
              transactionId: booking.paymentId || booking._id || appointmentId,
              appointmentId: booking._id || appointmentId,
              receiptId: booking.receiptId,
              doctorName: booking.doctorName,
              serviceName: booking.service,
              clinicName: booking.clinic,
              dateStr: booking.date,
              amount: booking.amount ? (booking.amount > 5000 ? Math.round(booking.amount / 100) : booking.amount) : 800,
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={15} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={styles.downloadInvoiceBtnText}>View Official Tax Invoice</Text>
          </TouchableOpacity>
        </View>

        {booking.status === 'CONFIRMED' || booking.status === 'UPCOMING' ? (
          <>
            <TouchableOpacity
              style={styles.primaryRescheduleBtn}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('RescheduleAppointment', { booking })}
            >
              <Text style={styles.primaryRescheduleBtnText}>Reschedule Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelLinkBtn}
              onPress={() => navigation.navigate('CancelAppointment', { booking })}
            >
              <Text style={styles.cancelLinkText}>Cancel Appointment</Text>
            </TouchableOpacity>
          </>
        ) : (booking.status === 'CANCELLED' || booking.status === 'NO_ATTENDANCE' || booking.status === 'PROVIDER_NO_SHOW' || booking.status === 'PATIENT_NO_SHOW' || booking.status === 'EXPIRED') ? (
          <TouchableOpacity
            style={styles.primaryRescheduleBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('BookAppointment')}
          >
            <Text style={styles.primaryRescheduleBtnText}>Book New Consultation</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* TAX INVOICE MODAL */}
      <Modal visible={invoiceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View>
                <Text style={styles.invoiceTitle}>ONE MEDICAL</Text>
                <Text style={styles.invoiceSub}>Official Consultation Invoice</Text>
              </View>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.invoiceDivider} />

            <View style={styles.invoiceRow}>
              <Text style={styles.invLabel}>Invoice No:</Text>
              <Text style={styles.invVal}>{booking.receiptId?.replace('#', '')}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invLabel}>Date & Time:</Text>
              <Text style={styles.invVal}>{booking.date}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invLabel}>Patient:</Text>
              <Text style={styles.invVal}>{user?.name || 'Udit'}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invLabel}>Specialist:</Text>
              <Text style={styles.invVal}>{booking.doctorName}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invLabel}>Service:</Text>
              <Text style={styles.invVal}>{booking.service}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invLabel}>Payment Mode:</Text>
              <Text style={styles.invVal}>Online (Razorpay / UPI)</Text>
            </View>

            <View style={styles.invoiceDivider} />

            <View style={styles.invoiceTotalRow}>
              <Text style={styles.invTotalLabel}>Total Paid:</Text>
              <Text style={styles.invTotalVal}>₹{(booking.amount / 100).toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeInvBtn}
              onPress={() => {
                setInvoiceModalVisible(false);
                Alert.alert('Invoice Saved', 'Tax invoice downloaded to your device.');
              }}
            >
              <Ionicons name="download-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.closeInvBtnText}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  heroStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  upcomingBadge: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003D9B',
  },
  heroIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  countdownSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  doctorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  docAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  docName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  docSpecialty: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  docMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003D9B',
    marginTop: 3,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
  rateDoctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoGridCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  infoValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  infoValueSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  mapContainer: {
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
    position: 'relative',
  },
  mapPhoto: {
    width: '100%',
    height: '100%',
  },
  getDirectionsBtn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003D9B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  getDirectionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  checklistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkItemText: {
    fontSize: 12,
    color: '#334155',
  },
  checkItemTextChecked: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  paymentStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  paymentGridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  paymentCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  receiptCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  paymentFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  paymentFieldLabelRight: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 5,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  receiptBadgePill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-end',
  },
  receiptBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  downloadInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  downloadInvoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  primaryRescheduleBtn: {
    backgroundColor: '#003D9B',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  primaryRescheduleBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  invoiceCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#003D9B',
    letterSpacing: 0.8,
  },
  invoiceSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  invVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  invTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  invTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16a34a',
  },
  closeInvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    borderRadius: 12,
    height: 44,
  },
  closeInvBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
