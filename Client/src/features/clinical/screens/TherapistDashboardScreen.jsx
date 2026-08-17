import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../../shared/config';

const { width } = Dimensions.get('window');

export default function TherapistDashboardScreen({ navigation }) {
  const { token, user } = useSelector((state) => state.auth);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/therapists/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDashboardData(json.data);
      }
    } catch (err) {
      console.warn('[TherapistDashboard] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const overview = dashboardData?.overview || {
    totalAppointments: 12,
    completedAppointments: 4,
    remainingAppointments: 8,
    completionPercentage: 33,
    nextAppointment: null,
  };

  const nextAppt = overview.nextAppointment;
  const pendingTasks = dashboardData?.pendingTasks || {
    pendingDocumentationCount: 3,
    pendingReportReviewsCount: 5,
    pendingProgramUpdatesCount: 2,
  };
  const dailyTimeline = dashboardData?.dailyTimeline || [];
  const metrics = dashboardData?.metrics || {
    seenTodayCount: 4,
    avgSessionDurationMins: 45,
    activeProgramsCount: 18,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <View style={styles.userProfileRow}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
          <View>
            <Text style={styles.greetingTitle}>
              Good Morning, {user?.name ? user.name.replace(/^Dr\.?\s*/i, '').split(' ')[0] : 'Sagar'} 👋
            </Text>
            <Text style={styles.greetingSub}>
              {overview.remainingAppointments === 0 && overview.completedAppointments > 0
                ? `All ${overview.completedAppointments} Appointments Completed Today! 🎉`
                : `Ready for your ${overview.remainingAppointments || overview.totalAppointments || 0} Appointments`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications" size={20} color="#003D9B" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {/* CARD 1: TODAY'S OVERVIEW (Dashed Border Container) */}
        <View style={styles.overviewDashedCard}>
          <View style={styles.overviewTopRow}>
            <View>
              <Text style={styles.overviewSectionTag}>TODAY'S OVERVIEW</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalNumber}>{overview.totalAppointments}</Text>
                <Text style={styles.totalLabel}>Total</Text>
              </View>
              <Text style={styles.completedSub}>
                <Text style={{ color: '#16a34a', fontWeight: '700' }}>{overview.completedAppointments} Completed</Text> • {overview.remainingAppointments} Remaining
              </Text>
            </View>

            {/* Circular Progress Ring */}
            <View style={styles.circularProgressContainer}>
              <View style={styles.circularRing}>
                <Text style={styles.percentText}>{overview.completionPercentage}%</Text>
              </View>
            </View>
          </View>

          {/* Next Badge Pill */}
          <View style={styles.nextPillContainer}>
            <Ionicons name={nextAppt ? "time-outline" : "checkmark-circle-outline"} size={14} color="#003D9B" />
            <Text style={styles.nextPillText}>
              {nextAppt
                ? `Next: ${nextAppt.timeFormatted || '10:30 AM'} (${nextAppt.minutesUntil ? `In ${nextAppt.minutesUntil}m` : 'Now'})`
                : (overview.completedAppointments > 0 ? 'All sessions completed today 🎉' : 'No upcoming sessions')}
            </Text>
          </View>
        </View>

        {/* CARD 2: NEXT PATIENT HERO */}
        <View style={styles.nextPatientSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Next Patient</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TherapistSchedule')}>
              <Text style={styles.sectionLink}>View Queue</Text>
            </TouchableOpacity>
          </View>

          {nextAppt ? (
            <View style={styles.nextPatientCard}>
              <View style={styles.patientInfoRow}>
                <View style={styles.patientAvatarPlaceholder}>
                  <Text style={styles.patientAvatarInitials}>
                    {nextAppt?.patientName ? nextAppt.patientName.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.patientNameRow}>
                    <Text style={styles.patientNameText} numberOfLines={1}>
                      {nextAppt.patientName}{nextAppt.patientAge ? `, ${nextAppt.patientAge}y` : ''}
                    </Text>
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText}>{nextAppt.roomNumber || 'CLINIC'}</Text>
                    </View>
                  </View>

                  <Text style={styles.conditionText} numberOfLines={1}>
                    {nextAppt.condition}
                  </Text>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={13} color="#64748b" />
                    <Text style={styles.timeDetailText}>
                      {nextAppt.timeFormatted} (In {nextAppt.minutesUntil || 0} mins)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.heroActionButtons}>
                <TouchableOpacity
                  style={styles.startSessionBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('ClinicalConsultation', {
                      appointmentId: nextAppt.id,
                      patientName: nextAppt.patientName,
                    })
                  }
                >
                  <Text style={styles.startSessionText}>Start Session</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('AppointmentDetails', {
                      appointmentId: nextAppt.id,
                      patientName: nextAppt.patientName,
                    })
                  }
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.nextPatientCard, { alignItems: 'center', paddingVertical: 24 }]}>
              <Ionicons name="checkmark-done-circle" size={42} color="#16a34a" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
                All Caught Up! 🎉
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
                {overview.completedAppointments > 0
                  ? `You have completed all ${overview.completedAppointments} scheduled sessions for today.`
                  : 'No pending appointments in your queue for today.'}
              </Text>
              <TouchableOpacity
                style={[styles.viewDetailsBtn, { alignSelf: 'stretch', marginHorizontal: 20, alignItems: 'center' }]}
                onPress={() => navigation.navigate('TherapistSchedule')}
              >
                <Text style={styles.viewDetailsText}>View Full Schedule</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* CARD 3: PENDING TASKS */}
        <View style={styles.pendingTasksSection}>
          <Text style={styles.sectionTitle}>Pending Tasks</Text>
          <View style={styles.pendingTasksRow}>
            {/* Task 1 */}
            <View style={styles.taskCard}>
              <View style={[styles.taskIconCircle, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="document-text" size={18} color="#2563eb" />
              </View>
              <Text style={styles.taskNumber}>{pendingTasks.pendingDocumentationCount}</Text>
              <Text style={styles.taskLabel}>Documentation</Text>
            </View>

            {/* Task 2 */}
            <View style={styles.taskCard}>
              <View style={[styles.taskIconCircle, { backgroundColor: '#faf5ff' }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#9333ea" />
              </View>
              <Text style={styles.taskNumber}>{pendingTasks.pendingReportReviewsCount}</Text>
              <Text style={styles.taskLabel}>Report Reviews</Text>
            </View>

            {/* Task 3 */}
            <View style={styles.taskCard}>
              <View style={[styles.taskIconCircle, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="barbell" size={18} color="#16a34a" />
              </View>
              <Text style={styles.taskNumber}>{pendingTasks.pendingProgramUpdatesCount}</Text>
              <Text style={styles.taskLabel}>Program Updates</Text>
            </View>
          </View>
        </View>

        {/* CARD 4: DAILY SCHEDULE TIMELINE */}
        <View style={styles.scheduleTimelineSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Daily Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TherapistSchedule')}>
              <Text style={styles.sectionLink}>Full Day</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timelineContainer}>
            {dailyTimeline.length > 0 ? (
              dailyTimeline.map((item, index) => {
                const isCompleted = ['COMPLETED', 'DOCUMENTED'].includes(item.status);
                const isNext = ['IN_PROGRESS', 'CONFIRMED'].includes(item.status) && index === 1;

                return (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.timelineRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('AppointmentDetails', {
                        appointmentId: item.id,
                        patientName: item.patientName,
                      })
                    }
                  >
                    <View style={styles.timelineLeftTrack}>
                      <View
                        style={[
                          styles.timelineDot,
                          isCompleted && styles.dotCompleted,
                          isNext && styles.dotNext,
                        ]}
                      >
                        {isCompleted && <Ionicons name="checkmark" size={10} color="#ffffff" />}
                      </View>
                      {index < dailyTimeline.length - 1 && <View style={styles.timelineLine} />}
                    </View>

                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineStatusHeader, isNext && { color: '#003D9B' }]}>
                        {item.time} • {item.status.replace('_', ' ')}
                      </Text>
                      <Text style={styles.timelinePatientName}>{item.patientName}</Text>
                      <Text style={styles.timelineConditionText}>{item.condition}</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>No consultations scheduled for today.</Text>
              </View>
            )}
          </View>
        </View>

        {/* CARD 5: QUICK ACTIONS (2x2 Grid) */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('TherapistPatients')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="people" size={20} color="#003D9B" />
              </View>
              <Text style={styles.quickActionLabel}>Patient List</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('TherapistPatients')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#f0fdfa' }]}>
                <Ionicons name="search" size={20} color="#0d9488" />
              </View>
              <Text style={styles.quickActionLabel}>Search Patient</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ExerciseLibrary')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="barbell" size={20} color="#dc2626" />
              </View>
              <Text style={styles.quickActionLabel}>Exercise Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('MedicalRecords')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: '#faf5ff' }]}>
                <Ionicons name="stats-chart" size={20} color="#9333ea" />
              </View>
              <Text style={styles.quickActionLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER METRICS SUMMARY */}
        <View style={styles.footerMetricsCard}>
          <View style={styles.footerMetricCol}>
            <Text style={styles.footerMetricVal}>{metrics.seenTodayCount}</Text>
            <Text style={styles.footerMetricLab}>SEEN TODAY</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerMetricCol}>
            <Text style={styles.footerMetricVal}>{metrics.avgSessionDurationMins}m</Text>
            <Text style={styles.footerMetricLab}>AVG. SESSION</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerMetricCol}>
            <Text style={styles.footerMetricVal}>{metrics.activeProgramsCount}</Text>
            <Text style={styles.footerMetricLab}>ACTIVE PROGS</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#003D9B',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#003D9B' },
  greetingTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  greetingSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 18 },

  // Overview Dashed Card
  overviewDashedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
    padding: 16,
    gap: 12,
  },
  overviewTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewSectionTag: { fontSize: 11, fontWeight: '800', color: '#003D9B', letterSpacing: 0.5 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  totalNumber: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  totalLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  completedSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  circularProgressContainer: { alignItems: 'center', justifyContent: 'center' },
  circularRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
  },
  percentText: { fontSize: 14, fontWeight: '900', color: '#003D9B' },
  nextPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  nextPillText: { fontSize: 12, fontWeight: '700', color: '#003D9B' },

  // Next Patient Section
  nextPatientSection: { gap: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  sectionLink: { fontSize: 13, fontWeight: '700', color: '#003D9B' },
  nextPatientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    gap: 14,
  },
  patientInfoRow: { flexDirection: 'row', alignItems: 'center' },
  patientAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarInitials: { fontSize: 18, fontWeight: '800', color: '#0284c7' },
  patientNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  patientNameText: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  roomBadge: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roomBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  conditionText: { fontSize: 12, color: '#0284c7', fontWeight: '600', marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timeDetailText: { fontSize: 11, color: '#64748b' },
  heroActionButtons: { flexDirection: 'row', gap: 10 },
  startSessionBtn: {
    flex: 1,
    backgroundColor: '#003D9B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  startSessionText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#003D9B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewDetailsText: { color: '#003D9B', fontSize: 13, fontWeight: '700' },

  // Pending Tasks
  pendingTasksSection: { gap: 8 },
  pendingTasksRow: { flexDirection: 'row', gap: 10 },
  taskCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  taskIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  taskNumber: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  taskLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textAlign: 'center' },

  // Daily Schedule Timeline
  scheduleTimelineSection: { gap: 8 },
  timelineContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  timelineLeftTrack: { alignItems: 'center', width: 24, marginRight: 8 },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotCompleted: { backgroundColor: '#16a34a' },
  dotNext: { backgroundColor: '#003D9B' },
  timelineLine: { width: 2, height: 44, backgroundColor: '#f1f5f9', marginTop: 2 },
  timelineContent: { flex: 1 },
  timelineStatusHeader: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  timelinePatientName: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  timelineConditionText: { fontSize: 12, color: '#64748b' },

  // Quick Actions Grid
  quickActionsSection: { gap: 8 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionBtn: {
    width: (width - 42) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  quickActionIconBox: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  // Footer Summary Metrics
  footerMetricsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  footerMetricCol: { alignItems: 'center' },
  footerMetricVal: { fontSize: 18, fontWeight: '900', color: '#003D9B' },
  footerMetricLab: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginTop: 2, letterSpacing: 0.5 },
  footerDivider: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
});
