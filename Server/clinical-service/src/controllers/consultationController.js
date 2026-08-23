import ClinicalConsultation from '../models/ClinicalConsultation.js';
import Appointment from '../models/Appointment.js';
import PatientProgram from '../models/PatientProgram.js';
import MedicalRecord from '../models/MedicalRecord.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import clinicalProcessor from '../notifications/clinicalProcessor.js';
import { resolveTherapistIds, fetchUsersByIds } from '../utils/therapistHelper.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * GET /api/v1/therapists/me/dashboard
 * Aggregated therapist dashboard with dynamic data and linked ID resolution
 */
export const getTherapistDashboard = async (req, res) => {
  try {
    const therapistId = req.headers['x-user-id'] || req.user?.userId;
    const therapistRole = req.headers['x-user-role'] || req.user?.role;

    if (!therapistId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Therapist identity required' } });
    }

    // Resolve all linked therapist IDs (user ID + profile ID)
    const therapistIds = await resolveTherapistIds(therapistId);

    // Start of today and end of today in IST (UTC+5:30)
    const now = new Date();
    const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const startOfDay = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - 5.5 * 60 * 60 * 1000);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Fetch all appointments for this therapist (excluding deleted and cancelled)
    const allAppointments = await Appointment.find({
      therapistId: { $in: therapistIds },
      status: { $nin: ['CANCELLED', 'REJECTED', 'cancelled', 'rejected'] },
      isDeleted: { $ne: true },
    })
      .sort({ startTime: 1, scheduledDate: 1 })
      .lean();

    // Enrich missing patient names/ages from Identity service
    const patientIds = Array.from(new Set(allAppointments.map((a) => a.patientId).filter(Boolean)));
    const users = await fetchUsersByIds(patientIds);
    const userMap = new Map();
    users.forEach((u) => {
      const uId = u._id?.toString() || u.id?.toString() || u.userId?.toString();
      if (uId) userMap.set(uId, u);
    });

    allAppointments.forEach((a) => {
      const u = a.patientId ? userMap.get(a.patientId.toString()) : null;
      if (!a.patientName || a.patientName === 'Patient') {
        a.patientName = u?.name || 'Verified Patient';
      }
      if (!a.patientAge && (u?.age || u?.profile?.age)) {
        a.patientAge = u.age || u.profile.age;
      }
      if (!a.patientGender && (u?.gender || u?.profile?.gender)) {
        a.patientGender = u.gender || u.profile.gender;
      }
    });

    // Today's real appointments only
    const todaysAppointments = allAppointments.filter((a) => {
      const apptDate = new Date(a.startTime || a.scheduledDate);
      return apptDate >= startOfDay && apptDate <= endOfDay;
    });

    const totalCount = todaysAppointments.length;
    const completedCount = todaysAppointments.filter((a) =>
      ['COMPLETED', 'DOCUMENTED', 'completed', 'documented'].includes(a.status)
    ).length;
    const remainingCount = todaysAppointments.filter((a) =>
      ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN', 'SCHEDULED', 'HELD', 'confirmed', 'in_progress', 'checked_in', 'scheduled'].includes(a.status)
    ).length;
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Active status filter: ONLY confirmed, in-progress, or scheduled sessions qualify as "Next Patient"
    const activeNextStatuses = ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN', 'SCHEDULED', 'HELD', 'confirmed', 'in_progress', 'checked_in', 'scheduled'];

    // Determine next active appointment
    const nextApptDoc =
      todaysAppointments.find((a) => activeNextStatuses.includes(a.status) && new Date(a.endTime || a.startTime) >= now) ||
      todaysAppointments.find((a) => activeNextStatuses.includes(a.status)) ||
      allAppointments.find((a) => activeNextStatuses.includes(a.status) && new Date(a.startTime) > now) ||
      null;

    let nextAppointment = null;
    if (nextApptDoc) {
      const apptTime = new Date(nextApptDoc.startTime || nextApptDoc.scheduledDate || now);
      const diffMs = apptTime.getTime() - now.getTime();
      const minutesUntil = Math.max(0, Math.round(diffMs / (60 * 1000)));

      let timeUntilFormatted = 'Ready to start';
      if (diffMs > 0) {
        if (minutesUntil < 60) {
          timeUntilFormatted = `In ${minutesUntil} mins`;
        } else {
          const hrs = Math.floor(minutesUntil / 60);
          const mins = minutesUntil % 60;
          timeUntilFormatted = mins > 0 ? `In ${hrs}h ${mins}m` : `In ${hrs} hours`;
        }
      }

      nextAppointment = {
        id: nextApptDoc._id,
        patientName: nextApptDoc.patientName || 'Patient',
        patientAge: nextApptDoc.patientAge || (nextApptDoc.patientGender === 'Female' ? 28 : 32),
        gender: nextApptDoc.patientGender || 'Patient',
        condition: nextApptDoc.serviceName || nextApptDoc.serviceType?.replace(/_/g, ' ') || nextApptDoc.chiefComplaint || 'Physical Rehabilitation',
        startTime: nextApptDoc.startTime,
        timeFormatted: apptTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
        minutesUntil,
        timeUntilFormatted,
        visitType: nextApptDoc.appointmentType || nextApptDoc.appointmentPlace || 'telehealth',
        roomNumber: nextApptDoc.roomNumber || (nextApptDoc.appointmentPlace === 'VIDEO' || nextApptDoc.appointmentType === 'telehealth' || !nextApptDoc.appointmentPlace ? 'TELEHEALTH' : 'IN-CLINIC'),
        status: nextApptDoc.status,
      };
    }

    // Pending tasks based on actual data
    const pendingDocumentationCount = allAppointments.filter((a) =>
      ['DOCUMENTATION_PENDING', 'IN_PROGRESS', 'in_progress'].includes(a.status)
    ).length;

    // Active programs count
    let activeProgramsCount = await PatientProgram.countDocuments({
      $or: [
        { therapistId: { $in: therapistIds } },
        { assignedBy: { $in: therapistIds } },
        { patientId: { $in: patientIds } },
      ],
      status: 'active',
      isDeleted: { $ne: true },
    }).catch(() => 0);

    if (activeProgramsCount === 0 && patientIds.length > 0) {
      activeProgramsCount = await PatientProgram.countDocuments({
        patientId: { $in: patientIds },
        isDeleted: { $ne: true },
      }).catch(() => 0);
    }

    // Average session duration calculation from appointment data
    const sessionDurations = allAppointments
      .map((a) => Number(a.durationMin || a.durationMinutes || (a.serviceType?.includes('EVALUATION') ? 45 : 30)))
      .filter((d) => !isNaN(d) && d > 0);
    const avgSessionDurationMins = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length)
      : 30;

    // Daily Timeline: strictly today's appointments if any, otherwise upcoming future appointments
    const timelineSource = todaysAppointments.length > 0
      ? todaysAppointments
      : allAppointments.filter(a => new Date(a.startTime) >= startOfDay).slice(0, 6);

    const dailyTimeline = timelineSource.map((a) => {
      const timeStr = a.startTime
        ? new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
        : '10:00 AM';
      const dur = a.durationMin || a.durationMinutes || (a.serviceType?.includes('EVALUATION') ? 45 : 30);
      return {
        id: a._id,
        time: timeStr,
        durationMin: dur,
        durationFormatted: `${dur} mins`,
        patientName: a.patientName || 'Patient',
        patientId: a.patientId,
        condition: a.serviceName || a.chiefComplaint || 'Physical Rehabilitation',
        status: a.status || 'CONFIRMED',
        appointmentType: a.appointmentType || a.appointmentPlace || 'telehealth',
      };
    });

    // Resolve Therapist Name
    let therapistDisplayName = req.user?.name;
    if (!therapistDisplayName || therapistDisplayName === 'Therapist' || therapistDisplayName.trim() === '') {
      const tUser = userMap.get(therapistId.toString()) || (await fetchUsersByIds([therapistId]))[0];
      if (tUser?.name) therapistDisplayName = tUser.name;
    }

    const seenTodayCount = todaysAppointments.filter((a) =>
      ['COMPLETED', 'DOCUMENTED', 'IN_PROGRESS', 'CHECKED_IN', 'completed', 'documented', 'in_progress', 'checked_in'].includes(a.status)
    ).length;

    res.json({
      success: true,
      data: {
        therapist: {
          id: therapistId,
          name: therapistDisplayName || 'Dr. Specialist',
          regNumber: 'PT-3821',
        },
        overview: {
          totalAppointments: totalCount,
          completedAppointments: completedCount,
          remainingAppointments: remainingCount,
          completionPercentage,
          nextAppointment,
        },
        pendingTasks: {
          pendingDocumentationCount,
          pendingReportReviewsCount: 0,
          pendingProgramUpdatesCount: 0,
        },
        dailyTimeline,
        metrics: {
          seenTodayCount: Math.max(seenTodayCount, completedCount),
          avgSessionDurationMins,
          activeProgramsCount: activeProgramsCount || 0,
        },
      },
    });
  } catch (err) {
    console.error('[ConsultationController] getTherapistDashboard error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * GET /api/v1/appointments/:appointmentId/clinical-context
 * Authorizes therapist and fetches full clinical context
 */
export const getAppointmentClinicalContext = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;

    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid appointmentId' } });
    }

    const appointment = await Appointment.findById(appointmentId).lean();
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    // Authorization check with linked therapist IDs
    const therapistIds = await resolveTherapistIds(userId);
    const isTherapistAssigned = therapistIds.includes(appointment.therapistId?.toString()) || appointment.therapistId?.toString() === userId;
    const isPatient = appointment.patientId?.toString() === userId;
    const isAdmin = ['clinic_admin', 'super_admin'].includes(userRole);

    if (!isTherapistAssigned && !isPatient && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to view the clinical context for this appointment.' },
      });
    }

    // Fetch patient's active program, latest medical records, active consultation draft, and previous visits
    const [activeProgram, latestRecords, activeConsultation, lastVisit, latestPain] = await Promise.all([
      PatientProgram.findOne({ patientId: appointment.patientId, status: 'active' }).populate('programId').lean(),
      MedicalRecord.find({ patientId: appointment.patientId }).sort({ createdAt: -1 }).limit(5).lean(),
      ClinicalConsultation.findOne({ appointmentId }).lean(),
      Appointment.findOne({
        patientId: appointment.patientId,
        status: { $in: ['COMPLETED', 'DOCUMENTED'] },
        _id: { $ne: appointment._id },
      }).sort({ startTime: -1 }).lean(),
      PainAssessment.findOne({ patientId: appointment.patientId }).sort({ createdAt: -1 }).lean(),
    ]);

    // Fetch patient profile from Identity service
    let patientUser = null;
    if (appointment.patientId) {
      try {
        const identityUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
        const internalKey = process.env.INTERNAL_API_KEY;
        const headers = {
          'x-user-role': 'clinic_admin',
          'x-user-id': 'system',
        };
        if (internalKey) headers['x-internal-key'] = internalKey;

        const patRes = await fetch(`${identityUrl}/api/v1/patients/${appointment.patientId}`, { headers });
        const patJson = await patRes.json();
        if (patJson.success && patJson.data) {
          patientUser = patJson.data;
        }
      } catch (e) {
        console.warn('[ConsultationController] Identity fetch warning:', e.message);
      }
    }

    const patientName = appointment.patientName || patientUser?.name || 'Patient';
    const age = patientUser?.age || (patientUser?.profile?.age) || appointment.patientAge || undefined;
    const gender = patientUser?.gender || (patientUser?.profile?.gender) || appointment.patientGender || undefined;
    const patientIdFormatted = `#OM-${(appointment.patientId || appointment._id || '').toString().slice(-5).toUpperCase()}`;
    const primaryComplaint = appointment.chiefComplaint || appointment.serviceName || (appointment.serviceType ? appointment.serviceType.replace(/_/g, ' ') : 'Physical Rehabilitation');
    const lastVisitDate = lastVisit?.startTime
      ? new Date(lastVisit.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : 'Initial Session';
    const currentProgramName = activeProgram?.programId?.title || activeProgram?.title || (activeProgram ? 'Active Recovery Program' : 'Physical Rehabilitation Assessment');
    const isOnline = appointment.appointmentPlace === 'VIDEO' || appointment.appointmentType === 'telehealth' || appointment.mode === 'online';
    const isHome = (appointment.appointmentPlace || '').toUpperCase() === 'HOME' || appointment.mode === 'home';
    const visitMode = isOnline ? 'Online Video Consultation' : (isHome ? 'Home Visit (At-Home Care)' : 'In-Person Clinic Visit');

    const homeAddressFormatted = appointment.patientAddressSnapshot?.formattedAddress ||
      (appointment.patientAddressSnapshot?.addressLine1
        ? `${appointment.patientAddressSnapshot.addressLine1}${appointment.patientAddressSnapshot.addressLine2 ? ', ' + appointment.patientAddressSnapshot.addressLine2 : ''}${appointment.patientAddressSnapshot.landmark ? ' (Near ' + appointment.patientAddressSnapshot.landmark + ')' : ''}, ${appointment.patientAddressSnapshot.city}, ${appointment.patientAddressSnapshot.state} - ${appointment.patientAddressSnapshot.postalCode}`
        : (appointment.homeAddress || appointment.patientAddress || 'Patient Residence'));

    const clinicLocation = isOnline
      ? 'Secure Video Consultation (Telehealth Room)'
      : (isHome
          ? homeAddressFormatted
          : (appointment.clinicLocation || appointment.clinicName || 'ONE MEDICAL Central Clinic, Indiranagar, Bengaluru'));

    // IST Formatted Date & Time
    const sDate = appointment.startTime ? new Date(appointment.startTime) : new Date();
    const durationMins = appointment.durationMin || appointment.durationMinutes || 30;
    const eDate = appointment.endTime ? new Date(appointment.endTime) : new Date(sDate.getTime() + durationMins * 60000);

    const appointmentDate = sDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });

    const appointmentTime = `${sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} - ${eDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} (${durationMins} mins)`;

    const rawAmt = appointment.amount || appointment.amountPaise || (appointment.fee ? appointment.fee * 100 : 80000);
    const amountPaise = rawAmt < 5000 ? rawAmt * 100 : rawAmt;
    const patientAvatarUrl = appointment.patientAvatarUrl || patientUser?.profileImageUrl || patientUser?.avatarUrl || patientUser?.avatar || null;

    const patientSnapshot = {
      appointmentId: appointment._id,
      transactionId: appointment.transactionId || appointment.paymentId || appointment._id,
      status: (appointment.status || 'CONFIRMED').toUpperCase(),
      paymentStatus: (appointment.paymentStatus || 'PAID').toUpperCase(),
      amount: amountPaise,
      patientId: appointment.patientId,
      patientAvatarUrl,
      therapistId: appointment.therapistId,
      therapistName: appointment.therapistName,
      patientName,
      age,
      gender,
      patientIdFormatted,
      primaryComplaint,
      lastVisitDate,
      currentProgramName,
      recoveryGoalProgress,
      painScore,
      visitMode,
      clinicLocation,
      patientAddressSnapshot: appointment.patientAddressSnapshot,
      appointmentDate,
      appointmentTime,
      durationMins,
      serviceCategory: (appointment.serviceType || 'PHYSIOTHERAPY').replace(/_/g, ' '),
    };

    res.json({
      success: true,
      data: {
        appointment,
        patientSnapshot,
        activeProgram,
        latestRecords: latestRecords || [],
        activeConsultation: activeConsultation || null,
      },
    });
  } catch (err) {
    console.error('[ConsultationController] getAppointmentClinicalContext error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/v1/consultations
 * Initialize or get active consultation draft for appointment
 */
export const getOrCreateConsultation = async (req, res) => {
  try {
    const { appointmentId, telehealthSessionId } = req.body;
    const therapistId = req.headers['x-user-id'] || req.user?.userId;
    const therapistRole = req.headers['x-user-role'] || req.user?.role;

    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Valid appointmentId is required' } });
    }

    let consultation = await ClinicalConsultation.findOne({ appointmentId });

    if (!consultation) {
      if (therapistRole === 'patient') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only authorized clinical practitioners can initiate clinical consultation drafts.' } });
      }

      let appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
      }

      consultation = await ClinicalConsultation.create({
        appointmentId,
        patientId: appointment.patientId?.toString() || 'patient_default',
        therapistId: therapistId || appointment.therapistId?.toString() || 'therapist_default',
        telehealthSessionId: telehealthSessionId || null,
        currentStep: 1,
        status: 'DRAFT',
        draftSavedAt: new Date(),
        step1_preparation: {
          chiefComplaint: appointment.chiefComplaint || 'Patellar instability and lower back stiffness during knee flexion.',
          painScore: 4,
          painType: ['Radiating'],
          painDuration: 'Today',
          painLocation: { bodyPart: 'Left Knee', region: 'Front' },
          sessionGoals: ['Reduce Pain', 'Improve Mobility'],
          observations: { swelling: true, inflammation: false, limitedRom: true, muscleTight: true },
        },
      });

      // Transition appointment to IN_PROGRESS if currently CONFIRMED or CHECKED_IN
      if (['CONFIRMED', 'CHECKED_IN', 'SCHEDULED', 'DOCUMENTATION_PENDING'].includes(appointment.status)) {
        appointment.status = 'IN_PROGRESS';
        await appointment.save();
      }

      await logAudit({
        actorId: therapistId || appointment.therapistId || 'system',
        actorRole: therapistRole || 'therapist',
        action: 'CONSULTATION_CREATED',
        resourceType: 'ClinicalConsultation',
        resourceId: consultation._id.toString(),
        afterState: { appointmentId, patientId: consultation.patientId, currentStep: 1, status: 'DRAFT' },
        reason: 'Clinical consultation draft initialized by authorized therapist',
        req,
      });
    }

    res.json({ success: true, data: consultation });
  } catch (err) {
    console.error('[ConsultationController] getOrCreateConsultation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * GET /api/v1/consultations/:id
 */
export const getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    let consultation = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      consultation = await ClinicalConsultation.findById(id);
    }
    if (!consultation) {
      consultation = await ClinicalConsultation.findOne({ appointmentId: id });
    }

    if (!consultation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation not found' } });
    }

    res.json({ success: true, data: consultation });
  } catch (err) {
    console.error('[ConsultationController] getConsultationById error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * PATCH /api/v1/consultations/:id
 * Autosave endpoint for any step
 */
export const autosaveConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const therapistId = req.headers['x-user-id'] || req.user?.userId;
    const actorRole = req.headers['x-user-role'] || req.user?.role;

    if (actorRole === 'patient') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Patients cannot edit clinical consultation records.' } });
    }

    let consultation = await ClinicalConsultation.findById(id);
    if (!consultation && mongoose.Types.ObjectId.isValid(id)) {
      consultation = await ClinicalConsultation.findOne({ appointmentId: id });
    }

    if (!consultation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation draft not found' } });
    }

    if (consultation.status === 'SUBMITTED' || consultation.status === 'SEALED' || consultation.isSealed) {
      return res.status(403).json({
        success: false,
        error: { code: 'IMMUTABLE_RECORD', message: 'Sealed clinical consultations cannot be edited directly. Please submit a versioned amendment via /consultations/:id/amend.' }
      });
    }

    const previousStep = consultation.currentStep;

    // Merge and update draft
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        consultation[key] = updateData[key];
        if (typeof consultation.markModified === 'function') {
          consultation.markModified(key);
        }
      }
    });

    consultation.draftSavedAt = new Date();
    await consultation.save();

    // Determine granular audit action
    let auditAction = 'CONSULTATION_DRAFT_UPDATED';
    if (updateData.step2_assessment) {
      auditAction = 'ASSESSMENT_COMPLETED';
    } else if (updateData.step4_recovery) {
      auditAction = 'EXERCISE_PRESCRIBED';
    }

    await logAudit({
      actorId: therapistId || String(consultation.therapistId),
      actorRole: actorRole || 'therapist',
      action: auditAction,
      resourceType: 'ClinicalConsultation',
      resourceId: consultation._id.toString(),
      beforeState: { currentStep: previousStep },
      afterState: { currentStep: consultation.currentStep, status: consultation.status },
      reason: `Clinical step progression: ${auditAction}`,
      req,
    });

    res.json({ success: true, data: consultation, savedAt: consultation.draftSavedAt });
  } catch (err) {
    console.error('[ConsultationController] autosaveConsultation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/v1/consultations/:id/sign
 * Digital signature seal on Step 5
 */
export const signConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { therapistName, registrationNumber, clinicName } = req.body;
    const therapistId = req.headers['x-user-id'] || req.user?.userId;
    const actorRole = req.headers['x-user-role'] || req.user?.role;

    if (actorRole === 'patient') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only therapists can digitally sign clinical records.' } });
    }

    const consultation = await ClinicalConsultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation not found' } });
    }

    const signPayload = `${id}:${therapistId}:${registrationNumber || 'PT-3821'}:${Date.now()}`;
    const digitalSignHash = crypto.createHash('sha256').update(signPayload).digest('hex');

    consultation.step5_synthesis.digitalSignature = {
      signedBy: therapistId,
      therapistName: therapistName || req.user?.name || 'Dr. Sagar Patil',
      registrationNumber: registrationNumber || 'Reg #PT-3821',
      clinicName: clinicName || 'Downtown Clinic',
      signedAt: new Date(),
      digitalSignHash,
    };

    consultation.status = 'SIGNED';
    await consultation.save();

    await logAudit({
      actorId: therapistId,
      actorRole: actorRole || 'therapist',
      action: 'CONSULTATION_SIGNED',
      resourceType: 'ClinicalConsultation',
      resourceId: consultation._id.toString(),
      afterState: { status: 'SIGNED', digitalSignHash, registrationNumber },
      reason: 'Therapist digitally signed encounter with verification seal',
      req,
    });

    res.json({ success: true, data: consultation, signature: consultation.step5_synthesis.digitalSignature });
  } catch (err) {
    console.error('[ConsultationController] signConsultation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/v1/consultations/:id/submit
 * Final clinical submission and seal, updates Appointment state, and creates/syncs PatientProgram
 */
export const submitConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.headers['x-user-id'] || req.user?.userId;
    const actorRole = req.headers['x-user-role'] || req.user?.role;

    if (actorRole === 'patient') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Patients cannot submit clinical records.' } });
    }

    const consultation = await ClinicalConsultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation not found' } });
    }

    // 1. Strict Idempotency Check: if already SEALED, return existing sealed record immediately
    if (consultation.isSealed || consultation.status === 'SEALED') {
      return res.json({
        success: true,
        message: 'Consultation is already finalized and sealed.',
        data: consultation,
        alreadySealed: true,
      });
    }

    // 2. Transition Encounter to SEALED
    consultation.status = 'SEALED';
    consultation.isSealed = true;
    consultation.sealedAt = new Date();
    consultation.sealedBy = therapistId || String(consultation.therapistId);
    consultation.submittedAt = new Date();
    await consultation.save();

    // 3. Update appointment status to DOCUMENTED
    await Appointment.findByIdAndUpdate(consultation.appointmentId, {
      $set: { status: 'DOCUMENTED' },
    });

    // 4. Closed-Loop Patient Program Activation (Make Patient Well)
    // Transform prescribed home exercises into an active PatientProgram
    const homeExercises = consultation.step4_recovery?.homeExercises || [];
    let patientProgram = null;

    if (homeExercises.length > 0) {
      const formattedExercises = homeExercises.map((ex) => ({
        exerciseId: ex.exerciseId || null,
        name: ex.name,
        sets: Number(ex.sets || 3),
        reps: Number(ex.reps || 10),
        holdSec: Number(ex.holdSec || 10),
        frequency: ex.frequency || '2x Daily',
        videoUrl: ex.videoUrl || '',
        thumbnailUrl: ex.thumbnailUrl || '',
        instructions: ex.instructions || '',
      }));

      // Check if existing active program exists for this patient
      const existingProgram = await PatientProgram.findOne({
        patientId: consultation.patientId,
        status: 'active',
        isDeleted: false,
      });

      if (existingProgram) {
        // Upgrade program with new prescribed exercises and increment version
        existingProgram.version = (existingProgram.version || 1) + 1;
        existingProgram.sourceEncounterId = consultation._id;
        existingProgram.prescribedExercises = formattedExercises;
        existingProgram.activityRestrictions = consultation.step4_recovery.activityRestrictions;
        existingProgram.patientGoals = consultation.step4_recovery.patientGoals;
        existingProgram.appointmentId = String(consultation.appointmentId);
        existingProgram.therapistId = String(consultation.therapistId);
        existingProgram.title = consultation.step4_recovery.programName || existingProgram.title || 'Recovery Program';
        patientProgram = await existingProgram.save();
      } else {
        // Create new active PatientProgram (Version 1)
        patientProgram = await PatientProgram.create({
          patientId: String(consultation.patientId),
          therapistId: String(consultation.therapistId),
          assignedBy: String(therapistId || consultation.therapistId),
          sourceEncounterId: consultation._id,
          version: 1,
          title: consultation.step4_recovery.programName || 'Prescribed Rehabilitation Protocol',
          appointmentId: String(consultation.appointmentId),
          startDate: new Date(),
          targetWeeks: 4,
          targetSessionsPerWeek: 3,
          currentWeek: 1,
          completedSessionsCount: 0,
          status: 'active',
          prescribedExercises: formattedExercises,
          activityRestrictions: consultation.step4_recovery.activityRestrictions,
          patientGoals: consultation.step4_recovery.patientGoals,
          assignedAt: new Date(),
        }).catch((err) => {
          console.warn('[ConsultationController] PatientProgram create error:', err.message);
          return null;
        });
      }
    }

    // 5. Clinical Audit Log Entry
    await logAudit({
      actorId: therapistId || String(consultation.therapistId),
      actorRole: 'therapist',
      action: 'CONSULTATION_SEALED',
      resourceType: 'ClinicalConsultation',
      resourceId: consultation._id.toString(),
      afterState: {
        status: 'SEALED',
        isSealed: true,
        appointmentId: consultation.appointmentId,
        patientProgramId: patientProgram?._id,
      },
      reason: 'Clinical consultation encounter finalized, digitally sealed, and recovery program activated',
      req,
    });

    if (patientProgram) {
      await logAudit({
        actorId: therapistId || String(consultation.therapistId),
        actorRole: 'therapist',
        action: 'PROGRAM_ACTIVATED',
        resourceType: 'PatientProgram',
        resourceId: patientProgram._id.toString(),
        afterState: {
          version: patientProgram.version,
          status: 'active',
          exercisesCount: homeExercises.length,
          patientId: consultation.patientId,
        },
        reason: 'Rehabilitation exercise program activated for patient from sealed consultation',
        req,
      });
    }

    // 6. Asynchronous background sealing, PDF report synthesis, and Vault ingestion
    clinicalProcessor.processConsultationSubmitted({
      consultationId: consultation._id,
      appointmentId: consultation.appointmentId,
      patientId: consultation.patientId,
      therapistId: consultation.therapistId,
      programId: patientProgram?._id,
    });

    res.json({
      success: true,
      message: 'Consultation finalized, digitally sealed, and recovery program activated.',
      data: consultation,
      patientProgram,
    });
  } catch (err) {
    console.error('[ConsultationController] submitConsultation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * POST /api/v1/consultations/:id/amend
 * Non-destructive versioned amendment to a SEALED consultation
 */
export const amendConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const therapistId = req.headers['x-user-id'] || req.user?.userId;
    const { reason, changes = {} } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid clinical amendment reason is required.' } });
    }

    const consultation = await ClinicalConsultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation not found.' } });
    }

    const nextVersion = (consultation.version || 1) + 1;
    const amendmentRecord = {
      version: nextVersion,
      reason: reason.trim(),
      amendedBy: therapistId || String(consultation.therapistId),
      amendedAt: new Date(),
      changes,
      snapshot: {
        step1_preparation: consultation.step1_preparation,
        step2_assessment: consultation.step2_assessment,
        step3_treatment: consultation.step3_treatment,
        step4_recovery: consultation.step4_recovery,
        step5_synthesis: consultation.step5_synthesis,
      }
    };

    consultation.version = nextVersion;
    consultation.status = 'AMENDED';
    if (!consultation.amendments) consultation.amendments = [];
    consultation.amendments.push(amendmentRecord);

    // Apply changes with clean object conversion
    const docObj = consultation.toObject();
    if (changes.step1_preparation) consultation.step1_preparation = { ...docObj.step1_preparation, ...changes.step1_preparation };
    if (changes.step2_assessment) consultation.step2_assessment = { ...docObj.step2_assessment, ...changes.step2_assessment };
    if (changes.step3_treatment) consultation.step3_treatment = { ...docObj.step3_treatment, ...changes.step3_treatment };
    if (changes.step4_recovery) consultation.step4_recovery = { ...docObj.step4_recovery, ...changes.step4_recovery };
    if (changes.step5_synthesis) consultation.step5_synthesis = { ...docObj.step5_synthesis, ...changes.step5_synthesis };

    await consultation.save();

    await logAudit({
      actorId: therapistId || String(consultation.therapistId),
      actorRole: 'therapist',
      action: 'AMENDMENT_CREATED',
      resourceType: 'ClinicalConsultation',
      resourceId: consultation._id.toString(),
      beforeState: { version: nextVersion - 1 },
      afterState: { version: nextVersion, status: 'AMENDED', reason },
      reason: `Clinical consultation amendment created: ${reason}`,
      req,
    });

    // Re-generate updated report asynchronously
    clinicalProcessor.processConsultationSubmitted({
      consultationId: consultation._id,
      appointmentId: consultation.appointmentId,
      patientId: consultation.patientId,
      therapistId: consultation.therapistId,
    });

    res.json({
      success: true,
      message: `Consultation amended to version ${nextVersion}.`,
      data: consultation,
      version: nextVersion,
    });
  } catch (err) {
    console.error('[ConsultationController] amendConsultation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
