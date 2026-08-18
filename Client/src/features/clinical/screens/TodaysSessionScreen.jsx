import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';
import EmptyState from '../../../shared/components/EmptyState';

const { width } = Dimensions.get('window');

export default function TodaysSessionScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const [exercises, setExercises] = useState([]);
  const [activeProgram, setActiveProgram] = useState(route.params?.program || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSession = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [todayRes, progRes] = await Promise.all([
        clinicalApi.getTodaysExercises(token),
        clinicalApi.getActiveProgram(token),
      ]);

      if (todayRes.success && todayRes.data) {
        const list = Array.isArray(todayRes.data)
          ? todayRes.data
          : todayRes.data.exercises || [];
        setExercises(list);
      }

      if (progRes.success && progRes.data) {
        setActiveProgram(progRes.data.assignment || progRes.data);
      }
    } catch (err) {
      console.warn('[TodaysSession] Failed to load today session:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSession();
  };

  const programTitle = activeProgram?.title || activeProgram?.programId?.title || "Daily Mobility & Core Protocol";
  const programDesc = activeProgram?.description || activeProgram?.programId?.description || "Targeted physical therapy exercises prescribed by your treating specialist.";
  const totalExercises = exercises.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{"Today's Session"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: '600' }}>
            Loading Today's Routine...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#003D9B']} />}
        >
          {/* HERO IMAGE BANNER */}
          <View style={styles.heroImageWrap}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80' }}
              style={styles.heroPhoto}
            />
            <View style={styles.heroOverlayContent}>
              <Text style={styles.heroTitle}>{programTitle}</Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}><Text style={styles.heroMetaPillText}>{totalExercises * 3 || 12} Mins</Text></View>
                <View style={styles.heroMetaPill}><Text style={styles.heroMetaPillText}>{totalExercises} Exercises</Text></View>
                <View style={styles.heroMetaPill}><Text style={styles.heroMetaPillText}>Prescribed</Text></View>
              </View>
            </View>
          </View>

          {/* THE GOAL & EQUIPMENT */}
          <View style={styles.goalCard}>
            <Text style={styles.sectionHeaderTitle}>Protocol Goal</Text>
            <Text style={styles.goalBodyText}>{programDesc}</Text>

            <Text style={[styles.sectionHeaderTitle, { fontSize: 13, marginTop: 12, marginBottom: 8 }]}>REQUIRED EQUIPMENT</Text>
            <View style={styles.equipmentRow}>
              <View style={styles.equipItem}>
                <Ionicons name="fitness-outline" size={18} color="#003D9B" />
                <Text style={styles.equipText}>Resistance Band</Text>
              </View>
              <View style={styles.equipItem}>
                <Ionicons name="body-outline" size={18} color="#003D9B" />
                <Text style={styles.equipText}>Exercise Mat</Text>
              </View>
              <View style={styles.equipItem}>
                <Ionicons name="water-outline" size={18} color="#003D9B" />
                <Text style={styles.equipText}>Hydration</Text>
              </View>
            </View>
          </View>

          {/* EXERCISES LIST */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Prescribed Movements</Text>
            <Text style={styles.countText}>{totalExercises} Total</Text>
          </View>

          {exercises.length === 0 ? (
            <EmptyState
              icon="fitness-outline"
              title="No Exercises for Today"
              description="You have completed all scheduled exercises or no recovery routine has been assigned yet."
              buttonText="Browse Recovery Programs"
              onButtonPress={() => navigation.navigate('RecoveryMain')}
            />
          ) : (
            <View style={styles.exerciseList}>
              {exercises.map((item, idx) => {
                const ex = item.exerciseId || item;
                const exName = ex.name || ex.title || `Exercise ${idx + 1}`;
                const reps = item.reps || ex.reps || 10;
                const sets = item.sets || ex.sets || 3;
                const hold = item.holdSeconds || ex.holdSeconds || 5;

                return (
                  <TouchableOpacity
                    key={ex._id || ex.id || idx}
                    style={styles.exCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('ExerciseDetail', { exercise: ex, prescription: item, exercisesList: exercises })}
                  >
                    <View style={styles.exIconCircle}>
                      <Ionicons name="play" size={16} color="#003D9B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName}>{exName}</Text>
                      <Text style={styles.exMeta}>{sets} Sets × {reps} Reps • {hold}s Hold</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* STICKY START SESSION CTA */}
      {exercises.length > 0 && (
        <View style={styles.bottomCtaBar}>
          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.85}
            onPress={() => {
              const first = exercises[0]?.exerciseId || exercises[0];
              navigation.navigate('ExerciseTimer', { exercise: first, prescription: exercises[0], exercisesList: exercises });
            }}
          >
            <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.startBtnText}>Start Today's Workout</Text>
          </TouchableOpacity>
        </View>
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
    paddingRight: 10,
    paddingVertical: 4,
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
    paddingBottom: 90,
  },
  heroImageWrap: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  heroOverlayContent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 30, 80, 0.65)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroMetaPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroMetaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  goalBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  equipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#003D9B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  exerciseList: {
    gap: 10,
  },
  exCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  exMeta: {
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
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 50,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
