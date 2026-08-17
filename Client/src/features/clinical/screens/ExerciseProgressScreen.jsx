import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export default function ExerciseProgressScreen({ route, navigation }) {
  const {
    exercise = { name: 'Therapeutic Movement' },
    exercisesList = [],
    currentIndex = 0,
    patientProgramId,
    idempotencyKey,
    accumulatedTelemetry = []
  } = route.params || {};

  const totalExercises = Math.max(1, exercisesList.length);
  const completedCount = currentIndex + 1;
  const progressPercent = Math.min(100, Math.round((completedCount / totalExercises) * 100));
  const remainingCount = Math.max(0, totalExercises - completedCount);

  const nextExercise = exercisesList[currentIndex + 1] || null;

  const handleContinue = () => {
    if (nextExercise) {
      navigation.navigate('ExerciseTimer', {
        exercise: nextExercise,
        exercisesList,
        currentIndex: currentIndex + 1,
        patientProgramId,
        idempotencyKey,
        accumulatedTelemetry
      });
    } else {
      navigation.navigate('SessionComplete', {
        patientProgramId,
        idempotencyKey,
        exercisesCompleted: accumulatedTelemetry
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Progress</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* CHECKMARK ICON */}
        <View style={styles.successOuter}>
          <View style={styles.successInner}>
            <Ionicons name="checkmark" size={32} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.greatJobTitle}>Great Job! 🎉</Text>
        <Text style={styles.subText}>You completed {exercise.name || exercise.title || 'the movement'} successfully.</Text>

        {/* PROGRESS CIRCLE */}
        <View style={styles.progressCircleOuter}>
          <View style={styles.progressCircleInner}>
            <Text style={styles.progressPercentText}>{progressPercent}%</Text>
            <Text style={styles.progressLabelText}>Session Complete</Text>
          </View>
        </View>

        {/* REMAINING STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{remainingCount}</Text>
            <Text style={styles.statLab}>Exercises Remaining</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{completedCount} of {totalExercises}</Text>
            <Text style={styles.statLab}>Completed Movements</Text>
          </View>
        </View>

        <Text style={styles.quoteText}>"Consistency is the key to full musculoskeletal recovery."</Text>

        {/* NEXT UP CARD */}
        {nextExercise && (
          <View style={styles.nextUpCard}>
            <Text style={styles.nextUpLabel}>NEXT UP</Text>
            <View style={styles.nextUpContentRow}>
              <View style={styles.nextUpIconCircle}>
                <Ionicons name="fitness" size={18} color="#003D9B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextUpTitle}>{nextExercise.name || nextExercise.title}</Text>
                <Text style={styles.nextUpSub}>
                  {nextExercise.sets || 3} Sets × {nextExercise.reps || 10} Reps • {nextExercise.holdSeconds || 5}s Hold
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* STICKY ACTION BUTTON */}
      <View style={styles.bottomCtaBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>
            {nextExercise ? 'Continue to Next Exercise ➔' : 'Finish & Record Telemetry ➔'}
          </Text>
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
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  successOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greatJobTitle: {
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
  progressCircleOuter: {
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
  progressCircleInner: {
    alignItems: 'center',
  },
  progressPercentText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#003D9B',
  },
  progressLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLab: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextUpCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nextUpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003D9B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  nextUpContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextUpIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextUpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  nextUpSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
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
  continueBtn: {
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
