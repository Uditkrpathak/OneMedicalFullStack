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

const padZero = (n) => String(n).padStart(2, '0');

const formatLocalDateStr = (d) => {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
};

// Generate 30-day date strip starting from today
const generateDates = () => {
  const dates = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = dayNames[d.getDay()];
    const monthName = monthNames[d.getMonth()];
    const dateNum = d.getDate();
    const fullYear = d.getFullYear();
    const isoDate = formatLocalDateStr(d);
    
    dates.push({
      id: isoDate,
      day: dayName,
      date: String(dateNum),
      month: monthName,
      year: fullYear,
      full: `${dayName}, ${dateNum} ${monthName}`,
      fullYearStr: `${dayName}, ${dateNum} ${monthName} ${fullYear}`,
      isToday: i === 0,
      rawDate: d,
    });
  }
  return dates;
};

// Generate available slots for a given date
const generateStandardSlots = (dateStr) => {
  const timeDefs = [
    { start: '09:00', end: '09:45' },
    { start: '09:45', end: '10:30' },
    { start: '10:30', end: '11:15' },
    { start: '11:15', end: '12:00' },
    { start: '12:00', end: '12:45' },
    { start: '14:00', end: '14:45' },
    { start: '14:45', end: '15:30' },
    { start: '15:30', end: '16:15' },
    { start: '16:15', end: '17:00' },
    { start: '17:00', end: '17:45' },
  ];
  return timeDefs.map(t => ({
    startTime: `${dateStr}T${t.start}:00.000Z`,
    endTime: `${dateStr}T${t.end}:00.000Z`,
    status: 'AVAILABLE',
  }));
};

