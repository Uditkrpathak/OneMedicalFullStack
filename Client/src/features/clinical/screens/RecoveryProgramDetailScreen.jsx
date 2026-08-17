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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import clinicalApi from '../api';

const { width } = Dimensions.get('window');

export default function RecoveryProgramDetailScreen({ route, navigation }) {
  const { token } = useSelector((state) => state.auth);
  const initialProgram = route.params?.program || {};
  const programId = route.params?.programId || initialProgram._id || initialProgram.id || initialProgram.programId?._id || initialProgram.programId;

  const [program, setProgram] = useState(initialProgram);
  const [loading, setLoading] = useState(!initialProgram?.title && !initialProgram?.name);

  useEffect(() => {
    if (!programId || typeof programId !== 'string') return;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await clinicalApi.getProgramById(programId, token);
        if (res.success && res.data) {
          setProgram(res.data);
        }
      } catch (err) {
        console.warn('Failed to load program details:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [programId, token]);

  const programTitle = program.title || program.name || 'Rehabilitation Protocol';
  const programCondition = program.condition || program.targetCondition || 'Musculoskeletal Rehabilitation';
  const durationWeeks = program.durationWeeks || program.targetWeeks || 4;
  const sessionsPerWeek = program.targetSessionsPerWeek || 3;
  const difficulty = (program.difficulty || 'beginner').toUpperCase();

  const phases = program.phases && program.phases.length > 0
    ? program.phases
    : [
        { week: 1, phaseName: 'Phase 1: Foundation & Mobility', exercises: program.exercises || [] },
        { week: 2, phaseName: 'Phase 2: Progressive Strengthening', exercises: [] },
      ];

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Program Details</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#003D9B" />
          <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading program details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
          {/* PROGRAM HEADER INFO */}
          <View style={styles.progInfoCard}>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{programCondition}</Text>
            </View>

            <Text style={styles.progTitle}>{programTitle}</Text>
            <Text style={styles.progSub}>
              {durationWeeks} Weeks • {sessionsPerWeek} Sessions/week • {difficulty}
            </Text>

            {program.description ? (
              <Text style={styles.overviewText}>{program.description}</Text>
            ) : null}
          </View>

          {/* ACTION BUTTON */}
          <TouchableOpacity
            style={styles.startSessionBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TodaysSession', { program })}
          >
            <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.startSessionBtnText}>Start Today's Exercises</Text>
          </TouchableOpacity>

          {/* RECOVERY ROADMAP TIMELINE */}
          <Text style={styles.sectionHeaderTitle}>Phased Recovery Progression</Text>

          <View style={styles.roadmapCard}>
            {phases.map((phase, idx) => (
              <View key={idx} style={styles.phaseItem}>
                <View style={[styles.phaseIconCircle, { backgroundColor: idx === 0 ? '#003D9B' : '#f1f5f9' }]}>
                  <Text style={[styles.phaseNum, idx === 0 && { color: '#ffffff' }]}>W{phase.week || idx + 1}</Text>
                </View>
                <View style={styles.phaseContent}>
                  <Text style={[styles.phaseTitle, idx === 0 && { color: '#003D9B' }]}>
                    {phase.phaseName || `Week ${phase.week || idx + 1}`}
                  </Text>
                  <Text style={styles.phaseDesc}>
                    {phase.exercises && phase.exercises.length > 0
                      ? `${phase.exercises.length} prescribed exercises in this phase`
                      : 'Targeted mobility and joint stabilization exercises'}
                  </Text>

                  {phase.exercises && phase.exercises.length > 0 && (
                    <View style={styles.exerciseChipsRow}>
                      {phase.exercises.map((ex, exIdx) => {
                        const exName = ex.exerciseId?.name || ex.exerciseId?.title || ex.name || `Exercise ${exIdx + 1}`;
                        return (
                          <View key={exIdx} style={styles.exChip}>
                            <Text style={styles.exChipText}>{exName} ({ex.sets || 3}x{ex.reps || 10})</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* PRECAUTIONS & EQUIPMENT */}
          {(program.precautions?.length > 0 || program.equipment?.length > 0) && (
            <View style={styles.precautionsCard}>
              {program.precautions?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.precautionHeader}>Clinical Precautions</Text>
                  {program.precautions.map((p, i) => (
                    <Text key={i} style={styles.precautionItem}>• {p}</Text>
                  ))}
                </View>
              )}
              {program.equipment?.length > 0 && (
                <View>
                  <Text style={styles.precautionHeader}>Required Equipment</Text>
                  <Text style={styles.precautionItem}>{program.equipment.join(', ')}</Text>
                </View>
              )}
            </View>
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
  progInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003D9B',
  },
  progTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  progSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  overviewText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  startSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 50,
    marginBottom: 20,
  },
  startSessionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  roadmapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 14,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phaseIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  phaseNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003D9B',
  },
  phaseContent: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  phaseDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  exerciseChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  exChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  exChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  precautionsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  precautionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  precautionItem: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 17,
  },
});
