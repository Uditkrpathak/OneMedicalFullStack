import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Generate unique idempotency key for this workout session
const generateUUID = () => {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
};

export default function ExerciseTimerActiveScreen({ route, navigation }) {
  const exercisesList = route.params?.exercisesList || (route.params?.exercise ? [route.params.exercise] : []);
  const initialPrescription = route.params?.prescription || {};
  const patientProgramId = route.params?.patientProgramId || route.params?.programId;

  // Session ID & Start Time generated once on mount
  const idempotencyKeyRef = useRef(generateUUID());
  const sessionStartTimeRef = useRef(new Date());

  // Workout Sequence State
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const currentExercise = exercisesList[exerciseIndex] || route.params?.exercise || { name: 'Therapeutic Movement' };

  // Current Exercise Targets
  const totalSets = currentExercise.sets || initialPrescription.sets || currentExercise.defaultSets || 3;
  const totalReps = currentExercise.reps || initialPrescription.reps || currentExercise.defaultReps || 10;
  const holdSecondsTarget = currentExercise.holdSeconds || initialPrescription.holdSeconds || currentExercise.defaultHoldSeconds || 5;
  const restSecondsTarget = currentExercise.restSeconds || initialPrescription.restSeconds || currentExercise.defaultRestSeconds || 30;

  // Local Timer State Machine: 'EXERCISE' | 'HOLD' | 'REST' | 'PAUSED'
  const [phase, setPhase] = useState('EXERCISE');
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [holdTimer, setHoldTimer] = useState(holdSecondsTarget);
  const [restTimer, setRestTimer] = useState(restSecondsTarget);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [coachMessage, setCoachMessage] = useState('Maintain smooth, controlled breathing.');

  // Accumulated Telemetry
  const accumulatedExercisesRef = useRef([]);

  // Hold Timer Effect
  useEffect(() => {
    let interval = null;
    if (phase === 'HOLD' && holdTimer > 0) {
      interval = setInterval(() => {
        setHoldTimer((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'HOLD' && holdTimer === 0) {
      // Hold finished -> complete rep
      handleRepFinished();
    }
    return () => clearInterval(interval);
  }, [phase, holdTimer]);

  // Rest Timer Effect
  useEffect(() => {
    let interval = null;
    if (phase === 'REST' && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'REST' && restTimer === 0) {
      // Rest finished -> Start next set
      setPhase('EXERCISE');
      setHoldTimer(holdSecondsTarget);
      setCoachMessage(`Set ${currentSet} ready! Begin rep 1.`);
    }
    return () => clearInterval(interval);
  }, [phase, restTimer]);

  const handleStartHoldOrRep = () => {
    if (holdSecondsTarget > 1) {
      setHoldTimer(holdSecondsTarget);
      setPhase('HOLD');
      setCoachMessage(`Hold steady for ${holdSecondsTarget} seconds...`);
    } else {
      handleRepFinished();
    }
  };

  const handleRepFinished = () => {
    setPhase('EXERCISE');
    setHoldTimer(holdSecondsTarget);

    if (currentRep < totalReps) {
      setCurrentRep((r) => r + 1);
      setCoachMessage(`Rep ${currentRep + 1} of ${totalReps}. Inhale and contract.`);
    } else {
      // Completed all reps for current set
      if (currentSet < totalSets) {
        // Transition to Rest Phase
        setCurrentSet((s) => s + 1);
        setCurrentRep(1);
        setRestTimer(restSecondsTarget);
        setPhase('REST');
        setCoachMessage(`Set ${currentSet} complete! Rest for ${restSecondsTarget} seconds.`);
      } else {
        // Completed all sets for this exercise
        recordExerciseCompletion();
        if (exerciseIndex + 1 < exercisesList.length) {
          // Transition to Next Exercise
          setExerciseIndex((i) => i + 1);
          setCurrentSet(1);
          setCurrentRep(1);
          setRestTimer(restSecondsTarget);
          setPhase('REST');
          setCoachMessage(`Exercise complete! Take a breather before next movement.`);
        } else {
          // Entire Workout Complete!
          finishEntireWorkout();
        }
      }
    }
  };

  const recordExerciseCompletion = () => {
    accumulatedExercisesRef.current.push({
      exerciseId: currentExercise._id || currentExercise.exerciseId || currentExercise.id,
      name: currentExercise.name || currentExercise.title,
      setsCompleted: totalSets,
      repsCompleted: totalReps,
      holdSecondsCompleted: holdSecondsTarget,
      durationSec: totalSets * totalReps * (holdSecondsTarget + 2),
      completed: true,
    });
  };

  const finishEntireWorkout = () => {
    const elapsedSeconds = Math.max(
      60,
      Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000)
    );

    navigation.navigate('SessionComplete', {
      patientProgramId,
      idempotencyKey: idempotencyKeyRef.current,
      durationSeconds: elapsedSeconds,
      exercisesCompleted: accumulatedExercisesRef.current,
      startedAt: sessionStartTimeRef.current.toISOString(),
      completedAt: new Date().toISOString(),
    });
  };

  const handleSkipRest = () => {
    setRestTimer(0);
    setPhase('EXERCISE');
    setHoldTimer(holdSecondsTarget);
  };

  const totalExercises = Math.max(1, exercisesList.length);
  const workoutProgressPercent = Math.round(((exerciseIndex + (currentSet - 1) / totalSets) / totalExercises) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            EXERCISE {exerciseIndex + 1} OF {totalExercises}
          </Text>
          <Text style={styles.headerSub}>SET {currentSet} OF {totalSets}</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerBackBtn, isVoiceEnabled && { backgroundColor: '#e6f0ff' }]}
          onPress={() => setIsVoiceEnabled(!isVoiceEnabled)}
        >
          <Ionicons
            name={isVoiceEnabled ? 'volume-high' : 'volume-mute'}
            size={20}
            color={isVoiceEnabled ? '#003D9B' : '#94a3b8'}
          />
        </TouchableOpacity>
      </View>

      {/* WORKOUT PROGRESS BAR */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${workoutProgressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* ACTIVE DEMO MEDIA */}
        <View style={styles.videoWrap}>
          <Image
            source={{ uri: currentExercise.thumbnailUrl || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800' }}
            style={styles.videoPhoto}
          />
          {isVoiceEnabled && (
            <View style={styles.audioCoachBadge}>
              <Ionicons name="mic-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.audioCoachBadgeText}>Voice Coach Active</Text>
            </View>
          )}
        </View>

        <Text style={styles.exTitle}>{currentExercise.name || currentExercise.title}</Text>
        <Text style={styles.exTargetSub}>
          {(currentExercise.bodyRegion || currentExercise.bodyPart || 'TARGETED RECOVERY').toUpperCase()}
        </Text>

        {/* TIMER & REP GAUGE */}
        {phase === 'REST' ? (
          <View style={[styles.counterCircleOuter, { borderColor: '#16a34a' }]}>
            <View style={styles.counterCircleInner}>
              <Text style={[styles.countText, { color: '#16a34a' }]}>{restTimer}s</Text>
              <Text style={styles.countLabelText}>REST INTERVAL</Text>
            </View>
          </View>
        ) : phase === 'HOLD' ? (
          <View style={[styles.counterCircleOuter, { borderColor: '#e11d48' }]}>
            <View style={styles.counterCircleInner}>
              <Text style={[styles.countText, { color: '#e11d48' }]}>{holdTimer}s</Text>
              <Text style={styles.countLabelText}>HOLD POSITION</Text>
            </View>
          </View>
        ) : (
          <View style={styles.counterCircleOuter}>
            <View style={styles.counterCircleInner}>
              <Text style={styles.countText}>{currentRep} / {totalReps}</Text>
              <Text style={styles.countLabelText}>REPS</Text>
            </View>
          </View>
        )}

        {/* VOICE COACH PROMPT CARD */}
        <View style={styles.coachCard}>
          <Ionicons name="sparkles" size={18} color="#003D9B" style={{ marginRight: 8 }} />
          <Text style={styles.cueText}>"{coachMessage}"</Text>
        </View>

        {phase === 'REST' && (
          <TouchableOpacity style={styles.skipRestBtn} onPress={handleSkipRest}>
            <Ionicons name="play-skip-forward-outline" size={16} color="#16a34a" style={{ marginRight: 6 }} />
            <Text style={styles.skipRestBtnText}>Skip Rest & Start Next Set</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* STICKY ACTION BUTTON */}
      {phase !== 'REST' && (
        <View style={styles.bottomCtaBar}>
          <TouchableOpacity
            style={styles.markRepBtn}
            activeOpacity={0.88}
            onPress={handleStartHoldOrRep}
          >
            <Text style={styles.markRepBtnText}>
              {phase === 'HOLD'
                ? `HOLDING (${holdTimer}s)...`
                : currentRep < totalReps
                ? `MARK REP ${currentRep} COMPLETE`
                : currentSet < totalSets
                ? 'FINISH SET & REST ➔'
                : exerciseIndex + 1 < totalExercises
                ? 'NEXT EXERCISE ➔'
                : 'FINISH WORKOUT ➔'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.8,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#003D9B',
    marginTop: 1,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#003D9B',
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
    alignItems: 'center',
  },
  videoWrap: {
    width: '100%',
    height: 180,
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
  audioCoachBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 61, 155, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audioCoachBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  exTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  exTargetSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003D9B',
    letterSpacing: 0.8,
    marginBottom: 20,
  },
  counterCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  counterCircleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#003D9B',
  },
  countLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  cueText: {
    flex: 1,
    fontSize: 13,
    color: '#003D9B',
    fontWeight: '600',
    lineHeight: 18,
  },
  skipRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 16,
  },
  skipRestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
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
    borderTopColor: '#e2e8f0',
  },
  markRepBtn: {
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markRepBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
