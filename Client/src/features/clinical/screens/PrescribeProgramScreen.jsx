import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import clinicalApi from '../api';
import { colors } from '../../../theme/colors';

export default function PrescribeProgramScreen({ route, navigation }) {
  const patientId = route.params?.patientId;
  const initialProgramId = route.params?.programId;
  const { token } = useSelector((state) => state.auth);

  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      targetWeeks: '4',
      targetSessionsPerWeek: '3',
      sets: '3',
      reps: '10',
      holdSeconds: '5',
      restSeconds: '30',
      patientGoals: 'Improve range of motion, muscle strength, and reduce pain symptoms.',
      notes: 'Perform slowly with smooth controlled breathing. Stop if sharp pain occurs.',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progRes, exRes] = await Promise.all([
          clinicalApi.listPrograms(token),
          clinicalApi.getExercises(token),
        ]);

        if (progRes.success && Array.isArray(progRes.data)) {
          setPrograms(progRes.data);
          const found = initialProgramId
            ? progRes.data.find((p) => p._id === initialProgramId)
            : progRes.data[0];
          setSelectedProgram(found || progRes.data[0] || null);
        }

        if (exRes.success && Array.isArray(exRes.data)) {
          setExercises(exRes.data);
          setSelectedExercise(exRes.data[0] || null);
        }
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load clinical catalogs.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, initialProgramId]);

  useEffect(() => {
    if (selectedExercise) {
      reset({
        targetWeeks: selectedProgram?.durationWeeks?.toString() || '4',
        targetSessionsPerWeek: selectedProgram?.targetSessionsPerWeek?.toString() || '3',
        sets: selectedExercise.defaultSets?.toString() || '3',
        reps: selectedExercise.defaultReps?.toString() || '10',
        holdSeconds: selectedExercise.defaultHoldSeconds?.toString() || '5',
        restSeconds: selectedExercise.defaultRestSeconds?.toString() || '30',
        patientGoals: 'Improve range of motion, muscle strength, and reduce pain symptoms.',
        notes: 'Perform slowly with smooth controlled breathing. Stop if sharp pain occurs.',
      });
    }
  }, [selectedExercise, selectedProgram]);

  const handlePrescribe = async (formData) => {
    if (!selectedProgram) {
      Alert.alert('Template Required', 'Please select a program template from the list.');
      return;
    }
    if (!patientId) {
      Alert.alert('Patient Required', 'No patient ID provided for assignment.');
      return;
    }

    setSubmitting(true);
    const prescriptionData = {
      patientId,
      programId: selectedProgram._id,
      startDate: new Date().toISOString(),
      targetWeeks: parseInt(formData.targetWeeks) || selectedProgram.durationWeeks || 4,
      targetSessionsPerWeek: parseInt(formData.targetSessionsPerWeek) || 3,
      patientGoals: formData.patientGoals,
      exerciseOverrides: selectedExercise
        ? [
            {
              exerciseId: selectedExercise._id,
              sets: parseInt(formData.sets) || 3,
              reps: parseInt(formData.reps) || 10,
              holdSeconds: parseInt(formData.holdSeconds) || 5,
              restSeconds: parseInt(formData.restSeconds) || 30,
              notes: formData.notes,
            },
          ]
        : [],
    };

    try {
      const res = await clinicalApi.prescribeProgram(prescriptionData, token);
      if (res.success) {
        Alert.alert(
          'Program Assigned',
          `Successfully prescribed "${selectedProgram.title || selectedProgram.name}" to patient.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Assignment Error', res.error?.message || 'Failed to prescribe program.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'An error occurred during prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading prescription suite...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescribe Recovery Program</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {/* PROGRAM TEMPLATE SELECTOR */}
        <Text style={styles.sectionHeader}>1. SELECT PROGRAM TEMPLATE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
          {programs.map((prog) => {
            const isSelected = selectedProgram?._id === prog._id;
            return (
              <TouchableOpacity
                key={prog._id}
                style={[styles.programCardChip, isSelected && styles.programCardChipActive]}
                onPress={() => setSelectedProgram(prog)}
              >
                <Text style={[styles.programChipTitle, isSelected && styles.programChipTitleActive]}>
                  {prog.title || prog.name}
                </Text>
                <Text style={[styles.programChipSub, isSelected && styles.programChipSubActive]}>
                  {prog.condition || prog.targetCondition || 'General Rehab'} • {prog.durationWeeks || 4}w
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CUSTOM TARGETS */}
        <Text style={styles.sectionHeader}>2. DURATION & FREQUENCY</Text>
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Target Duration (Weeks)</Text>
            <Controller
              control={control}
              name="targetWeeks"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Sessions / Week</Text>
            <Controller
              control={control}
              name="targetSessionsPerWeek"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
          </View>
        </View>

        {/* EXERCISE SELECTION & OVERRIDE */}
        <Text style={styles.sectionHeader}>3. CUSTOMIZE EXERCISE REPS & HOLDS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
          {exercises.map((ex) => {
            const isSelected = selectedExercise?._id === ex._id;
            return (
              <TouchableOpacity
                key={ex._id}
                style={[styles.exChipPill, isSelected && styles.exChipPillActive]}
                onPress={() => setSelectedExercise(ex)}
              >
                <Text style={[styles.exChipText, isSelected && styles.exChipTextActive]}>
                  {ex.name || ex.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.overrideCard}>
          <Text style={styles.overrideTitle}>
            Custom Prescriptions for: <Text style={{ color: '#003D9B' }}>{selectedExercise?.name || 'Exercise'}</Text>
          </Text>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Sets</Text>
              <Controller
                control={control}
                name="sets"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Reps</Text>
              <Controller
                control={control}
                name="reps"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Hold (sec)</Text>
              <Controller
                control={control}
                name="holdSeconds"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Clinical Guidance Notes</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                multiline
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        {/* CLINICAL GOALS */}
        <Text style={styles.sectionHeader}>4. CLINICAL REHABILITATION GOALS</Text>
        <Controller
          control={control}
          name="patientGoals"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top', marginBottom: 20 }]}
              multiline
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleSubmit(handlePrescribe)}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Assign Recovery Program</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  horizontalChips: {
    marginBottom: 14,
  },
  programCardChip: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginRight: 10,
    minWidth: 180,
  },
  programCardChipActive: {
    borderColor: '#003D9B',
    backgroundColor: '#e6f0ff',
  },
  programChipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  programChipTitleActive: {
    color: '#003D9B',
  },
  programChipSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  programChipSubActive: {
    color: '#003D9B',
    fontWeight: '600',
  },
  exChipPill: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  exChipPillActive: {
    backgroundColor: '#003D9B',
    borderColor: '#003D9B',
  },
  exChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  exChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  overrideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  overrideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#003D9B',
    borderRadius: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
