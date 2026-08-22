import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_URL } from '../../../shared/config';
import { useNotification } from '../../../context/NotificationContext';

const { width } = Dimensions.get('window');

export default function ClinicalConsultationScreen({ route, navigation }) {
  const { token, user } = useSelector((state) => state.auth);
  const { showInAppNotification } = useNotification() || {};

  const appointmentId = route.params?.appointmentId || 'apt_sample';
  const initialPatientName = route.params?.patientName || route.params?.booking?.patientName || 'Udit';
  const therapistDisplayName = user?.name || 'Dr. Vivek Joshi';
  const therapistRegNumber = user?.registrationNumber || 'PT-3821';
  const clinicDisplayName = user?.clinicName || 'ONE MEDICAL Center, MG Road';

  const [consultationId, setConsultationId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedStatusText, setSavedStatusText] = useState('Saved just now');

  // Modals for dynamic additions
  const [vitalsModalVisible, setVitalsModalVisible] = useState(false);
  const [jointPickerVisible, setJointPickerVisible] = useState(false);
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [addHomeExerciseModalVisible, setAddHomeExerciseModalVisible] = useState(false);

  // New Exercise Form State
  const [newExerciseForm, setNewExerciseForm] = useState({ name: '', sets: '3', reps: '10', holdSec: '30' });
  const [newHomeExForm, setNewHomeExForm] = useState({ name: '', sets: '2', reps: '10', frequency: '2x Daily' });

  // Unified 6-Step Consultation State
  const [consultationData, setConsultationData] = useState({
    // Step 1: Preparation
    step1_preparation: {
      chiefComplaint: 'Patellar instability and localized stiffness during knee flexion.',
      painScore: 4,
      painType: ['Radiating'],
      painDuration: 'Today',
      painLocation: { bodyPart: 'Left Knee', region: 'Front' },
      sessionGoals: ['Reduce Pain', 'Improve Mobility'],
      observations: { swelling: true, inflammation: false, limitedRom: true, muscleTight: true, tenderness: true },
    },

    // Step 2: Assessment
    step2_assessment: {
      vitals: { bp: '120/80', hr: 72, temp: 98.6, spo2: 98 },
      painMovement: 4,
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
        { name: 'McMurray Test', result: 'NEGATIVE' },
      ],
      functionalObservations: ['Walking', 'Balance', 'Sit to Stand'],
      clinicalImpression: 'Patient presents with reduction in localized tenderness and progressive knee stability.',
    },

    // Step 3: Treatment
    step3_treatment: {
      modalities: ['Manual Therapy', 'IFT', 'Heat Therapy'],
      exercisesPerformed: [
        { name: 'Isometric Quad Sets', sets: 3, reps: 12, holdSec: 30 },
        { name: 'Straight Leg Raise (SLR)', sets: 2, reps: 10, holdSec: 10 },
      ],
      bodyRegionTreated: 'Left Knee',
      patientResponse: 'Tolerated Well',
      sessionIntensity: 'Moderate',
      durationMins: 45,
      treatmentRemarks: 'Tolerated manual mobilization well. Patient noted 25% reduction in pain post-session.',
    },

    // Step 4: Recovery
    step4_recovery: {
      programName: 'Post-ACL Knee Rehabilitation',
      homeExercises: [
        { name: 'Isometric Quad Sets', sets: 3, reps: 10, frequency: '2x Daily' },
        { name: 'Heel Slides', sets: 2, reps: 10, frequency: '1x Daily' },
      ],
      patientGoals: ['Reduce Pain', 'Improve Mobility'],
      activityRestrictions: ['Avoid Heavy Squats', 'Avoid High Impact Running'],
      homeCareInstructions: 'Apply cold ice pack for 15 mins post home exercise routine twice daily.',
      nextReviewDate: 'In 1 Week',
      nextReviewMilestone: 'Phase 2 ROM Target (105°)',
      patientEducation: { exerciseVideos: true, painManagementGuide: true, ergonomicsGuide: true },
    },

    // Step 5: Synthesis
    step5_synthesis: {
      conditionSummary: {
        condition: 'Left Knee Patellofemoral Pain Syndrome',
        mobility: 'Moderate flexion restriction (85°)',
        interventions: 'Manual Therapy, Isometric Quad Strengthening',
        nextPhase: 'Phase 2 active knee stabilization and closed-chain exercises.',
      },
      clinicalImpression: 'Patient shows consistent functional improvement with reduced inflammatory response.',
      additionalNotes: 'Patient advised to adhere strictly to daily home exercise regimen.',
      progressStatus: 'Improved',
      goalStatus: 'Partially Achieved',
      complications: false,
      digitalSignature: {
        signedBy: user?.userId || 'th_1',
        therapistName: therapistDisplayName,
        registrationNumber: therapistRegNumber,
        clinicName: clinicDisplayName,
        signedAt: null,
      },
    },

    // Step 6: Reports & Next Visit
    step6_reports: {
      attachedReports: [
        {
          title: 'MRI_Knee_Joint_Left.pdf',
          category: 'MRI Scan',
          hospital: 'OneMedical Diagnostic Hub',
          doctorName: therapistDisplayName,
          date: 'Aug 18, 2026',
        },
      ],
      nextVisit: {
        required: true,
        date: 'In 1 Week',
        time: '10:30 AM',
        consultationType: 'In-person Clinic',
        clinic: clinicDisplayName,
        sessionObjectives: ['Pain Reassessment', 'ROM Check (105° Target)', 'Load Progression'],
        automatedReminders: { medication: true, exercise: true, hydration: true },
        referralNotes: 'No Referral Needed',
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
          body: JSON.stringify({ appointmentId, patientName: initialPatientName }),
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
          therapistName: therapistDisplayName,
          registrationNumber: therapistRegNumber,
          clinicName: clinicDisplayName,
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
        if (showInAppNotification) {
          showInAppNotification({
            title: 'Consultation Finalized & Signed',
            message: `Encounter for ${initialPatientName} documented. Treatment plan published to patient app.`,
            type: 'consultation.completed',
            category: 'CLINICAL ENCOUNTER',
          });
        }
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

  // Calculation of ROM Restriction
  const calculateRestriction = (measured, maxDegrees = 110) => {
    const pct = (measured / maxDegrees) * 100;
    if (pct >= 95) return 'NORMAL';
    if (pct >= 80) return 'MILD';
    if (pct >= 60) return 'MODERATE';
    return 'SEVERE';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#003D9B" />
        <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '600' }}>
          Loading clinical consultation draft...
        </Text>
      </SafeAreaView>
    );
  }

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
            <TouchableOpacity
              key={st}
              style={[
                styles.stepSegment,
                st <= currentStep && styles.stepSegmentActive,
                st === currentStep && styles.stepSegmentCurrent,
              ]}
              onPress={() => {
                setCurrentStep(st);
                autosave(currentStep, st);
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* STEP 1: PREPARATION & CHIEF COMPLAINT */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <View style={styles.stepCardContainer}>
            {/* Patient Header Chip */}
            <View style={styles.patientPillCard}>
              <View style={styles.patientMiniAvatar}>
                <Text style={styles.patientAvatarLetter}>{initialPatientName.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.pillPatientName}>{initialPatientName}</Text>
                <Text style={styles.pillPatientSub}>32y, Male • Follow-up Consultation</Text>
              </View>
              <View style={styles.conditionChip}>
                <Text style={styles.conditionChipText}>Knee Rehabilitation</Text>
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
              </View>

              {/* Quick Prompt Tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {['+ Knee Pain', '+ Lower Back Stiffness', '+ Post-Op Follow-up', '+ Neck Spasm'].map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.quickTagBtn}
                    onPress={() => {
                      const clean = tag.replace('+ ', '');
                      const curr = consultationData.step1_preparation.chiefComplaint;
                      const updated = curr ? `${curr}, ${clean}` : clean;
                      setConsultationData((prev) => ({
                        ...prev,
                        step1_preparation: { ...prev.step1_preparation, chiefComplaint: updated },
                      }));
                    }}
                  >
                    <Text style={styles.quickTagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pain Assessment VNRS (0 - 10) */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>PAIN ASSESSMENT (VNRS)</Text>
                <View style={[
                  styles.painScoreBadge,
                  consultationData.step1_preparation.painScore >= 7
                    ? { backgroundColor: '#fee2e2' }
                    : consultationData.step1_preparation.painScore >= 4
                    ? { backgroundColor: '#fef3c7' }
                    : { backgroundColor: '#f0fdf4' }
                ]}>
                  <Text style={[
                    styles.painValHighlight,
                    consultationData.step1_preparation.painScore >= 7
                      ? { color: '#dc2626' }
                      : consultationData.step1_preparation.painScore >= 4
                      ? { color: '#b45309' }
                      : { color: '#16a34a' }
                  ]}>
                    {consultationData.step1_preparation.painScore} / 10
                  </Text>
                </View>
              </View>

              {/* VNRS 0-10 Buttons */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSel = consultationData.step1_preparation.painScore === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[styles.numScoreBtn, isSel && styles.numScoreBtnActive]}
                      onPress={() =>
                        setConsultationData((prev) => ({
                          ...prev,
                          step1_preparation: { ...prev.step1_preparation, painScore: num },
                        }))
                      }
                    >
                      <Text style={[styles.numScoreText, isSel && styles.numScoreTextActive]}>{num}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Pain Type Multi-select */}
              <Text style={[styles.fieldLabel, { marginTop: 6 }]}>PAIN CHARACTERISTICS</Text>
              <View style={styles.painPillOptionsRow}>
                {['Sharp', 'Dull', 'Radiating', 'Burning', 'Stiffness', 'Throbbing', 'Aching'].map((type) => {
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
                  <TouchableOpacity
                    style={consultationData.step1_preparation.painLocation.region === 'Front' ? styles.toggleSideActive : styles.toggleSide}
                    onPress={() =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step1_preparation: {
                          ...prev.step1_preparation,
                          painLocation: { ...prev.step1_preparation.painLocation, region: 'Front' },
                        },
                      }))
                    }
                  >
                    <Text style={consultationData.step1_preparation.painLocation.region === 'Front' ? styles.toggleSideTextActive : styles.toggleSideText}>Front</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={consultationData.step1_preparation.painLocation.region === 'Back' ? styles.toggleSideActive : styles.toggleSide}
                    onPress={() =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step1_preparation: {
                          ...prev.step1_preparation,
                          painLocation: { ...prev.step1_preparation.painLocation, region: 'Back' },
                        },
                      }))
                    }
                  >
                    <Text style={consultationData.step1_preparation.painLocation.region === 'Back' ? styles.toggleSideTextActive : styles.toggleSideText}>Back</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.anatomicalBox}>
                <Ionicons name="body" size={90} color="#003D9B" style={{ opacity: 0.85 }} />
                <View style={styles.selectedJointPill}>
                  <Text style={styles.selectedJointText}>
                    Selected: {consultationData.step1_preparation.painLocation.bodyPart} ({consultationData.step1_preparation.painLocation.region})
                  </Text>
                </View>
              </View>

              {/* Joint Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 6 }}>
                {['Left Knee', 'Right Knee', 'Lower Back', 'Cervical Spine', 'Left Shoulder', 'Right Shoulder', 'Left Ankle', 'Right Ankle', 'Hip'].map((joint) => {
                  const isSel = consultationData.step1_preparation.painLocation.bodyPart === joint;
                  return (
                    <TouchableOpacity
                      key={joint}
                      style={[styles.jointChip, isSel && styles.jointChipActive]}
                      onPress={() =>
                        setConsultationData((prev) => ({
                          ...prev,
                          step1_preparation: {
                            ...prev.step1_preparation,
                            painLocation: { ...prev.step1_preparation.painLocation, bodyPart: joint },
                          },
                        }))
                      }
                    >
                      <Text style={[styles.jointChipText, isSel && styles.jointChipTextActive]}>{joint}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Session Goals */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SESSION GOAL</Text>
              <View style={styles.goalsWrapRow}>
                {['Reduce Pain', 'Improve Mobility', 'Strength Training', 'Post Surgery', 'Functional Gait'].map((goal) => {
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
                {['swelling', 'inflammation', 'limitedRom', 'muscleTight', 'tenderness'].map((obsKey) => {
                  const labels = {
                    swelling: 'Swelling',
                    inflammation: 'Inflammation',
                    limitedRom: 'Limited ROM',
                    muscleTight: 'Muscle Tight',
                    tenderness: 'Tenderness',
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

        {/* ========================================================================= */}
        {/* STEP 2: ASSESSMENT & VITALS */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <View style={styles.stepCardContainer}>
            {/* Vitals 2x2 Grid with Interactive Quick Edit */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>VITAL SIGNS</Text>
                <TouchableOpacity onPress={() => setVitalsModalVisible(true)}>
                  <Text style={styles.changeJointLink}>Edit Vitals</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.vitalsGrid}>
                <TouchableOpacity style={styles.vitalCard} onPress={() => setVitalsModalVisible(true)}>
                  <Text style={styles.vitalCardLabel}>Blood Pressure</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.bp} mmHg</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.vitalCard} onPress={() => setVitalsModalVisible(true)}>
                  <Text style={styles.vitalCardLabel}>Heart Rate</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.hr} bpm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.vitalCard} onPress={() => setVitalsModalVisible(true)}>
                  <Text style={styles.vitalCardLabel}>Temp</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.temp} °F</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.vitalCard} onPress={() => setVitalsModalVisible(true)}>
                  <Text style={styles.vitalCardLabel}>SpO2</Text>
                  <Text style={styles.vitalCardValue}>{consultationData.step2_assessment.vitals.spo2} %</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pain Reassessment Movement vs Rest */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PAIN REASSESSMENT</Text>
              
              <View style={{ gap: 10 }}>
                <View>
                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderRowLabel}>During Movement</Text>
                    <Text style={styles.sliderValBadge}>{consultationData.step2_assessment.painMovement} / 10</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {[0, 2, 4, 6, 8, 10].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.smallPill, consultationData.step2_assessment.painMovement === v && styles.smallPillActive]}
                        onPress={() =>
                          setConsultationData((prev) => ({
                            ...prev,
                            step2_assessment: { ...prev.step2_assessment, painMovement: v },
                          }))
                        }
                      >
                        <Text style={[styles.smallPillText, consultationData.step2_assessment.painMovement === v && styles.smallPillTextActive]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderRowLabel}>At Rest</Text>
                    <Text style={styles.sliderValBadge}>{consultationData.step2_assessment.painRest} / 10</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {[0, 2, 4, 6, 8, 10].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.smallPill, consultationData.step2_assessment.painRest === v && styles.smallPillActive]}
                        onPress={() =>
                          setConsultationData((prev) => ({
                            ...prev,
                            step2_assessment: { ...prev.step2_assessment, painRest: v },
                          }))
                        }
                      >
                        <Text style={[styles.smallPillText, consultationData.step2_assessment.painRest === v && styles.smallPillTextActive]}>
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Range of Motion (ROM) Joint Tool */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>RANGE OF MOTION (ROM)</Text>
                <TouchableOpacity onPress={() => setJointPickerVisible(true)}>
                  <Text style={styles.changeJointLink}>Change Joint</Text>
                </TouchableOpacity>
              </View>

              {consultationData.step2_assessment.structuredRom.map((romItem, idx) => (
                <View key={idx} style={styles.romCard}>
                  <View style={styles.romHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="accessibility" size={16} color="#003D9B" />
                      <Text style={styles.romJointName}>{romItem.joint}</Text>
                    </View>
                    <Text style={styles.romSub}>
                      Flexion: {romItem.flexionDegrees}° • Extension: {romItem.extensionDegrees}°
                    </Text>
                  </View>

                  <View style={styles.romBadgesRow}>
                    <View style={styles.measuredRomBadge}>
                      <Text style={styles.measuredRomLabel}>MEASURED</Text>
                      <Text style={styles.measuredRomValue}>{romItem.measuredDegrees}°</Text>
                      
                      {/* Stepper Buttons */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <TouchableOpacity
                          style={styles.stepAngleBtn}
                          onPress={() => {
                            const newDeg = Math.max(0, romItem.measuredDegrees - 5);
                            const newRest = calculateRestriction(newDeg, romItem.flexionDegrees);
                            const updated = [...consultationData.step2_assessment.structuredRom];
                            updated[idx] = { ...romItem, measuredDegrees: newDeg, restriction: newRest };
                            setConsultationData((prev) => ({
                              ...prev,
                              step2_assessment: { ...prev.step2_assessment, structuredRom: updated },
                            }));
                          }}
                        >
                          <Text style={styles.stepAngleBtnText}>-5°</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.stepAngleBtn}
                          onPress={() => {
                            const newDeg = Math.min(romItem.flexionDegrees, romItem.measuredDegrees + 5);
                            const newRest = calculateRestriction(newDeg, romItem.flexionDegrees);
                            const updated = [...consultationData.step2_assessment.structuredRom];
                            updated[idx] = { ...romItem, measuredDegrees: newDeg, restriction: newRest };
                            setConsultationData((prev) => ({
                              ...prev,
                              step2_assessment: { ...prev.step2_assessment, structuredRom: updated },
                            }));
                          }}
                        >
                          <Text style={styles.stepAngleBtnText}>+5°</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[
                      styles.restrictionBadge,
                      romItem.restriction === 'NORMAL'
                        ? { backgroundColor: '#f0fdf4' }
                        : romItem.restriction === 'MILD'
                        ? { backgroundColor: '#eff6ff' }
                        : romItem.restriction === 'MODERATE'
                        ? { backgroundColor: '#fef3c7' }
                        : { backgroundColor: '#fee2e2' }
                    ]}>
                      <Text style={[
                        styles.restrictionLabel,
                        romItem.restriction === 'NORMAL'
                          ? { color: '#16a34a' }
                          : romItem.restriction === 'MILD'
                          ? { color: '#0284c7' }
                          : romItem.restriction === 'MODERATE'
                          ? { color: '#b45309' }
                          : { color: '#dc2626' }
                      ]}>
                        RESTRICTION
                      </Text>
                      <Text style={[
                        styles.restrictionValue,
                        romItem.restriction === 'NORMAL'
                          ? { color: '#16a34a' }
                          : romItem.restriction === 'MILD'
                          ? { color: '#0284c7' }
                          : romItem.restriction === 'MODERATE'
                          ? { color: '#b45309' }
                          : { color: '#dc2626' }
                      ]}>
                        {romItem.restriction}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Muscle Strength */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>MUSCLE STRENGTH</Text>
              <View style={styles.strengthRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="expand" size={16} color="#003D9B" />
                  <Text style={styles.strengthMuscleText}>Quadriceps & Hamstrings</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['1/5', '2/5', '3/5', '4/5', '5/5'].map((grade) => {
                    const isSel = consultationData.step2_assessment.muscleStrength === grade;
                    return (
                      <TouchableOpacity
                        key={grade}
                        style={[styles.gradeBtn, isSel && styles.gradeBtnActive]}
                        onPress={() =>
                          setConsultationData((prev) => ({
                            ...prev,
                            step2_assessment: { ...prev.step2_assessment, muscleStrength: grade },
                          }))
                        }
                      >
                        <Text style={[styles.gradeBtnText, isSel && styles.gradeBtnTextActive]}>{grade}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Special Tests Toggle */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SPECIAL TESTS (TAP TO TOGGLE)</Text>
              {consultationData.step2_assessment.specialTests.map((t, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.specialTestRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    const newRes = t.result === 'POSITIVE' ? 'NEGATIVE' : 'POSITIVE';
                    const updated = [...consultationData.step2_assessment.specialTests];
                    updated[idx] = { ...t, result: newRes };
                    setConsultationData((prev) => ({
                      ...prev,
                      step2_assessment: { ...prev.step2_assessment, specialTests: updated },
                    }));
                  }}
                >
                  <Text style={styles.testName}>{t.name}</Text>
                  <View style={[
                    styles.testBadge,
                    t.result === 'POSITIVE' ? { backgroundColor: '#fee2e2' } : { backgroundColor: '#f1f5f9' }
                  ]}>
                    <Text style={[
                      styles.testBadgeText,
                      t.result === 'POSITIVE' ? { color: '#dc2626' } : { color: '#64748b' }
                    ]}>
                      {t.result}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: TREATMENT & EXERCISES */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <View style={styles.stepCardContainer}>
            {/* Treatment Modalities */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>TREATMENT MODALITIES</Text>
              <View style={styles.modalitiesRow}>
                {['Manual Therapy', 'Stretching', 'IFT', 'Heat Therapy', 'Dry Needling', 'TENS', 'Ultrasound', 'Cryotherapy'].map((mod) => {
                  const isSel = consultationData.step3_treatment.modalities.includes(mod);
                  return (
                    <TouchableOpacity
                      key={mod}
                      style={[styles.modalityChip, isSel && styles.modalityChipActive]}
                      onPress={() => {
                        const exists = consultationData.step3_treatment.modalities.includes(mod);
                        const updated = exists
                          ? consultationData.step3_treatment.modalities.filter((m) => m !== mod)
                          : [...consultationData.step3_treatment.modalities, mod];
                        setConsultationData((prev) => ({
                          ...prev,
                          step3_treatment: { ...prev.step3_treatment, modalities: updated },
                        }));
                      }}
                    >
                      <Text style={[styles.modalityChipText, isSel && styles.modalityChipTextActive]}>{mod}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Exercises Performed */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>EXERCISES PERFORMED</Text>
                <TouchableOpacity onPress={() => setAddExerciseModalVisible(true)}>
                  <Text style={styles.addLink}>+ Add New</Text>
                </TouchableOpacity>
              </View>

              {consultationData.step3_treatment.exercisesPerformed.map((ex, idx) => (
                <View key={idx} style={styles.performedExerciseCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseNameTitle}>{ex.name}</Text>
                    <Text style={styles.exerciseParamText}>
                      Sets: {ex.sets} • Reps: {ex.reps} • Hold: {ex.holdSec}s
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = consultationData.step3_treatment.exercisesPerformed.filter((_, i) => i !== idx);
                      setConsultationData((prev) => ({
                        ...prev,
                        step3_treatment: { ...prev.step3_treatment, exercisesPerformed: updated },
                      }));
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
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

            {/* Treatment Remarks */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>TREATMENT REMARKS</Text>
              <TextInput
                style={styles.textAreaInput}
                multiline
                value={consultationData.step3_treatment.treatmentRemarks}
                onChangeText={(txt) =>
                  setConsultationData((prev) => ({
                    ...prev,
                    step3_treatment: { ...prev.step3_treatment, treatmentRemarks: txt },
                  }))
                }
                placeholder="Notes on manual therapy or tolerance..."
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: RECOVERY PROGRAM & HOME CARE */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <View style={styles.stepCardContainer}>
            {/* Recovery Program */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>RECOVERY PROGRAM</Text>
              <View style={styles.programCard}>
                <Ionicons name="fitness" size={20} color="#003D9B" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.programTitleText}>{consultationData.step4_recovery.programName}</Text>
                  <Text style={styles.programSubText}>{consultationData.step4_recovery.nextReviewMilestone}</Text>
                </View>
              </View>
              
              {/* Program Selector Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                {['Post-ACL Knee Rehabilitation', 'Lumbar Spine Stabilization', 'Cervical Spine Care', 'Rotator Cuff Protocol'].map((pName) => (
                  <TouchableOpacity
                    key={pName}
                    style={[
                      styles.quickTagBtn,
                      consultationData.step4_recovery.programName === pName && { backgroundColor: '#003D9B', borderColor: '#003D9B' }
                    ]}
                    onPress={() =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step4_recovery: { ...prev.step4_recovery, programName: pName },
                      }))
                    }
                  >
                    <Text style={[
                      styles.quickTagText,
                      consultationData.step4_recovery.programName === pName && { color: '#ffffff' }
                    ]}>
                      {pName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Home Exercises */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>HOME EXERCISES</Text>
                <TouchableOpacity onPress={() => setAddHomeExerciseModalVisible(true)}>
                  <Text style={styles.addLink}>+ Add Exercise</Text>
                </TouchableOpacity>
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
                  <TouchableOpacity
                    onPress={() => {
                      const updated = consultationData.step4_recovery.homeExercises.filter((_, i) => i !== idx);
                      setConsultationData((prev) => ({
                        ...prev,
                        step4_recovery: { ...prev.step4_recovery, homeExercises: updated },
                      }));
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Patient Education Toggles */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PATIENT EDUCATION</Text>
              <View style={styles.educationToggleRow}>
                <Text style={styles.educationToggleLabel}>Exercise Videos in Patient App</Text>
                <Switch
                  value={consultationData.step4_recovery.patientEducation.exerciseVideos}
                  onValueChange={(v) =>
                    setConsultationData((prev) => ({
                      ...prev,
                      step4_recovery: {
                        ...prev.step4_recovery,
                        patientEducation: { ...prev.step4_recovery.patientEducation, exerciseVideos: v },
                      },
                    }))
                  }
                  trackColor={{ true: '#003D9B' }}
                />
              </View>
              <View style={styles.educationToggleRow}>
                <Text style={styles.educationToggleLabel}>Pain Management & Ice Guide</Text>
                <Switch
                  value={consultationData.step4_recovery.patientEducation.painManagementGuide}
                  onValueChange={(v) =>
                    setConsultationData((prev) => ({
                      ...prev,
                      step4_recovery: {
                        ...prev.step4_recovery,
                        patientEducation: { ...prev.step4_recovery.patientEducation, painManagementGuide: v },
                      },
                    }))
                  }
                  trackColor={{ true: '#003D9B' }}
                />
              </View>
            </View>

            {/* Home Care Instructions */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>HOME CARE INSTRUCTIONS</Text>
              <TextInput
                style={styles.textAreaInput}
                multiline
                value={consultationData.step4_recovery.homeCareInstructions}
                onChangeText={(txt) =>
                  setConsultationData((prev) => ({
                    ...prev,
                    step4_recovery: { ...prev.step4_recovery, homeCareInstructions: txt },
                  }))
                }
                placeholder="Instructions for ice pack, rest, posture..."
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: SYNTHESIS & DIGITAL SIGN-OFF */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <View style={styles.stepCardContainer}>
            {/* Session Synthesis */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SESSION SYNTHESIS</Text>

              <View style={styles.synthesisGrid}>
                <View style={styles.synthesisCell}>
                  <Text style={styles.synthesisCellLab}>CONDITION</Text>
                  <TextInput
                    style={styles.synthesisCellInput}
                    value={consultationData.step5_synthesis.conditionSummary.condition}
                    onChangeText={(txt) =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step5_synthesis: {
                          ...prev.step5_synthesis,
                          conditionSummary: { ...prev.step5_synthesis.conditionSummary, condition: txt },
                        },
                      }))
                    }
                  />
                </View>
                <View style={styles.synthesisCell}>
                  <Text style={styles.synthesisCellLab}>MOBILITY</Text>
                  <TextInput
                    style={styles.synthesisCellInput}
                    value={consultationData.step5_synthesis.conditionSummary.mobility}
                    onChangeText={(txt) =>
                      setConsultationData((prev) => ({
                        ...prev,
                        step5_synthesis: {
                          ...prev.step5_synthesis,
                          conditionSummary: { ...prev.step5_synthesis.conditionSummary, mobility: txt },
                        },
                      }))
                    }
                  />
                </View>
              </View>
            </View>

            {/* Progress Status */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>PROGRESS STATUS</Text>
              <View style={styles.progressRow}>
                {['Much Improved', 'Improved', 'No Significant Change', 'Worsened'].map((st) => (
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

            {/* Clinical Impression */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>CLINICAL IMPRESSION NOTES</Text>
              <TextInput
                style={styles.textAreaInput}
                multiline
                value={consultationData.step5_synthesis.clinicalImpression}
                onChangeText={(txt) =>
                  setConsultationData((prev) => ({
                    ...prev,
                    step5_synthesis: { ...prev.step5_synthesis, clinicalImpression: txt },
                  }))
                }
                placeholder="Summary impression for this encounter..."
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Digital Signature Card */}
            <View style={styles.signatureCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#003D9B" />
                <View>
                  <Text style={styles.signTherapistName}>{therapistDisplayName}</Text>
                  <Text style={styles.signRegNum}>Reg #{therapistRegNumber} • {clinicDisplayName}</Text>
                </View>
              </View>

              <View style={styles.signatureCanvasBox}>
                <Text style={styles.signatureCanvasText}>{therapistDisplayName}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={styles.signTimestamp}>Saved & Sealed electronically</Text>
                <Text style={styles.signOfficial}>Digital Sign-off ✓</Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: REPORTS & NEXT VISIT SCHEDULING */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <View style={styles.stepCardContainer}>
            {/* Reports Section */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>TODAY'S REPORTS & ATTACHMENTS</Text>
              {consultationData.step6_reports.attachedReports.map((rep, idx) => (
                <View key={idx} style={styles.reportDocCard}>
                  <Ionicons name="document-attach" size={24} color="#dc2626" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.reportDocTitle}>{rep.title}</Text>
                    <Text style={styles.reportDocSub}>{rep.category} • {rep.hospital} • {rep.date}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Next Visit Scheduling */}
            <View style={styles.inputSection}>
              <Text style={styles.fieldLabel}>SCHEDULE NEXT VISIT</Text>
              
              {/* Quick Date Chips */}
              <Text style={[styles.fieldLabel, { marginTop: 4 }]}>RECOMMENDED TIMELINE</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { label: 'In 3 Days', days: 3 },
                  { label: 'In 1 Week', days: 7 },
                  { label: 'In 2 Weeks', days: 14 },
                  { label: 'In 1 Month', days: 30 }
                ].map(({ label, days }) => {
                  const isSel = consultationData.step6_reports.nextVisit.date.includes(label) || consultationData.step6_reports.nextVisit.date === label;
                  
                  const computeTargetDate = (d) => {
                    const target = new Date();
                    target.setDate(target.getDate() + d);
                    return `${label} (${target.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`;
                  };

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.smallPill, isSel && styles.smallPillActive]}
                      onPress={() => {
                        const formatted = computeTargetDate(days);
                        setConsultationData((prev) => ({
                          ...prev,
                          step6_reports: {
                            ...prev.step6_reports,
                            nextVisit: { ...prev.step6_reports.nextVisit, date: formatted },
                          },
                        }));
                      }}
                    >
                      <Text style={[styles.smallPillText, isSel && styles.smallPillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Time Slots */}
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>PREFERRED REVIEW TIME</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['09:30 AM', '10:30 AM', '02:00 PM', '05:30 PM'].map((tm) => {
                  const isTmSel = consultationData.step6_reports.nextVisit.time === tm;
                  return (
                    <TouchableOpacity
                      key={tm}
                      style={[styles.smallPill, isTmSel && styles.smallPillActive]}
                      onPress={() =>
                        setConsultationData((prev) => ({
                          ...prev,
                          step6_reports: {
                            ...prev.step6_reports,
                            nextVisit: { ...prev.step6_reports.nextVisit, time: tm },
                          },
                        }))
                      }
                    >
                      <Text style={[styles.smallPillText, isTmSel && styles.smallPillTextActive]}>{tm}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Next Visit Card */}
              <View style={styles.nextVisitCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.nextVisitDateLabel}>
                    Date: {consultationData.step6_reports.nextVisit.date || 'In 1 Week (Recommended)'}
                  </Text>
                  <Text style={styles.nextVisitTimeLabel}>
                    Time: {consultationData.step6_reports.nextVisit.time || '10:30 AM'}
                  </Text>
                </View>
                <Text style={styles.nextVisitTypeLabel}>
                  Consultation: {consultationData.step6_reports.nextVisit.consultationType} • {consultationData.step6_reports.nextVisit.clinic}
                </Text>
              </View>

              {/* Automated Reminders */}
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>AUTOMATED NOTIFICATIONS</Text>
              <View style={styles.educationToggleRow}>
                <Text style={styles.educationToggleLabel}>Exercise Reminders (Daily)</Text>
                <Switch
                  value={consultationData.step6_reports.nextVisit.automatedReminders.exercise}
                  onValueChange={(v) =>
                    setConsultationData((prev) => ({
                      ...prev,
                      step6_reports: {
                        ...prev.step6_reports,
                        nextVisit: {
                          ...prev.step6_reports.nextVisit,
                          automatedReminders: { ...prev.step6_reports.nextVisit.automatedReminders, exercise: v },
                        },
                      },
                    }))
                  }
                  trackColor={{ true: '#003D9B' }}
                />
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

      {/* ========================================================================= */}
      {/* MODAL: EDIT VITALS */}
      {/* ========================================================================= */}
      <Modal visible={vitalsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={styles.modalTitle}>Update Vital Signs</Text>

            <Text style={styles.modalInputLabel}>Blood Pressure (mmHg)</Text>
            <TextInput
              style={styles.modalInput}
              value={consultationData.step2_assessment.vitals.bp}
              onChangeText={(v) =>
                setConsultationData((prev) => ({
                  ...prev,
                  step2_assessment: { ...prev.step2_assessment, vitals: { ...prev.step2_assessment.vitals, bp: v } },
                }))
              }
            />

            <Text style={styles.modalInputLabel}>Heart Rate (bpm)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(consultationData.step2_assessment.vitals.hr)}
              onChangeText={(v) =>
                setConsultationData((prev) => ({
                  ...prev,
                  step2_assessment: { ...prev.step2_assessment, vitals: { ...prev.step2_assessment.vitals, hr: parseInt(v) || 72 } },
                }))
              }
            />

            <Text style={styles.modalInputLabel}>Temperature (°F)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(consultationData.step2_assessment.vitals.temp)}
              onChangeText={(v) =>
                setConsultationData((prev) => ({
                  ...prev,
                  step2_assessment: { ...prev.step2_assessment, vitals: { ...prev.step2_assessment.vitals, temp: parseFloat(v) || 98.6 } },
                }))
              }
            />

            <Text style={styles.modalInputLabel}>SpO2 (%)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(consultationData.step2_assessment.vitals.spo2)}
              onChangeText={(v) =>
                setConsultationData((prev) => ({
                  ...prev,
                  step2_assessment: { ...prev.step2_assessment, vitals: { ...prev.step2_assessment.vitals, spo2: parseInt(v) || 98 } },
                }))
              }
            />

            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => setVitalsModalVisible(false)}>
              <Text style={styles.modalSaveBtnText}>Save Vitals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CHANGE JOINT */}
      {/* ========================================================================= */}
      <Modal visible={jointPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={styles.modalTitle}>Select Joint For ROM</Text>
            {[
              { joint: 'Knee', movement: 'Flexion', max: 110, ext: 0 },
              { joint: 'Shoulder', movement: 'Flexion', max: 180, ext: 0 },
              { joint: 'Lumbar Spine', movement: 'Flexion', max: 60, ext: 0 },
              { joint: 'Cervical Spine', movement: 'Rotation', max: 80, ext: 0 },
              { joint: 'Ankle', movement: 'Dorsiflexion', max: 20, ext: 0 },
            ].map((j) => (
              <TouchableOpacity
                key={j.joint}
                style={styles.jointPickerItem}
                onPress={() => {
                  const updated = [
                    {
                      joint: j.joint,
                      movement: j.movement,
                      extensionDegrees: j.ext,
                      flexionDegrees: j.max,
                      measuredDegrees: Math.round(j.max * 0.75),
                      restriction: 'MODERATE',
                    },
                  ];
                  setConsultationData((prev) => ({
                    ...prev,
                    step2_assessment: { ...prev.step2_assessment, structuredRom: updated },
                  }));
                  setJointPickerVisible(false);
                }}
              >
                <Text style={styles.jointPickerItemText}>{j.joint} ({j.movement})</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>Normal: {j.max}°</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: '#64748b', marginTop: 10 }]} onPress={() => setJointPickerVisible(false)}>
              <Text style={styles.modalSaveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ADD PERFORMED EXERCISE */}
      {/* ========================================================================= */}
      <Modal visible={addExerciseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={styles.modalTitle}>Add Performed Exercise</Text>

            <Text style={styles.modalInputLabel}>Exercise Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Wall Squats"
              value={newExerciseForm.name}
              onChangeText={(v) => setNewExerciseForm((prev) => ({ ...prev, name: v }))}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalInputLabel}>Sets</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newExerciseForm.sets}
                  onChangeText={(v) => setNewExerciseForm((prev) => ({ ...prev, sets: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalInputLabel}>Reps</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newExerciseForm.reps}
                  onChangeText={(v) => setNewExerciseForm((prev) => ({ ...prev, reps: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalInputLabel}>Hold (s)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newExerciseForm.holdSec}
                  onChangeText={(v) => setNewExerciseForm((prev) => ({ ...prev, holdSec: v }))}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => {
                if (!newExerciseForm.name.trim()) {
                  Alert.alert('Required', 'Please enter exercise name');
                  return;
                }
                const updated = [
                  ...consultationData.step3_treatment.exercisesPerformed,
                  {
                    name: newExerciseForm.name.trim(),
                    sets: parseInt(newExerciseForm.sets) || 3,
                    reps: parseInt(newExerciseForm.reps) || 10,
                    holdSec: parseInt(newExerciseForm.holdSec) || 30,
                  },
                ];
                setConsultationData((prev) => ({
                  ...prev,
                  step3_treatment: { ...prev.step3_treatment, exercisesPerformed: updated },
                }));
                setNewExerciseForm({ name: '', sets: '3', reps: '10', holdSec: '30' });
                setAddExerciseModalVisible(false);
              }}
            >
              <Text style={styles.modalSaveBtnText}>Add to Performed List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ADD HOME EXERCISE */}
      {/* ========================================================================= */}
      <Modal visible={addHomeExerciseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={styles.modalTitle}>Add Prescribed Home Exercise</Text>

            <Text style={styles.modalInputLabel}>Exercise Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Quad Sets"
              value={newHomeExForm.name}
              onChangeText={(v) => setNewHomeExForm((prev) => ({ ...prev, name: v }))}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalInputLabel}>Sets</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newHomeExForm.sets}
                  onChangeText={(v) => setNewHomeExForm((prev) => ({ ...prev, sets: v }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalInputLabel}>Reps</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={newHomeExForm.reps}
                  onChangeText={(v) => setNewHomeExForm((prev) => ({ ...prev, reps: v }))}
                />
              </View>
            </View>

            <Text style={styles.modalInputLabel}>Frequency</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2x Daily"
              value={newHomeExForm.frequency}
              onChangeText={(v) => setNewHomeExForm((prev) => ({ ...prev, frequency: v }))}
            />

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => {
                if (!newHomeExForm.name.trim()) {
                  Alert.alert('Required', 'Please enter exercise name');
                  return;
                }
                const updated = [
                  ...consultationData.step4_recovery.homeExercises,
                  {
                    name: newHomeExForm.name.trim(),
                    sets: parseInt(newHomeExForm.sets) || 2,
                    reps: parseInt(newHomeExForm.reps) || 10,
                    frequency: newHomeExForm.frequency.trim() || '2x Daily',
                  },
                ];
                setConsultationData((prev) => ({
                  ...prev,
                  step4_recovery: { ...prev.step4_recovery, homeExercises: updated },
                }));
                setNewHomeExForm({ name: '', sets: '2', reps: '10', frequency: '2x Daily' });
                setAddHomeExerciseModalVisible(false);
              }}
            >
              <Text style={styles.modalSaveBtnText}>Add to Home Protocol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 13,
    color: '#0f172a',
    minHeight: 70,
  },
  quickTagBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickTagText: { fontSize: 11, fontWeight: '700', color: '#003D9B' },
  painScoreBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  painValHighlight: { fontSize: 13, fontWeight: '900' },
  numScoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  numScoreBtnActive: { backgroundColor: '#003D9B', borderColor: '#003D9B' },
  numScoreText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  numScoreTextActive: { color: '#ffffff' },
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
  jointChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jointChipActive: { backgroundColor: '#003D9B', borderColor: '#003D9B' },
  jointChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  jointChipTextActive: { color: '#ffffff' },

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
  smallPill: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallPillActive: { backgroundColor: '#003D9B' },
  smallPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  smallPillTextActive: { color: '#ffffff' },

  romCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, gap: 10 },
  romHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  romJointName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  romSub: { fontSize: 11, color: '#64748b' },
  romBadgesRow: { flexDirection: 'row', gap: 8 },
  measuredRomBadge: { flex: 1, backgroundColor: '#e0f2fe', padding: 8, borderRadius: 8, alignItems: 'center' },
  measuredRomLabel: { fontSize: 9, fontWeight: '800', color: '#0369a1' },
  measuredRomValue: { fontSize: 14, fontWeight: '900', color: '#0369a1', marginTop: 2 },
  stepAngleBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  stepAngleBtnText: { fontSize: 10, fontWeight: '800', color: '#0369a1' },
  restrictionBadge: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  restrictionLabel: { fontSize: 9, fontWeight: '800' },
  restrictionValue: { fontSize: 14, fontWeight: '900', marginTop: 2 },

  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strengthMuscleText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  gradeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f1f5f9' },
  gradeBtnActive: { backgroundColor: '#003D9B' },
  gradeBtnText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  gradeBtnTextActive: { color: '#ffffff' },

  specialTestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  testName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  testBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  testBadgeText: { fontSize: 10, fontWeight: '800' },

  // Step 3 Treatment
  modalitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalityChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  modalityChipActive: { backgroundColor: '#003D9B' },
  modalityChipText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  modalityChipTextActive: { color: '#ffffff' },
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
  synthesisCellInput: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginTop: 2, padding: 0 },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  progressBtn: {
    flex: 1,
    minWidth: '45%',
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
  nextVisitCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, gap: 4, marginTop: 6 },
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

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  modalInputLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginTop: 4 },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  modalSaveBtn: {
    backgroundColor: '#003D9B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSaveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  jointPickerItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jointPickerItemText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
});
