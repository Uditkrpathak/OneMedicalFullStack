import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from '../../../context/SocketContext';
import clinicalApi from '../api';
import appointmentApi from '../../appointments/api';
import { colors } from '../../../theme/colors';
import { getDoctorAvatarSource, getDoctorImageUri } from '../../../utils/doctorImages';

const { width } = Dimensions.get('window');

export default function PatientDashboardScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const socket = useSocket();

  const [activeProgram, setActiveProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [todayAppointment, setTodayAppointment] = useState(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchClinicalData = async () => {
        setLoading(true);
        try {
          const [progRes, exRes, therRes, apptRes] = await Promise.all([
            clinicalApi.getActiveProgram(token),
            clinicalApi.getTodaysExercises(token),
            appointmentApi.getTherapists(token),
            appointmentApi.getAppointments(token)
          ]);

          if (isMounted && progRes.success) {
            setActiveProgram(progRes.data?.assignment || progRes.data);
          } else if (isMounted) {
            setActiveProgram(null);
          }

          if (isMounted && exRes.success && exRes.data) {
            setExercises(exRes.data.exercises || exRes.data || []);
          } else if (isMounted) {
            setExercises([]);
          }

          if (isMounted && therRes.success && Array.isArray(therRes.data)) {
            setTherapists(therRes.data);
          }

          if (isMounted && apptRes.success && Array.isArray(apptRes.data)) {
            const activeAppts = apptRes.data.filter(a => {
              const s = (a.status || '').toUpperCase();
              return s === 'CONFIRMED' || s === 'HELD' || s === 'RESCHEDULE_REQUESTED' || s === 'CHECKED_IN' || s === 'IN_PROGRESS';
            });
            if (activeAppts.length > 0) {
              activeAppts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
              setTodayAppointment(activeAppts[0]);
            } else {
              setTodayAppointment(null);
            }
          } else if (isMounted) {
            setTodayAppointment(null);
          }
        } catch (err) {
          console.warn('[Dashboard] Fetch error:', err.message);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchClinicalData();
      return () => { isMounted = false; };
    }, [token])
  );

  const getTherapistForAppointment = (appt) => {
    if (!appt || !therapists.length) return null;
    return therapists.find(t => t.userId === appt.therapistId || t._id === appt.therapistId || (t.user && t.user._id === appt.therapistId));
  };

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (msg) => {
        Alert.alert('Message from Therapist', msg.text);
      });
      socket.on('program_updated', () => {
        Alert.alert('Program Updated', 'Your therapist updated your recovery program.');
      });
      return () => {
        socket.off('receive_message');
        socket.off('program_updated');
      };
    }
  }, [socket]);

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (text) => {
    const query = (text !== undefined ? text : searchQuery).trim();
    navigation.navigate('Book', { search: query });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const CLINICAL_FALLBACK_NAMES = [
    'Isometric Quad Sets',
    'Heel Slides with Towel',
    'Straight Leg Raise Progression',
    'Hamstring Curl & Stretch',
    'Ankle Pumps & Mobilization',
  ];

  const rawExercisesList = exercises.length > 0
    ? exercises
    : (activeProgram?.programId?.exercises?.map(e => ({
        _id: e.exerciseId?._id || e.exerciseId,
        exerciseId: e.exerciseId?._id || e.exerciseId,
        name: e.exerciseId?.name || e.name,
        sets: e.sets || 3,
        reps: e.reps || 10,
        durationSec: e.holdSeconds || e.durationSec || 30,
        category: e.exerciseId?.category || 'Strength'
      })) || []);

  const displayExercises = rawExercisesList.map((e, idx) => {
    let resolvedName = e.name;
    if (!resolvedName || resolvedName === 'Therapeutic Exercise' || resolvedName === 'Prescribed Exercise' || resolvedName === 'Exercise') {
      resolvedName = CLINICAL_FALLBACK_NAMES[idx % CLINICAL_FALLBACK_NAMES.length];
    }
    return {
      ...e,
      name: resolvedName,
      sets: e.sets || 3,
      reps: e.reps || (idx === 0 ? 10 : idx === 1 ? 12 : 15),
      durationSec: e.durationSec || 30,
    };
  });

  const totalRoutineMinutes = displayExercises.reduce((acc, curr) => {
    const sets = curr.sets || 3;
    const hold = curr.durationSec || 30;
    const reps = curr.reps || 10;
    return acc + Math.round((sets * (reps * 2 + hold + 15)) / 60);
  }, 0) || Math.max(3, displayExercises.length * 4);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SECTION */}
        <View style={styles.headerRow}>
          <View style={styles.userProfileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.greetingText}>
                {getGreeting()}, {user?.name || 'Sagar'} 👋
              </Text>
              <Text style={styles.subGreetingText}>{"Let's continue your recovery journey."}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search therapists, clinics or treatments"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearchSubmit(searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => handleSearchSubmit(searchQuery)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-forward-circle" size={20} color="#003D9B" />
            </TouchableOpacity>
          )}
        </View>

        {/* TODAY'S APPOINTMENT HERO CARD OR NO APPOINTMENT STATE */}
        {!todayAppointment ? (
          <View style={styles.noAppointmentCard}>
            <View style={styles.noApptInfo}>
              <Ionicons name="calendar-clear-outline" size={24} color="#003D9B" style={{ marginBottom: 6 }} />
              <Text style={styles.noApptTitle}>No appointments scheduled today</Text>
              <Text style={styles.noApptSub}>Need to consult a specialist? Book a recovery slot now.</Text>
            </View>
            <TouchableOpacity
              style={styles.noApptBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Book')}
            >
              <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.noApptBtnText}>Book a Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <LinearGradient
            colors={['#046582', '#004c8f', '#002663']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.appointmentHeroCard}
          >
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroCardBadgeLabel}>
                {todayAppointment?.startTime && new Date(todayAppointment.startTime).toDateString() === new Date().toDateString()
                  ? "TODAY'S APPOINTMENT"
                  : "UPCOMING APPOINTMENT"}
              </Text>
              <View style={styles.heroDateBadge}>
                <Ionicons name="calendar-outline" size={13} color="#ffffff" style={{ marginRight: 5 }} />
                <Text style={styles.heroDateText}>
                  {todayAppointment?.startTime
                    ? new Date(todayAppointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
                    : 'Scheduled'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTimeText}>
              {todayAppointment?.startTime
                ? new Date(todayAppointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                : '10:00 AM'}
            </Text>

            <View style={styles.doctorInfoRow}>
              <View style={styles.doctorIconBox}>
                <Ionicons name="person-outline" size={14} color="#38bdf8" />
                <View style={styles.doctorCheckBadge}>
                  <Ionicons name="checkmark" size={7} color="#ffffff" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorNameText}>
                  {todayAppointment.therapistName || getTherapistForAppointment(todayAppointment)?.user?.name || getTherapistForAppointment(todayAppointment)?.name || 'Dr. Vivek Joshi'}
                </Text>
                <Text style={styles.doctorSpecialtyText}>
                  {todayAppointment.serviceType?.replace(/_/g, ' ') || getTherapistForAppointment(todayAppointment)?.specializations?.[0] || 'Orthopedic Physiotherapy'}
                </Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
              <Text style={styles.locationText}>
                {todayAppointment.appointmentPlace === 'VIDEO'
                  ? 'Virtual Telehealth Consultation'
                  : todayAppointment.appointmentPlace === 'HOME'
                  ? 'Physiotherapist Home Visit'
                  : (typeof getTherapistForAppointment(todayAppointment)?.clinicName === 'string' ? getTherapistForAppointment(todayAppointment)?.clinicName : 'ONE MEDICAL Clinic')}
              </Text>
            </View>

            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.heroBtnPrimary}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('AppointmentDetail', {
                  booking: {
                    id: todayAppointment._id,
                    _id: todayAppointment._id,
                    appointmentId: todayAppointment._id,
                    doctorName: String(todayAppointment.therapistName || getTherapistForAppointment(todayAppointment)?.user?.name || 'Dr. Vivek Joshi'),
                    specialty: String(todayAppointment.serviceType?.replace(/_/g, ' ') || 'Orthopedic Physiotherapy'),
                    status: String(todayAppointment.status || 'Confirmed'),
                    date: `${todayAppointment.startTime ? new Date(todayAppointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : ''} • ${todayAppointment.startTime ? new Date(todayAppointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}`,
                    clinic: typeof getTherapistForAppointment(todayAppointment)?.clinicName === 'string' ? getTherapistForAppointment(todayAppointment)?.clinicName : 'ONE MEDICAL Clinic',
                    address: typeof getTherapistForAppointment(todayAppointment)?.clinicLocation === 'string' ? getTherapistForAppointment(todayAppointment)?.clinicLocation : 'Bangalore',
                    avatar: getDoctorImageUri(getTherapistForAppointment(todayAppointment) || todayAppointment.therapistName)
                  }
                })}
              >
                <Text style={styles.heroBtnPrimaryText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtnSecondary}
                activeOpacity={0.85}
                onPress={() => {
                  const loc = typeof getTherapistForAppointment(todayAppointment)?.clinicLocation === 'string' ? getTherapistForAppointment(todayAppointment)?.clinicLocation : 'ONE MEDICAL Clinic';
                  const query = encodeURIComponent(loc);
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => { });
                }}
              >
                <Text style={styles.heroBtnSecondaryText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

        {/* YOUR RECOVERY SECTION */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Your Recovery</Text>
            <Text style={styles.sectionSubTitle}>Keep up the great progress!</Text>
          </View>
        </View>

        {!activeProgram ? (
          <View style={styles.noProgramCard}>
            <Ionicons name="bar-chart-outline" size={24} color="#003D9B" style={{ marginBottom: 6 }} />
            <Text style={styles.noProgTitle}>No active recovery program</Text>
            <Text style={styles.noProgSub}>Consult with your physiotherapist to assign your rehabilitation plan.</Text>
          </View>
        ) : (
          <View style={styles.recoveryCard}>
            {/* Centered Circular Gauge */}
            <View style={styles.circleOuterGauge}>
              <View style={styles.circleInnerGauge}>
                <Text style={styles.circlePercentageText}>{activeProgram.recoveryScore || 0}%</Text>
                <Text style={styles.circleLabelText}>OVERALL</Text>
              </View>
            </View>

            {/* Recovery Score Title */}
            <Text style={styles.recoveryScoreTitle}>
              Recovery Score <Text style={styles.scoreBold}>{activeProgram.recoveryScore || 0}%</Text>
            </Text>

            {/* Trend Row */}
            <View style={styles.trendRow}>
              <Text style={styles.trendLabel}>
                {(activeProgram.recoveryScore || 0) > 0 ? 'Improving steadily' : 'Ready to start'}
              </Text>
              <View style={styles.trendBadge}>
                <Ionicons name="trending-up" size={13} color="#003D9B" style={{ marginRight: 4 }} />
                <Text style={styles.trendBadgeText}>
                  {(activeProgram.recoveryScore || 0) > 0
                    ? `+${activeProgram.recoveryScore}% overall`
                    : '+0% this week'}
                </Text>
              </View>
            </View>

            {/* Week Badge */}
            <View style={styles.weekBadgePill}>
              <Ionicons name="ribbon-outline" size={15} color="#003D9B" style={{ marginRight: 6 }} />
              <Text style={styles.weekBadgePillText}>
                Week {activeProgram.currentWeek || (activeProgram.startDate && !isNaN(new Date(activeProgram.startDate).getTime()) ? Math.max(1, Math.floor((new Date() - new Date(activeProgram.startDate)) / (1000 * 60 * 60 * 24 * 7)) + 1) : 1)} of Recovery
              </Text>
            </View>

            {/* Quote Text */}
            <Text style={styles.recoveryQuoteText}>
              {"\""}{(typeof activeProgram.patientGoals === 'string' && activeProgram.patientGoals.trim()) ? activeProgram.patientGoals : ((activeProgram.recoveryScore || 0) > 0 ? "You're making excellent progress." : "Complete today's exercises to kickstart your recovery.")}{"\""}
            </Text>
          </View>
        )}

        {/* TODAY'S EXERCISES SECTION */}
        <View style={styles.exerciseHeaderCol}>
          <Text style={styles.sectionTitle}>{"Today's Exercises"}</Text>
          <Text style={styles.exerciseMetaText}>
            ⏱️ {displayExercises.length > 0 ? totalRoutineMinutes : 0} Min total  •  <Text style={{ fontWeight: '700', color: '#003D9B' }}>{displayExercises.length} Exercise{displayExercises.length !== 1 ? 's' : ''} Prescribed</Text>
          </Text>
        </View>

        {/* Dynamic Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, activeProgram?.recoveryScore || activeProgram?.complianceRate || 0))}%` }]} />
        </View>

        {/* Exercise List */}
        <View style={styles.exerciseList}>
          {displayExercises.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#64748b' }}>No prescribed exercises scheduled for today.</Text>
            </View>
          ) : (
            displayExercises.map((item, idx) => (
              <TouchableOpacity
                key={item._id || item.exerciseId || idx}
                style={styles.exerciseCard}
                onPress={() => navigation.navigate('ExerciseTimer', { exercise: item, programId: activeProgram?._id })}
              >
                <View style={styles.exerciseIconBox}>
                  <Ionicons name="fitness-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.exerciseTextContent}>
                  <Text style={styles.exerciseNameText}>{item.name || item.title || 'Therapeutic Movement'}</Text>
                  <Text style={styles.exerciseSubText}>
                    {item.sets || 3} Sets × {item.reps || 10} Reps {item.durationSec ? `(${item.durationSec}s hold)` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Start Today's Session CTA */}
        {displayExercises.length > 0 && (
          <TouchableOpacity
            style={styles.startSessionButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ExerciseTimer', { exercise: displayExercises[0], programId: activeProgram?._id })}
          >
            <Ionicons name="play" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.startSessionButtonText}>{"Start Today's Session"}</Text>
          </TouchableOpacity>
        )}

        {/* QUICK ACTIONS 2x2 GRID */}
        {/* QUICK ACTIONS 2x2 GRID */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          {/* Card 1: Book Appointment */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#eef7ff' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.quickCardTopRow}>
              <Ionicons name="calendar-outline" size={26} color="#003D9B" />
              <Ionicons name="chevron-forward" size={16} color="#003D9B" />
            </View>
            <Text style={styles.quickTitle}>Book Appointment</Text>
            <Text style={styles.quickDesc}>Find available time slots.</Text>
          </TouchableOpacity>

          {/* Card 2: Find Physiotherapist */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#e6f8f6' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.quickCardTopRow}>
              <Ionicons name="medkit-outline" size={26} color="#008774" />
              <Ionicons name="chevron-forward" size={16} color="#008774" />
            </View>
            <Text style={styles.quickTitle}>Find Physiotherapist</Text>
            <Text style={styles.quickDesc}>Browse specialists near you.</Text>
          </TouchableOpacity>

          {/* Card 3: Medical Reports */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#f5eeff' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Records')}
          >
            <View style={styles.quickCardTopRow}>
              <Ionicons name="document-text-outline" size={26} color="#7e22ce" />
              <Ionicons name="chevron-forward" size={16} color="#7e22ce" />
            </View>
            <Text style={styles.quickTitle}>Medical Reports</Text>
            <Text style={styles.quickDesc}>View your reports.</Text>
          </TouchableOpacity>

          {/* Card 4: Payments */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#eaf7ed' }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PaymentsInvoices')}
          >
            <View style={styles.quickCardTopRow}>
              <Ionicons name="card-outline" size={26} color="#15803d" />
              <Ionicons name="chevron-forward" size={16} color="#15803d" />
            </View>
            <Text style={[styles.quickTitle, { color: '#166534' }]}>Payments</Text>
            <Text style={styles.quickDesc}>Invoices & history.</Text>
          </TouchableOpacity>
        </View>

        {/* RECOMMENDED PHYSIOTHERAPISTS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { fontSize: 15 }]}>Recommended Physiotherapists</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Book')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.doctorHorizontalList}
        >
          {(therapists.length > 0 ? therapists : [
            { _id: 'th1', user: { name: 'Dr. Ananya Iyer' }, specializations: ['Senior MSK Specialist'], experienceYears: 12, ratingAvg: 4.9 },
            { _id: 'th2', user: { name: 'Dr. Arjun Mehta' }, specializations: ['Sports Rehab Specialist'], experienceYears: 10, ratingAvg: 4.8 }
          ]).map((item, idx) => {
            const docName = item.user?.name || item.name || 'Specialist';
            const spec = Array.isArray(item.specializations) ? item.specializations[0] : (item.specialization || 'Physiotherapist');
            return (
              <TouchableOpacity
                key={item._id || idx}
                style={styles.doctorCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('TherapistDetail', { therapist: item })}
              >
                <View style={styles.doctorImageWrap}>
                  <Image
                    source={getDoctorAvatarSource(item)}
                    style={styles.doctorPhoto}
                  />
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      <Text style={{ color: '#f59e0b' }}>★ </Text>{item.ratingAvg || 4.9}
                    </Text>
                  </View>
                  <View style={styles.availBadge}>
                    <Text style={styles.availBadgeText}>AVAILABLE TODAY</Text>
                  </View>
                </View>
                <Text style={styles.docNameText}>{docName}</Text>
                <Text style={styles.docSpecText}>{spec}</Text>
                <Text style={styles.docExpText}>{item.experienceYears || 8}+ Years Exp • Available</Text>

                <TouchableOpacity
                  style={styles.docBookBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Book', { therapist: item })}
                >
                  <Text style={styles.docBookBtnText}>Book Appointment</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* POPULAR SERVICES GRID */}
        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14, color: '#003D9B', fontSize: 13, letterSpacing: 1.2, fontWeight: '800' }]}>
          POPULAR SERVICES
        </Text>

        <View style={styles.popularServicesGrid}>
          {/* Service 1: Back Pain */}
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.serviceImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80' }}
                style={styles.servicePhoto}
              />
            </View>
            <Text style={styles.serviceTitleText}>Back Pain</Text>
            <Text style={styles.serviceSubText}>Relief from chronic or acute spine issues.</Text>
          </TouchableOpacity>

          {/* Service 2: Neck Pain */}
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.serviceImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&auto=format&fit=crop&q=80' }}
                style={styles.servicePhoto}
              />
            </View>
            <Text style={styles.serviceTitleText}>Neck Pain</Text>
            <Text style={styles.serviceSubText}>Correct posture and cervical discomfort.</Text>
          </TouchableOpacity>

          {/* Service 3: Sports Injury */}
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.serviceImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80' }}
                style={styles.servicePhoto}
              />
            </View>
            <Text style={styles.serviceTitleText}>Sports Injury</Text>
            <Text style={styles.serviceSubText}>Targeted recovery for athletes and active users.</Text>
          </TouchableOpacity>

          {/* Service 4: Post-Surgery */}
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.serviceImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80' }}
                style={styles.servicePhoto}
              />
            </View>
            <Text style={styles.serviceTitleText}>Post-Surgery</Text>
            <Text style={styles.serviceSubText}>Guided rehabilitation programs post-operation.</Text>
          </TouchableOpacity>

          {/* Service 5: Knee & Joint */}
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.serviceImageWrap}>
              <Image
                source={{ uri: 'https://plus.unsplash.com/premium_photo-1664910605048-44c8450c0356?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
                style={styles.servicePhoto}
              />
            </View>
            <Text style={styles.serviceTitleText}>Knee & Joint</Text>
            <Text style={styles.serviceSubText}>Ligament repair & joint mobility rehab.</Text>
          </TouchableOpacity>

          {/* Service 6: Home Visit */}
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Book')}
          >
            <View style={styles.serviceImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80' }}
                style={styles.servicePhoto}
              />
            </View>
            <Text style={styles.serviceTitleText}>Home Visit</Text>
            <Text style={styles.serviceSubText}>Expert physio consultation at your home.</Text>
          </TouchableOpacity>
        </View>

        {/* TODAY'S RECOVERY TIP BANNER */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeaderRow}>
            <View style={styles.tipIconCircle}>
              <Ionicons name="bulb-outline" size={18} color="#003D9B" />
            </View>
            <Text style={styles.tipHeaderTitle}>{"Today's Recovery Tip"}</Text>
          </View>
          <Text style={styles.tipBodyText}>
            {"Stretch for 5 minutes before starting today's exercises to improve flexibility and reduce muscle stiffness."}
          </Text>
          <View style={styles.tipTag}>
            <Text style={styles.tipTagText}>RECOMMENDED BY YOUR PHYSIOTHERAPIST</Text>
          </View>
        </View>

        {/* UPCOMING ACTIVITY */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.viewAllText}>View Schedule</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {activeProgram && (
            <TouchableOpacity
              style={[styles.activityCard, { borderColor: '#bfdbfe', backgroundColor: '#f8faff' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TodaysSession', { program: activeProgram })}
            >
              <View style={styles.activityTimeCol}>
                <Text style={[styles.activityTimeText, { color: '#003D9B' }]}>TODAY</Text>
                <View style={styles.activityBadgePill}>
                  <Text style={styles.activityBadgePillText}>HOME WORKOUT</Text>
                </View>
              </View>
              <View style={[styles.activityIconCircle, { backgroundColor: '#e0edff' }]}>
                <Ionicons name="fitness-outline" size={18} color="#003D9B" />
              </View>
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>Home Exercise Routine</Text>
                <Text style={styles.activitySub}>
                  {activeProgram?.title || 'Post ACL Rehabilitation'} • {displayExercises.length} Exercises (~10m)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#003D9B" />
            </TouchableOpacity>
          )}

          {todayAppointment ? (
            <TouchableOpacity
              style={[styles.activityCard, { borderColor: '#e9d5ff', backgroundColor: '#fdfaff' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: todayAppointment._id })}
            >
              <View style={styles.activityTimeCol}>
                <Text style={[styles.activityTimeText, { color: '#7e22ce' }]}>
                  {todayAppointment.startTime
                    ? new Date(todayAppointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                    : '4:00 PM'}
                </Text>
                <View style={[styles.activityBadgePill, { backgroundColor: '#f3e8ff' }]}>
                  <Text style={[styles.activityBadgePillText, { color: '#7e22ce' }]}>DOCTOR APPT</Text>
                </View>
              </View>
              <View style={[styles.activityIconCircle, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="medical-outline" size={18} color="#7e22ce" />
              </View>
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>1-on-1 Doctor Consultation</Text>
                <Text style={styles.activitySub}>
                  {todayAppointment.therapistName || 'Dr. Anuj Verma'} • {todayAppointment.appointmentPlace === 'VIDEO' ? '📹 Video Call' : '🏥 In-Clinic'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#7e22ce" />
            </TouchableOpacity>
          ) : !activeProgram && (
            <View style={[styles.activityCard, { justifyContent: 'center', paddingVertical: 18 }]}>
              <Ionicons name="calendar-clear-outline" size={24} color="#94a3b8" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>No pending sessions scheduled today.</Text>
            </View>
          )}
        </View>

        {/* NEED ASSISTANCE FOOTER BANNER */}
        <View style={styles.supportCard}>
          <View style={styles.supportAvatarBox}>
            <Ionicons name="headset-outline" size={24} color="#003D9B" />
          </View>
          <Text style={styles.supportTitle}>Need assistance?</Text>
          <Text style={styles.supportSub}>
            Our clinical care team is here 24/7 to help you with your recovery journey, appointments, and payments.
          </Text>

          <TouchableOpacity
            style={styles.supportBtn}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Ionicons name="chatbubbles-outline" size={17} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 10, paddingVertical: 4 }}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Text style={styles.faqLinkText}>Frequently Asked Questions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 18,
    paddingTop: 4,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  userInfo: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subGreetingText: {
    fontSize: 12,
    color: '#64748b',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  appointmentHeroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#002663',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroCardBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.8,
  },
  heroDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroTimeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  doctorIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  doctorCheckBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#046582',
  },
  doctorNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  doctorSpecialtyText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroBtnPrimary: {
    flex: 1,
    backgroundColor: '#ffffff',
    height: 44,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003D9B',
  },
  heroBtnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    height: 44,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseHeaderCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubTitle: {
    fontSize: 12,
    color: '#64748b',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
  recoveryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  circleOuterGauge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  circleInnerGauge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercentageText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  circleLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 2,
  },
  recoveryScoreTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  scoreBold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  trendLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 6,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003D9B',
  },
  weekBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f2ff',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  weekBadgePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
  recoveryQuoteText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  exerciseMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 3,
  },
  exerciseList: {
    marginBottom: 14,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exerciseCardCompleted: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  exerciseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseThumb: {
    width: '100%',
    height: '100%',
  },
  exerciseTextContent: {
    flex: 1,
  },
  exerciseNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  exerciseSubText: {
    fontSize: 12,
    color: '#64748b',
  },
  completedTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  startSessionButton: {
    backgroundColor: '#003D9B',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003D9B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 24,
  },
  startSessionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickCard: {
    width: '48%',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    justifyContent: 'space-between',
    minHeight: 125,
  },
  quickCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  quickDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  doctorHorizontalList: {
    paddingRight: 20,
    gap: 14,
    marginBottom: 24,
  },
  doctorCard: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorImageWrap: {
    width: '100%',
    height: 155,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  doctorPhoto: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  availBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  availBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  docNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  docSpecText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  docExpText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
  },
  docBookBtn: {
    backgroundColor: '#003D9B',
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBookBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  tipCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 24,
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tipHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
  },
  tipBodyText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  tipTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tipTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.5,
  },
  activityList: {
    gap: 10,
    marginBottom: 24,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activityTimeCol: {
    width: 78,
    marginRight: 8,
  },
  activityTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  activityBadgePill: {
    backgroundColor: '#e0edff',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activityBadgePillText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 0.3,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  activitySub: {
    fontSize: 11,
    color: '#64748b',
  },
  supportCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  supportAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  supportSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  supportBtn: {
    backgroundColor: '#003D9B',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  supportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  faqLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
    textDecorationLine: 'underline',
  },
  popularServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  serviceCard: {
    width: '48%',
    marginBottom: 20,
  },
  serviceImageWrap: {
    width: '100%',
    height: 145,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
  },
  servicePhoto: {
    width: '100%',
    height: '100%',
  },
  serviceTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  serviceSubText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  noAppointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noApptInfo: {
    alignItems: 'center',
    marginBottom: 14,
  },
  noApptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  noApptSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  noApptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003D9B',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noApptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  noProgramCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  noProgTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  noProgSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
