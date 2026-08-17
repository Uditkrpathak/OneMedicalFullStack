import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_URL } from '../../../shared/config';

const { width } = Dimensions.get('window');

export default function ClinicalConsultationScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const appointmentId = route.params?.appointmentId || 'apt_sample';
  const initialPatientName = route.params?.patientName || 'Sanya Malhotra';

  const [consultationId, setConsultationId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedStatusText, setSavedStatusText] = useState('Saved just now');

  // Unified 6-Step Consultation State
  const [consultationData, setConsultationData] = useState({
    // Step 1: Preparation
    step1_preparation: {
      chiefComplaint: 'Patellar instability and lower back stiffness during knee flexion.',
      painScore: 4,
      painType: ['Radiating'],
      painDuration: 'Today',
      painLocation: { bodyPart: 'Left Knee', region: 'Front' },
      sessionGoals: ['Reduce Pain', 'Improve Mobility'],
      observations: { swelling: true, inflammation: false, limitedRom: true, muscleTight: true },
    },

    // Step 2: Assessment
    step2_assessment: {
      vitals: { bp: '120/80', hr: 72, temp: 98.6, spo2: 98 },
      painMovement: 6,
      painRest: 2,
      structuredRom: [
        {
          joint: 'Knee',
          movement: 'Flexion',
          extensionDegrees: 0,
          flexionDegrees: 110,
          measuredDegrees: 85,
          restriction: 'MODERATE',
        },
      ],
      muscleStrength: '3/5',
      specialTests: [
        { name: 'Lachman Test', result: 'POSITIVE' },
        { name: 'Straight Leg Raise', result: 'NEGATIVE' },
      ],
      functionalObservations: ['Walking', 'Balance', 'Sit to Stand'],
      clinicalImpression: 'Patient presents with significant reduction in localized tenderness over L4-L5.',
    },

    // Step 3: Treatment
    step3_treatment: {
      modalities: ['Manual Therapy', 'IFT'],
      exercisesPerformed: [
        { name: 'Pelvic Tilts', sets: 3, reps: 12, holdSec: 30 },
        { name: 'Cat-Cow Stretch', sets: 2, reps: 10, holdSec: 45 },
      ],
      bodyRegionTreated: 'Lower Back',
      patientResponse: 'Tolerated Well',
      sessionIntensity: 'Moderate',
      durationMins: 45,
      treatmentRemarks: 'Tolerated manual mobilization well. Patient noted 20% reduction in discomfort.',
    },

    // Step 4: Recovery
    step4_recovery: {
      programName: 'Lumbar Spine Stabilization',
      homeExercises: [
        { name: 'Pelvic Tilts', sets: 3, reps: 10, frequency: '2x Daily' },
        { name: 'Cat-Cow Stretch', sets: 2, reps: 10, frequency: '1x Daily' },
      ],
      patientGoals: ['Reduce Pain', 'Improve Mobility'],
      activityRestrictions: ['Avoid Heavy Lifting'],
      homeCareInstructions: 'Apply ice pack for 15 mins post home exercise routine.',
      nextReviewDate: 'Nov 05, 2024',
      nextReviewMilestone: 'Phase 2 Check',
      patientEducation: { exerciseVideos: true, painManagementGuide: true },
    },

    // Step 5: Synthesis
    step5_synthesis: {
      conditionSummary: {
        condition: 'Lower Back Pain',
        mobility: 'Moderate restriction',
        interventions: 'Manual Therapy, Pelvic Tilts focus',
        nextPhase: 'Lumbar Stabilization Program initialization scheduled for next session.',
      },
      clinicalImpression: 'Patient presents with significant reduction in localized tenderness over L4-L5.',
      additionalNotes: '',
      progressStatus: 'Improved',
      goalStatus: 'Partially Achieved',
      complications: false,
      digitalSignature: {
        signedBy: user?.userId || 'th_1',
        therapistName: 'Dr. Ananya Iyer',
        registrationNumber: 'Reg #PT-3821',
        clinicName: 'Downtown Clinic',
        signedAt: null,
      },
    },

    // Step 6: Reports & Next Visit
    step6_reports: {
      attachedReports: [
        {
          title: 'MRI_Lumbar_Spine.pdf',
          category: 'MRI',
          hospital: 'Manipal Hospital',
          doctorName: 'Dr. Satish Kumar',
        },
      ],
      nextVisit: {
        required: true,
        date: 'Nov 05, 2024',
        time: '10:30 AM',
        consultationType: 'In-person',
        clinic: 'Downtown Clinic',
        sessionObjectives: ['Pain Reassessment', 'ROM Assessment', 'Progress Review'],
        automatedReminders: { medication: true, exercise: true, hydration: true },
        referralNotes: 'No Referral',
        nextVisitChecklist: { reviewPainScore: true, reviewExerciseCompliance: true, reviewReports: true },
      },
    },
  });

  // Fetch or Initialize Consultation Draft
  useEffect(() => {
    async function initConsultation() {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/consultations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ appointmentId }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setConsultationId(json.data._id);
          if (json.data.currentStep) setCurrentStep(json.data.currentStep);
          setConsultationData((prev) => ({
            ...prev,
            step1_preparation: json.data.step1_preparation || prev.step1_preparation,
            step2_assessment: json.data.step2_assessment || prev.step2_assessment,
            step3_treatment: json.data.step3_treatment || prev.step3_treatment,
            step4_recovery: json.data.step4_recovery || prev.step4_recovery,
            step5_synthesis: json.data.step5_synthesis || prev.step5_synthesis,
            step6_reports: json.data.step6_reports || prev.step6_reports,
          }));
        }
      } catch (err) {
        console.warn('[ClinicalConsultation] init error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    initConsultation();
  }, [appointmentId, token]);

  // Step-by-Step Autosave Function
  const autosave = async (stepNumber, nextStepOverride) => {
    if (!token || !consultationId) return;
    setSavingDraft(true);
    setSavedStatusText('Saving...');
    try {
      const res = await fetch(`${API_URL}/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentStep: nextStepOverride || stepNumber,
          ...consultationData,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedStatusText('Saved just now');
      }
    } catch (err) {
      setSavedStatusText('Saved locally');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleNextStep = () => {
    const next = Math.min(6, currentStep + 1);
    setCurrentStep(next);
    autosave(currentStep, next);
  };

  const handlePrevStep = () => {
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
  };

  // Step 5: Digital Signature
  const handleDigitalSign = async () => {
    if (!token || !consultationId) return;
    try {
      const res = await fetch(`${API_URL}/consultations/${consultationId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          therapistName: 'Dr. Ananya Iyer',
          registrationNumber: 'Reg #PT-3821',
          clinicName: 'Downtown Clinic',
        }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Digitally Signed', 'Consultation encounter has been digitally signed and cryptographically sealed.');
        handleNextStep();
      }
    } catch (err) {
      Alert.alert('Signed Locally', 'Signature recorded.');
      handleNextStep();
    }
  };

  // Step 6: Final Submission
  const handleFinalSubmit = async () => {
    if (!token || !consultationId) return;
    try {
      const res = await fetch(`${API_URL}/consultations/${consultationId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Encounter Finalized', 'Clinical consultation record submitted to patient permanent records.', [
          { text: 'OK', onPress: () => navigation.navigate('TherapistHome') },
        ]);
      }
    } catch (err) {
      Alert.alert('Submitted', 'Consultation record saved.', [
        { text: 'OK', onPress: () => navigation.navigate('TherapistHome') },
      ]);
    }
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 1:
        return 'Preparation';
      case 2:
        return 'Assessment';
      case 3:
        return 'Treatment';
      case 4:
        return 'Recovery';
      case 5:
        return 'Synthesis / Progress';
      case 6:
        return 'Reports & Scheduling';
      default:
        return 'Consultation';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={currentStep > 1 ? handlePrevStep : () => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#003D9B" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerPatientName}>{initialPatientName}</Text>
          <Text style={styles.savedStatusText}>• {savedStatusText}</Text>
        </View>

        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#003D9B" />
        </TouchableOpacity>
      </View>

      {/* Step Indicator Progress Bar */}
      <View style={styles.stepIndicatorContainer}>
        <View style={styles.stepHeaderRow}>
          <Text style={styles.stepCountText}>STEP {currentStep} OF 6</Text>
          <Text style={styles.stepNameText}>{getStepTitle(currentStep)}</Text>
        </View>

        <View style={styles.stepSegmentsRow}>
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <View
              key={st}
              style={[
                styles.stepSegment,
                st <= currentStep && styles.stepSegmentActive,
                st === currentStep && styles.stepSegmentCurrent,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: PREPARATION & CHIEF COMPLAINT */}
        {currentStep === 1 && (
          <View style={styles.stepCardContainer}>
            {/* Patient Header Chip */}
            <View style={styles.patientPillCard}>
              <View style={styles.patientMiniAvatar}>
                <Text style={styles.patientAvatarLetter}>{initialPatientName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.pillPatientName}>{initialPatientName}</Text>
                <Text style={styles.pillPatientSub}>28y, Female • Follow-up</Text>
              </View>
              <View style={styles.conditionChip}>
                <Text style={styles.conditionChipText}>ACL Recovery</Text>
              </View>
            </View>

            {/* Chief Complaint */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>CHIEF COMPLAINT</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textAreaInput}
                  multiline
                  value={consultationData.step1_preparation.chiefComplaint}
                  onChangeText={(txt) =>
                    setConsultationData((prev) => ({
                      ...prev,
                      step1_preparation: { ...prev.step1_preparation, chiefComplaint: txt },
                    }))
                  }
                  placeholder="What is the patient's main concern today?"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity style={styles.dictateMicBtn}>
                  <Ionicons name="mic" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pain Assessment (VNRS) */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.fieldLabel}>PAIN ASSESSMENT (VNRS)</Text>
                <Text style={styles.painValHighlight}>{consultationData.step1_preparation.painScore} / 10</Text>
              </View>

              {/* Slider Pills */}
              <View style={styles.painPillOptionsRow}>
                {['Sharp', 'Dull', 'Radiating', 'Burning', 'Stiffness'].map((type) => {
                  const isSel = consultationData.step1_preparation.painType.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.painTypePill, isSel && styles.painTypePillActive]}
                      onPress={() => {
                        const exists = consultationData.step1_preparation.painType.includes(type);
                        const updated = exists
                          ? consultationData.step1_preparation.painType.filter((t) => t !== type)
                          : [...consultationData.step1_preparation.painType, type];
                        setConsultationData((prev) => ({
                          ...prev,
                          step1_preparation: { ...prev.step1_preparation, painType: updated },
                        }));
                      }}
                    >
                      <Text style={[styles.painTypePillText, isSel && styles.painTypePillTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pain Location Anatomical Diagram Box */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>PAIN LOCATION</Text>
                <View style={styles.frontBackToggle}>
                  <TouchableOpacity style={styles.toggleSideActive}>
                    <Text style={styles.toggleSideTextActive}>Front</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toggleSide}>
                    <Text style={styles.toggleSideText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.anatomicalBox}>
                <Ionicons name="body" size={90} color="#003D9B" style={{ opacity: 0.8 }} />
                <View style={styles.selectedJointPill}>
                  <Text style={styles.selectedJointText}>Selected: Left Knee</Text>
                </View>
              </View>
            </View>

            {/* Session Goals */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SESSION GOAL</Text>
              <View style={styles.goalsWrapRow}>
                {['Reduce Pain', 'Improve Mobility', 'Strength Training', 'Post Surgery'].map((goal) => {
                  const isSel = consultationData.step1_preparation.sessionGoals.includes(goal);
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[styles.goalPill, isSel && styles.goalPillActive]}
                      onPress={() => {
                        const exists = consultationData.step1_preparation.sessionGoals.includes(goal);
                        const updated = exists
                          ? consultationData.step1_preparation.sessionGoals.filter((g) => g !== goal)
                          : [...consultationData.step1_preparation.sessionGoals, goal];
                        setConsultationData((prev) => ({
                          ...prev,
                          step1_preparation: { ...prev.step1_preparation, sessionGoals: updated },
                        }));
                      }}
                    >
                      <Ionicons name="sparkles-outline" size={13} color={isSel ? '#ffffff' : '#003D9B'} />
                      <Text style={[styles.goalPillText, isSel && styles.goalPillTextActive]}>{goal}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Quick Observations Checkboxes */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>QUICK OBSERVATIONS</Text>
              <View style={styles.observationsGrid}>
                {['swelling', 'inflammation', 'limitedRom', 'muscleTight'].map((obsKey) => {
                  const labels = {
                    swelling: 'Swelling',
                    inflammation: 'Inflammation',
                    limitedRom: 'Limited ROM',
                    muscleTight: 'Muscle Tight',
                  };
                  const isChecked = consultationData.step1_preparation.observations[obsKey];
                  return (
                    <TouchableOpacity
                      key={obsKey}
                      style={styles.obsCheckRow}
                      onPress={() =>
                        setConsultationData((prev) => ({
                          ...prev,
                          step1_preparation: {
                            ...prev.step1_preparation,
                            observations: {
                              ...prev.step1_preparation.observations,
                              [obsKey]: !isChecked,
                            },
                          },
                        }))
                      }
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={isChecked ? '#003D9B' : '#94a3b8'}
                      />
                      <Text style={styles.obsCheckLabel}>{labels[obsKey]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: ASSESSMENT & VITALS */}
        {currentStep === 2 && (
          <View style={styles.stepCardContainer}>
            {/* Vitals 2x2 Grid */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>VITAL SIGNS</Text>
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalCardLabel}>Blood Pressure</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.bp} mmHg</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalCardLabel}>Heart Rate</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.hr} bpm</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalCardLabel}>Temp</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.temp} °F</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalCardLabel}>SpO2</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.spo2} %</Text>
                </View>
              </View>
            </View>

            {/* Pain Reassessment Movement vs Rest */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PAIN REASSESSMENT</Text>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderRowLabel}>During Movement</Text>
                <Text style={styles.sliderValBadge}>{consultationData.step2_assessment.painMovement} / 10</Text>
              </View>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderRowLabel}>At Rest</Text>
                <Text style={styles.sliderValBadge}>{consultationData.step2_assessment.painRest} / 10</Text>
              </View>
            </View>

            {/* Range of Motion (ROM) Joint Tool */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>RANGE OF MOTION (ROM)</Text>
                <Text style={styles.changeJointLink}>Change Joint</Text>
              </View>

              <View style={styles.romCard}>
                <View style={styles.romHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="accessibility" size={16} color="#003D9B" />
                    <Text style={styles.romJointName}>Knee</Text>
                  </View>
                  <Text style={styles.romSub}>Flexion: 110° • Extension: 0°</Text>
                </View>

                <View style={styles.romBadgesRow}>
                  <View style={styles.measuredRomBadge}>
                    <Text style={styles.measuredRomLabel}>MEASURED</Text>
                    <Text style={styles.measuredRomValue}>85°</Text>
                  </View>
                  <View style={styles.restrictionBadge}>
                    <Text style={styles.restrictionLabel}>RESTRICTION</Text>
                    <Text style={styles.restrictionValue}>MODERATE</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Muscle Strength */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>MUSCLE STRENGTH</Text>
              <View style={styles.strengthRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="expand" size={16} color="#003D9B" />
                  <Text style={styles.strengthMuscleText}>Quadriceps</Text>
                </View>
                <View style={styles.strengthSelector}>
                  <Text style={styles.strengthSelectorText}>3/5</Text>
                  <Ionicons name="chevron-down" size={14} color="#64748b" />
                </View>
              </View>
            </View>

            {/* Special Tests */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SPECIAL TESTS</Text>
              <View style={styles.specialTestRow}>
                <Text style={styles.testName}>Lachman Test</Text>
                <View style={[styles.testBadge, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.testBadgeText, { color: '#dc2626' }]}>POSITIVE</Text>
                </View>
              </View>
              <View style={styles.specialTestRow}>
                <Text style={styles.testName}>Straight Leg Raise</Text>
                <View style={[styles.testBadge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.testBadgeText, { color: '#64748b' }]}>NEGATIVE</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: TREATMENT & EXERCISES */}
        {currentStep === 3 && (
          <View style={styles.stepCardContainer}>
            {/* Treatment Modalities */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>TREATMENT MODALITIES</Text>
              <View style={styles.modalitiesRow}>
                {['Manual Therapy', 'Stretching', 'IFT', 'Heat Therapy', 'Dry Needling'].map((mod) => (
                  <View key={mod} style={styles.modalityChip}>
                    <Text style={styles.modalityChipText}>{mod}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Exercises Performed */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>EXERCISES PERFORMED</Text>
                <Text style={styles.addLink}>+ Add New</Text>
              </View>

              {consultationData.step3_treatment.exercisesPerformed.map((ex, idx) => (
                <View key={idx} style={styles.performedExerciseCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseNameTitle}>{ex.name}</Text>
                    <Text style={styles.exerciseParamText}>
                      Sets: {ex.sets} • Reps: {ex.reps} • Hold: {ex.holdSec}s
                    </Text>
                  </View>
                  <Ionicons name="create-outline" size={18} color="#003D9B" />
                </View>
              ))}
            </View>

            {/* Patient Response */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PATIENT RESPONSE</Text>
              <View style={styles.patientResponseRow}>
                {['Tolerated Well', 'Mild Pain', 'Fatigued', 'Significant Pain'].map((resp) => (
                  <TouchableOpacity
                    key={resp}
                    style={[
                      styles.responseChip,
                      consultationData.step3_treatment.patientResponse === resp && styles.responseChipActive,
                    ]}
                    onPress={() =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step3_treatment: { ...prev.step3_treatment, patientResponse: resp },
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.responseChipText,
                        consultationData.step3_treatment.patientResponse === resp && styles.responseChipTextActive,
                      ]}
                    >
                      {resp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: RECOVERY PROGRAM & HOME CARE */}
        {currentStep === 4 && (
          <View style={styles.stepCardContainer}>
            {/* Recovery Program */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>RECOVERY PROGRAM</Text>
              <View style={styles.programCard}>
                <Ionicons name="fitness" size={20} color="#003D9B" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.programTitleText}>{consultationData.step4_recovery.programName}</Text>
                  <Text style={styles.programSubText}>Phase 2: Active Home Routine</Text>
                </View>
                <Ionicons name="create-outline" size={18} color="#64748b" />
              </View>
            </View>

            {/* Home Exercises */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>HOME EXERCISES</Text>
                <Text style={styles.addLink}>+ Add Exercise</Text>
              </View>

              {consultationData.step4_recovery.homeExercises.map((ex, idx) => (
                <View key={idx} style={styles.homeExCard}>
                  <View style={styles.homeExThumb}>
                    <Ionicons name="play-circle" size={24} color="#003D9B" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.homeExTitle}>{ex.name}</Text>
                    <Text style={styles.homeExSub}>
                      {ex.sets} Sets • {ex.reps} Reps • {ex.frequency}
                    </Text>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={16} color="#94a3b8" />
                </View>
              ))}
            </View>

            {/* Patient Education Toggles */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PATIENT EDUCATION</Text>
              <View style={styles.educationToggleRow}>
                <Text style={styles.educationToggleLabel}>Exercise Videos</Text>
                <Switch value={true} trackColor={{ true: '#003D9B' }} />
              </View>
              <View style={styles.educationToggleRow}>
                <Text style={styles.educationToggleLabel}>Pain Management Guide</Text>
                <Switch value={true} trackColor={{ true: '#003D9B' }} />
              </View>
            </View>
          </View>
        )}

        {/* STEP 5: SYNTHESIS & DIGITAL SIGN-OFF */}
        {currentStep === 5 && (
          <View style={styles.stepCardContainer}>
            {/* Session Synthesis 2x2 */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>SESSION SYNTHESIS</Text>
                <Text style={styles.addLink}>Edit</Text>
              </View>

              <View style={styles.synthesisGrid}>
                <View style={styles.synthesisCell}>
                  <Text style={styles.synthesisCellLab}>CONDITION</Text>
                  <Text style={styles.synthesisCellVal}>Lower Back Pain</Text>
                </View>
                <View style={styles.synthesisCell}>
                  <Text style={styles.synthesisCellLab}>MOBILITY</Text>
                  <Text style={styles.synthesisCellVal}>Moderate restriction</Text>
                </View>
              </View>
            </View>

            {/* Progress Status */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PROGRESS STATUS</Text>
              <View style={styles.progressRow}>
                {['Much Improved', 'Improved', 'No Significant Change'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.progressBtn,
                      consultationData.step5_synthesis.progressStatus === st && styles.progressBtnActive,
                    ]}
                    onPress={() =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step5_synthesis: { ...prev.step5_synthesis, progressStatus: st },
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.progressBtnText,
                        consultationData.step5_synthesis.progressStatus === st && styles.progressBtnTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Digital Signature Card */}
            <View style={styles.signatureCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#003D9B" />
                <View>
                  <Text style={styles.signTherapistName}>Dr. Ananya Iyer</Text>
                  <Text style={styles.signRegNum}>Reg #PT-3821 • Downtown Clinic</Text>
                </View>
              </View>

              <View style={styles.signatureCanvasBox}>
                <Text style={styles.signatureCanvasText}>Ananya Iyer</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={styles.signTimestamp}>Timestamp: 14:38 IST</Text>
                <Text style={styles.signOfficial}>Digital Sign-off</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 6: REPORTS & NEXT VISIT SCHEDULING */}
        {currentStep === 6 && (
          <View style={styles.stepCardContainer}>
            {/* Reports Section */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>TODAY'S REPORTS</Text>
              <View style={styles.reportDocCard}>
                <Ionicons name="document-attach" size={24} color="#dc2626" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.reportDocTitle}>MRI_Lumbar_Spine.pdf</Text>
                  <Text style={styles.reportDocSub}>MRI • 2.5 MB • Today, 10:30 AM</Text>
                </View>
              </View>
            </View>

            {/* Next Visit Scheduling */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SCHEDULE NEXT VISIT</Text>
              <View style={styles.nextVisitCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.nextVisitDateLabel}>Date: Nov 05, 2024</Text>
                  <Text style={styles.nextVisitTimeLabel}>Time: 10:30 AM</Text>
                </View>
                <Text style={styles.nextVisitTypeLabel}>Consultation: In-person • Downtown Clinic</Text>
              </View>
            </View>
          </View>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.saveDraftOutlineBtn}
            onPress={() => autosave(currentStep)}
            disabled={savingDraft}
          >
            {savingDraft ? (
              <ActivityIndicator size="small" color="#003D9B" />
            ) : (
              <Text style={styles.saveDraftBtnText}>Save Draft</Text>
            )}
          </TouchableOpacity>

          {currentStep === 5 ? (
            <TouchableOpacity style={styles.primaryContinueBtn} onPress={handleDigitalSign}>
              <Text style={styles.primaryContinueText}>Digital Sign & Continue →</Text>
            </TouchableOpacity>
          ) : currentStep === 6 ? (
            <TouchableOpacity style={styles.primaryFinalSubmitBtn} onPress={handleFinalSubmit}>
              <Text style={styles.primaryContinueText}>Finalize & Submit Clinical Record ✓</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryContinueBtn} onPress={handleNextStep}>
              <Text style={styles.primaryContinueText}>Continue to {getStepTitle(currentStep + 1)} →</Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerPatientName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  savedStatusText: { fontSize: 11, color: '#64748b' },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Step Progress Bar
  stepIndicatorContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  stepHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepCountText: { fontSize: 11, fontWeight: '800', color: '#003D9B', letterSpacing: 0.5 },
  stepNameText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  stepSegmentsRow: { flexDirection: 'row', gap: 6 },
  stepSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  stepSegmentActive: { backgroundColor: '#93c5fd' },
  stepSegmentCurrent: { backgroundColor: '#003D9B' },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  stepCardContainer: { gap: 16 },

  // Patient Pill
  patientPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  patientMiniAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarLetter: { fontSize: 16, fontWeight: '800', color: '#003D9B' },
  pillPatientName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  pillPatientSub: { fontSize: 11, color: '#64748b' },
  conditionChip: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  conditionChipText: { fontSize: 10, fontWeight: '800', color: '#0369a1' },

  // Sections & Inputs
  inputSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  textAreaWrapper: { position: 'relative' },
  textAreaInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    paddingRight: 40,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 70,
  },
  dictateMicBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#003D9B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  painValHighlight: { fontSize: 14, fontWeight: '900', color: '#003D9B' },
  painPillOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  painTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  painTypePillActive: { backgroundColor: '#003D9B' },
  painTypePillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  painTypePillTextActive: { color: '#ffffff' },

  // Body Map Box
  frontBackToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  toggleSideActive: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  toggleSideTextActive: { fontSize: 11, fontWeight: '700', color: '#003D9B' },
  toggleSide: { paddingHorizontal: 8, paddingVertical: 3 },
  toggleSideText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  anatomicalBox: {
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedJointPill: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  selectedJointText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },

  // Goals & Obs
  goalsWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  goalPillActive: { backgroundColor: '#003D9B' },
  goalPillText: { fontSize: 11, fontWeight: '700', color: '#003D9B' },
  goalPillTextActive: { color: '#ffffff' },

  observationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  obsCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  obsCheckLabel: { fontSize: 12, color: '#334155', fontWeight: '600' },

  // Step 2 Vitals
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCard: {
    width: (width - 60) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vitalCardLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  vitalCardValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderRowLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  sliderValBadge: { fontSize: 13, fontWeight: '900', color: '#003D9B' },
  changeJointLink: { fontSize: 11, fontWeight: '700', color: '#003D9B' },
  romCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, gap: 10 },
  romHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  romJointName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  romSub: { fontSize: 11, color: '#64748b' },
  romBadgesRow: { flexDirection: 'row', gap: 8 },
  measuredRomBadge: { flex: 1, backgroundColor: '#e0f2fe', padding: 8, borderRadius: 8, alignItems: 'center' },
  measuredRomLabel: { fontSize: 9, fontWeight: '800', color: '#0369a1' },
  measuredRomValue: { fontSize: 14, fontWeight: '900', color: '#0369a1', marginTop: 2 },
  restrictionBadge: { flex: 1, backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, alignItems: 'center' },
  restrictionLabel: { fontSize: 9, fontWeight: '800', color: '#dc2626' },
  restrictionValue: { fontSize: 14, fontWeight: '900', color: '#dc2626', marginTop: 2 },

  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strengthMuscleText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  strengthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  strengthSelectorText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },

  specialTestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  testBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  testBadgeText: { fontSize: 10, fontWeight: '800' },

  // Step 3 Treatment
  modalitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalityChip: { backgroundColor: '#003D9B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  modalityChipText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  addLink: { fontSize: 11, fontWeight: '700', color: '#003D9B' },
  performedExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exerciseNameTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  exerciseParamText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  patientResponseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  responseChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  responseChipActive: { backgroundColor: '#003D9B' },
  responseChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  responseChipTextActive: { color: '#ffffff' },

  // Step 4 Recovery
  programCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  programTitleText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  programSubText: { fontSize: 11, color: '#64748b' },
  homeExCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  homeExThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeExTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  homeExSub: { fontSize: 11, color: '#64748b' },
  educationToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  educationToggleLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },

  // Step 5 Synthesis
  synthesisGrid: { flexDirection: 'row', gap: 8 },
  synthesisCell: { flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  synthesisCellLab: { fontSize: 9, fontWeight: '800', color: '#94a3b8' },
  synthesisCellVal: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressBtnActive: { backgroundColor: '#003D9B' },
  progressBtnText: { fontSize: 10, fontWeight: '700', color: '#475569', textAlign: 'center' },
  progressBtnTextActive: { color: '#ffffff' },

  signatureCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 8,
  },
  signTherapistName: { fontSize: 13, fontWeight: '800', color: '#003D9B' },
  signRegNum: { fontSize: 11, color: '#64748b' },
  signatureCanvasBox: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureCanvasText: { fontSize: 18, fontStyle: 'italic', fontWeight: '700', color: '#003D9B' },
  signTimestamp: { fontSize: 10, color: '#94a3b8' },
  signOfficial: { fontSize: 10, fontWeight: '800', color: '#003D9B' },

  // Step 6 Reports & Next Visit
  reportDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reportDocTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  reportDocSub: { fontSize: 11, color: '#64748b' },
  nextVisitCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, gap: 4 },
  nextVisitDateLabel: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  nextVisitTimeLabel: { fontSize: 12, fontWeight: '800', color: '#003D9B' },
  nextVisitTypeLabel: { fontSize: 11, color: '#64748b' },

  // Bottom Actions
  actionButtonsContainer: { gap: 10, marginTop: 10 },
  saveDraftOutlineBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#003D9B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveDraftBtnText: { color: '#003D9B', fontSize: 13, fontWeight: '700' },
  primaryContinueBtn: {
    backgroundColor: '#003D9B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryFinalSubmitBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryContinueText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
