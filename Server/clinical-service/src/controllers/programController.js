import mongoose from 'mongoose';
import Program from '../models/Program.js';
import PatientProgram from '../models/PatientProgram.js';
import TreatmentProgramExercise from '../models/TreatmentProgramExercise.js';
import ExerciseSession from '../models/ExerciseSession.js';
import SessionLog from '../models/SessionLog.js';
import Appointment from '../models/Appointment.js';
import Exercise from '../models/Exercise.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';
import { publishEvent } from '../utils/rabbitmq.js';

// ─── CREATE PROGRAM TEMPLATE (Therapist/Admin) ────────────────────────────────
export const createProgram = async (req, res) => {
  try {
    const therapistId = req.user?.userId;
    const {
      title,
      name,
      description,
      targetCondition,
      condition,
      durationWeeks,
      difficulty,
      targetSessionsPerWeek,
      phases,
      exercises,
      precautions,
      equipment,
      isTemplate = true
    } = req.body;

    const programTitle = title || name;
    const programCondition = targetCondition || condition;

    if (!programTitle || !programCondition) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and condition are required.' } });
    }

    const program = await Program.create({
      title: programTitle,
      name: programTitle,
      description,
      condition: programCondition,
      targetCondition: programCondition,
      durationWeeks: durationWeeks || 4,
      targetSessionsPerWeek: targetSessionsPerWeek || 3,
      totalSessionsTarget: (durationWeeks || 4) * (targetSessionsPerWeek || 3),
      difficulty: difficulty || 'beginner',
      phases: phases || [],
      exercises: exercises || [],
      precautions: precautions || [],
      equipment: equipment || [],
      isTemplate,
      isActive: true,
      createdBy: therapistId || 'system'
    });

    res.status(201).json({ success: true, data: { program } });
  } catch (err) {
    console.error('[Program] createProgram error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── LIST PROGRAM TEMPLATES ───────────────────────────────────────────────────
export const listPrograms = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { page = 1, limit = 50, targetCondition, condition, difficulty } = req.query;

    const filter = { isDeleted: false, isActive: true };
    const cond = condition || targetCondition;
    if (cond) {
      filter.$or = [
        { condition: new RegExp(cond, 'i') },
        { targetCondition: new RegExp(cond, 'i') }
      ];
    }
    if (difficulty) filter.difficulty = difficulty;

    let total = await Program.countDocuments(filter);
    if (total === 0 && !cond && !difficulty) {
      // Auto-seed real program templates in MongoDB
      const defaultTemplates = [
        {
          title: 'Post-ACL Knee Rehabilitation',
          name: 'Post-ACL Knee Rehabilitation',
          condition: 'Knee Rehab',
          targetCondition: 'Knee Rehab',
          durationWeeks: 6,
          targetSessionsPerWeek: 4,
          totalSessionsTarget: 24,
          difficulty: 'intermediate',
          description: 'Structured protocol for restoring knee range of motion, quad strength, and joint stability.',
          isTemplate: true,
          isActive: true,
          createdBy: 'system'
        },
        {
          title: 'Lumbar Spine Core Stabilization',
          name: 'Lumbar Spine Core Stabilization',
          condition: 'Lower Back Pain',
          targetCondition: 'Lower Back Pain',
          durationWeeks: 4,
          targetSessionsPerWeek: 3,
          totalSessionsTarget: 12,
          difficulty: 'beginner',
          description: 'Targeted strengthening of deep core muscles and pelvic stabilization to alleviate disc strain.',
          isTemplate: true,
          isActive: true,
          createdBy: 'system'
        },
        {
          title: 'Cervical Spine & Neck Relief',
          name: 'Cervical Spine & Neck Relief',
          condition: 'Neck Pain',
          targetCondition: 'Neck Pain',
          durationWeeks: 4,
          targetSessionsPerWeek: 3,
          totalSessionsTarget: 12,
          difficulty: 'beginner',
          description: 'Postural correction and gentle cervical mobilization routines for pain-free motion.',
          isTemplate: true,
          isActive: true,
          createdBy: 'system'
        },
        {
          title: 'Rotator Cuff Shoulder Rehab',
          name: 'Rotator Cuff Shoulder Rehab',
          condition: 'Shoulder Mobility',
          targetCondition: 'Shoulder Mobility',
          durationWeeks: 6,
          targetSessionsPerWeek: 3,
          totalSessionsTarget: 18,
          difficulty: 'intermediate',
          description: 'Progressive scaption, external rotation, and scapular stabilization exercises.',
          isTemplate: true,
          isActive: true,
          createdBy: 'system'
        },
        {
          title: 'Ankle Mobility & Gait Recovery',
          name: 'Ankle Mobility & Gait Recovery',
          condition: 'Ankle Sprain',
          targetCondition: 'Ankle Sprain',
          durationWeeks: 3,
          targetSessionsPerWeek: 4,
          totalSessionsTarget: 12,
          difficulty: 'beginner',
          description: 'Proprioception balance drills and dorsiflexion resistance training.',
          isTemplate: true,
          isActive: true,
          createdBy: 'system'
        }
      ];
      await Program.insertMany(defaultTemplates);
      total = await Program.countDocuments(filter);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const programs = await Program.find(filter)
      .populate('exercises.exerciseId')
      .populate('phases.exercises.exerciseId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: programs,
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (err) {
    console.error('[Program] listPrograms error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET PROGRAM BY ID ────────────────────────────────────────────────────────
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    let program = await Program.findOne({ _id: id, isDeleted: false })
      .populate('exercises.exerciseId')
      .populate('phases.exercises.exerciseId')
      .lean();

    if (!program) {
      const patientProg = await PatientProgram.findOne({ _id: id, isDeleted: false })
        .populate('programId')
        .populate('exercises.exerciseId')
        .populate('phases.exercises.exerciseId')
        .lean();

      if (patientProg) {
        program = {
          _id: patientProg._id,
          title: patientProg.programId?.title || patientProg.title || 'Personalized Recovery Program',
          condition: patientProg.programId?.condition || patientProg.condition || 'Musculoskeletal Rehabilitation',
          durationWeeks: patientProg.targetWeeks || patientProg.programId?.durationWeeks || 4,
          targetWeeks: patientProg.targetWeeks || 4,
          targetSessionsPerWeek: patientProg.targetSessionsPerWeek || 3,
          difficulty: patientProg.programId?.difficulty || 'BEGINNER',
          phases: patientProg.programId?.phases || patientProg.phases || [],
          exercises: patientProg.exercises || patientProg.programId?.exercises || [],
          patientGoals: patientProg.patientGoals || [],
          status: patientProg.status,
        };
      }
    }

    if (!program) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Program not found.' } });
    }
    res.json({ success: true, data: program });
  } catch (err) {
    console.error('[Program] getProgramById error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ASSIGN PROGRAM TO PATIENT (CARE-RELATIONSHIP PROTECTED) ──────────────────
export const assignProgram = async (req, res) => {
  try {
    const therapistId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { id, programId: paramProgId } = req.params;
    const programId = id || paramProgId;

    const {
      patientId,
      startDate,
      targetWeeks,
      targetSessionsPerWeek,
      milestones,
      exerciseOverrides,
      activityRestrictions,
      patientGoals,
      appointmentId
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'patientId is required.' } });
    }

    // Care relationship check: must have confirmed appointment or care relationship
    if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(therapistId, patientId);
      if (!hasCare) {
        return res.status(403).json({
          success: false,
          error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'Active care relationship or confirmed appointment required to assign program.' }
        });
      }
    }

    let program = null;
    if (programId && mongoose.Types.ObjectId.isValid(programId)) {
      program = await Program.findOne({ _id: programId, isDeleted: false });
    }
    if (!program && programId) {
      const sanitizedKey = programId.replace(/^prog_/, '').replace(/_/g, ' ');
      program = await Program.findOne({
        $or: [
          { title: new RegExp(sanitizedKey, 'i') },
          { name: new RegExp(sanitizedKey, 'i') },
          { condition: new RegExp(sanitizedKey, 'i') }
        ],
        isDeleted: false
      });
    }
    if (!program) {
      const defaultTitle = req.body.title || req.body.programTitle || 'Post-ACL Knee Rehabilitation';
      program = await Program.create({
        title: defaultTitle,
        name: defaultTitle,
        condition: req.body.condition || 'Rehabilitation',
        targetCondition: req.body.condition || 'Rehabilitation',
        durationWeeks: Number(targetWeeks || 4),
        targetSessionsPerWeek: Number(targetSessionsPerWeek || 3),
        totalSessionsTarget: Number((targetWeeks || 4) * (targetSessionsPerWeek || 3)),
        difficulty: 'beginner',
        isTemplate: true,
        isActive: true,
        createdBy: therapistId || 'system'
      });
    }

    // Only pause previous active programs if explicitly requested
    if (req.body.replaceExisting === true) {
      await PatientProgram.updateMany(
        { patientId: patientId.toString(), status: 'active' },
        { $set: { status: 'paused' } }
      );
    }

    const assignment = await PatientProgram.create({
      patientId: patientId.toString(),
      therapistId: therapistId ? therapistId.toString() : program.createdBy,
      assignedBy: therapistId ? therapistId.toString() : 'system',
      programId: program._id,
      programTemplateId: program._id,
      title: program.title,
      appointmentId,
      startDate: startDate ? new Date(startDate) : new Date(),
      targetWeeks: Number(targetWeeks || program.durationWeeks || 4),
      targetSessionsPerWeek: Number(targetSessionsPerWeek || program.targetSessionsPerWeek || 3),
      currentWeek: 1,
      completedSessionsCount: 0,
      status: 'active',
      milestones: milestones || [],
      exerciseOverrides: exerciseOverrides || [],
      activityRestrictions,
      patientGoals,
      assignedAt: new Date()
    });

    const populated = await PatientProgram.findById(assignment._id)
      .populate({ path: 'programId', populate: { path: 'exercises.exerciseId' } })
      .lean();

    try {
      await publishEvent('clinical.exercise_assigned', {
        eventId: `PROG_ASSIGN:${assignment._id}_${Date.now()}`,
        type: 'clinical.exercise_assigned',
        patientId: patientId.toString(),
        therapistId: therapistId ? therapistId.toString() : 'system',
        therapistName: req.user?.name || 'Dr. Vivek Joshi',
        programTitle: program.title,
        route: 'TodaysSession',
      });
    } catch (evtErr) {
      console.warn('[Program] Notification publish error:', evtErr.message);
    }

    res.status(201).json({ success: true, data: { assignment: populated } });
  } catch (err) {
    console.error('[Program] assignProgram error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET PATIENT'S ACTIVE PROGRAM ────────────────────────────────────────────
export const getMyActiveProgram = async (req, res) => {
  try {
    const patientId = req.user?.userId || req.user?.id || req.user?._id || req.headers['x-user-id'];
    if (!patientId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const assignment = await PatientProgram.findOne({ patientId: patientId.toString(), status: 'active', isDeleted: false })
      .populate({ path: 'programId', populate: [{ path: 'exercises.exerciseId' }, { path: 'phases.exercises.exerciseId' }] })
      .populate('exerciseOverrides.exerciseId')
      .lean();

    if (!assignment) {
      return res.json({ success: true, data: { assignment: null, message: 'No active program assigned.' } });
    }

    // Compute progress stats
    const totalTarget = (assignment.targetWeeks || 4) * (assignment.targetSessionsPerWeek || 3);
    const completed = assignment.completedSessionsCount || 0;
    const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((completed / totalTarget) * 100)) : 0;

    res.json({
      success: true,
      data: {
        ...assignment,
        progressPercent,
        remainingSessions: Math.max(0, totalTarget - completed),
        title: assignment.title || assignment.programId?.title || 'Recovery Program',
      }
    });
  } catch (err) {
    console.error('[Program] getMyActiveProgram error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET ALL PROGRAMS FOR SPECIFIC PATIENT (Therapist/Admin) ────────────────
export const getPatientPrograms = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { patientId } = req.params;

    const programs = await PatientProgram.find({ patientId: patientId.toString(), isDeleted: false })
      .populate({ path: 'programId', populate: [{ path: 'exercises.exerciseId' }, { path: 'phases.exercises.exerciseId' }] })
      .populate('exerciseOverrides.exerciseId')
      .sort({ status: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: programs });
  } catch (err) {
    console.error('[Program] getPatientPrograms error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET PATIENT'S PROGRAM HISTORY ────────────────────────────────────────────
export const getMyPrograms = async (req, res) => {
  try {
    const patientId = req.user?.userId || req.user?.id || req.user?._id || req.headers['x-user-id'];
    if (!patientId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }
    const programs = await PatientProgram.find({ patientId: patientId.toString(), isDeleted: false })
      .populate({ path: 'programId', populate: { path: 'exercises.exerciseId' } })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: programs });
  } catch (err) {
    console.error('[Program] getMyPrograms error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET ACTIVE PROGRAM FOR SPECIFIC PATIENT (Therapist/Admin) ────────────────
export const getPatientActiveProgram = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.user?.id || req.user?._id || req.headers['x-user-id'];
    const requesterRole = req.user?.role;
    const { patientId } = req.params;

    if (requesterRole === 'patient' && requesterId !== patientId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, patientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship found.' } });
      }
    }

    const assignment = await PatientProgram.findOne({ patientId: patientId.toString(), status: 'active', isDeleted: false })
      .populate({ path: 'programId', populate: [{ path: 'exercises.exerciseId' }, { path: 'phases.exercises.exerciseId' }] })
      .populate('exerciseOverrides.exerciseId')
      .lean();

    if (!assignment) {
      return res.json({ success: true, data: null, message: 'No active program assigned.' });
    }

    res.json({ success: true, data: assignment });
  } catch (err) {
    console.error('[Program] getPatientActiveProgram error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET TODAY'S PRESCRIBED EXERCISES ─────────────────────────────────────────
export const getTodaysExercises = async (req, res) => {
  try {
    const patientId = req.user?.userId || req.user?.id || req.user?._id || req.headers['x-user-id'];
    if (!patientId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun

    const assignment = await PatientProgram.findOne({ patientId: String(patientId), status: 'active', isDeleted: false })
      .populate({ path: 'programId', populate: [{ path: 'exercises.exerciseId' }, { path: 'phases.exercises.exerciseId' }] })
      .populate('exerciseOverrides.exerciseId')
      .populate('prescribedExercises.exerciseId')
      .lean();

    if (!assignment) {
      return res.json({ success: true, data: { exercises: [], message: 'No active recovery program.' } });
    }

    const program = assignment.programId || { title: assignment.title || 'Recovery Protocol', phases: [], exercises: [] };
    const daysElapsed = Math.max(0, Math.floor((today - new Date(assignment.startDate || Date.now())) / (1000 * 60 * 60 * 24)));
    const currentWeek = Math.min(assignment.targetWeeks || 4, Math.floor(daysElapsed / 7) + 1);

    // 1. Check if direct consultation prescribedExercises are available
    let rawExercises = [];
    if (assignment.prescribedExercises && assignment.prescribedExercises.length > 0) {
      rawExercises = assignment.prescribedExercises.map((pe) => ({
        exerciseId: pe.exerciseId || pe,
        name: pe.name,
        title: pe.name,
        sets: pe.sets || 3,
        reps: pe.reps || 10,
        holdSeconds: pe.holdSec || 10,
        restSeconds: 30,
        frequency: pe.frequency || '2x Daily',
        videoUrl: pe.videoUrl || '',
        thumbnailUrl: pe.thumbnailUrl || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600',
        instructions: pe.instructions ? [pe.instructions] : ['Execute with steady controlled form.'],
      }));
    } else if (program.phases && program.phases.length > 0) {
      // 2. Check if program has phased weekly exercises
      const currentPhase = program.phases.find(p => p.week === currentWeek) || program.phases[0];
      rawExercises = currentPhase?.exercises || [];
    } else if (program.exercises && program.exercises.length > 0) {
      // 3. Fallback to general program exercises if phases empty
      rawExercises = program.exercises;
    } else {
      // 4. Fallback to all active exercises if template exercises not explicitly linked
      const defaultExList = await Exercise.find({ isDeleted: { $ne: true } }).limit(4).lean();
      rawExercises = defaultExList.map(e => ({ exerciseId: e, sets: 3, reps: 10, holdSeconds: 5, restSeconds: 30 }));
    }

    // 4. Map overrides
    const overrideMap = {};
    (assignment.exerciseOverrides || []).forEach(o => {
      if (o && o.exerciseId) {
        const key = (o.exerciseId._id ? o.exerciseId._id.toString() : (typeof o.exerciseId === 'string' ? o.exerciseId : (o.exerciseId.id ? o.exerciseId.id.toString() : String(o.exerciseId))));
        if (key) overrideMap[key] = o;
      }
    });

    const enriched = (rawExercises || []).map(ex => {
      const exerciseDoc = (ex && ex.exerciseId && typeof ex.exerciseId === 'object') ? ex.exerciseId : {};
      const exIdStr = exerciseDoc._id ? exerciseDoc._id.toString() : (ex?.exerciseId ? String(ex.exerciseId) : (ex?._id ? String(ex._id) : ''));
      const override = overrideMap[exIdStr] || {};

      return {
        _id: exerciseDoc._id || ex?._id || exIdStr,
        exerciseId: exerciseDoc._id || ex?._id || exIdStr,
        name: exerciseDoc.name || exerciseDoc.title || 'Therapeutic Exercise',
        title: exerciseDoc.name || exerciseDoc.title || 'Therapeutic Exercise',
        description: exerciseDoc.description || 'Targeted mobility and strength repetition.',
        bodyRegion: exerciseDoc.bodyRegion || exerciseDoc.bodyPart || 'general',
        category: exerciseDoc.category || 'mobility',
        difficulty: exerciseDoc.difficulty || 'beginner',
        instructions: exerciseDoc.instructions || [],
        precautions: exerciseDoc.precautions || [],
        videoUrl: exerciseDoc.videoUrl || exerciseDoc.mediaUrl,
        thumbnailUrl: exerciseDoc.thumbnailUrl || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600',
        sets: override.sets || ex.sets || exerciseDoc.defaultSets || 3,
        reps: override.reps || ex.reps || exerciseDoc.defaultReps || 10,
        holdSeconds: override.holdSeconds || ex.holdSeconds || exerciseDoc.defaultHoldSeconds || 5,
        restSeconds: override.restSeconds || ex.restSeconds || exerciseDoc.defaultRestSeconds || 30,
        durationSec: override.durationSec || ex.durationSec || exerciseDoc.defaultDurationSec || 30,
        notes: override.notes || ex.notes || '',
      };
    });

    res.json({
      success: true,
      data: {
        patientProgramId: assignment._id,
        programId: program._id,
        programTitle: program.title,
        weekNumber: currentWeek,
        targetWeeks: assignment.targetWeeks,
        dayOfWeek,
        exercises: enriched,
        recoveryScore: assignment.recoveryScore || 0,
        completedSessionsCount: assignment.completedSessionsCount || 0
      }
    });
  } catch (err) {
    console.error('[Program] getTodaysExercises error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE PROGRAM STATUS ────────────────────────────────────────────────────
export const updateProgramStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const assignment = await PatientProgram.findByIdAndUpdate(id, { status }, { new: true });
    res.json({ success: true, data: { assignment } });
  } catch (err) {
    console.error('[Program] updateProgramStatus error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET ASSIGNED PATIENTS FOR THERAPIST ──────────────────────────────────────
export const getAssignedPatients = async (req, res) => {
  try {
    const therapistId = req.user?.userId;
    if (!therapistId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const [activePrograms, appointments] = await Promise.all([
      PatientProgram.find({
        $or: [{ therapistId: therapistId.toString() }, { assignedBy: therapistId.toString() }],
        status: 'active',
        isDeleted: false
      }).populate('programId').lean(),
      Appointment.find({
        therapistId: therapistId.toString(),
        status: { $in: ['CONFIRMED', 'HELD', 'COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'confirmed', 'completed', 'scheduled', 'in_progress', 'rescheduled'] },
        isDeleted: false
      }).lean()
    ]);

    const patientMap = new Map();

    activePrograms.forEach(ap => {
      patientMap.set(ap.patientId, {
        userId: ap.patientId,
        patientId: ap.patientId,
        activeProgramId: ap._id,
        programTitle: ap.programId?.title || ap.title || 'Recovery Program',
        status: ap.status,
        recoveryScore: ap.recoveryScore || 0,
        completedSessions: ap.completedSessionsCount || 0,
      });
    });

    appointments.forEach(a => {
      if (!patientMap.has(a.patientId)) {
        patientMap.set(a.patientId, {
          userId: a.patientId,
          patientId: a.patientId,
          hasActiveAppointment: true,
          lastAppointmentDate: a.startTime,
        });
      }
    });

    res.json({ success: true, data: Array.from(patientMap.values()) });
  } catch (err) {
    console.error('[Program] getAssignedPatients error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADD EXERCISE PRESCRIPTION (Doctor) ──────────────────────────────────────────
export const addExercisePrescription = async (req, res) => {
  try {
    const therapistId = req.user?.userId;
    const { id: programId } = req.params;
    const {
      exerciseId,
      sets = 3,
      reps = 10,
      holdSeconds = 0,
      restSeconds = 30,
      frequency = 'Daily',
      durationWeeks = 4,
      instructions = '',
      changeReason = 'Initial Prescription'
    } = req.body;

    const program = await PatientProgram.findById(programId);
    if (!program || program.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Patient program not found.' } });
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise || exercise.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exercise not found in library.' } });
    }

    const initialPrescription = {
      version: 1,
      sets: parseInt(sets),
      reps: parseInt(reps),
      holdSeconds: parseInt(holdSeconds),
      restSeconds: parseInt(restSeconds),
      frequency,
      durationWeeks: parseInt(durationWeeks),
      instructions,
      prescribedBy: therapistId || 'therapist',
      prescribedAt: new Date(),
      changeReason,
    };

    const programExercise = await TreatmentProgramExercise.create({
      programId: program._id,
      patientId: program.patientId,
      exerciseId: exercise._id,
      clinicalStatus: 'ACTIVE',
      currentPrescription: initialPrescription,
      prescriptionHistory: [initialPrescription],
    });

    const populated = await TreatmentProgramExercise.findById(programExercise._id).populate('exerciseId');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('[Program] addExercisePrescription error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── MODIFY EXERCISE PRESCRIPTION (Versioned Progression / Adjustment) ──────────
export const modifyExercisePrescription = async (req, res) => {
  try {
    const therapistId = req.user?.userId;
    const { exerciseId: programExerciseId } = req.params;
    const {
      sets,
      reps,
      holdSeconds,
      restSeconds,
      frequency,
      durationWeeks,
      instructions,
      changeReason = 'Clinical Progression',
      clinicalStatus
    } = req.body;

    const progEx = await TreatmentProgramExercise.findById(programExerciseId);
    if (!progEx) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Prescribed exercise not found.' } });
    }

    const curr = progEx.currentPrescription;
    const newVersion = (curr.version || 1) + 1;

    const nextPrescription = {
      version: newVersion,
      sets: sets !== undefined ? parseInt(sets) : curr.sets,
      reps: reps !== undefined ? parseInt(reps) : curr.reps,
      holdSeconds: holdSeconds !== undefined ? parseInt(holdSeconds) : curr.holdSeconds,
      restSeconds: restSeconds !== undefined ? parseInt(restSeconds) : curr.restSeconds,
      frequency: frequency || curr.frequency,
      durationWeeks: durationWeeks !== undefined ? parseInt(durationWeeks) : curr.durationWeeks,
      instructions: instructions !== undefined ? instructions : curr.instructions,
      prescribedBy: therapistId || 'therapist',
      prescribedAt: new Date(),
      changeReason,
    };

    progEx.prescriptionHistory.push(nextPrescription);
    progEx.currentPrescription = nextPrescription;
    if (clinicalStatus) progEx.clinicalStatus = clinicalStatus;
    await progEx.save();

    const populated = await TreatmentProgramExercise.findById(progEx._id).populate('exerciseId');
    res.json({ success: true, data: populated });
  } catch (err) {
    console.error('[Program] modifyExercisePrescription error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── REPLACE EXERCISE PRESCRIPTION (e.g. Patient Discomfort) ────────────────────
export const replaceExercisePrescription = async (req, res) => {
  try {
    const therapistId = req.user?.userId;
    const { exerciseId: programExerciseId } = req.params;
    const { newExerciseId, reason = 'Patient discomfort', sets, reps } = req.body;

    const oldProgEx = await TreatmentProgramExercise.findById(programExerciseId);
    if (!oldProgEx) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Original prescribed exercise not found.' } });
    }

    const newEx = await Exercise.findById(newExerciseId);
    if (!newEx) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Replacement exercise not found in catalog.' } });
    }

    // Mark old as REPLACED
    oldProgEx.clinicalStatus = 'REPLACED';
    oldProgEx.replacedByExerciseId = newEx._id;
    await oldProgEx.save();

    // Create new prescription
    const initialPrescription = {
      version: 1,
      sets: sets ? parseInt(sets) : (newEx.defaultSets || 3),
      reps: reps ? parseInt(reps) : (newEx.defaultReps || 10),
      holdSeconds: newEx.defaultHoldSeconds || 0,
      restSeconds: newEx.defaultRestSeconds || 30,
      frequency: oldProgEx.currentPrescription?.frequency || 'Daily',
      durationWeeks: oldProgEx.currentPrescription?.durationWeeks || 4,
      instructions: newEx.description || '',
      prescribedBy: therapistId || 'therapist',
      prescribedAt: new Date(),
      changeReason: `Replaced previous exercise: ${reason}`,
    };

    const newProgEx = await TreatmentProgramExercise.create({
      programId: oldProgEx.programId,
      patientId: oldProgEx.patientId,
      exerciseId: newEx._id,
      clinicalStatus: 'ACTIVE',
      currentPrescription: initialPrescription,
      prescriptionHistory: [initialPrescription],
    });

    const populatedNew = await TreatmentProgramExercise.findById(newProgEx._id).populate('exerciseId');
    res.status(201).json({
      success: true,
      data: {
        replacedExercise: oldProgEx,
        newExercise: populatedNew,
        message: 'Exercise replaced successfully.',
      }
    });
  } catch (err) {
    console.error('[Program] replaceExercisePrescription error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── LOG GRANULAR EXERCISE SESSION (Patient App) ────────────────────────────────
export const logExerciseSession = async (req, res) => {
  try {
    const patientId = req.user?.userId;
    const {
      programId,
      programExerciseId,
      exerciseId,
      prescribedSets,
      prescribedReps,
      completedSets,
      completedReps,
      durationSeconds,
      painBefore,
      painAfter,
      difficultyRating,
      patientFeedback,
    } = req.body;

    if (!programId || !exerciseId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'programId and exerciseId are required.' } });
    }

    const pSets = parseInt(prescribedSets) || 3;
    const pReps = parseInt(prescribedReps) || 10;
    const cSets = parseInt(completedSets) || pSets;
    const cReps = parseInt(completedReps) || pReps;

    const totalPrescribed = pSets * pReps;
    const totalDone = cSets * cReps;
    const completionPct = totalPrescribed > 0 ? Math.min(100, Math.round((totalDone / totalPrescribed) * 100)) : 100;

    const session = await ExerciseSession.create({
      patientId,
      programId,
      programExerciseId,
      exerciseId,
      prescribedSets: pSets,
      prescribedReps: pReps,
      completedSets: cSets,
      completedReps: cReps,
      completionPercentage: completionPct,
      durationSeconds: parseInt(durationSeconds) || 0,
      painBefore: painBefore !== undefined ? parseInt(painBefore) : undefined,
      painAfter: painAfter !== undefined ? parseInt(painAfter) : undefined,
      difficultyRating: difficultyRating || 'optimal',
      patientFeedback,
    });

    // Update patient program sessions count
    await PatientProgram.findByIdAndUpdate(programId, {
      $inc: { completedSessionsCount: 1 }
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error('[Program] logExerciseSession error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET PROGRAM ADHERENCE & CLINICAL PROGRESS ──────────────────────────────────
export const getProgramAdherence = async (req, res) => {
  try {
    const { id: programId } = req.params;
    const program = await PatientProgram.findById(programId);
    if (!program || program.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Patient program not found.' } });
    }

    const sessions = await ExerciseSession.find({ programId }).sort({ date: 1 }).lean();
    const prescribedExercises = await TreatmentProgramExercise.find({ programId }).populate('exerciseId').lean();

    // Group sessions by week
    const startDate = new Date(program.startDate || program.createdAt);
    const weeklyData = [];
    const totalWeeks = program.targetWeeks || 4;

    for (let w = 1; w <= totalWeeks; w++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (w - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSessions = sessions.filter(s => new Date(s.date) >= weekStart && new Date(s.date) < weekEnd);
      const targetWeekly = (program.targetSessionsPerWeek || 3) * (prescribedExercises.length || 3);
      const completedWeekly = weekSessions.length;
      const weeklyAdherence = targetWeekly > 0 ? Math.min(100, Math.round((completedWeekly / targetWeekly) * 100)) : 0;

      weeklyData.push({
        weekNumber: w,
        startDate: weekStart,
        endDate: weekEnd,
        completedSessions: completedWeekly,
        targetSessions: targetWeekly,
        adherencePercent: weeklyAdherence,
      });
    }

    const overallAdherence = weeklyData.length > 0
      ? Math.round(weeklyData.reduce((acc, curr) => acc + curr.adherencePercent, 0) / weeklyData.length)
      : 0;

    // Calculate pain trend
    const painReadings = sessions.filter(s => s.painBefore !== undefined || s.painAfter !== undefined);
    const initialPain = painReadings.length > 0 ? (painReadings[0].painBefore ?? painReadings[0].painAfter ?? 8) : 8;
    const currentPain = painReadings.length > 0 ? (painReadings[painReadings.length - 1].painAfter ?? painReadings[painReadings.length - 1].painBefore ?? 4) : 4;

    res.json({
      success: true,
      data: {
        programId: program._id,
        patientId: program.patientId,
        title: program.title,
        overallAdherencePercent: overallAdherence,
        painReduction: { initial: initialPain, current: currentPain, improvedBy: Math.max(0, initialPain - currentPain) },
        totalSessionsLogged: sessions.length,
        prescribedExercisesCount: prescribedExercises.length,
        weeklyBreakdown: weeklyData,
        prescribedExercises,
      }
    });
  } catch (err) {
    console.error('[Program] getProgramAdherence error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

