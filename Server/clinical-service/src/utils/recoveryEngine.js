import SessionLog from '../models/SessionLog.js';
import PatientProgram from '../models/PatientProgram.js';
import Program from '../models/Program.js';

/**
 * Recovery Score Formula (0–100):
 *   adherence      × 0.5  (% of scheduled sessions completed on time)
 *   painTrend      × 0.3  (improvement in pain: 100 = pain dropped to 0, 0 = pain unchanged or worse)
 *   milestones     × 0.2  (% milestones achieved)
 */
import mongoose from 'mongoose';

export const recalculateRecoveryScore = async (patientProgramId) => {
  if (!patientProgramId || !mongoose.Types.ObjectId.isValid(patientProgramId)) return null;
  const patientProgram = await PatientProgram.findById(patientProgramId).populate('programId');
  if (!patientProgram || !patientProgram.programId) return null;

  const program = patientProgram.programId;
  const startDate = new Date(patientProgram.startDate);
  const today = new Date();

  // ── 1. Adherence Score ───────────────────────────────────────────────────────
  // Expected sessions = number of distinct (weekNumber, dayOfWeek) pairs elapsed so far
  const daysElapsed = Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
  const weeksElapsed = Math.ceil(daysElapsed / 7);

  const expectedSessions = program.exercises.filter(ex => {
    const weekDiff = ex.weekNumber - 1;
    return weekDiff < weeksElapsed;
  }).length || 1;

  const actualSessions = await SessionLog.countDocuments({ patientProgramId, completedOffline: false });
  const adherencePercent = Math.min(100, Math.round((actualSessions / expectedSessions) * 100));

  // ── 2. Pain Trend Score ──────────────────────────────────────────────────────
  // Compare average pain of first 2 sessions vs last 2 sessions
  const allLogs = await SessionLog.find({ patientProgramId }).sort({ createdAt: 1 }).lean();
  let painTrendScore = 50; // neutral if not enough data
  if (allLogs.length >= 4) {
    const first2Avg = (allLogs[0].painLevel + allLogs[1].painLevel) / 2;
    const last2 = allLogs.slice(-2);
    const last2Avg = (last2[0].painLevel + last2[1].painLevel) / 2;
    const improvement = first2Avg - last2Avg; // positive = getting better
    painTrendScore = Math.min(100, Math.max(0, 50 + improvement * 10));
  }

  // ── 3. Milestone Score ───────────────────────────────────────────────────────
  const totalMilestones = patientProgram.milestones.length;
  const achievedMilestones = patientProgram.milestones.filter(m => m.achieved).length;
  const milestoneScore = totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 100;

  // ── Final Score ───────────────────────────────────────────────────────────────
  const recoveryScore = Math.round(
    adherencePercent * 0.5 +
    painTrendScore   * 0.3 +
    milestoneScore   * 0.2
  );

  await PatientProgram.findByIdAndUpdate(patientProgramId, {
    recoveryScore,
    adherencePercent,
    painTrendScore: Math.round(painTrendScore),
    milestoneScore,
  });

  return { recoveryScore, adherencePercent, painTrendScore: Math.round(painTrendScore), milestoneScore };
};

/**
 * Check if pain level crosses the alert threshold for consecutive sessions.
 * Returns true if an alert should be fired.
 */
export const checkPainAlert = async (patientProgramId) => {
  const threshold = parseInt(process.env.PAIN_ALERT_THRESHOLD) || 7;
  const consecutiveRequired = parseInt(process.env.PAIN_ALERT_CONSECUTIVE_SESSIONS) || 2;

  const recentLogs = await SessionLog.find({ patientProgramId })
    .sort({ createdAt: -1 })
    .limit(consecutiveRequired)
    .lean();

  if (recentLogs.length < consecutiveRequired) return false;
  return recentLogs.every(log => log.painLevel >= threshold);
};
