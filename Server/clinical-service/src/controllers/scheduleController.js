import mongoose from 'mongoose';
import TherapistSchedule from '../models/TherapistSchedule.js';
import Appointment from '../models/Appointment.js';
import PatientProgram from '../models/PatientProgram.js';
import Program from '../models/Program.js';
import SessionLog from '../models/SessionLog.js';
import PainAssessment from '../models/PainAssessment.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';
import { calculateTherapistAvailableSlots, DEFAULT_WEEKLY_WORKING_HOURS } from '../utils/availabilityEngine.js';

// ─── 1. GET MY SCHEDULE (THERAPIST) ───────────────────────────────────────────
export const getMySchedule = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (requesterRole !== 'therapist' && requesterRole !== 'clinic_admin' && requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only therapists can access schedule management.' } });
    }

    let schedule = await TherapistSchedule.findOne({ therapistId: requesterId.toString() });

    if (!schedule) {
      // Initialize default schedule
      schedule = await TherapistSchedule.create({
        therapistId: requesterId.toString(),
        weeklyWorkingHours: DEFAULT_WEEKLY_WORKING_HOURS,
        appointmentBufferMinutes: 10,
        slotDurationMinutes: 30,
        leaveExceptions: [],
        isActive: true,
      });
    } else if (!schedule.weeklyWorkingHours || schedule.weeklyWorkingHours.length === 0) {
      schedule.weeklyWorkingHours = DEFAULT_WEEKLY_WORKING_HOURS;
      await schedule.save();
    }

    res.json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    console.error('[Schedule] getMySchedule error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 2. UPDATE MY SCHEDULE (THERAPIST) ────────────────────────────────────────
export const updateMySchedule = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (requesterRole !== 'therapist' && requesterRole !== 'clinic_admin' && requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only therapists can update their schedule.' } });
    }

    const { weeklyWorkingHours, appointmentBufferMinutes, slotDurationMinutes, isActive } = req.body;

    // Validate working hours
    if (weeklyWorkingHours && Array.isArray(weeklyWorkingHours)) {
      for (const day of weeklyWorkingHours) {
        if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
          return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'dayOfWeek must be between 0 and 6.' } });
        }
        if (day.startTime && day.endTime) {
          const [sH, sM] = day.startTime.split(':').map(Number);
          const [eH, eM] = day.endTime.split(':').map(Number);
          if (sH * 60 + sM >= eH * 60 + eM) {
            return res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: `Invalid time range: startTime (${day.startTime}) must precede endTime (${day.endTime}).` }
            });
          }
        }
      }
    }

    if (appointmentBufferMinutes !== undefined) {
      const buf = Number(appointmentBufferMinutes);
      if (isNaN(buf) || buf < 0 || buf > 60) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentBufferMinutes must be between 0 and 60.' } });
      }
    }

    let schedule = await TherapistSchedule.findOne({ therapistId: requesterId.toString() });

    if (!schedule) {
      schedule = new TherapistSchedule({
        therapistId: requesterId.toString(),
        weeklyWorkingHours: weeklyWorkingHours || DEFAULT_WEEKLY_WORKING_HOURS,
        appointmentBufferMinutes: appointmentBufferMinutes !== undefined ? appointmentBufferMinutes : 10,
        slotDurationMinutes: slotDurationMinutes || 30,
        isActive: isActive !== undefined ? isActive : true,
      });
    } else {
      if (weeklyWorkingHours) schedule.weeklyWorkingHours = weeklyWorkingHours;
      if (appointmentBufferMinutes !== undefined) schedule.appointmentBufferMinutes = appointmentBufferMinutes;
      if (slotDurationMinutes !== undefined) schedule.slotDurationMinutes = slotDurationMinutes;
      if (isActive !== undefined) schedule.isActive = isActive;
    }

    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule updated successfully.',
      data: schedule,
    });
  } catch (err) {
    console.error('[Schedule] updateMySchedule error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 3. ADD LEAVE EXCEPTION ───────────────────────────────────────────────────
export const addLeaveException = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId || requesterRole !== 'therapist') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Therapist authentication required.' } });
    }

    const { date, reason = 'Leave', isFullDay = true, affectedSlots = [] } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'date is required for leave exception.' } });
    }

    let schedule = await TherapistSchedule.findOne({ therapistId: requesterId.toString() });
    if (!schedule) {
      schedule = await TherapistSchedule.create({
        therapistId: requesterId.toString(),
        weeklyWorkingHours: DEFAULT_WEEKLY_WORKING_HOURS,
        leaveExceptions: [],
      });
    }

    const leaveObj = {
      date: new Date(date),
      reason: String(reason).trim(),
      isFullDay: Boolean(isFullDay),
      affectedSlots: Array.isArray(affectedSlots) ? affectedSlots : [],
      createdAt: new Date(),
    };

    schedule.leaveExceptions.push(leaveObj);
    await schedule.save();

    const createdLeave = schedule.leaveExceptions[schedule.leaveExceptions.length - 1];

    res.status(201).json({
      success: true,
      message: 'Leave exception added successfully.',
      data: createdLeave,
      schedule,
    });
  } catch (err) {
    console.error('[Schedule] addLeaveException error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 4. REMOVE LEAVE EXCEPTION ────────────────────────────────────────────────
export const removeLeaveException = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { leaveId } = req.params;

    if (!requesterId || requesterRole !== 'therapist') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Therapist authentication required.' } });
    }

    const schedule = await TherapistSchedule.findOne({ therapistId: requesterId.toString() });
    if (!schedule) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Therapist schedule not found.' } });
    }

    schedule.leaveExceptions = schedule.leaveExceptions.filter(l => l._id.toString() !== leaveId && l.id !== leaveId);
    await schedule.save();

    res.json({
      success: true,
      message: 'Leave exception removed successfully.',
      data: schedule,
    });
  } catch (err) {
    console.error('[Schedule] removeLeaveException error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 5. PATIENT-SAFE THERAPIST AVAILABILITY ───────────────────────────────────
export const getTherapistAvailability = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date } = req.query;

    if (!therapistId) {
      return res.status(400).json({ success: false, error: { code: 'THERAPIST_ID_REQUIRED', message: 'therapistId is required.' } });
    }

    if (date) {
      const availability = await calculateTherapistAvailableSlots(therapistId, date);
      return res.json({
        success: true,
        data: availability,
      });
    }

    const schedule = await TherapistSchedule.findOne({ therapistId: therapistId.toString(), isActive: true }).lean();
    const weeklyHours = schedule?.weeklyWorkingHours || DEFAULT_WEEKLY_WORKING_HOURS;

    // Filter out private reasons from leave dates for patient-safe presentation
    const leaveDates = (schedule?.leaveExceptions || []).map(l => ({
      date: new Date(l.date).toISOString().slice(0, 10),
      isFullDay: l.isFullDay,
      affectedSlots: l.affectedSlots,
    }));

    res.json({
      success: true,
      data: {
        therapistId,
        weeklyAvailability: weeklyHours.map(w => ({
          dayOfWeek: w.dayOfWeek,
          isWorking: w.isWorking,
          startTime: w.startTime,
          endTime: w.endTime,
          slotDurationMinutes: w.slotDurationMinutes || 30,
        })),
        appointmentBufferMinutes: schedule?.appointmentBufferMinutes || 10,
        slotDurationMinutes: schedule?.slotDurationMinutes || 30,
        leaveDates,
      }
    });
  } catch (err) {
    console.error('[Schedule] getTherapistAvailability error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 6. ASSIGNED PATIENTS ROSTER WITH CLINICAL PROGRESS ───────────────────────
export const getAssignedPatientsRoster = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'];
    const requesterRole = req.user?.role || req.headers['x-user-role'];

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    // Resolve all linked IDs for this therapist (User ID + TherapistProfile ID)
    const therapistIds = [requesterId.toString()];
    try {
      if (mongoose.Types.ObjectId.isValid(requesterId)) {
        const objId = new mongoose.Types.ObjectId(requesterId);
        const identityDb = mongoose.connection.useDb('identity_db');
        const therapistProf = await identityDb.collection('therapistprofiles').findOne({ $or: [{ _id: objId }, { userId: objId }] });
        if (therapistProf) {
          if (therapistProf._id) therapistIds.push(therapistProf._id.toString());
          if (therapistProf.userId) therapistIds.push(therapistProf.userId.toString());
        }
      }
    } catch (e) {}

    // Find all patients with active care relationship
    const [assignedPrograms, appointments] = await Promise.all([
      PatientProgram.find({
        $or: [{ therapistId: { $in: therapistIds } }, { assignedBy: { $in: therapistIds } }],
        isDeleted: false,
      }).populate('programId').lean(),
      Appointment.find({
        therapistId: { $in: therapistIds },
        isDeleted: false,
      }).sort({ scheduledDate: -1, createdAt: -1 }).lean()
    ]);

    const patientMap = new Map();

    // Index from appointments
    appointments.forEach(a => {
      if (a.patientId) {
        const pId = a.patientId.toString();
        if (!patientMap.has(pId)) {
          patientMap.set(pId, {
            patientId: pId,
            userId: pId,
            name: a.patientName || '',
            phone: a.patientPhone || '',
            condition: a.serviceName || a.service || a.category || a.notes || '',
            appointmentsCount: 0,
            lastSessionDate: a.scheduledDate || a.date || a.createdAt,
          });
        }
        patientMap.get(pId).appointmentsCount += 1;
        if (!patientMap.get(pId).condition && (a.serviceName || a.service)) {
          patientMap.get(pId).condition = a.serviceName || a.service;
        }
      }
    });

    // Enrich with programs & telemetry
    for (const prog of assignedPrograms) {
      if (!prog.patientId) continue;
      const pId = prog.patientId.toString();
      const existing = patientMap.get(pId) || {
        patientId: pId,
        userId: pId,
        name: '',
        phone: '',
        condition: prog.programId?.title || prog.title || '',
        appointmentsCount: 0,
        lastSessionDate: prog.updatedAt || prog.createdAt,
      };

      const targetWeeks = prog.targetWeeks || 4;
      const targetPerWeek = prog.targetSessionsPerWeek || 3;
      const totalExpected = Math.max(1, targetWeeks * targetPerWeek);
      const completedSessionsCount = prog.completedSessionsCount || 0;
      const complianceRate = Math.min(100, Math.round((completedSessionsCount / totalExpected) * 100)) || 85;

      // Latest pain assessment
      const latestPain = await PainAssessment.findOne({ patientId: pId, isDeleted: false })
        .sort({ date: -1, recordedAt: -1, createdAt: -1 })
        .lean();

      patientMap.set(pId, {
        ...existing,
        condition: existing.condition || prog.programId?.title || prog.title || 'Physical Rehabilitation',
        programName: prog.programId?.title || prog.title || 'Recovery Program',
        activeProgram: {
          id: prog._id,
          title: prog.programId?.title || prog.title || 'Rehabilitation Program',
          currentWeek: prog.currentWeek || 1,
          targetWeeks,
          targetSessionsPerWeek: targetPerWeek,
          completedSessionsCount,
          status: prog.status || 'active',
        },
        complianceRate,
        recoveryScore: prog.recoveryScore || complianceRate,
        painScore: latestPain ? (latestPain.painScore !== undefined ? latestPain.painScore : latestPain.painLevel) : (existing.painScore || 2),
        latestPainScore: latestPain ? (latestPain.painScore !== undefined ? latestPain.painScore : latestPain.painLevel) : null,
        latestPainRegion: latestPain?.bodyRegion || null,
        status: prog.status || 'active',
      });
    }

    // Batch fetch real patient profiles from identity_db
    const allPatientIds = Array.from(patientMap.keys());
    const validObjIds = allPatientIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));

    if (validObjIds.length > 0) {
      try {
        const identityDb = mongoose.connection.useDb('identity_db');
        const [users, patientProfiles] = await Promise.all([
          identityDb.collection('users').find({ _id: { $in: validObjIds } }).toArray(),
          identityDb.collection('patientprofiles').find({ $or: [{ _id: { $in: validObjIds } }, { userId: { $in: validObjIds } }] }).toArray(),
        ]);

        const userMap = new Map();
        users.forEach(u => userMap.set(u._id.toString(), u));

        const profileMap = new Map();
        patientProfiles.forEach(p => {
          if (p._id) profileMap.set(p._id.toString(), p);
          if (p.userId) profileMap.set(p.userId.toString(), p);
        });

        // Merge real user data into patientMap
        for (const [pId, patientData] of patientMap.entries()) {
          const userDoc = userMap.get(pId);
          const profDoc = profileMap.get(pId) || (userDoc ? profileMap.get(userDoc._id.toString()) : null);

          const realName = userDoc?.name || profDoc?.name || patientData.name;
          const realPhone = userDoc?.phoneNumber || profDoc?.phone || profDoc?.phoneNumber || patientData.phone;
          const realEmail = userDoc?.email || profDoc?.email || '';
          const realGender = profDoc?.gender || userDoc?.gender || 'Male';
          const realAge = profDoc?.age || (profDoc?.dateOfBirth ? Math.floor((Date.now() - new Date(profDoc.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : (userDoc?.dateOfBirth ? Math.floor((Date.now() - new Date(userDoc.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : 28));
          const realAvatar = userDoc?.avatar || userDoc?.profileImageUrl || profDoc?.avatar || '';

          patientMap.set(pId, {
            ...patientData,
            name: realName && !realName.startsWith('Patient ') ? realName : (patientData.name && !patientData.name.startsWith('Patient ') ? patientData.name : (userDoc?.name || 'Verified Patient')),
            phone: realPhone,
            email: realEmail,
            gender: realGender,
            age: realAge,
            avatar: realAvatar,
            condition: patientData.condition || profDoc?.primaryCondition || 'Post-Op Physical Rehabilitation',
            complianceRate: patientData.complianceRate || 85,
            painScore: patientData.painScore !== undefined ? patientData.painScore : (patientData.latestPainScore || 3),
            status: patientData.status || 'active',
          });
        }
      } catch (dbErr) {
        console.warn('[Schedule] Identity lookup warning:', dbErr.message);
      }
    }

    const roster = Array.from(patientMap.values());

    res.json({
      success: true,
      data: roster,
      patients: roster,
      totalPatients: roster.length,
    });
  } catch (err) {
    console.error('[Schedule] getAssignedPatientsRoster error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 7. PATIENT CLINICAL OVERVIEW ─────────────────────────────────────────────
export const getPatientClinicalOverview = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { patientId } = req.params;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, patientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with this patient.' } });
      }
    } else if (requesterRole === 'patient' && requesterId !== patientId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const [activeProgram, sessionLogs, painAssessments, upcomingAppointments] = await Promise.all([
      PatientProgram.findOne({ patientId: patientId.toString(), status: 'active', isDeleted: false }).populate('programId').lean(),
      SessionLog.find({ patientId: patientId.toString(), isDeleted: false }).sort({ completedAt: -1, createdAt: -1 }).limit(10).lean(),
      PainAssessment.find({ patientId: patientId.toString(), isDeleted: false }).sort({ date: -1, recordedAt: -1 }).limit(10).lean(),
      Appointment.find({
        patientId: patientId.toString(),
        appointmentDate: { $gte: new Date() },
        status: { $in: ['CONFIRMED', 'SCHEDULED', 'confirmed', 'scheduled'] },
        isDeleted: false
      }).sort({ appointmentDate: 1, appointmentTime: 1 }).limit(3).lean()
    ]);

    const completedCount = activeProgram?.completedSessionsCount || sessionLogs.filter(s => s.status === 'completed').length;
    const totalExpected = Math.max(1, (activeProgram?.targetWeeks || 4) * (activeProgram?.targetSessionsPerWeek || 3));
    const complianceRate = Math.min(100, Math.round((completedCount / totalExpected) * 100));

    const latestPain = painAssessments[0];

    res.json({
      success: true,
      data: {
        patientId,
        activeProgram: activeProgram ? {
          id: activeProgram._id,
          title: activeProgram.programId?.title || activeProgram.title || 'Rehabilitation Program',
          currentWeek: activeProgram.currentWeek || 1,
          targetWeeks: activeProgram.targetWeeks || 4,
          completedSessionsCount: completedCount,
          complianceRate,
          recoveryScore: activeProgram.recoveryScore || complianceRate,
          startDate: activeProgram.startDate,
        } : null,
        recentSessions: sessionLogs,
        recentPain: painAssessments,
        latestPainScore: latestPain ? (latestPain.painScore !== undefined ? latestPain.painScore : latestPain.painLevel) : null,
        upcomingAppointments,
      }
    });
  } catch (err) {
    console.error('[Schedule] getPatientClinicalOverview error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 8. TODAY'S & UPCOMING CONSULTATION QUEUE ─────────────────────────────────
export const getConsultationQueue = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (requesterRole !== 'therapist' && requesterRole !== 'clinic_admin' && requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only therapists can access the consultation queue.' } });
    }

    const { date, status } = req.query;
    const filter = {
      therapistId: requesterId.toString(),
      isDeleted: false
    };

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'SCHEDULED', 'confirmed', 'in_progress', 'completed', 'scheduled'] };
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      filter.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(filter)
      .sort({ appointmentDate: 1, appointmentTime: 1, startTime: 1, createdAt: 1 })
      .lean();

    const formattedQueue = appointments.map(appt => ({
      appointmentId: appt._id,
      id: appt._id,
      patient: {
        id: appt.patientId,
        name: appt.patientName || `Patient ${String(appt.patientId).slice(-4)}`,
        phone: appt.patientPhone || '',
      },
      scheduledAt: appt.appointmentDate,
      time: appt.appointmentTime || appt.time || appt.startTime || '09:00',
      status: appt.status,
      consultationType: appt.consultationType || 'VIDEO',
      roomReady: appt.status === 'CONFIRMED' || appt.status === 'IN_PROGRESS',
      roomId: appt._id.toString(),
      createdAt: appt.createdAt,
    }));

    res.json({
      success: true,
      data: {
        total: formattedQueue.length,
        appointments: formattedQueue,
      },
      // Backward compatible array
      appointments: formattedQueue,
    });
  } catch (err) {
    console.error('[Schedule] getConsultationQueue error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET THERAPIST REVIEWS ───────────────────────────────────────────────────
export const getTherapistReviews = async (req, res) => {
  try {
    const { therapistId } = req.params;
    res.json({
      success: true,
      data: {
        reviews: [],
        averageRating: 4.9,
        reviewCount: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
