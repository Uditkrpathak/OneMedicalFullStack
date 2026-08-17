import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';
import { colors } from '../../../theme/colors';

const { width } = Dimensions.get('window');

export default function RecoveryMainScreen({ navigation }) {
  const { user, token } = useSelector((state) => state.auth);
  const [activeProgram, setActiveProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgram = async () => {
    try {
      const res = await clinicalApi.getActiveProgram(token);
      if (res.success && res.data) {
        setActiveProgram(res.data);
      } else {
        setActiveProgram(null);
      }
    } catch (err) {
      console.warn('[RecoveryMain] Error fetching active program:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProgram();
  };

  const recoveryScore = activeProgram?.recoveryScore || 0;
  const programName = activeProgram?.title || activeProgram?.programId?.title || 'Physical Therapy Program';
  const currentWeek = activeProgram?.currentWeek || 1;
  const targetWeeks = activeProgram?.targetWeeks || 4;
  const completedSessions = activeProgram?.completedSessionsCount || 0;
  const targetSessions = activeProgram?.totalTargetSessions || (targetWeeks * (activeProgram?.targetSessionsPerWeek || 3));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
      >
        {/* HEADER BAR */}
        <View style={styles.headerRow}>
          <View style={styles.userProfileRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Home');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>

            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.greetingText} numberOfLines={1}>
                {getGreeting()}, {user?.name || 'Patient'} 👋
              </Text>
              <Text style={styles.subGreetingText}>{"Let's continue your recovery."}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#003D9B" style={{ marginVertical: 40 }} />
        ) : activeProgram ? (
          <>
            {/* RECOVERY HERO CARD */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeaderRow}>
                <Ionicons name="trending-up" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.heroBadgeText}>Week {currentWeek} of {targetWeeks} • Active Protocol</Text>
              </View>

              <Text style={styles.heroTitle}>{programName}</Text>
              <Text style={styles.heroSubText}>
                {completedSessions > 0
                  ? `Completed ${completedSessions} of ${targetSessions} prescribed sessions.`
                  : 'Your personalized recovery protocol is ready to begin.'}
              </Text>

              {/* CIRCULAR GAUGE */}
              <View style={styles.circleGaugeOuter}>
                <View style={styles.circleGaugeInner}>
                  <Text style={styles.gaugeNumberText}>{recoveryScore}%</Text>
                  <Text style={styles.gaugeLabelText}>RECOVERY</Text>
                </View>
              </View>
            </View>

            {/* ACTION ROW: START TODAY'S SESSION */}
            <TouchableOpacity
              style={styles.startSessionBanner}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TodaysSession', { program: activeProgram })}
            >
              <View style={styles.startSessionIconBox}>
                <Ionicons name="play" size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.startSessionTitle}>{"Start Today's Session"}</Text>
                <Text style={styles.startSessionSub}>Guided reps, hold timer & audio telemetry</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="fitness-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Active Recovery Program</Text>
            <Text style={styles.emptySub}>
              Consult with your physiotherapist to receive an evidence-based clinical rehabilitation routine.
            </Text>
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.emptyCtaBtnText}>Book Specialist Consultation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* METRIC TILES */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={styles.metricBox}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RecoveryProgressAnalytics')}
          >
            <View style={styles.metricIconRow}>
              <Ionicons name="analytics-outline" size={20} color="#003D9B" />
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </View>
            <Text style={styles.metricValue}>{activeProgram?.adherencePercent || 0}%</Text>
            <Text style={styles.metricLabel}>Protocol Adherence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricBox}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BodyPainMap')}
          >
            <View style={styles.metricIconRow}>
              <Ionicons name="body-outline" size={20} color="#0284c7" />
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </View>
            <Text style={styles.metricValue}>Pain Map</Text>
            <Text style={styles.metricLabel}>Log Symptom Zone</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricBox}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MyRecoveryPrograms')}
          >
            <View style={styles.metricIconRow}>
              <Ionicons name="calendar-outline" size={20} color="#16a34a" />
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </View>
            <Text style={styles.metricValue}>{completedSessions}</Text>
            <Text style={styles.metricLabel}>Sessions Finished</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricBox}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MedicalRecordsVault')}
          >
            <View style={styles.metricIconRow}>
              <Ionicons name="document-text-outline" size={20} color="#7c3aed" />
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </View>
            <Text style={styles.metricValue}>Clinical Vault</Text>
            <Text style={styles.metricLabel}>MRI & Prescriptions</Text>
          </TouchableOpacity>
        </View>

        {/* PROGRAM DETAILS LINK */}
        {activeProgram && (
          <TouchableOpacity
            style={styles.viewDetailsRow}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RecoveryProgramDetail', { program: activeProgram, programId: activeProgram.programId?._id || activeProgram.programId })}
          >
            <Ionicons name="list-outline" size={20} color="#003D9B" style={{ marginRight: 10 }} />
            <Text style={styles.viewDetailsText}>View Complete Multi-Week Protocol Breakdown</Text>
            <Ionicons name="chevron-forward" size={16} color="#003D9B" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subGreetingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  heroCard: {
    backgroundColor: '#003D9B',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubText: {
    fontSize: 13,
    color: '#bae6fd',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  circleGaugeOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGaugeInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeNumberText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#003D9B',
  },
  gaugeLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  startSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  startSessionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  startSessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  startSessionSub: {
    fontSize: 12,
    color: '#dcfce7',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyCtaBtn: {
    backgroundColor: '#003D9B',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  viewDetailsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#003D9B',
  },
});
