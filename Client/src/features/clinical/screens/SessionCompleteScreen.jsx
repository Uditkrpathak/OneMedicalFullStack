import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';

export default function SessionCompleteScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const {
    patientProgramId,
    idempotencyKey,
    durationSeconds = 180,
    exercisesCompleted = [],
    startedAt,
    completedAt
  } = route.params || {};

  const [painLevel, setPainLevel] = useState(2);
  const [rpeScore, setRpeScore] = useState(4); // Borg Scale (1 = very light, 10 = max exertion)
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loggedScores, setLoggedScores] = useState(null);

  const formatDuration = (sec) => {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    if (s < 60) return `${s} Sec`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m} Min${m > 1 ? 's' : ''}`;
  };

  const totalExercisesDone = exercisesCompleted.length > 0 ? exercisesCompleted.length : 1;

  const handleSaveAndFinish = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        patientProgramId: patientProgramId || undefined,
        idempotencyKey: idempotencyKey || undefined,
        date: new Date().toISOString().slice(0, 10),
        durationSeconds: Number(durationSeconds),
        perceivedExertionRPE: Number(rpeScore),
        painLevel: Number(painLevel),
        status: 'completed',
        exercisesCompleted: exercisesCompleted.length > 0
          ? exercisesCompleted
          : [
              {
                exerciseId: route.params?.exercise?._id || route.params?.exercise?.exerciseId,
                name: route.params?.exercise?.name || route.params?.exercise?.title || 'Therapeutic Movement',
                setsCompleted: Math.max(1, route.params?.setsCompleted || 3),
                repsCompleted: Math.max(1, route.params?.repsCompleted || 10),
                holdSecondsCompleted: route.params?.exercise?.durationSec || 5,
                durationSec: Number(durationSeconds),
                completed: true,
              },
            ],
        notes: `Completed workout session with RPE ${rpeScore}/10 and post-session pain ${painLevel}/10.`,
        startedAt,
        completedAt: completedAt || new Date().toISOString(),
      };

      const res = await clinicalApi.logSession(payload, token);
      if (res.success) {
        setSubmitted(true);
        const prog = res.data?.program || res.data?.patientProgram || {};
        setLoggedScores({
          recoveryScore: prog.recoveryScore !== undefined ? prog.recoveryScore : (res.data?.recoveryScore ?? 0),
          adherencePercent: prog.adherencePercent !== undefined ? prog.adherencePercent : (res.data?.adherencePercent ?? 0),
          completedSessionsCount: prog.completedSessionsCount !== undefined ? prog.completedSessionsCount : 1,
        });
      } else {
        Alert.alert('Session Log', res.error?.message || 'Session recorded.');
        setSubmitted(true);
      }
    } catch (err) {
      console.warn('[SessionComplete] Error:', err.message);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.navigate('RecoveryMain')}>
          <Ionicons name="close" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Complete</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* SUCCESS ICON */}
        <View style={styles.successOuter}>
          <View style={styles.successInner}>
            <Ionicons name="checkmark" size={40} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.titleText}>Great Job! Workout Completed</Text>
        <Text style={styles.subText}>
          You finished {totalExercisesDone} prescribed therapeutic exercise{totalExercisesDone > 1 ? 's' : ''}.
        </Text>

        {!submitted ? (
          <>
            {/* PERCEIVED EXERTION (RPE 1-10) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>1. How intense was this workout? (RPE)</Text>
              <Text style={styles.cardSub}>Rate perceived exertion from 1 (Very Light) to 10 (Maximum Effort)</Text>
              <View style={styles.chipsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                  const isSelected = rpeScore === score;
                  return (
                    <TouchableOpacity
                      key={score}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setRpeScore(score)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {score}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.labelsRow}>
                <Text style={styles.labelSub}>1: Light / Gentle</Text>
                <Text style={styles.labelSub}>5: Moderate</Text>
                <Text style={styles.labelSub}>10: Very Heavy</Text>
              </View>
            </View>

            {/* PAIN ASSESSMENT (0-10) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>2. How is your joint/muscle pain right now?</Text>
              <Text style={styles.cardSub}>Select current symptom pain from 0 (No Pain) to 10 (Severe)</Text>
              <View style={styles.chipsRow}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                  const isSelected = painLevel === score;
                  return (
                    <TouchableOpacity
                      key={score}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setPainLevel(score)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {score}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.labelsRow}>
                <Text style={styles.labelSub}>0: No Pain</Text>
                <Text style={styles.labelSub}>5: Moderate</Text>
                <Text style={styles.labelSub}>10: Severe</Text>
              </View>
            </View>
          </>
        ) : (
          /* SUMMARY AFTER LOGGING */
          <View style={styles.summaryCard}>
            <View style={styles.scoreRow}>
              <Ionicons name="trending-up" size={24} color="#16a34a" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.summaryScoreText}>
                  Recovery Score: {loggedScores?.recoveryScore ?? 0}%
                </Text>
                <Text style={styles.summaryScoreSub}>
                  Protocol Adherence: {loggedScores?.adherencePercent ?? 0}% • {loggedScores?.completedSessionsCount ?? 1} Session{(loggedScores?.completedSessionsCount ?? 1) > 1 ? 's' : ''} Completed
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* WORKOUT STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statVal}>{formatDuration(durationSeconds)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>EXERCISES</Text>
            <Text style={styles.statVal}>{totalExercisesDone}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>INTENSITY (RPE)</Text>
            <Text style={styles.statVal}>{rpeScore} / 10</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PAIN SCORE</Text>
            <Text style={styles.statVal}>{painLevel} / 10</Text>
          </View>
        </View>

        {/* CTA BUTTON */}
        {!submitted ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleSaveAndFinish}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Telemetry & Finish</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('RecoveryMain')}
          >
            <Text style={styles.primaryBtnText}>Return to Recovery Dashboard</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    width: 32,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#003D9B',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  summaryScoreSub: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003D9B',
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
