import PainAssessment from '../models/PainAssessment.js';
import PatientProgram from '../models/PatientProgram.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';
import { publishEvent } from '../utils/rabbitmq.js';

// ─── CREATE INDEPENDENT PAIN ASSESSMENT ──────────────────────────────────────
export const createPainAssessment = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    let targetPatientId = requesterId;

    if (requesterRole === 'therapist') {
      const therapistPatientId = req.body.patientId || req.body.userId;
      if (!therapistPatientId) {
        return res.status(400).json({ success: false, error: { code: 'PATIENT_ID_REQUIRED', message: 'patientId is required for therapist submissions.' } });
      }
      const hasCare = await hasActiveCareRelationship(requesterId, therapistPatientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with patient.' } });
      }
      targetPatientId = therapistPatientId;
    }

    const {
      patientProgramId,
      bodyRegion,
      painScore,
      painLevel,
      painType,
      sensation,
      coordinates,
      triggers = [],
      relievers = [],
      notes,
      source = 'body_map',
      date,
      recordedAt
    } = req.body;

    const rawScore = painScore !== undefined ? painScore : painLevel;
    if (rawScore === undefined || rawScore === null || isNaN(Number(rawScore))) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'painScore is required and must be a number between 0 and 10.' }
      });
    }

    const scoreNum = Number(rawScore);
    if (scoreNum < 0 || scoreNum > 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'painScore must be between 0 and 10.' }
      });
    }

    if (!bodyRegion || typeof bodyRegion !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'bodyRegion is required.' }
      });
    }

    // Resolve active program association if not explicitly provided
    let activeProgramId = patientProgramId;
    if (!activeProgramId) {
      const activeProgram = await PatientProgram.findOne({
        patientId: targetPatientId.toString(),
        status: 'active',
        isDeleted: false
      }).select('_id');
      if (activeProgram) {
        activeProgramId = activeProgram._id;
      }
    }

    const assessmentDate = date ? new Date(date) : (recordedAt ? new Date(recordedAt) : new Date());

    const assessment = await PainAssessment.create({
      patientId: targetPatientId.toString(),
      patientProgramId: activeProgramId,
      bodyRegion: bodyRegion.toLowerCase().trim(),
      painScore: scoreNum,
      painLevel: scoreNum,
      painType: painType || sensation || 'dull',
      sensation: sensation || painType || 'dull',
      coordinates: coordinates || { x: 50, y: 50, side: 'front' },
      triggers: Array.isArray(triggers) ? triggers : [String(triggers)],
      relievers: Array.isArray(relievers) ? relievers : [String(relievers)],
      notes: notes || '',
      source,
      date: assessmentDate,
      recordedAt: assessmentDate
    });

    // High Pain Alert (pain >= 7)
    if (scoreNum >= 7) {
      try {
        await publishEvent('clinical.alert', {
          event: 'clinical.alert',
          type: 'HIGH_PAIN_ASSESSMENT',
          assessmentId: assessment._id.toString(),
          patientId: targetPatientId.toString(),
          patientProgramId: activeProgramId ? activeProgramId.toString() : null,
          painScore: scoreNum,
          bodyRegion: assessment.bodyRegion,
          recordedAt: assessmentDate.toISOString(),
          message: `High clinical pain score reported: ${scoreNum}/10 for region ${assessment.bodyRegion}.`
        });
      } catch (evtErr) {
        // standalone resiliency
      }
    }

    res.status(201).json({
      success: true,
      message: 'Pain assessment recorded successfully.',
      data: assessment
    });
  } catch (err) {
    console.error('[PainAssessment] create error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET PAIN ASSESSMENTS HISTORY ─────────────────────────────────────────────
export const getPainAssessments = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    let targetPatientId = req.query.patientId || req.params.patientId || requesterId;

    if (requesterRole === 'therapist') {
      const queryPatientId = req.query.patientId || req.params.patientId;
      if (queryPatientId) {
        const hasCare = await hasActiveCareRelationship(requesterId, queryPatientId);
        if (!hasCare) {
          return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with this patient.' } });
        }
        targetPatientId = queryPatientId;
      }
    } else if (requesterRole === 'patient') {
      targetPatientId = requesterId;
    }

    const { page = 1, limit = 20, bodyRegion, source, from, to, programId } = req.query;
    const filter = { patientId: targetPatientId.toString(), isDeleted: false };

    if (bodyRegion) filter.bodyRegion = bodyRegion.toLowerCase().trim();
    if (source) filter.source = source;
    if (programId) filter.patientProgramId = programId;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [assessments, total] = await Promise.all([
      PainAssessment.find(filter)
        .sort({ date: -1, recordedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PainAssessment.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit)) || 1;

    res.json({
      success: true,
      data: assessments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages
      }
    });
  } catch (err) {
    console.error('[PainAssessment] get list error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const getPatientPainHistory = getPainAssessments;
