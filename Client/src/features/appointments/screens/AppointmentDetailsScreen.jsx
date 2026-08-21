import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_URL } from '../../../shared/config';
import paymentApi from '../../payments/api';
import { useNotification } from '../../../context/NotificationContext';

const { width } = Dimensions.get('window');

export default function AppointmentDetailsScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const { showInAppNotification } = useNotification() || {};
  const appointmentId = route.params?.appointmentId || 'apt_sample';

  const [clinicalContext, setClinicalContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrModalData, setQrModalData] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const fetchClinicalContext = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/appointments/${appointmentId}/clinical-context`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setClinicalContext(json.data);
      }
    } catch (err) {
      console.warn('[AppointmentDetails] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicalContext();
  }, [appointmentId, token]);

  const handleOpenClinicDynamicQr = async () => {
    try {
      const res = await paymentApi.generateClinicDynamicQr(appointmentId, token);
      if (res.success && res.data) {
        setQrModalData({
          ...res.data,
          patientName: snapshot.patientName,
          amount: Math.round((snapshot.amount || 49900) / 100),
        });
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to generate clinic UPI QR.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not reach payment gateway.');
    }
  };

  const handleVerifyClinicPayment = async () => {
    if (!qrModalData) return;
    setVerifyingPayment(true);
    try {
      const res = await paymentApi.verifyClinicPayment(qrModalData.appointmentId, qrModalData.gatewayOrderId, token);
      if (res.success) {
        if (showInAppNotification) {
          showInAppNotification({
            title: 'Payment Verified & Settled',
            message: `₹${qrModalData.amount || 499} payment verified. GST Tax invoice issued.`,
            type: 'payment.paid',
            category: 'PAYMENT SUCCESS',
            data: { appointmentId },
          });
        }
        Alert.alert('Payment Verified', 'UPI Payment verified successfully. GST Tax invoice issued.', [
          {
            text: 'OK',
            onPress: () => {
              setQrModalData(null);
              fetchClinicalContext();
            },
          },
        ]);
      } else {
        Alert.alert('Verification Failed', res.error?.message || 'Gateway has not confirmed payment yet.');
      }
    } catch (err) {
      Alert.alert('Verification Error', err.message || 'Unable to verify payment with gateway.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '600' }}>
          Loading clinical context...
        </Text>
      </SafeAreaView>
    );
  }

  const snapshot = clinicalContext?.patientSnapshot || {
    patientName: route.params?.patientName || 'Patient',
    age: '--',
    gender: 'Patient',
    patientIdFormatted: '#OM-PATIENT',
    primaryComplaint: 'Clinical Consultation',
    lastVisitDate: 'Initial Session',
    currentProgramName: 'General Assessment',
    recoveryGoalProgress: 0,
    painScore: 0,
    visitMode: 'Clinic Visit',
    clinicLocation: 'One Medical Hub',
    appointmentDate: 'Scheduled Date',
    appointmentTime: '10:00 AM',
    status: 'CONFIRMED',
    serviceCategory: 'Physiotherapy',
  };

  const latestReport = clinicalContext?.latestRecords && clinicalContext.latestRecords.length > 0 ? clinicalContext.latestRecords[0] : null;

  const getStatusBadge = (st) => {
    switch ((st || '').toUpperCase()) {
      case 'CONFIRMED':
        return { bg: '#dbeafe', text: '#1e40af', label: 'CONFIRMED' };
      case 'CANCELLED':
        return { bg: '#fee2e2', text: '#dc2626', label: 'CANCELLED' };
      case 'COMPLETED':
      case 'DOCUMENTED':
        return { bg: '#dcfce7', text: '#15803d', label: 'COMPLETED' };
      case 'NO_ATTENDANCE':
      case 'MISSED':
        return { bg: '#fef3c7', text: '#b45309', label: 'MISSED SESSION' };
      case 'IN_PROGRESS':
        return { bg: '#e0e7ff', text: '#4338ca', label: 'IN PROGRESS' };
      default:
        return { bg: '#eff6ff', text: '#1d4ed8', label: st || 'CONFIRMED' };
    }
  };

  const statusBadge = getStatusBadge(snapshot.status);
  const isOnlineMode = (snapshot.visitMode || '').toLowerCase().includes('online') || (snapshot.visitMode || '').toLowerCase().includes('video');
  const isHomeMode = (snapshot.visitMode || '').toLowerCase().includes('home');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Purple Alert Banner for Recent Report (Only if report exists) */}
        {latestReport && (
          <TouchableOpacity
            style={styles.alertBanner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MedicalRecordsVault')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="information-circle" size={18} color="#9333ea" />
              <Text style={styles.alertBannerText} numberOfLines={1}>
                Recent {latestReport.title || latestReport.category?.replace(/_/g, ' ') || 'medical record'} uploaded ({new Date(latestReport.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9333ea" />
          </TouchableOpacity>
        )}

        {/* Patient Hero Profile Card */}
        <View style={styles.patientHeroCard}>
          <View style={styles.heroAvatarContainer}>
            <View style={styles.avatarLargeCircle}>
              <Text style={styles.avatarLargeText}>{snapshot.patientName.charAt(0).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.heroInfoCenter}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroPatientName}>{snapshot.patientName}</Text>
              <View style={[styles.confirmedBadge, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.confirmedBadgeText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
              </View>
            </View>

            <Text style={styles.heroSubText}>
              {snapshot.age ? `${snapshot.age}y, ` : ''}{snapshot.gender} • ID: {snapshot.patientIdFormatted}
            </Text>

            <View style={styles.heroChipsRow}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{snapshot.serviceCategory || 'Physiotherapy'}</Text>
              </View>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{snapshot.lastVisitDate === 'Initial Session' ? 'Initial Evaluation' : 'Follow-up'}</Text>
              </View>
            </View>

            {/* Vitals Meters */}
            <View style={styles.heroMetersRow}>
              <View style={styles.meterBox}>
                <Text style={styles.meterLab}>PAIN SCORE</Text>
                <Text style={styles.meterVal}>{snapshot.painScore}/10</Text>
              </View>

              <View style={styles.meterBox}>
                <Text style={styles.meterLab}>PROGRESS</Text>
                <Text style={styles.meterVal}>{snapshot.recoveryGoalProgress}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Schedule & Mode Cards */}
        <View style={styles.scheduleInfoCard}>
          <View style={styles.infoRowItem}>
            <View style={[styles.infoIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="calendar" size={18} color="#003D9B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoRowLabel}>Appointment Schedule</Text>
              <Text style={styles.infoRowDate}>{snapshot.appointmentDate}</Text>
              <Text style={styles.infoRowTime}>{snapshot.appointmentTime}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.infoRowItem}>
            <View style={[styles.infoIconBox, { backgroundColor: isOnlineMode ? '#eff6ff' : isHomeMode ? '#fef3c7' : '#f0fdfa' }]}>
              <Ionicons
                name={isOnlineMode ? 'videocam' : isHomeMode ? 'home' : 'location'}
                size={18}
                color={isOnlineMode ? '#003D9B' : isHomeMode ? '#d97706' : '#0d9488'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoRowLabel}>Visit Mode</Text>
              <Text style={styles.infoRowDate}>{snapshot.visitMode}</Text>
              <Text style={styles.infoRowTime}>{snapshot.clinicLocation}</Text>
            </View>
          </View>
        </View>

        {/* UPI PAYMENT STATUS & SELF-PAY BANNER */}
        {snapshot?.paymentStatus !== 'PAID' && snapshot?.status !== 'CANCELLED' && (
          <View style={{ backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#bfdbfe', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="qr-code-outline" size={20} color="#003D9B" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#003D9B' }}>Payment Pending (₹{Math.round((snapshot.amount || 49900) / 100)})</Text>
              </View>
              <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#b45309' }}>PAY AT CLINIC</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#475569', lineHeight: 16 }}>
              You can pay right now via UPI to skip reception counter queues, or scan the dynamic clinic QR upon arrival.
            </Text>
            {user?.role === 'therapist' ? (
              <TouchableOpacity
                style={{ backgroundColor: '#003D9B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                activeOpacity={0.85}
                onPress={handleOpenClinicDynamicQr}
              >
                <Ionicons name="qr-code" size={16} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Collect Payment / Generate Dynamic QR</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{ backgroundColor: '#003D9B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ChoosePayment', { appointmentId })}
              >
                <Ionicons name="flash" size={16} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Pay ₹{Math.round((snapshot.amount || 49900) / 100)} via UPI Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Clinical Snapshot */}
        <View style={styles.clinicalSnapshotCard}>
          <Text style={styles.sectionHeading}>CLINICAL SNAPSHOT</Text>

          <View style={styles.snapshotDataRow}>
            <Text style={styles.snapshotLabel}>Primary Complaint</Text>
            <Text style={styles.snapshotValue}>{snapshot.primaryComplaint}</Text>
          </View>

          <View style={styles.snapshotDataRow}>
            <Text style={styles.snapshotLabel}>Last Visit</Text>
            <Text style={styles.snapshotValue}>{snapshot.lastVisitDate}</Text>
          </View>

          <View style={styles.snapshotDataRow}>
            <Text style={styles.snapshotLabel}>Current Program</Text>
            <Text style={[styles.snapshotValue, { color: '#003D9B', fontWeight: '800' }]}>
              {snapshot.currentProgramName}
            </Text>
          </View>

          {/* Recovery Goal Progress Bar */}
          <View style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.goalLabel}>RECOVERY GOAL</Text>
              <Text style={styles.goalPercent}>{snapshot.recoveryGoalProgress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${snapshot.recoveryGoalProgress}%` }]} />
            </View>
          </View>
        </View>

        {/* Quick Access Grid */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionHeading}>QUICK ACCESS</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() =>
                navigation.navigate('MedicalRecords', {
                  patientId: snapshot.patientId,
                  patientName: snapshot.patientName,
                })
              }
            >
              <Ionicons name="medkit-outline" size={22} color="#003D9B" />
              <Text style={styles.quickAccessText}>Medical History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() =>
                navigation.navigate('MedicalRecordsVault', {
                  patientId: snapshot.patientId,
                  patientName: snapshot.patientName,
                })
              }
            >
              <Ionicons name="folder-outline" size={22} color="#003D9B" />
              <Text style={styles.quickAccessText}>Previous Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() =>
                navigation.navigate('RecoveryProgressAnalytics', {
                  patientId: snapshot.patientId,
                  programId: clinicalContext?.activeProgram?._id || '',
                  patientName: snapshot.patientName,
                })
              }
            >
              <Ionicons name="trending-up-outline" size={22} color="#003D9B" />
              <Text style={styles.quickAccessText}>Recovery Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() =>
                navigation.navigate('InvoiceDetails', {
                  transactionId: snapshot.transactionId || snapshot.appointmentId || appointmentId,
                  appointmentId,
                })
              }
            >
              <Ionicons name="receipt-outline" size={22} color="#003D9B" />
              <Text style={styles.quickAccessText}>Tax Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic CTA & Secondary Actions based on Appointment Lifecycle & User Role */}
        {['COMPLETED', 'DOCUMENTED'].includes(snapshot.status) ? (
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={[styles.startConsultationBtn, { backgroundColor: '#16a34a' }]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ClinicalConsultation', {
                  appointmentId,
                  patientName: snapshot.patientName,
                })
              }
            >
              <Ionicons name="document-text" size={16} color="#ffffff" />
              <Text style={styles.startConsultationText}>View Signed Clinical Summary</Text>
            </TouchableOpacity>

            {user?.role === 'patient' && (
              <TouchableOpacity
                style={[styles.startConsultationBtn, { backgroundColor: '#ffffff', borderColor: '#003D9B', borderWidth: 1.5, marginTop: 12 }]}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('BookAppointment', {
                    therapistId: snapshot.therapistId,
                    therapistName: snapshot.therapistName,
                  })
                }
              >
                <Ionicons name="calendar-outline" size={16} color="#003D9B" />
                <Text style={[styles.startConsultationText, { color: '#003D9B' }]}>Book Follow-up Appointment</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : snapshot.status === 'CANCELLED' ? (
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={styles.startConsultationBtn}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('BookAppointment', {
                  therapistId: snapshot.therapistId,
                  therapistName: snapshot.therapistName,
                })
              }
            >
              <Ionicons name="refresh" size={16} color="#ffffff" />
              <Text style={styles.startConsultationText}>Re-book Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Start Consultation CTA */}
            <TouchableOpacity
              style={styles.startConsultationBtn}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ClinicalConsultation', {
                  appointmentId,
                  patientName: snapshot.patientName,
                })
              }
            >
              <Ionicons name="play" size={16} color="#ffffff" />
              <Text style={styles.startConsultationText}>Start Consultation</Text>
            </TouchableOpacity>

            {/* Reschedule & Cancel Row */}
            <View style={styles.bottomSecondaryRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('RescheduleAppointment', {
                    appointmentId,
                    booking: { _id: appointmentId, doctorName: snapshot.therapistName },
                  })
                }
              >
                <Text style={styles.rescheduleText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('CancelAppointment', {
                    appointmentId,
                    booking: { _id: appointmentId, doctorName: snapshot.therapistName },
                  })
                }
              >
                <Text style={styles.cancelText}>Cancel Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CLINIC DYNAMIC UPI QR MODAL */}
      <Modal visible={!!qrModalData} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View>
                <Text style={styles.qrModalTitle}>Clinic Dynamic UPI QR</Text>
                <Text style={styles.qrModalSub}>Instant counterless UPI payment capture</Text>
              </View>
              <TouchableOpacity onPress={() => setQrModalData(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrImageBox}>
              <Ionicons name="qr-code" size={140} color="#003D9B" />
              <View style={styles.qrLivePill}>
                <View style={styles.liveGreenDot} />
                <Text style={styles.qrLiveText}>SECURE UPI AUTOPAY</Text>
              </View>
            </View>

            <View style={styles.qrDetailsBox}>
              <Text style={styles.qrPatientName}>{qrModalData?.patientName || snapshot.patientName}</Text>
              <Text style={styles.qrAmountText}>₹{qrModalData?.amount || 499}</Text>
              <Text style={styles.qrVpaText}>{qrModalData?.vpa || 'onemedical.clinic@icici'}</Text>
            </View>

            <TouchableOpacity
              style={styles.verifyPaymentBtn}
              activeOpacity={0.85}
              disabled={verifyingPayment}
              onPress={handleVerifyClinicPayment}
            >
              {verifyingPayment ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.verifyPaymentBtnText}>Confirm & Verify Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf5ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  alertBannerText: { fontSize: 12, fontWeight: '700', color: '#7e22ce' },

  // Hero Card
  patientHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#003D9B',
    overflow: 'hidden',
  },
  avatarLargeCircle: { alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { fontSize: 30, fontWeight: '900', color: '#003D9B' },
  heroInfoCenter: { alignItems: 'center', gap: 6, width: '100%' },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPatientName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  confirmedBadge: { backgroundColor: '#1d4ed8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  confirmedBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  heroSubText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  heroChipsRow: { flexDirection: 'row', gap: 6 },
  heroChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  heroChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },

  heroMetersRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 6 },
  meterBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  meterLab: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  meterVal: { fontSize: 16, fontWeight: '900', color: '#003D9B', marginTop: 2 },

  // Schedule Info Card
  scheduleInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  infoRowItem: { flexDirection: 'row', gap: 12 },
  infoIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoRowLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  infoRowDate: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  infoRowTime: { fontSize: 12, color: '#003D9B', fontWeight: '700', marginTop: 1 },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9' },

  // Clinical Snapshot
  clinicalSnapshotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  sectionHeading: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  snapshotDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  snapshotLabel: { fontSize: 13, color: '#64748b' },
  snapshotValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  goalLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  goalPercent: { fontSize: 11, fontWeight: '800', color: '#003D9B' },
  progressBarTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#003D9B', borderRadius: 3 },

  // Quick Access
  quickAccessSection: { gap: 8 },
  quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAccessCard: {
    width: (width - 42) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 6,
  },
  quickAccessText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  // CTA
  startConsultationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#003D9B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startConsultationText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  bottomSecondaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  secondaryActionBtn: { padding: 8 },
  rescheduleText: { color: '#003D9B', fontSize: 13, fontWeight: '700' },
  cancelText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },

  // QR Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#003D9B',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  qrModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  qrModalSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  qrImageBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  qrLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  liveGreenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  qrLiveText: { fontSize: 10, fontWeight: '800', color: '#003D9B' },
  qrDetailsBox: { alignItems: 'center', marginBottom: 20 },
  qrPatientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  qrAmountText: { fontSize: 24, fontWeight: '900', color: '#003D9B', marginVertical: 4 },
  qrVpaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  verifyPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
  },
  verifyPaymentBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
