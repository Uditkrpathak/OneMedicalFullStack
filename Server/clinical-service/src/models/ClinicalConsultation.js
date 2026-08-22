import mongoose from 'mongoose';

const ClinicalConsultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    therapistId: {
      type: String,
      required: true,
      index: true,
    },
    telehealthSessionId: {
      type: String,
      default: null,
    },
    currentStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'SIGNED', 'SUBMITTED', 'FINALIZED', 'SEALED', 'AMENDED'],
      default: 'DRAFT',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isSealed: {
      type: Boolean,
      default: false,
      index: true,
    },
    sealedAt: {
      type: Date,
      default: null,
    },
    sealedBy: {
      type: String,
      default: null,
    },
    reportMedicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalRecord',
      default: null,
    },
    amendments: [
      {
        version: { type: Number, required: true },
        reason: { type: String, required: true },
        amendedBy: { type: String, required: true },
        amendedAt: { type: Date, default: Date.now },
        changes: { type: mongoose.Schema.Types.Mixed },
        snapshot: { type: mongoose.Schema.Types.Mixed },
      }
    ],
    draftSavedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },

    // ─── STEP 1: Preparation & Chief Complaint ──────────────────────────────
    step1_preparation: {
      chiefComplaint: { type: String, default: '' },
      painScore: { type: Number, min: 0, max: 10, default: 0 },
      painType: {
        type: [String],
        enum: ['Sharp', 'Dull', 'Radiating', 'Burning', 'Stiffness', 'Throbbing', 'Aching'],
        default: ['Radiating'],
      },
      painDuration: { type: String, default: 'Today' },
      painLocation: {
        bodyPart: { type: String, default: 'Left Knee' },
        region: { type: String, enum: ['Front', 'Back'], default: 'Front' },
        coordinates: { x: Number, y: Number },
      },
      sessionGoals: {
        type: [String],
        default: ['Reduce Pain', 'Improve Mobility'],
      },
      observations: {
        swelling: { type: Boolean, default: false },
        inflammation: { type: Boolean, default: false },
        limitedRom: { type: Boolean, default: false },
        muscleTight: { type: Boolean, default: false },
      },
    },

    // ─── STEP 2: Assessment & Vitals ─────────────────────────────────────────
    step2_assessment: {
      vitals: {
        bp: { type: String, default: '120/80' },
        hr: { type: Number, default: 72 },
        temp: { type: Number, default: 98.6 },
        spo2: { type: Number, default: 98 },
      },
      painMovement: { type: Number, min: 0, max: 10, default: 4 },
      painRest: { type: Number, min: 0, max: 10, default: 2 },
      structuredRom: [
        {
          joint: { type: String, default: 'Knee' },
          movement: { type: String, default: 'Flexion' },
          extensionDegrees: { type: Number, default: 0 },
          flexionDegrees: { type: Number, default: 110 },
          measuredDegrees: { type: Number, default: 85 },
          restriction: {
            type: String,
            default: 'MODERATE',
          },
        },
      ],
      muscleStrength: { type: String, default: '3/5' },
      specialTests: [
        {
          name: { type: String, default: 'Lachman Test' },
          result: { type: String, enum: ['POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'], default: 'POSITIVE' },
        },
        {
          name: { type: String, default: 'Straight Leg Raise' },
          result: { type: String, enum: ['POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'], default: 'NEGATIVE' },
        },
      ],
      functionalObservations: {
        type: [String],
        default: ['Walking', 'Sit to Stand'],
      },
      clinicalImpression: { type: String, default: '' },
    },

    // ─── STEP 3: Treatment & Exercises ───────────────────────────────────────
    step3_treatment: {
      modalities: {
        type: [String],
        default: ['Manual Therapy', 'IFT'],
      },
      exercisesPerformed: [
        {
          name: { type: String, required: true },
          sets: { type: Number, default: 3 },
          reps: { type: Number, default: 10 },
          holdSec: { type: Number, default: 30 },
        },
      ],
      bodyRegionTreated: { type: String, default: 'Lower Back' },
      patientResponse: {
        type: String,
        enum: ['Tolerated Well', 'Mild Pain', 'Fatigued', 'Significant Pain'],
        default: 'Tolerated Well',
      },
      sessionIntensity: {
        type: String,
        enum: ['Very Light', 'Light', 'Moderate', 'High', 'Very High'],
        default: 'Moderate',
      },
      durationMins: { type: Number, default: 45 },
      treatmentRemarks: { type: String, default: '' },
    },

    // ─── STEP 4: Recovery Program & Home Care ────────────────────────────────
    step4_recovery: {
      programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
      programName: { type: String, default: 'Lumbar Spine Stabilization' },
      homeExercises: [
        {
          exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },
          name: { type: String, required: true },
          sets: { type: Number, default: 3 },
          reps: { type: Number, default: 10 },
          frequency: { type: String, default: '2x Daily' },
          videoUrl: { type: String, default: '' },
          thumbnailUrl: { type: String, default: '' },
        },
      ],
      patientGoals: {
        type: [String],
        default: ['Reduce Pain', 'Improve Mobility'],
      },
      activityRestrictions: {
        type: [String],
        default: ['Avoid Heavy Lifting'],
      },
      homeCareInstructions: { type: String, default: '' },
      nextReviewDate: { type: String, default: '' },
      nextReviewMilestone: { type: String, default: 'Phase 2 Check' },
      patientEducation: {
        exerciseVideos: { type: Boolean, default: true },
        painManagementGuide: { type: Boolean, default: true },
      },
    },

    // ─── STEP 5: Synthesis & Digital Sign-Off ─────────────────────────────────
    step5_synthesis: {
      conditionSummary: {
        condition: { type: String, default: 'Lower Back Pain' },
        mobility: { type: String, default: 'Moderate restriction' },
        interventions: { type: String, default: 'Manual Therapy, Pelvic Tilts focus' },
        nextPhase: { type: String, default: 'Lumbar Stabilization Program initialization' },
      },
      clinicalImpression: { type: String, default: '' },
      additionalNotes: { type: String, default: '' },
      progressStatus: {
        type: String,
        default: 'Improved',
      },
      goalStatus: {
        type: String,
        default: 'Partially Achieved',
      },
      complications: { type: Boolean, default: false },
      digitalSignature: {
        signedBy: { type: String, default: '' },
        therapistName: { type: String, default: '' },
        registrationNumber: { type: String, default: '' },
        clinicName: { type: String, default: 'One Medical Clinic' },
        signedAt: { type: Date, default: null },
        digitalSignHash: { type: String, default: '' },
      },
    },

    // ─── STEP 6: Reports & Next Visit Scheduling ──────────────────────────────
    step6_reports: {
      attachedReports: [
        {
          title: { type: String, default: '' },
          category: { type: String, default: 'MRI' },
          url: { type: String, default: '' },
          hospital: { type: String, default: '' },
          doctorName: { type: String, default: '' },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      nextVisit: {
        required: { type: Boolean, default: true },
        date: { type: String, default: '' },
        time: { type: String, default: '10:30 AM' },
        consultationType: {
          type: String,
          default: 'In-person Clinic',
        },
        clinic: { type: String, default: 'Downtown Clinic' },
        sessionObjectives: {
          type: [String],
          default: ['Pain Reassessment', 'ROM Assessment', 'Progress Review'],
        },
        automatedReminders: {
          medication: { type: Boolean, default: true },
          exercise: { type: Boolean, default: true },
          hydration: { type: Boolean, default: true },
        },
        referralNotes: { type: String, default: '' },
        nextVisitChecklist: {
          reviewPainScore: { type: Boolean, default: true },
          reviewExerciseCompliance: { type: Boolean, default: true },
          reviewReports: { type: Boolean, default: true },
        },
      },
    },
  },
  { timestamps: true }
);

ClinicalConsultationSchema.index({ appointmentId: 1, therapistId: 1 });
ClinicalConsultationSchema.index({ patientId: 1, createdAt: -1 });

const ClinicalConsultation = mongoose.model('ClinicalConsultation', ClinicalConsultationSchema);
export default ClinicalConsultation;
