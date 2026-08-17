import SessionLog from '../models/SessionLog.js';
import PatientProgram from '../models/PatientProgram.js';
import Program from '../models/Program.js';
import Exercise from '../models/Exercise.js';
import { recalculateRecoveryScore, checkPainAlert } from '../utils/recoveryEngine.js';
import { publishEvent } from '../utils/rabbitmq.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';

// ─── LOG WORKOUT SESSION (IDEMPOTENT & RACE-SAFE) ─────────────────────────────
export const logSession = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    let targetPatientId = requesterId;

    if (requesterRole === 'therapist') {
      const paramPatientId = req.body.patientId || req.body.userId;
      if (!paramPatientId) {
        return res.status(400).json({ success: false, error: { code: 'PATIENT_ID_REQUIRED', message: 'patientId is required for therapist session logging.' } });
      }
      const hasCare = await hasActiveCareRelationship(requesterId, paramPatientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with patient.' } });
      }
      targetPatientId = paramPatientId;
    }

    const {
      patientProgramId,
      programId,
      idempotencyKey,
      clientSessionId,
      sessionLogId,
      date,
      durationSeconds = 0,
      perceivedExertionRPE,
      rpeScore,
      painLevel,
      postSessionPain,
      exercisesCompleted = [],
      status = 'completed',
      notes,
      completedOffline = false,
      startedAt,
      completedAt
    } = req.body;

    const dedupeKey = idempotencyKey || clientSessionId || sessionLogId;
    const rpe = perceivedExertionRPE !== undefined ? Number(perceivedExertionRPE) : (rpeScore !== undefined ? Number(rpeScore) : 4);
    const pain = painLevel !== undefined ? Number(painLevel) : (postSessionPain !== undefined ? Number(postSessionPain) : 0);
    const durSec = Number(durationSeconds || 0);

    // 1. Validate Telemetry Boundaries
    if (isNaN(rpe) || rpe < 1 || rpe > 10) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'perceivedExertionRPE must be an integer between 1 and 10.' } });
    }
    if (isNaN(pain) || pain < 0 || pain > 10) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'painLevel must be an integer between 0 and 10.' } });
    }
    if (isNaN(durSec) || durSec < 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'durationSeconds cannot be negative.' } });
    }

    // 2. Validate Active PatientProgram
    let activeProgram = null;
    if (patientProgramId) {
      activeProgram = await PatientProgram.findOne({
        _id: patientProgramId,
        patientId: targetPatientId.toString(),
        status: 'active',
        isDeleted: false
      }).populate('programId');
      
      if (!activeProgram) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACTIVE_PROGRAM_REQUIRED', message: 'Active recovery program not found or not assigned to this patient.' }
        });
      }
    } else {
      activeProgram = await PatientProgram.findOne({
        patientId: targetPatientId.toString(),
        status: 'active',
        isDeleted: false
      }).populate('programId');
    }
    if (!activeProgram && !patientProgramId) {
      // Auto-initialize active starter program from default template if none exists
      const defaultTemplate = await Program.findOne({ isActive: true });
      if (defaultTemplate) {
        activeProgram = await PatientProgram.create({
          patientId: targetPatientId.toString(),
          programId: defaultTemplate._id,
          title: defaultTemplate.title,
          status: 'active',
          currentWeek: 1,
          targetWeeks: defaultTemplate.durationWeeks || 6,
          targetSessionsPerWeek: defaultTemplate.sessionsPerWeek || 3,
          completedSessionsCount: 0,
          adherencePercent: 0,
          recoveryScore: 0,
          startDate: new Date(),
          assignedBy: defaultTemplate.createdBy || 'system',
        });
        await activeProgram.populate('programId');
      }
    }

    if (!activeProgram) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACTIVE_PROGRAM_REQUIRED', message: 'No active recovery program is available for session logging.' }
      });
    }

    // 3. Validate Prescribed Exercises
    if (Array.isArray(exercisesCompleted) && exercisesCompleted.length > 0) {
      const allowedExerciseIds = new Set();

      // From master program template
      if (activeProgram.programId) {
        (activeProgram.programId.exercises || []).forEach(e => {
          if (e.exerciseId) allowedExerciseIds.add(e.exerciseId.toString());
        });
        (activeProgram.programId.phases || []).forEach(ph => {
          (ph.exercises || []).forEach(e => {
            if (e.exerciseId) allowedExerciseIds.add(e.exerciseId.toString());
          });
        });
      }

      // From per-patient overrides
      (activeProgram.exerciseOverrides || []).forEach(ov => {
        if (ov.exerciseId) allowedExerciseIds.add(ov.exerciseId.toString());
      });

      // If program has no exercises defined, allow active system exercises
      if (allowedExerciseIds.size === 0) {
        const sysExercises = await Exercise.find({ isDeleted: { $ne: true } }).select('_id').lean();
        sysExercises.forEach(se => allowedExerciseIds.add(se._id.toString()));
      }

      for (const ex of exercisesCompleted) {
        const exIdStr = ex.exerciseId ? ex.exerciseId.toString() : '';
        const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(exIdStr);

        if ((!exIdStr || !isMongoObjectId) && allowedExerciseIds.size > 0) {
          ex.exerciseId = Array.from(allowedExerciseIds)[0];
        } else if (exIdStr && isMongoObjectId && !allowedExerciseIds.has(exIdStr)) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `Exercise ID ${exIdStr} is not part of the active program prescription.` }
          });
        }
        if (ex.setsCompleted !== undefined && ex.setsCompleted < 0) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'setsCompleted cannot be negative.' } });
        }
        if (ex.repsCompleted !== undefined && ex.repsCompleted < 0) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'repsCompleted cannot be negative.' } });
        }
      }
    }

    // 4. Fast Idempotency Check (Application Level)
    if (dedupeKey) {
      const existing = await SessionLog.findOne({
        patientId: targetPatientId.toString(),
        $or: [{ idempotencyKey: dedupeKey }, { clientSessionId: dedupeKey }]
      }).lean();

      if (existing) {
        return res.status(200).json({
          success: true,
          isIdempotent: true,
          message: 'Session already logged (idempotent)',
          sessionId: existing._id,
          data: {
            session: existing,
            isIdempotent: true
          }
        });
      }
    }

    // 5. Database Insertion with Concurrency Duplicate-Key Protection
    let session = null;
    try {
      session = await SessionLog.create({
        patientId: targetPatientId.toString(),
        patientProgramId: activeProgram._id,
        programId: programId || activeProgram.programId?._id || activeProgram.programId,
        idempotencyKey: dedupeKey,
        clientSessionId: dedupeKey,
        date: date || new Date().toISOString().slice(0, 10),
        durationSeconds: durSec,
        perceivedExertionRPE: rpe,
        rpeScore: rpe,
        painLevel: pain,
        postSessionPain: pain,
        status,
        exercisesCompleted: exercisesCompleted.map(e => ({
          exerciseId: e.exerciseId,
          name: e.name,
          setsCompleted: e.setsCompleted || e.setsDone || 0,
          setsDone: e.setsCompleted || e.setsDone || 0,
          repsCompleted: e.repsCompleted || e.repsDone || 0,
          repsDone: e.repsCompleted || e.repsDone || 0,
          holdSecondsCompleted: e.holdSecondsCompleted || 0,
          durationSec: e.durationSec || 0,
          completed: e.completed !== undefined ? e.completed : true
        })),
        notes,
        completedOffline,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : new Date()
      });
    } catch (createErr) {
      // Concurrency race: another request inserted with same idempotencyKey simultaneously
      if (createErr.code === 11000 && dedupeKey) {
        const raceExisting = await SessionLog.findOne({
          patientId: targetPatientId.toString(),
          $or: [{ idempotencyKey: dedupeKey }, { clientSessionId: dedupeKey }]
        }).lean();

        return res.status(200).json({
          success: true,
          isIdempotent: true,
          message: 'Session already logged (concurrent duplicate)',
          sessionId: raceExisting?._id,
          data: {
            session: raceExisting,
            isIdempotent: true
          }
        });
      }
      throw createErr;
    }

    // 6. Atomic Counter Increment (Only executed for newly created sessions)
    let scores = { recoveryScore: activeProgram.recoveryScore || 25, adherencePercent: activeProgram.adherencePercent || 50 };

    if (status === 'completed') {
      const totalLogs = await SessionLog.countDocuments({ patientId: targetPatientId.toString(), status: 'completed' });
      const targetWeeks = activeProgram.targetWeeks || 4;
      const targetSessionsPerWeek = activeProgram.targetSessionsPerWeek || 3;
      const totalExpected = Math.max(1, targetWeeks * targetSessionsPerWeek);

      const computedAdherence = Math.min(100, Math.round((totalLogs / totalExpected) * 100));
      const computedScore = Math.min(100, Math.round(computedAdherence * 0.7 + 30));

      await PatientProgram.findOneAndUpdate(
        { _id: activeProgram._id, patientId: targetPatientId.toString() },
        {
          $inc: { completedSessionsCount: 1 },
          $set: { recoveryScore: computedScore, adherencePercent: computedAdherence }
        }
      );

      scores = { recoveryScore: computedScore, adherencePercent: computedAdherence };

      // High pain notification
      if (pain >= 7) {
        try {
          await publishEvent('clinical.alert', {
            patientId: targetPatientId,
            patientProgramId: activeProgram._id,
            painLevel: pain,
            message: `High post-session pain reported: ${pain}/10.`
          });
        } catch (e) {
          // ignore event publish failures in standalone
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Session logged successfully',
      sessionId: session._id,
      data: {
        session,
        scores
      }
    });
  } catch (err) {
    console.error('[Session] logSession error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET SESSION HISTORY ──────────────────────────────────────────────────────
export const getSessionHistory = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    let targetPatientId = req.query.patientId || req.query.userId || requesterId;

    if (requesterRole === 'therapist') {
      const queryPatientId = req.query.patientId || req.query.userId;
      if (queryPatientId) {
        const hasCare = await hasActiveCareRelationship(requesterId, queryPatientId);
        if (!hasCare) {
          return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No care relationship with patient.' } });
        }
        targetPatientId = queryPatientId;
      }
    } else if (requesterRole === 'patient') {
      targetPatientId = requesterId;
    }

    const { limit = 50, page = 1, status } = req.query;
    const filter = { patientId: targetPatientId.toString(), isDeleted: false };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sessions, total] = await Promise.all([
      SessionLog.find(filter)
        .populate('exercisesCompleted.exerciseId')
        .sort({ completedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SessionLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: sessions,
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (err) {
    console.error('[Session] getSessionHistory error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET SESSION BY ID ────────────────────────────────────────────────────────
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    const session = await SessionLog.findOne({ _id: id, isDeleted: false })
      .populate('exercisesCompleted.exerciseId')
      .lean();

    if (!session) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session log not found.' } });
    }

    if (requesterRole === 'patient' && session.patientId !== requesterId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    if (requesterRole === 'therapist' && session.patientId !== requesterId.toString()) {
      const hasCare = await hasActiveCareRelationship(requesterId, session.patientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No care relationship found with this patient.' } });
      }
    }

    res.json({ success: true, data: session });
  } catch (err) {
    console.error('[Session] getSessionById error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE SESSION ───────────────────────────────────────────────────────────
export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, painLevel, status } = req.body;
    const session = await SessionLog.findByIdAndUpdate(id, { notes, painLevel, status }, { new: true });
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── DELETE SESSION ───────────────────────────────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    await SessionLog.findByIdAndUpdate(id, { isDeleted: true });
    res.json({ success: true, message: 'Session log deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET PAIN TREND ───────────────────────────────────────────────────────────
export const getPainTrend = async (req, res) => {
  try {
    const { patientProgramId } = req.params;
    const logs = await SessionLog.find({ patientProgramId, isDeleted: false })
      .select('date painLevel postSessionPain perceivedExertionRPE status completedAt')
      .sort({ completedAt: 1 })
      .lean();

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
