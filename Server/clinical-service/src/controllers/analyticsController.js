import PatientProgram from '../models/PatientProgram.js';
import SessionLog from '../models/SessionLog.js';
import PainAssessment from '../models/PainAssessment.js';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';

// ─── CONSTANTS & HELPERS ───────────────────────────────────────────────────────
const REVENUE_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'DOCUMENTED', 'CHECKED_IN'];
const NON_ACTIVE_STATUSES = ['CANCELLED', 'REJECTED', 'RESCHEDULED', 'EXPIRED', 'PAYMENT_EXPIRED'];
const PAID_STATUSES = ['PAID', 'SETTLED'];
const ALLOWED_ADMIN_ROLES = ['clinic_admin', 'super_admin', 'admin'];
const ALLOWED_RECOVERY_ROLES = ['patient', 'therapist', 'clinic_admin', 'super_admin', 'admin'];

// Asia/Kolkata is UTC+5:30 (330 minutes)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getStartOfTodayIST() {
  const nowUtc = Date.now();
  const istTime = new Date(nowUtc + IST_OFFSET_MS);
  const istYear = istTime.getUTCFullYear();
  const istMonth = istTime.getUTCMonth();
  const istDate = istTime.getUTCDate();
  return new Date(Date.UTC(istYear, istMonth, istDate) - IST_OFFSET_MS);
}