export default function SelectDateTimeScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const doctor = route.params?.doctor || {
    name: 'Dr. Ananya Sharma',
    specialty: 'Senior Physiotherapist • One Medical Hub',
    fee: 499,
    rating: 4.9,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
  };
  const therapistId = route.params?.therapistId || doctor?.id || doctor?._id;

  const datesList = generateDates();
  const [selectedDateObj, setSelectedDateObj] = useState(datesList[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Month state for the full calendar modal
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Fetch slots whenever selected date changes
  useEffect(() => {
    if (!selectedDateObj?.id) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedSlot(null);
      try {
        if (therapistId) {
          const res = await appointmentApi.getSlotAvailability(therapistId, selectedDateObj.id, token);
          if (res.success && Array.isArray(res.data?.slots) && res.data.slots.length > 0) {
            setSlots(res.data.slots);
            return;
          }
        }
        // Fallback to standard slots if schedule not yet populated
        setSlots(generateStandardSlots(selectedDateObj.id));
      } catch (err) {
        setSlots(generateStandardSlots(selectedDateObj.id));
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

  const handleContinue = async () => {
    if (!selectedSlot) {
      Alert.alert('Select a Time', 'Please select an available time slot to continue.');
      return;
    }
    setBookingLoading(true);
    try {
      const effectiveTherapistId = therapistId || '6a852af5de9306b009a7bc88';
      const res = await appointmentApi.createHold({
        therapistId: effectiveTherapistId,
        startTime: selectedSlot.startTime,
        endTime:   selectedSlot.endTime,
        serviceType: route.params?.serviceType || 'PHYSIOTHERAPY_SESSION',
        appointmentPlace: route.params?.appointmentPlace || 'CLINIC',
      }, token);

      if (res?.success && res?.data?.appointment?._id) {
        navigation.navigate('ChoosePayment', { appointmentId: res.data.appointment._id });
      } else if (res?.error?.code === 'SLOT_UNAVAILABLE') {
        Alert.alert('Slot Taken', 'This slot was just taken. Please choose another available slot.');
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

  // Calendar Modal Month Matrix Helper
  const getCalendarMonthData = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const matrix = [];
    let currentDay = 1;

    for (let row = 0; row < 6; row++) {
      const week = [];
      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < firstDayIndex) {
          week.push(null);
        } else if (currentDay > daysInMonth) {
          week.push(null);
        } else {
          const dObj = new Date(year, month, currentDay);
          const iso = formatLocalDateStr(dObj);
          const todayIso = formatLocalDateStr(new Date());
          const isPast = iso < todayIso;
          week.push({
            dayNum: currentDay,
            iso,
            isPast,
            dateObj: dObj,
          });
          currentDay++;
        }
      }
      matrix.push(week);
      if (currentDay > daysInMonth) break;
    }
    return matrix;
  };

  const handleSelectCalendarDay = (dayCell) => {
    if (!dayCell || dayCell.isPast) return;
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = dayCell.dateObj;
    const dayName = dayNames[d.getDay()];
    const monthName = monthNames[d.getMonth()];
    const dateNum = d.getDate();
    const fullYear = d.getFullYear();

    const newObj = {
      id: dayCell.iso,
      day: dayName,
      date: String(dateNum),
      month: monthName,
      year: fullYear,
      full: `${dayName}, ${dateNum} ${monthName}`,
      fullYearStr: `${dayName}, ${dateNum} ${monthName} ${fullYear}`,
      isToday: dayCell.iso === formatLocalDateStr(new Date()),
      rawDate: d,
    };
    setSelectedDateObj(newObj);
    setShowCalendarModal(false);
  };

  const handlePrevMonth = () => {
    const prev = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    const today = new Date();
    if (prev.getFullYear() < today.getFullYear() || (prev.getFullYear() === today.getFullYear() && prev.getMonth() < today.getMonth())) {
      return;
    }
    setCalendarMonth(prev);
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const { morning, afternoon, evening } = classifySlots();
  const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
            <Text style={styles.docSummaryName}>{doctor.name || doctor.user?.name || 'Dr. Ananya Sharma'}</Text>
            <Text style={styles.docSummarySub}>{doctor.specialty || doctor.specialization || 'Senior Physiotherapist'}</Text>
            <View style={styles.docSummaryMetaRow}>
              <Text style={styles.docSummaryRating}>★ {doctor.ratingAvg || doctor.rating || 4.9}</Text>
              <Text style={styles.docSummaryDot}>|</Text>
              <Text style={styles.docSummaryFee}>₹{doctor.consultationFee ? Math.round(doctor.consultationFee / 100) : (doctor.fee || 499)}</Text>
            </View>
          </View>
        </View>

        {/* SELECT DATE SECTION HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity
            style={styles.monthBadgeBtn}
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={14} color="#003D9B" style={{ marginRight: 6 }} />
            <Text style={styles.selectedMonthSub}>{selectedDateObj?.month || 'Aug'} {selectedDateObj?.year || 2026}</Text>
          </TouchableOpacity>
        </View>

        {/* HORIZONTAL DATE STRIP */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelectorScroll}>
          {datesList.map((item) => {
            const isSelected = selectedDateObj?.id === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDateObj(item)}
                activeOpacity={0.8}
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
                        activeOpacity={0.8}
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
                <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 12 }]}>
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
                        activeOpacity={0.8}
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
                <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 12 }]}>
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
                        activeOpacity={0.8}
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
          </>
        )}

        {/* SELECTION SUMMARY BOX */}
        {selectedSlot && (
          <View style={styles.summaryBoxCard}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryIconBox}>
                <Ionicons name="checkmark-circle" size={22} color="#003D9B" />
              </View>
              <View style={styles.summaryDetails}>
                <Text style={styles.summaryDateTimeText}>
                  {selectedDateObj?.full} • {formatSlotTime(selectedSlot.startTime)}
                </Text>
                <Text style={styles.summaryDurationText}>45 mins consultation • Selected Slot</Text>
              </View>
              <Text style={styles.summaryFeeAmount}>₹{doctor.fee || 499}</Text>
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

      {/* FULL MONTH CALENDAR MODAL */}
      <Modal visible={showCalendarModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header with Navigation */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Consultation Date</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Month & Year Bar */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color="#003D9B" />
              </TouchableOpacity>
              <Text style={styles.monthNavTitle}>
                {monthNamesFull[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color="#003D9B" />
              </TouchableOpacity>
            </View>

            {/* Weekdays Header */}
            <View style={styles.weekdayHeaderRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <Text key={d} style={styles.weekdayHeaderText}>{d}</Text>
              ))}
            </View>

            {/* Calendar Days Matrix */}
            <View style={styles.calendarMatrixContainer}>
              {getCalendarMonthData().map((week, wIdx) => (
                <View key={wIdx} style={styles.calendarWeekRow}>
                  {week.map((cell, cIdx) => {
                    if (!cell) {
                      return <View key={cIdx} style={styles.calendarDayCellEmpty} />;
                    }
                    const isSelected = selectedDateObj?.id === cell.iso;
                    const isToday = cell.iso === formatLocalDateStr(new Date());

                    return (
                      <TouchableOpacity
                        key={cIdx}
                        disabled={cell.isPast}
                        style={[
                          styles.calendarDayCell,
                          isSelected && styles.calendarDayCellSelected,
                          cell.isPast && styles.calendarDayCellPast,
                        ]}
                        onPress={() => handleSelectCalendarDay(cell)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            cell.isPast && styles.calendarDayTextPast,
                            isToday && !isSelected && styles.calendarDayTextToday,
                          ]}
                        >
                          {cell.dayNum}
                        </Text>
                        {isToday && !isSelected && <View style={styles.calendarTodayDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Quick Filter Buttons */}
            <View style={styles.quickDateRow}>
              <TouchableOpacity
                style={styles.quickDateBtn}
                onPress={() => {
                  setSelectedDateObj(datesList[0]);
                  setShowCalendarModal(false);
                }}
              >
                <Text style={styles.quickDateBtnText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateBtn}
                onPress={() => {
                  if (datesList[1]) setSelectedDateObj(datesList[1]);
                  setShowCalendarModal(false);
                }}
              >
                <Text style={styles.quickDateBtnText}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateBtn}
                onPress={() => {
                  if (datesList[7]) setSelectedDateObj(datesList[7]);
                  setShowCalendarModal(false);
                }}
              >
                <Text style={styles.quickDateBtnText}>Next Week</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  monthBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
    width: (width - 60) / 2,
    paddingVertical: 14,
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
    fontSize: 13,
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

  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayHeaderText: {
    width: (width - 44) / 7,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  calendarMatrixContainer: {
    marginBottom: 16,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarDayCellEmpty: {
    width: (width - 44) / 7,
    height: 38,
  },
  calendarDayCell: {
    width: (width - 44) / 7,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCellSelected: {
    backgroundColor: '#003D9B',
  },
  calendarDayCellPast: {
    opacity: 0.25,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  calendarDayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  calendarDayTextPast: {
    color: '#94a3b8',
  },
  calendarDayTextToday: {
    color: '#003D9B',
    fontWeight: '800',
  },
  calendarTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#003D9B',
    marginTop: 2,
  },
  quickDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickDateBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickDateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
});
