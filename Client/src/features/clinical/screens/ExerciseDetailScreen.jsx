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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';

const { width } = Dimensions.get('window');

export default function ExerciseDetailScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const isTherapist = user?.role === 'therapist' || user?.role === 'clinic_admin';
  const initialExercise = route.params?.exercise || {};
  const prescription = route.params?.prescription || {};
  const exerciseId = route.params?.exerciseId || initialExercise._id || initialExercise.id || prescription.exerciseId;

  const [exercise, setExercise] = useState(initialExercise);
  const [loading, setLoading] = useState(!initialExercise.name && !initialExercise.title);

  useEffect(() => {
    if (!exerciseId || typeof exerciseId !== 'string') return;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await clinicalApi.getExerciseById(exerciseId, token);
        if (res.success && res.data) {
          setExercise(prev => ({
            ...prev,
            ...res.data,
            name: res.data.name || res.data.title || prev.name,
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch exercise details:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [exerciseId, token]);

  const exerciseName = exercise.name || exercise.title || 'Therapeutic Movement';
  const targetReps = prescription.reps || prescription.targetReps || exercise.reps || exercise.defaultReps || 10;
  const targetSets = prescription.sets || prescription.targetSets || exercise.sets || exercise.defaultSets || 3;
  const targetHold = prescription.holdSeconds || exercise.holdSeconds || exercise.defaultHoldSeconds || 5;
  const targetRest = prescription.restSeconds || exercise.restSeconds || exercise.defaultRestSeconds || 30;

  const bodyRegion = (exercise.bodyRegion || exercise.bodyPart || 'General').toUpperCase();
  const category = (exercise.category || 'Mobility').toUpperCase();
  const difficulty = (exercise.difficulty || 'Beginner').toUpperCase();

  const rawInstructions = exercise.instructions || [
    'Assume the prescribed starting posture with neutral spine.',
    'Execute the movement slowly with controlled breathing.',
    'Hold at the peak contraction for the prescribed seconds.',
    'Return smoothly to starting position and rest between sets.'
  ];
  const instructionsList = Array.isArray(rawInstructions) ? rawInstructions : String(rawInstructions).split('\n').filter(Boolean);

  const rawPrecautions = exercise.precautions || exercise.mistakesToAvoid || [
    'Stop immediately if you experience sharp or radiating pain.',
    'Do not hold your breath during the repetition.'
  ];
  const precautionsList = Array.isArray(rawPrecautions) ? rawPrecautions : String(rawPrecautions).split('\n').filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Details</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* VIDEO / MEDIA BANNER */}
          <View style={styles.videoWrap}>
            <Image
              source={{ uri: exercise.thumbnailUrl || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800' }}
              style={styles.videoPhoto}
            />
            <View style={styles.videoOverlay}>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>{bodyRegion} • {category}</Text>
              </View>
            </View>
          </View>

          {/* TITLE & DESCRIPTION */}
          <View style={styles.infoCard}>
            <Text style={styles.exerciseTitle}>{exerciseName}</Text>
            <Text style={styles.exerciseDesc}>
              {exercise.description || 'Targeted physical therapy exercise for muscle activation and joint mobility.'}
            </Text>

            {/* PRESCRIPTION STATS GRID */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{targetSets}</Text>
                <Text style={styles.statLabel}>SETS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{targetReps}</Text>
                <Text style={styles.statLabel}>REPS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{targetHold}s</Text>
                <Text style={styles.statLabel}>HOLD</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{targetRest}s</Text>
                <Text style={styles.statLabel}>REST</Text>
              </View>
            </View>
          </View>

          {/* INSTRUCTIONS */}
          <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
          <View style={styles.stepsCard}>
            {instructionsList.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* PRECAUTIONS */}
          {precautionsList.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Clinical Precautions</Text>
              <View style={styles.precautionsCard}>
                {precautionsList.map((item, idx) => (
                  <View key={idx} style={styles.precautionRow}>
                    <Ionicons name="warning-outline" size={16} color="#d97706" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={styles.precautionText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ACTION BUTTONS */}
          {isTherapist ? (
            <View style={{ gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.85}
                onPress={() => {
                  navigation.navigate('PrescribeProgram', {
                    exercise,
                    exerciseId: exercise._id || exercise.id,
                  });
                }}
              >
                <Ionicons name="clipboard-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.startBtnText}>📋 Prescribe to Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: '#e2e8f0', elevation: 0 }]}
                activeOpacity={0.85}
                onPress={() => {
                  navigation.navigate('ExerciseTimer', {
                    exercise,
                    prescription: { ...prescription, sets: targetSets, reps: targetReps, holdSeconds: targetHold, restSeconds: targetRest },
                    exercisesList: route.params?.exercisesList || [exercise],
                  });
                }}
              >
                <Ionicons name="play-outline" size={18} color="#0f172a" style={{ marginRight: 8 }} />
                <Text style={[styles.startBtnText, { color: '#0f172a' }]}>Preview Exercise Timer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startBtn}
              activeOpacity={0.85}
              onPress={() => {
                navigation.navigate('ExerciseTimer', {
                  exercise,
                  prescription: { ...prescription, sets: targetSets, reps: targetReps, holdSeconds: targetHold, restSeconds: targetRest },
                  exercisesList: route.params?.exercisesList || [exercise],
                });
              }}
            >
              <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>Start Exercise Timer</Text>
            </TouchableOpacity>
          )}
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
  videoWrap: {
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  videoPhoto: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: 'flex-start',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 61, 155, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  exerciseDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003D9B',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 4,
  },
  stepsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003D9B',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  precautionsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 20,
    gap: 8,
  },
  precautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  precautionText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 17,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 52,
    marginBottom: 20,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
