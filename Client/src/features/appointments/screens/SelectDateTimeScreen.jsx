import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import appointmentApi from '../api';
import { getDoctorAvatarSource } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

// Generate dynamic 14-day date strip
const generateDates = () => {
  const dates = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = dayNames[d.getDay()];
    const monthName = monthNames[d.getMonth()];
    const dateNum = d.getDate();
    const fullYear = d.getFullYear();
    const isoDate = d.toISOString().split('T')[0];
    
    dates.push({
      id: isoDate,
      day: dayName,
      date: String(dateNum),
      month: monthName,
      year: fullYear,
      full: `${dayName}, ${dateNum} ${monthName}`,
      fullYearStr: `${dayName}, ${dateNum} ${monthName} ${fullYear}`,
      isToday: i === 0,
    });
  }
  return dates;
};

export default function SelectDateTimeScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const doctor = route.params?.doctor || {
    name: 'Dr. Specialist',
    specialty: 'MSK Specialist • One Medical Hub',
    fee: 1500,
    rating: 4.9,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
  };
  const therapistId = route.params?.therapistId || doctor?.id || doctor?._id;

  const datesList = generateDates();
  const [selectedDateObj, setSelectedDateObj] = useState(datesList[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);  // full ISO slot object { startTime, endTime, status }
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Fetch real slots from backend whenever selected date changes
  useEffect(() => {
    if (!therapistId || !selectedDateObj?.id) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedSlot(null);
      try {
        const res = await appointmentApi.getSlotAvailability(therapistId, selectedDateObj.id, token);
        if (res.success && Array.isArray(res.data?.slots)) {
          setSlots(res.data.slots);
          if (res.data.onLeave) {
            setSlotsError('Specialist is on leave for the selected date. Please choose another day.');
          } else if (res.data.isWorkingDay === false) {
            setSlotsError('Specialist is not available on this day of the week.');
          } else if (res.data.slots.length === 0) {
            setSlotsError('No slots available on this date.');
          }
        } else {
          setSlots([]);
          setSlotsError('No schedule configured for this date.');
        }
      } catch (err) {
        console.warn('Slot availability fetch error:', err.message);
        setSlots([]);
        setSlotsError('Could not load slots. Please select another date.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDateObj, therapistId, token]);

  const classifySlots = () => {
    const morning = [], afternoon = [], evening = [];
    for (const slot of slots) {
      const d = new Date(slot.startTime);
      const istHours = (d.getUTCHours() + 5.5) % 24;
      if (istHours < 12)       morning.push(slot);
      else if (istHours < 17)  afternoon.push(slot);
      else                    evening.push(slot);
    }
    return { morning, afternoon, evening };
  };

  const formatSlotTime = (isoStr) => {
    try {
      return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    } catch {
      return '10:00 AM';
    }
  };

  // Create hold and navigate with only appointmentId
  const handleContinue = async () => {
    if (!selectedSlot) {
      Alert.alert('Select a Time', 'Please select an available time slot to continue.');
      return;
    }
    if (!therapistId) {
      Alert.alert('Error', 'Missing therapist information. Please go back and select a therapist.');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await appointmentApi.createHold({
        therapistId,
        startTime: selectedSlot.startTime,
        endTime:   selectedSlot.endTime,
        serviceType: route.params?.serviceType || 'PHYSIOTHERAPY_SESSION',
        appointmentPlace: route.params?.appointmentPlace || 'CLINIC',
      }, token);

      if (res?.success && res?.data?.appointment?._id) {
        // Navigate with ONLY appointmentId — backend authoritative
        navigation.navigate('ChoosePayment', { appointmentId: res.data.appointment._id });
      } else if (res?.error?.code === 'SLOT_UNAVAILABLE') {
        Alert.alert('Slot Taken', 'This slot was just taken. Please choose another available slot.');
        const refreshed = await appointmentApi.getSlotAvailability(therapistId, selectedDateObj.id, token);
        if (refreshed.success) setSlots(refreshed.data?.slots || []);
        setSelectedSlot(null);
      } else {
        Alert.alert('Booking Error', res?.error?.message || 'Could not hold slot. Please try again.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to server. Please check your connection.');
    } finally {
      setBookingLoading(false);
    }
  };

  const { morning, afternoon, evening } = classifySlots();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Date & Time</Text>
        <TouchableOpacity style={styles.calendarHeaderBtn} onPress={() => setShowCalendarModal(true)}>
          <Ionicons name="calendar" size={20} color="#003D9B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* DOCTOR MINI SUMMARY CARD */}
        <View style={styles.doctorSummaryCard}>
          <Image
            source={getDoctorAvatarSource(doctor)}
            style={styles.doctorSummaryAvatar}
          />
          <View style={styles.doctorSummaryTextContent}>
            <Text style={styles.docSummaryName}>{doctor.name || doctor.user?.name || 'Dr. Specialist'}</Text>
            <Text style={styles.docSummarySub}>{doctor.specialty || doctor.specialization || 'MSK Specialist • One Medical Hub'}</Text>
            <View style={styles.docSummaryMetaRow}>
              <Text style={styles.docSummaryRating}>★ {doctor.ratingAvg || doctor.rating || 4.9}</Text>
              <Text style={styles.docSummaryDot}>|</Text>
              <Text style={styles.docSummaryFee}>₹{doctor.consultationFee ? Math.round(doctor.consultationFee / 100) : (doctor.fee || 1500)}</Text>
            </View>
          </View>
        </View>

        {/* SELECT DATE SECTION HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f0ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
            onPress={() => setShowCalendarModal(true)}
          >
            <Ionicons name="calendar" size={14} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={styles.selectedMonthSub}>{selectedDateObj.month || 'Aug'} {selectedDateObj.year || 2026}</Text>
          </TouchableOpacity>
        </View>

        {/* HORIZONTAL DATE STRIP */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelectorScroll}>
          {datesList.map((item) => {
            const isSelected = selectedDateObj.date === item.date;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDateObj(item)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {item.day}
                </Text>
                <Text style={[styles.dateNumText, isSelected && styles.dateNumTextSelected]}>
                  {item.date}
                </Text>
                {item.isToday && (
                  <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SLOTS CONTENT */}
        {slotsLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#003D9B" />
            <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading available slots...</Text>
          </View>
        ) : (
          <>
            {/* MORNING SLOTS */}
            {morning.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 22, marginBottom: 12 }]}>
                  🌅 Morning Slots
                </Text>
                <View style={styles.slotsGrid}>
                  {morning.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const isAvailable = slot.status === 'AVAILABLE';
                    return (
                      <TouchableOpacity
                        key={slot.startTime}
                        disabled={!isAvailable}
                        style={[
                          styles.slotBox,
                          !isAvailable && styles.slotBoxDisabled,
                          isSelected && styles.slotBoxSelected,
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text
                          style={[
                            styles.slotTimeText,
                            !isAvailable && styles.slotTimeTextDisabled,
                            isSelected && styles.slotTimeTextSelected,
                          ]}
                        >
                          {formatSlotTime(slot.startTime)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* AFTERNOON SLOTS */}
            {afternoon.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 10 }]}>
                  ☀️ Afternoon Slots
                </Text>
                <View style={styles.slotsGrid}>
                  {afternoon.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const isAvailable = slot.status === 'AVAILABLE';
                    return (
                      <TouchableOpacity
                        key={slot.startTime}
                        disabled={!isAvailable}
                        style={[
                          styles.slotBox,
                          !isAvailable && styles.slotBoxDisabled,
                          isSelected && styles.slotBoxSelected,
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text
                          style={[
                            styles.slotTimeText,
                            !isAvailable && styles.slotTimeTextDisabled,
                            isSelected && styles.slotTimeTextSelected,
                          ]}
                        >
                          {formatSlotTime(slot.startTime)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* EVENING SLOTS */}
            {evening.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 10 }]}>
                  🌙 Evening Slots
                </Text>
                <View style={styles.slotsGrid}>
                  {evening.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    const isAvailable = slot.status === 'AVAILABLE';
                    return (
                      <TouchableOpacity
                        key={slot.startTime}
                        disabled={!isAvailable}
                        style={[
                          styles.slotBox,
                          !isAvailable && styles.slotBoxDisabled,
                          isSelected && styles.slotBoxSelected,
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text
                          style={[
                            styles.slotTimeText,
                            !isAvailable && styles.slotTimeTextDisabled,
                            isSelected && styles.slotTimeTextSelected,
                          ]}
                        >
                          {formatSlotTime(slot.startTime)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {slots.length === 0 && (
              <View style={{ paddingVertical: 36, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, marginTop: 16, paddingHorizontal: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Ionicons name="calendar-outline" size={36} color="#94a3b8" />
                <Text style={{ marginTop: 10, color: '#1e293b', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                  {slotsError || 'No slots available for this date.'}
                </Text>
                <Text style={{ marginTop: 4, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                  Please select an alternative working day from the calendar bar above.
                </Text>
              </View>
            )}
          </>
        )}

        {/* SELECTION SUMMARY BOX */}
        {selectedSlot && (
          <View style={styles.summaryBoxCard}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryIconBox}>
                <Ionicons name="calendar-outline" size={20} color="#003D9B" />
              </View>
              <View style={styles.summaryDetails}>
                <Text style={styles.summaryDateTimeText}>
                  {selectedDateObj.full} • {formatSlotTime(selectedSlot.startTime)}
                </Text>
                <Text style={styles.summaryDurationText}>45 mins consultation</Text>
              </View>
              <Text style={styles.summaryFeeAmount}>₹{doctor.fee || 1500}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* STICKY CONTINUE CTA */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={[styles.continueBtn, (!selectedSlot || bookingLoading) && styles.continueBtnDisabled]}
          activeOpacity={0.85}
          disabled={!selectedSlot || bookingLoading}
          onPress={handleContinue}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueBtnText}>Confirm & Proceed to Pay ➔</Text>
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
  calendarHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  doctorSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorSummaryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  doctorSummaryTextContent: {
    flex: 1,
  },
  docSummaryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  docSummarySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  docSummaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  docSummaryRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  docSummaryDot: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  docSummaryFee: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  selectedMonthSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  dateSelectorScroll: {
    gap: 10,
    paddingBottom: 8,
  },
  dateCard: {
    width: 62,
    height: 74,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  dateCardSelected: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  dayTextSelected: {
    color: '#93c5fd',
  },
  dateNumText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  dateNumTextSelected: {
    color: '#ffffff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#003D9B',
    marginTop: 3,
  },
  todayDotSelected: {
    backgroundColor: '#ffffff',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  slotBox: {
    width: (width - 60) / 3,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotBoxDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.5,
  },
  slotBoxSelected: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  slotTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  slotTimeTextDisabled: {
    color: '#94a3b8',
  },
  slotTimeTextSelected: {
    color: '#ffffff',
  },
  summaryBoxCard: {
    backgroundColor: '#f0f6ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 16,
    marginBottom: 20,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryDateTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryDurationText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  summaryFeeAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003D9B',
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
    backgroundColor: '#003D9B',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
