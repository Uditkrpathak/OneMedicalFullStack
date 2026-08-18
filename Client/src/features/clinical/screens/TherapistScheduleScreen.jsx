import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../../shared/config';
import paymentApi from '../../payments/api';

const { width } = Dimensions.get('window');

export default function TherapistScheduleScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);

  const [selectedDateIndex, setSelectedDateIndex] = useState(0); // Index 0 is Today
  const [activeFilter, setActiveFilter] = useState('All');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter modals state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [consultTypeFilter, setConsultTypeFilter] = useState('ALL');

  // Clinic Dynamic UPI QR state
  const [qrModalData, setQrModalData] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const handleOpenClinicUpiQr = async (appt) => {
    try {
      const res = await paymentApi.generateClinicDynamicQr(appt.id, token);
      if (res.success && res.data) {
        setQrModalData({
          ...res.data,
          patientName: appt.patientName,
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
        Alert.alert('Payment Verified', 'UPI Payment verified successfully. GST Tax invoice issued.', [
          {
            text: 'OK',
            onPress: () => {
              setQrModalData(null);
              fetchSchedule();
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

  const generateWeekDays = () => {
    const list = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      list.push({
        iso,
        day: dayNames[d.getDay()],
        date: String(d.getDate()),
        full: i === 0 ? `Today, ${monthNames[d.getMonth()]} ${d.getDate()}` : `${fullDayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`,
        isToday: i === 0,
      });
    }
    return list;
  };

  const weekDays = generateWeekDays();

  const fetchSchedule = async () => {
    if (!token) return;
    try {
      const selectedDay = weekDays[selectedDateIndex];
      const query = selectedDay?.iso ? `?date=${selectedDay.iso}` : '';

      const res = await fetch(`${API_URL}/therapists/appointments/queue${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success && (json.data?.appointments || json.appointments) && (json.data?.appointments || json.appointments).length > 0) {
        const queue = json.data?.appointments || json.appointments || [];
        const list = queue.map((a) => {
          const status = a.status || 'CONFIRMED';
          const type = a.consultationType === 'VIDEO' ? 'telehealth' : 'clinic_visit';
          const timeFormatted = a.time || (a.startTime ? new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '10:00 AM');
          return {
            id: a.id || a.appointmentId || a._id,
            time: timeFormatted,
            patientName: a.patient?.name || a.patientName || 'Patient',
            condition: a.condition || 'Physical Rehabilitation',
            sessionInfo: `${timeFormatted} — 45m session`,
            status,
            type,
          };
        });
        setAppointments(list);
      } else {
        // Fallback to dashboard daily timeline
        const dashRes = await fetch(`${API_URL}/therapists/me/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dashJson = await dashRes.json();
        if (dashJson.success && dashJson.data?.dailyTimeline) {
          const list = dashJson.data.dailyTimeline.map((a) => {
            const status = a.status || 'CONFIRMED';
            const type = a.appointmentType || 'clinic_visit';
            const timeFormatted = a.time || '10:00 AM';
            return {
              id: a.id || a._id,
              time: timeFormatted,
              patientName: a.patientName || 'Patient',
              condition: a.condition || 'Physical Rehabilitation',
              sessionInfo: `${timeFormatted} — 45m session`,
              status,
              type,
            };
          });
          setAppointments(list);
        } else {
          setAppointments([]);
        }
      }
    } catch (err) {
      console.warn('[TherapistSchedule] fetch error:', err.message);
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [token, selectedDateIndex])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const filteredAppointments = appointments.filter((item) => {
    // Status Filter
    if (activeFilter === 'Confirmed' && !['CONFIRMED', 'SCHEDULED'].includes(item.status)) return false;
    if (activeFilter === 'In Progress' && item.status !== 'IN_PROGRESS') return false;
    if (activeFilter === 'Completed' && !['COMPLETED', 'DOCUMENTED', 'DOCUMENTATION_PENDING'].includes(item.status)) return false;

    // Type Filter
    if (consultTypeFilter === 'CLINIC' && item.type !== 'clinic_visit') return false;
    if (consultTypeFilter === 'VIDEO' && item.type !== 'telehealth') return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.patientName?.toLowerCase().includes(q);
      const matchCond = item.condition?.toLowerCase().includes(q);
      const matchStatus = item.status?.toLowerCase().includes(q);
      if (!matchName && !matchCond && !matchStatus) return false;
    }

    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorAvatarText}>
              {user?.name ? user.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() : 'V'}
            </Text>
          </View>
          <Text style={styles.headerDateTitle}>
            {weekDays[selectedDateIndex]?.full || 'Tuesday, Oct 24'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconBtn, showCalendarModal && styles.headerIconBtnActive]}
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={19} color="#003D9B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, showSearch && styles.headerIconBtnActive]}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={19} color="#003D9B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, showFilterModal && styles.headerIconBtnActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter-outline" size={19} color="#003D9B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Input */}
      {showSearch && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient, condition, or status..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Week Day Selector */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((item, idx) => {
          const isSelected = selectedDateIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.weekDayCol, isSelected && styles.weekDayColActive]}
              onPress={() => setSelectedDateIndex(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekDayLabel, isSelected && styles.weekDayLabelActive]}>
                {item.day}
              </Text>
              <View style={[styles.dateBubble, isSelected && styles.dateBubbleActive]}>
                <Text style={[styles.dateNumber, isSelected && styles.dateNumberActive]}>
                  {item.date}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter Tabs (Horizontal Scrollable for Perfect Responsiveness) */}
      <View style={styles.filterPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {['All', 'Confirmed', 'In Progress', 'Completed', 'Missed'].map((pill) => {
            const isActive = activeFilter === pill;
            return (
              <TouchableOpacity
                key={pill}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(pill)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Schedule Timeline Content */}
      <ScrollView
        contentContainerStyle={styles.scheduleListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#003D9B" />
          </View>
        ) : filteredAppointments.length > 0 ? (
          filteredAppointments.map((appt, index) => {
            const isCompleted = appt.status === 'COMPLETED' || appt.status === 'DOCUMENTED';
            const isInProgress = appt.status === 'IN_PROGRESS';
            const isConfirmed = appt.status === 'CONFIRMED' || appt.status === 'SCHEDULED';
            const isDocPending = appt.status === 'DOCUMENTATION_PENDING';
            const isCheckedIn = appt.status === 'CHECKED_IN' || appt.status === 'WAITING_FOR_THERAPIST';
            const isProviderNoShow = appt.status === 'PROVIDER_NO_SHOW';
            const isPatientNoShow = appt.status === 'PATIENT_NO_SHOW';
            const isNoAttendance = appt.status === 'NO_ATTENDANCE';

            return (
              <View key={appt.id || index} style={styles.timelineCardRow}>
                {/* Left Time Column & Track */}
                <View style={styles.timeTrackCol}>
                  <Text style={styles.timelineTimeText}>{appt.time?.split(' ')[0] || '10:00'}</Text>
                  <View
                    style={[
                      styles.trackNode,
                      isCompleted && styles.nodeCompleted,
                      isInProgress && styles.nodeInProgress,
                      isDocPending && styles.nodeDocPending,
                      isProviderNoShow && { borderColor: '#ef4444', backgroundColor: '#ef4444' },
                    ]}
                  />
                  {index < filteredAppointments.length - 1 && <View style={styles.trackLine} />}
                </View>

                {/* Right Appointment Card */}
                <View
                  style={[
                    styles.appointmentCard,
                    isInProgress && styles.cardHighlightInProgress,
                    isDocPending && styles.cardHighlightDocPending,
                    isProviderNoShow && { borderColor: '#fecaca', borderWidth: 1.5 },
                  ]}
                >
                  {/* Card Header: Patient Name & Status Tag */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.patientNameHeader}>{appt.patientName}</Text>
                    {isCompleted && (
                      <View style={styles.tagCompleted}>
                        <Text style={styles.tagCompletedText}>COMPLETED</Text>
                      </View>
                    )}
                    {isInProgress && (
                      <View style={styles.tagInProgress}>
                        <View style={styles.greenLiveDot} />
                        <Text style={styles.tagInProgressText}>IN PROGRESS</Text>
                      </View>
                    )}
                    {isCheckedIn && (
                      <View style={[styles.tagConfirmed, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.tagConfirmedText, { color: '#b45309' }]}>PATIENT WAITING</Text>
                      </View>
                    )}
                    {isConfirmed && !isCheckedIn && (
                      <View style={styles.tagConfirmed}>
                        <Text style={styles.tagConfirmedText}>CONFIRMED</Text>
                      </View>
                    )}
                    {isProviderNoShow && (
                      <View style={[styles.tagCompleted, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.tagCompletedText, { color: '#dc2626' }]}>MISSED SESSION</Text>
                      </View>
                    )}
                    {isPatientNoShow && (
                      <View style={[styles.tagCompleted, { backgroundColor: '#fef2f2' }]}>
                        <Text style={[styles.tagCompletedText, { color: '#b91c1c' }]}>NO SHOW</Text>
                      </View>
                    )}
                    {isNoAttendance && (
                      <View style={styles.tagCompleted}>
                        <Text style={styles.tagCompletedText}>UNATTENDED</Text>
                      </View>
                    )}
                    {isDocPending && (
                      <View style={styles.tagDocPending}>
                        <Text style={styles.tagDocPendingText}>DOC PENDING</Text>
                      </View>
                    )}
                  </View>

                  {/* Visit Mode & Complaint Subtitle */}
                  <View style={styles.conditionRow}>
                    <Ionicons
                      name={appt.type === 'telehealth' ? 'videocam-outline' : 'location-outline'}
                      size={14}
                      color={appt.type === 'telehealth' ? '#0284c7' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.conditionSubText}>
                      {appt.type === 'telehealth' ? 'Online Consultation' : 'Clinic Visit'} • {appt.condition}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.cardInnerDivider} />

                  {/* State-Machine Specific Action Rows */}
                  {isCompleted && (
                    <View style={styles.completedFooterRow}>
                      <Text style={styles.sessionDurationText}>{appt.sessionInfo}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('AppointmentDetails', {
                            appointmentId: appt.id,
                            patientName: appt.patientName,
                          })
                        }
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                      >
                        <Text style={styles.viewSummaryLink}>View Summary</Text>
                        <Ionicons name="chevron-forward" size={13} color="#003D9B" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {isInProgress && (
                    <View style={styles.inProgressActionRow}>
                      <TouchableOpacity
                        style={styles.joinSessionBtn}
                        activeOpacity={0.85}
                        onPress={() =>
                          navigation.navigate('VideoCall', {
                            callId: `call_${appt.id}`,
                            isCaller: true,
                            recipientName: appt.patientName,
                            appointmentId: appt.id,
                          })
                        }
                      >
                        <Ionicons name="videocam" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.joinSessionText}>Join Session</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.phoneActionBtn}
                        onPress={() =>
                          navigation.navigate('AppointmentDetails', {
                            appointmentId: appt.id,
                            patientName: appt.patientName,
                          })
                        }
                      >
                        <Ionicons name="call" size={16} color="#003D9B" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {isConfirmed && (
                    <View style={styles.confirmedActionRow}>
                      {appt.paymentStatus !== 'PAID' && (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#fef3c7',
                            borderColor: '#fde68a',
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 8,
                          }}
                          onPress={() => handleOpenClinicUpiQr(appt)}
                        >
                          <Ionicons name="qr-code" size={14} color="#b45309" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309' }}>Collect UPI</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.detailsOutlineBtn}
                        onPress={() =>
                          navigation.navigate('AppointmentDetails', {
                            appointmentId: appt.id,
                            patientName: appt.patientName,
                          })
                        }
                      >
                        <Text style={styles.detailsBtnText}>Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.preChartOutlineBtn}
                        onPress={() =>
                          navigation.navigate('ClinicalConsultation', {
                            appointmentId: appt.id,
                            patientName: appt.patientName,
                          })
                        }
                      >
                        <Text style={styles.preChartBtnText}>Pre-Chart</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isDocPending && (
                    <TouchableOpacity
                      style={styles.completeNotesBtn}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('ClinicalConsultation', {
                          appointmentId: appt.id,
                          patientName: appt.patientName,
                        })
                      }
                    >
                      <Ionicons name="create-outline" size={16} color="#6b21a8" style={{ marginRight: 6 }} />
                      <Text style={styles.completeNotesText}>Complete Notes</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyStateBox}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyStateTitle}>No Consultations Found</Text>
            <Text style={styles.emptyStateSub}>No appointments match your active filter for this day.</Text>
          </View>
        )}
      </ScrollView>

      {/* Calendar Picker Modal */}
      <Modal visible={showCalendarModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Schedule Date</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarGrid}>
              {weekDays.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.calDateBox, selectedDateIndex === idx && styles.calDateBoxActive]}
                  onPress={() => {
                    setSelectedDateIndex(idx);
                    setShowCalendarModal(false);
                  }}
                >
                  <Text style={[styles.calDayText, selectedDateIndex === idx && styles.calDayTextActive]}>
                    {item.day}
                  </Text>
                  <Text style={[styles.calDateNum, selectedDateIndex === idx && styles.calDateNumActive]}>
                    {item.date}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filter Consultations</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginTop: 12 }}>
              {[
                { id: 'ALL', label: 'All Modes' },
                { id: 'CLINIC', label: 'Clinic Visits' },
                { id: 'VIDEO', label: 'Video Consultations' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.filterOptRow, consultTypeFilter === opt.id && styles.filterOptRowActive]}
                  onPress={() => {
                    setConsultTypeFilter(opt.id);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[styles.filterOptText, consultTypeFilter === opt.id && styles.filterOptTextActive]}>
                    {opt.label}
                  </Text>
                  {consultTypeFilter === opt.id && <Ionicons name="checkmark" size={18} color="#003D9B" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Dynamic Clinic UPI QR Modal */}
      <Modal visible={!!qrModalData} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModalContent, { padding: 24, alignItems: 'center' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Clinic UPI Payment</Text>
              <TouchableOpacity onPress={() => setQrModalData(null)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* QR Icon Frame */}
            <View style={{ width: 180, height: 180, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 2, borderColor: '#003D9B', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="qr-code" size={130} color="#003D9B" />
              <View style={{ position: 'absolute', bottom: 8, backgroundColor: '#003D9B', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>DYNAMIC UPI QR</Text>
              </View>
            </View>

            <Text style={{ fontSize: 22, fontWeight: '900', color: '#003D9B' }}>₹{qrModalData?.amountRupees || 499}</Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Patient: {qrModalData?.patientName || 'Patient'}</Text>
            <Text style={{ fontSize: 11, color: '#003D9B', fontWeight: '700', marginTop: 4 }}>VPA: {qrModalData?.upiVpa || 'onemedical.pay@icici'}</Text>

            <View style={{ width: '100%', height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 }} />

            <TouchableOpacity
              style={{
                width: '100%',
                backgroundColor: '#003D9B',
                height: 48,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              activeOpacity={0.85}
              disabled={verifyingPayment}
              onPress={handleVerifyClinicPayment}
            >
              {verifyingPayment ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Verify Server Payment</Text>
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  doctorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatarText: { fontSize: 16, fontWeight: '800', color: '#003D9B' },
  headerDateTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerIconBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#003D9B',
    borderWidth: 1,
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', padding: 0 },

  // Week Days
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  weekDayCol: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 12 },
  weekDayColActive: {},
  weekDayLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  weekDayLabelActive: { color: '#003D9B' },
  dateBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBubbleActive: { backgroundColor: '#003D9B' },
  dateNumber: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dateNumberActive: { color: '#ffffff' },

  // Filter Pills
  filterPillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: { backgroundColor: '#003D9B', borderColor: '#003D9B' },
  filterPillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterPillTextActive: { color: '#ffffff' },

  // Timeline List
  scheduleListContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 6 },
  timelineCardRow: { flexDirection: 'row', marginBottom: 16 },
  timeTrackCol: { width: 50, alignItems: 'center', marginRight: 10 },
  timelineTimeText: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 },
  trackNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    zIndex: 2,
  },
  nodeCompleted: { borderColor: '#94a3b8', backgroundColor: '#94a3b8' },
  nodeInProgress: { borderColor: '#003D9B', backgroundColor: '#003D9B', width: 16, height: 16, borderRadius: 8 },
  nodeDocPending: { borderColor: '#9333ea', backgroundColor: '#9333ea' },
  trackLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: -2 },

  // Right Appointment Card
  appointmentCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHighlightInProgress: {
    borderColor: '#bfdbfe',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  cardHighlightDocPending: {
    borderColor: '#f3e8ff',
    borderWidth: 1.5,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientNameHeader: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },

  // Status Badges
  tagCompleted: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  tagCompletedText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  tagInProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    gap: 4,
  },
  greenLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  tagInProgressText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  tagConfirmed: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  tagConfirmedText: { fontSize: 10, fontWeight: '800', color: '#003D9B' },
  tagDocPending: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#faf5ff',
  },
  tagDocPendingText: { fontSize: 10, fontWeight: '800', color: '#7e22ce' },

  conditionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  conditionSubText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  cardInnerDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },

  // Card Action Buttons
  completedFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDurationText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  viewSummaryLink: { fontSize: 12, fontWeight: '700', color: '#003D9B' },

  inProgressActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  joinSessionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinSessionText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  phoneActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  confirmedActionRow: { flexDirection: 'row', gap: 8 },
  detailsOutlineBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  preChartOutlineBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  preChartBtnText: { fontSize: 12, fontWeight: '700', color: '#003D9B' },

  completeNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingVertical: 9,
    borderRadius: 8,
  },
  completeNotesText: { fontSize: 12, fontWeight: '700', color: '#7e22ce' },

  // Empty State
  emptyStateBox: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginBottom: 4 },
  emptyStateSub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarModalContent: { backgroundColor: '#ffffff', width: '100%', borderRadius: 20, padding: 20, elevation: 5 },
  filterModalContent: { backgroundColor: '#ffffff', width: '100%', borderRadius: 20, padding: 20, elevation: 5 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  calDateBox: { width: (width - 80) / 4, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  calDateBoxActive: { backgroundColor: '#003D9B', borderColor: '#003D9B' },
  calDayText: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  calDayTextActive: { color: '#ffffff' },
  calDateNum: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  calDateNumActive: { color: '#ffffff' },

  filterOptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  filterOptRowActive: { borderColor: '#003D9B', backgroundColor: '#eff6ff' },
  filterOptText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  filterOptTextActive: { color: '#003D9B', fontWeight: '800' },
});