function getISTDateString(date) {
  if (!date) return '';
  const d = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

export function isAuthorizedAdmin(req) {
  const userRole = req.user?.role || req.headers['x-user-role'];
  if (ALLOWED_ADMIN_ROLES.includes(userRole)) return true;
  
  // Accept internal key ONLY if configured and matching for service-to-service calls
  const internalKey = req.headers['x-internal-key'];
  if (internalKey && process.env.INTERNAL_API_KEY && internalKey === process.env.INTERNAL_API_KEY) {
    return true;
  }
  return false;
}

export function getCanonicalRevenueInr(appointment) {
  if (!appointment) return 0;
  if (typeof appointment.amount === 'number' && appointment.amount > 0) {
    return appointment.amount;
  }
  if (typeof appointment.paidAmount === 'number' && appointment.paidAmount > 0) {
    return appointment.paidAmount;
  }
  if (typeof appointment.amountPaise === 'number' && appointment.amountPaise > 0) {
    return Math.round(appointment.amountPaise / 100);
  }
  if (appointment.amount) {
    const num = Number(appointment.amount);
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
}

export function parsePagination(query) {
  const rawPage = Number.parseInt(query?.page, 10);
  const rawLimit = Number.parseInt(query?.limit, 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(100, rawLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ─── GET RECOVERY PROGRESS ANALYTICS (PROGRAM-SCOPED) ─────────────────────────
export const getRecoveryProgress = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'];
    const requesterRole = req.user?.role || req.headers['x-user-role'];
    let targetPatientId = req.params.patientId || req.query.patientId;

    if (!requesterRole || !ALLOWED_RECOVERY_ROLES.includes(requesterRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized role.' } });
    }

    if (targetPatientId === 'me' || (!targetPatientId && requesterRole === 'patient')) {
      targetPatientId = requesterId?.toString();
    }

    if (!targetPatientId) {
      return res.status(400).json({ success: false, error: { code: 'PATIENT_ID_REQUIRED', message: 'patientId is required.' } });
    }

    // 1. Authorization Invariants
    if (requesterRole === 'patient') {
      if (requesterId && requesterId.toString() !== targetPatientId.toString()) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own recovery analytics.' } });
      }
    } else if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, targetPatientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with this patient.' } });
      }
    }

    // 2. Resolve Program Scoping
    const { programId } = req.query;
    let patientProgramFilter = { patientId: targetPatientId.toString(), isDeleted: false };
    
    if (programId) {
      patientProgramFilter.$or = [{ _id: programId }, { programId: programId }];
    } else {
      patientProgramFilter.status = 'active';
    }

    let patientProgram = await PatientProgram.findOne(patientProgramFilter).populate('programId').lean();
    if (!patientProgram && !programId) {
      patientProgram = await PatientProgram.findOne({ patientId: targetPatientId.toString(), isDeleted: false })
        .sort({ updatedAt: -1 })
        .populate('programId')
        .lean();
    }

    // 3. Query Scoped Session Logs
    const sessionLogsFilter = { patientId: targetPatientId.toString(), isDeleted: false };
    if (patientProgram) {
      sessionLogsFilter.$or = [
        { patientProgramId: patientProgram._id },
        { programId: patientProgram.programId?._id || patientProgram.programId }
      ];
    }
    const sessionLogs = await SessionLog.find(sessionLogsFilter).sort({ completedAt: 1, date: 1, createdAt: 1 }).lean();

    // 4. Query Scoped Pain Assessments
    const painFilter = { patientId: targetPatientId.toString(), isDeleted: false };
    if (patientProgram) {
      painFilter.$or = [
        { patientProgramId: patientProgram._id },
        { patientProgramId: { $exists: false } },
        { patientProgramId: null }
      ];
    }
    const painAssessments = await PainAssessment.find(painFilter).sort({ date: 1, recordedAt: 1, createdAt: 1 }).lean();

    // 5. Calculate Metrics
    const completedSessions = sessionLogs.filter(s => s.status === 'completed');
    const targetWeeks = patientProgram?.targetWeeks || 4;
    const targetSessionsPerWeek = patientProgram?.targetSessionsPerWeek || 3;
    const expectedSessions = Math.max(1, targetWeeks * targetSessionsPerWeek);
    const completedCount = completedSessions.length;

    // Compliance: (completed / expected) * 100
    const rawCompliancePercent = (completedCount / expectedSessions) * 100;
    const compliancePercent = Math.min(100, Math.round(rawCompliancePercent * 100) / 100);

    // Pain Reduction: Baseline vs Latest
    let baselinePain = null;
    let latestPain = null;
    let painReductionPercent = 0;

    if (painAssessments.length > 0) {
      baselinePain = painAssessments[0].painScore !== undefined ? painAssessments[0].painScore : painAssessments[0].painLevel;
      latestPain = painAssessments[painAssessments.length - 1].painScore !== undefined
        ? painAssessments[painAssessments.length - 1].painScore
        : painAssessments[painAssessments.length - 1].painLevel;

      if (baselinePain !== null && latestPain !== null) {
        if (baselinePain > 0) {
          painReductionPercent = Math.max(0, Math.min(100, Math.round(((baselinePain - latestPain) / baselinePain) * 100)));
        } else if (baselinePain === 0 && latestPain === 0) {
          painReductionPercent = 100; // No pain to begin with, maintained 0
        }
      }
    }

    // Mobility Honesty
    const mobilityData = {
      mobility: null,
      mobilityAvailable: false
    };

    // Normalized Weights: Compliance (40/70 = 57.14%) + Pain (30/70 = 42.86%)
    const compositeRecoveryScore = Math.min(
      100,
      Math.max(
        0,
        Math.round((compliancePercent * (40 / 70)) + (painReductionPercent * (30 / 70)))
      )
    );

    // Timeline for Charts
    const timelineMap = new Map();

    painAssessments.forEach(p => {
      const dStr = getISTDateString(p.date || p.recordedAt || p.createdAt);
      const score = p.painScore !== undefined ? p.painScore : p.painLevel;
      timelineMap.set(dStr, { date: dStr, painScore: score });
    });

    sessionLogs.forEach(s => {
      const dStr = s.date || getISTDateString(s.completedAt || s.createdAt);
      const existing = timelineMap.get(dStr) || { date: dStr };
      timelineMap.set(dStr, {
        ...existing,
        sessionCompleted: s.status === 'completed',
        durationSeconds: s.durationSeconds || 0,
        painScore: existing.painScore !== undefined ? existing.painScore : (s.painLevel !== undefined ? s.painLevel : s.postSessionPain)
      });
    });

    const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Structured Analytics Response
    res.json({
      success: true,
      data: {
        patientId: targetPatientId,
        program: patientProgram ? {
          id: patientProgram._id,
          title: patientProgram.programId?.title || patientProgram.title || 'Personalized Recovery Program',
          currentWeek: patientProgram.currentWeek || 1,
          targetWeeks,
          status: patientProgram.status,
          startDate: patientProgram.startDate,
        } : null,
        compliance: {
          completedSessions: completedCount,
          expectedSessions,
          percent: compliancePercent
        },
        pain: {
          baseline: baselinePain,
          latest: latestPain,
          reductionPercent: painReductionPercent
        },
        mobility: mobilityData,
        compositeRecoveryScore,
        timeline,
        sessionMetrics: {
          totalCompletedSessions: completedCount,
          totalExpectedSessions: expectedSessions,
          complianceRate: Math.round(compliancePercent),
          sessions: sessionLogs
        },
        painMetrics: {
          initialPain: baselinePain,
          currentPain: latestPain,
          painReductionPercent,
          history: painAssessments
        }
      }
    });
  } catch (err) {
    console.error('[Analytics] getRecoveryProgress error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const getRecoveryProgressAnalytics = getRecoveryProgress;

// ─── ADMIN: SUMMARY KPIS (AUTHORITATIVE BACKEND CALCULATION) ────────────────
export const getAnalyticsSummary = async (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const startOfToday = getStartOfTodayIST();

    const [
      totalAppointments,
      appointmentsToday,
      confirmedAppointments,
      activeProgramsCount,
      completedSessionsCount,
      uniquePatients,
      uniqueTherapists,
    ] = await Promise.all([
      Appointment.countDocuments({ isDeleted: false, status: { $nin: NON_ACTIVE_STATUSES } }),
      Appointment.countDocuments({ isDeleted: false, startTime: { $gte: startOfToday }, status: { $nin: NON_ACTIVE_STATUSES } }),
      Appointment.find({
        isDeleted: false,
        status: { $in: REVENUE_STATUSES },
        paymentStatus: { $in: ['PAID', 'paid', 'SETTLED', 'settled'] }
      }, 'amount paidAmount').lean(),
      PatientProgram.countDocuments({ isDeleted: false, status: 'active' }),
      SessionLog.countDocuments({ isDeleted: false, status: 'completed' }),
      Appointment.distinct('patientId', { isDeleted: false }),
      Appointment.distinct('therapistId', { isDeleted: false }),
    ]);

    // Fetch authoritative enrolled patients and therapists count from Identity Service
    let enrolledPatientsCount = 0;
    let enrolledTherapistsCount = 0;
    const identityUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
    const internalKey = process.env.INTERNAL_API_KEY;

    if (internalKey) {
      try {
        const [patRes, therapistRes] = await Promise.all([
          fetch(`${identityUrl}/api/v1/patients`, {
            headers: {
              'x-internal-key': internalKey,
              'x-user-role': 'clinic_admin',
              'x-user-id': 'system',
            },
          }),
          fetch(`${identityUrl}/api/v1/therapists`, {
            headers: {
              'x-internal-key': internalKey,
              'x-user-role': 'clinic_admin',
              'x-user-id': 'system',
            },
          }),
        ]);

        const [patJson, therapistJson] = await Promise.all([patRes.json(), therapistRes.json()]);

        if (patJson.success && Array.isArray(patJson.data)) {
          enrolledPatientsCount = patJson.data.length;
        }
        if (therapistJson.success && Array.isArray(therapistJson.data)) {
          enrolledTherapistsCount = therapistJson.data.length;
        }
      } catch (e) {
        console.warn('[Analytics] Identity Service fetch fallback:', e.message);
      }
    }

    if (!enrolledPatientsCount) {
      enrolledPatientsCount = uniquePatients.filter(id => id && !String(id).startsWith('test_') && !String(id).startsWith('patient_seed_')).length || uniquePatients.length;
    }
    if (!enrolledTherapistsCount) {
      enrolledTherapistsCount = uniqueTherapists.filter(id => id && !String(id).startsWith('test_') && !String(id).startsWith('therapist_')).length || uniqueTherapists.length;
    }

    // Canonical INR revenue accumulation without heuristics
    let totalRevenue = 0;
    confirmedAppointments.forEach(a => {
      totalRevenue += getCanonicalRevenueInr(a);
    });

    // Authentic completion rate (0 when 0 appointments, NEVER default 85)
    const completionRate = totalAppointments > 0
      ? Math.min(100, Math.round((completedSessionsCount / totalAppointments) * 100))
      : 0;

    res.json({
      success: true,
      data: {
        totalPatients: enrolledPatientsCount,
        activeTherapists: enrolledTherapistsCount,
        totalAppointments,
        appointmentsToday,
        totalRevenue: Math.max(0, totalRevenue),
        activePrograms: activeProgramsCount,
        completedSessions: completedSessionsCount,
        completionRate,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: REVENUE & APPOINTMENTS CHART ──────────────────────────────────────
export const getRevenueChart = async (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { range = '7d' } = req.query;
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const nowUtc = Date.now();
    const startDate = new Date(nowUtc - days * 24 * 60 * 60 * 1000);

    const appointments = await Appointment.find({
      isDeleted: false,
      startTime: { $gte: startDate },
    }).sort({ startTime: 1 }).lean();

    // Bucket by IST date (YYYY-MM-DD)
    const dayMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const bucketTime = new Date(nowUtc - i * 24 * 60 * 60 * 1000);
      const dateStr = getISTDateString(bucketTime);
      const dayName = new Date(bucketTime.getTime() + IST_OFFSET_MS).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      dayMap[dateStr] = { date: dateStr, day: dayName, appointments: 0, revenue: 0 };
    }

    appointments.forEach(a => {
      if (!a.startTime) return;
      const dStr = getISTDateString(a.startTime);
      if (dayMap[dStr]) {
        if (!NON_ACTIVE_STATUSES.includes(a.status)) {
          dayMap[dStr].appointments += 1;
        }
        const isPaid = PAID_STATUSES.includes(String(a.paymentStatus || '').toUpperCase());
        if (REVENUE_STATUSES.includes(a.status) && isPaid) {
          dayMap[dStr].revenue += getCanonicalRevenueInr(a);
        }
      }
    });

    const series = Object.values(dayMap);
    res.json({ success: true, data: series });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: THERAPIST PERFORMANCE STATS (MONGO AGGREGATION) ───────────────────
export const getTherapistStats = async (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const stats = await Appointment.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: { $ifNull: ['$therapistId', 'unknown'] },
          therapistName: { $last: '$therapistName' },
          sessions: {
            $sum: {
              $cond: [{ $in: ['$status', NON_ACTIVE_STATUSES] }, 0, 1]
            }
          },
          revenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', REVENUE_STATUSES] },
                    { $in: [{ $toUpper: '$paymentStatus' }, PAID_STATUSES] }
                  ]
                },
                { $round: [{ $divide: [{ $ifNull: ['$amount', 0] }, 100] }, 0] },
                0
              ]
            }
          },
          patients: { $addToSet: '$patientId' }
        }
      },
      {
        $project: {
          _id: 0,
          therapistId: '$_id',
          name: { $ifNull: ['$therapistName', 'Specialist'] },
          sessions: '$sessions',
          revenue: '$revenue',
          rating: { $literal: null },
          patientsCount: {
            $size: {
              $filter: {
                input: '$patients',
                as: 'p',
                cond: { $and: [{ $ne: ['$$p', null] }, { $ne: ['$$p', ''] }] }
              }
            }
          }
        }
      }
    ]);

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: AUDIT LOGS QUERY (ESCAPED REGEX & BOUNDED PAGINATION) ─────────────
export const getAdminAuditLog = async (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const { patientId, category, actorId } = req.query;

    const filter = {};
    if (patientId) filter.resourceId = patientId;
    if (actorId) filter.actorId = actorId;
    if (category) {
      const escaped = String(category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.action = new RegExp(escaped, 'i');
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, meta: { page, limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
