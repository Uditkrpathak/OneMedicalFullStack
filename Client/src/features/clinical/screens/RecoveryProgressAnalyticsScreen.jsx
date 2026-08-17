import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';

export default function RecoveryProgressAnalyticsScreen({ navigation, route }) {
  const { token, user } = useSelector((state) => state.auth);
  const patientId = user?.role === 'patient'
    ? (user?._id || user?.userId || user?.id || 'me')
    : (route.params?.patientId || null);
  const programId = route.params?.programId || '';
  const patientName = route.params?.patientName || 'Patient';

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (user?.role === 'therapist' && !patientId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await clinicalApi.getRecoveryProgress(patientId, programId, token);
        if (res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (err) {
        console.warn('Failed to load progress analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [patientId, programId, token]);

  const compositeScore = analytics?.compositeRecoveryScore || 0;
  const compliance = analytics?.compliance || {
    completedSessions: analytics?.program?.completedSessionsCount || 0,
    expectedSessions: (analytics?.program?.targetWeeks ? analytics.program.targetWeeks * (analytics.program.targetSessionsPerWeek || 3) : 0),
    percent: analytics?.program?.adherencePercent || 0
  };
  const pain = analytics?.pain || { baseline: null, latest: null, reductionPercent: 0 };
  const mobility = analytics?.mobility || { mobility: null, mobilityAvailable: false };
  const timeline = analytics?.timeline || [];
  const programTitle = analytics?.program?.title || 'Active Rehabilitation Program';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recovery Analytics</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Calculating clinical progress...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* COMPOSITE RECOVERY SCORE HERO CARD */}
          <View style={styles.heroCard}>
            <Text style={styles.heroMetaLabel}>PROGRAM RECOVERY INDEX</Text>
            <Text style={styles.heroProgramTitle}>{programTitle}</Text>

            <View style={styles.scoreGaugeCircle}>
              <Text style={styles.scoreGaugeVal}>{compositeScore}%</Text>
              <Text style={styles.scoreGaugeLabel}>COMPOSITE SCORE</Text>
            </View>

            <View style={styles.heroSubRow}>
              <Ionicons name="shield-checkmark" size={16} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={styles.heroSubText}>Multi-factor weighted clinical algorithm</Text>
            </View>
          </View>

          {/* 3 CORE PILLARS GRID */}
          <Text style={styles.sectionTitle}>Recovery Breakdown</Text>
          <View style={styles.pillarsGrid}>
            {/* COMPLIANCE PILLAR (40%) */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeader}>
                <Ionicons name="checkmark-done-circle" size={20} color="#003D9B" />
                <Text style={styles.pillarWeight}>Weight: 40%</Text>
              </View>
              <Text style={styles.pillarVal}>{compliance.percent}%</Text>
              <Text style={styles.pillarLabel}>Session Compliance</Text>
              <Text style={styles.pillarDetail}>
                {compliance.expectedSessions > 0
                  ? `${compliance.completedSessions} of ${compliance.expectedSessions} sessions`
                  : `${compliance.completedSessions} session${compliance.completedSessions !== 1 ? 's' : ''} completed`}
              </Text>
            </View>

            {/* PAIN REDUCTION PILLAR (30%) */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeader}>
                <Ionicons name="heart-half-outline" size={20} color="#dc2626" />
                <Text style={styles.pillarWeight}>Weight: 30%</Text>
              </View>
              <Text style={styles.pillarVal}>{pain.reductionPercent}%</Text>
              <Text style={styles.pillarLabel}>Pain Reduction</Text>
              <Text style={styles.pillarDetail}>
                {pain.baseline !== null ? `${pain.baseline}/10 → ${pain.latest}/10` : 'No pain records'}
              </Text>
            </View>

            {/* MOBILITY PILLAR (30% / Normalized) */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeader}>
                <Ionicons name="body-outline" size={20} color="#64748b" />
                <Text style={styles.pillarWeight}>Weight: 30%</Text>
              </View>
              <Text style={[styles.pillarVal, { color: '#64748b', fontSize: 16 }]}>
                {mobility.mobilityAvailable ? `${mobility.mobility}%` : 'Not Measured'}
              </Text>
              <Text style={styles.pillarLabel}>Mobility & ROM</Text>
              <Text style={styles.pillarDetail}>
                {mobility.mobilityAvailable ? 'Sensor Verified' : 'Re-weighted dynamically'}
              </Text>
            </View>
          </View>

          {/* RECOVERY TIMELINE & LOGS */}
          <Text style={styles.sectionTitle}>Clinical Progress Timeline</Text>
          <View style={styles.timelineCard}>
            {timeline.length === 0 ? (
              <Text style={styles.emptyText}>No session or pain records logged for this protocol yet.</Text>
            ) : (
              timeline.map((item, idx) => (
                <View key={item.date || idx} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.timelineDate}>
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.timelineDetail}>
                      {item.sessionCompleted ? '✅ Workout Completed' : '📋 Clinical Assessment'}
                      {item.painScore !== undefined ? ` • Pain: ${item.painScore}/10` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 12,
    backgroundColor: '#ffffff',
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
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  heroMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 0.8,
  },
  heroProgramTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreGaugeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    borderWidth: 5,
    borderColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreGaugeVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#166534',
  },
  scoreGaugeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSubText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  pillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  pillarCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pillarWeight: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  pillarVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  pillarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pillarDetail: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#003D9B',
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  timelineDetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
