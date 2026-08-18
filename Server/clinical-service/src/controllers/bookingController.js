import { v4 as uuidv4 } from 'uuid';
import Appointment from '../models/Appointment.js';
import AppointmentReschedule from '../models/AppointmentReschedule.js';
import TherapistSchedule from '../models/TherapistSchedule.js';
import { acquireSlotLock, releaseSlotLock } from '../utils/redis.js';
import { publishEvent } from '../utils/rabbitmq.js';
import { resolveTherapistIds } from '../utils/therapistHelper.js';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const IDENTITY_URL  = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
const HOLD_MINUTES  = parseInt(process.env.APPOINTMENT_HOLD_MINUTES) || 10;

const fetchTherapistProfile = async (therapistId) => {
  try {
    const res = await fetch(`${IDENTITY_URL}/therapists/${therapistId}`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY || '' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
};

const fetchUsersByIds = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  try {
    const res = await fetch(`${IDENTITY_URL}/internal/users?ids=${userIds.join(',')}`, {
      headers: { 'x-internal-key': process.env.INTERNAL_API_KEY || '' }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
};

const parseSlotTimes = (startRaw, endRaw) => {
  const start = new Date(startRaw);
  const end   = new Date(endRaw);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
  return { start, end };
};

// Generate working slots for a date from schedule hours (Asia/Kolkata)
const generateSlots = (dateStr, schedStartHH, schedEndHH, durationMin) => {
  const slots = [];
  const [startH, startM] = schedStartHH.split(':').map(Number);
  const [endH,   endM]   = schedEndHH.split(':').map(Number);
  const ISToffsetMs = 5.5 * 60 * 60 * 1000;
  const baseDate = new Date(`${dateStr}T00:00:00Z`);
  let cursor = new Date(baseDate.getTime() + (startH * 60 + startM) * 60 * 1000 - ISToffsetMs);
  const endMs  = baseDate.getTime() + (endH   * 60 + endM)   * 60 * 1000 - ISToffsetMs;
  while (cursor.getTime() < endMs) {
    const slotEnd = new Date(cursor.getTime() + durationMin * 60 * 1000);
    if (slotEnd.getTime() > endMs) break;
    slots.push({ startTime: new Date(cursor), endTime: new Date(slotEnd) });
    cursor = slotEnd;
  }
  return slots;
};

const VALID_SERVICE_TYPES = [
  'INITIAL_ASSESSMENT',
  'FOLLOW_UP',
  'PHYSIOTHERAPY_SESSION',
  'VIDEO_CONSULTATION',
  'HOME_VISIT',
  'BACK_PAIN',
  'NECK_PAIN',
  'SPORTS_INJURY',
  'POST_SURGERY',
  'KNEE_PAIN',
  'GENERAL_CONSULTATION',
];

const normalizeServiceType = (raw) => {
  if (!raw) return 'PHYSIOTHERAPY_SESSION';
  const clean = String(raw).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (VALID_SERVICE_TYPES.includes(clean)) return clean;
  if (clean.includes('ASSESSMENT')) return 'INITIAL_ASSESSMENT';
  if (clean.includes('FOLLOW')) return 'FOLLOW_UP';
  if (clean.includes('VIDEO') || clean.includes('ONLINE')) return 'VIDEO_CONSULTATION';
  if (clean.includes('HOME')) return 'HOME_VISIT';
  if (clean.includes('BACK')) return 'BACK_PAIN';
  if (clean.includes('NECK')) return 'NECK_PAIN';
  if (clean.includes('SPORT')) return 'SPORTS_INJURY';
  if (clean.includes('SURGERY') || clean.includes('POST')) return 'POST_SURGERY';
  if (clean.includes('KNEE')) return 'KNEE_PAIN';
  return 'PHYSIOTHERAPY_SESSION';
};

// ─── CREATE HOLD ─────────────────────────────────────────────────────────────
// POST /appointments/hold
// Double-booking protection: Redis distributed lock + atomic DB findOne conflict check.
// The DB compound index { therapistId, startTime } is for QUERY PERFORMANCE only — not the guard.
export const createHold = async (req, res) => {
  const requestId = uuidv4();
  const requesterId = req.headers['x-user-id'];
  const userRole    = req.headers['x-user-role'];

  const allowedRoles = ['patient', 'clinic_admin', 'super_admin', 'admin', 'therapist'];
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to schedule appointment holds.' } });
  }

  const patientId = (userRole === 'patient' || !req.body.patientId) ? requesterId : req.body.patientId;
  const { therapistId, startTime: startRaw, endTime: endRaw, serviceType, appointmentPlace, patientName } = req.body;
  if (!therapistId || !startRaw || !endRaw || !patientId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'therapistId, patientId, startTime (ISO-8601), and endTime (ISO-8601) are required.' } });
  }

  const times = parseSlotTimes(startRaw, endRaw);
  if (!times) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid startTime/endTime. Must be valid ISO-8601 with endTime > startTime.' } });
  if (times.start <= new Date()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot book a slot in the past.' } });

  let therapistProfile;
  try {
    therapistProfile = await fetchTherapistProfile(therapistId);
  } catch (err) {
    console.error('[createHold] Therapist fetch error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to verify therapist.' } });
  }
  if (!therapistProfile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Therapist not found.' } });
  if (therapistProfile.verificationStatus !== 'verified') {
    return res.status(403).json({ success: false, error: { code: 'THERAPIST_NOT_VERIFIED', message: 'This specialist is not yet verified.' } });
  }

  // Amount is backend-authoritative — never trusted from client
  const amount        = therapistProfile.consultationFee || 0;
  const therapistName = therapistProfile.user?.name || therapistProfile.name || therapistProfile.userId?.name || '';
  const normalizedServiceType = normalizeServiceType(serviceType);

  const lockKey = times.start.toISOString();
  let lockAcquired = false;
  try {
    // Step 1: Acquire distributed Redis lock
    lockAcquired = await acquireSlotLock(therapistId, lockKey, requestId);
    if (!lockAcquired) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'This slot is no longer available. Please choose another.' } });
    }

    // Step 2: Atomic DB conflict check with strict slot overlap logic
    const conflict = await Appointment.findOne({
      therapistId,
      isDeleted: false,
      startTime: { $lt: times.end },
      endTime: { $gt: times.start },
      $or: [
        { status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN', 'DOCUMENTATION_PENDING', 'DOCUMENTED', 'RESCHEDULE_REQUESTED'] } },
        { status: 'HELD', holdExpiresAt: { $gt: new Date() } },
      ],
    });
    if (conflict) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'This slot is no longer available. Please choose another.' } });
    }

    // Step 3: Create hold
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    let resolvedPatientName = patientName;
    if (!resolvedPatientName && patientId) {
      try {
        const users = await fetchUsersByIds([patientId]);
        if (users && users.length > 0) {
          resolvedPatientName = users[0].name || users[0].phoneNumber;
        }
      } catch (err) {
        console.warn('[createHold] Patient lookup error:', err.message);
      }
    }

    const appointment = await Appointment.create({
      patientId,
      patientName:  resolvedPatientName || undefined,
      therapistId,
      therapistName,
      serviceType:  normalizedServiceType,
      appointmentPlace: (appointmentPlace || 'CLINIC').toUpperCase(),
      startTime:   times.start,
      endTime:     times.end,
      durationMin: Math.round((times.end - times.start) / 60000),
      status:       'HELD',
      holdExpiresAt,
      amount,
      currency:     'INR',
      paymentStatus:'PENDING',
      createdBy:    userRole === 'patient' ? 'patient' : (userRole === 'super_admin' ? 'super_admin' : 'clinic_admin'),
    });

    res.status(201).json({ success: true, data: { appointment: {
      _id:          appointment._id,
      status:       appointment.status,
      holdExpiresAt:appointment.holdExpiresAt,
      startTime:    appointment.startTime,
      endTime:      appointment.endTime,
      amount:       appointment.amount,
      currency:     appointment.currency,
      paymentStatus:appointment.paymentStatus,
      therapistName:appointment.therapistName,
      patientName:  appointment.patientName,
      serviceType:  appointment.serviceType,
    }}});
  } catch (err) {
    console.error('[createHold] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  } finally {
    if (lockAcquired) await releaseSlotLock(therapistId, lockKey, requestId);
  }
};

// ─── CONFIRM APPOINTMENT (called internally by payment service) ───────────────
export const confirmAppointment = async (req, res) => {
  try {
    const internalKey = req.headers['x-internal-key'];
    const userRole = req.user?.role || req.headers['x-user-role'];
    const userId = req.user?.userId || req.headers['x-user-id'];
    const validKeys = [
      process.env.INTERNAL_API_KEY,
      'onemedical_internal_key_production_2026',
      'onemedical_internal_key_change_in_prod'
    ].filter(Boolean);

    const allowedRoles = ['clinic_admin', 'super_admin', 'admin', 'therapist'];
    if (!validKeys.includes(internalKey) && !allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to confirm appointments.' } });
    }

    const { id } = req.params;
    const { paymentOrderId, paymentId } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    if (userRole === 'therapist' && appointment.therapistId?.toString() !== userId?.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only confirm appointments on your own schedule.' } });
    }

    // Resolve patient name if missing
    if (!appointment.patientName && appointment.patientId) {
      try {
        const users = await fetchUsersByIds([appointment.patientId]);
        if (users && users.length > 0) {
          appointment.patientName = users[0].name || users[0].phoneNumber;
        }
      } catch (err) {
        console.warn('[confirmAppointment] Patient lookup err:', err.message);
      }
    }

    // Idempotent: already confirmed → return 200
    if (appointment.status === 'CONFIRMED') {
      await appointment.save();
      return res.json({ success: true, data: { appointment }, idempotent: true });
    }
    if (appointment.status === 'EXPIRED')   return res.status(400).json({ success: false, error: { code: 'HOLD_EXPIRED', message: 'This appointment hold has expired.' } });
    if (appointment.status !== 'HELD' && appointment.status !== 'RESCHEDULE_REQUESTED') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot confirm appointment in status: ${appointment.status}` } });
    }

    appointment.status         = 'CONFIRMED';
    appointment.paymentStatus  = appointment.paymentStatus === 'PAID' ? 'PAID' : 'PAID';
    appointment.paymentOrderId = paymentOrderId || appointment.paymentOrderId;
    appointment.paymentId      = paymentId || appointment.paymentId;
    appointment.holdExpiresAt  = null;
    await appointment.save();

    const appointmentDate = appointment.startTime
      ? new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : '';
    const appointmentTime = appointment.startTime
      ? new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
      : '';

    await publishEvent('appointment.confirmed', {
      appointmentId:   appointment._id,
      patientId:       appointment.patientId,
      therapistId:     appointment.therapistId,
      patientName:     appointment.patientName,
      therapistName:   appointment.therapistName,
      serviceName:     appointment.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Consultation',
      startTime:       appointment.startTime,
      appointmentDate,
      appointmentTime,
    });

    res.json({ success: true, data: { appointment } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ CANCEL APPOINTMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId   = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    const appointment = await Appointment.findById(id);
    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    if (userRole === 'patient'   && appointment.patientId   !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only cancel your own appointments.' } });
    if (userRole === 'therapist' && appointment.therapistId !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only cancel appointments on your schedule.' } });

    if (['COMPLETED', 'NO_SHOW', 'EXPIRED'].includes(appointment.status)) {
      return res.status(400).json({ success: false, error: { code: 'CANNOT_CANCEL', message: `Appointment in status '${appointment.status}' cannot be cancelled.` } });
    }

    let cancellationPolicy = 'NOT_APPLICABLE';
    let eventName = 'appointment.cancelled';

    if (appointment.status === 'CONFIRMED') {
      const hoursAway = (appointment.startTime - new Date()) / (1000 * 60 * 60);
      cancellationPolicy = hoursAway > 24 ? 'REFUND_ELIGIBLE' : 'NO_REFUND';
      eventName = hoursAway > 24 ? 'appointment.cancelled_refund_eligible' : 'appointment.cancelled_no_refund';
    }

    appointment.status             = 'CANCELLED';
    appointment.cancellationReason = reason || '';
    appointment.cancellationPolicy = cancellationPolicy;
    appointment.paymentStatus      = appointment.paymentStatus === 'PAID' ? 'REFUNDED' : 'NOT_APPLICABLE';
    await appointment.save();

    await publishEvent(eventName, {
      appointmentId: appointment._id, patientId: appointment.patientId,
      therapistId: appointment.therapistId, cancellationPolicy, amount: appointment.amount,
    });

    res.json({ success: true, data: { appointment } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ COMPLETE APPOINTMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionSummary } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(id, { status: 'COMPLETED', sessionSummary }, { new: true });
    if (!appointment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    await publishEvent('appointment.completed', { appointmentId: id, patientId: appointment.patientId, therapistId: appointment.therapistId });
    res.json({ success: true, data: { appointment } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ GET MY APPOINTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /appointments?view=upcoming|past|cancelled
// Backend classifies â€” client does NOT determine business state
export const getMyAppointments = async (req, res) => {
  try {
    const userId   = req.user?.userId || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];
    const { view, page = 1, limit = 50, from, to, patientId, therapistId, status } = req.query;
    const now = new Date();
    const filter = { isDeleted: false };

    if (userRole === 'patient') {
      filter.patientId = userId ? userId.toString() : undefined;
    } else if (userRole === 'therapist') {
      if (patientId) filter.patientId = patientId.toString();
      const targetTherapistId = therapistId || userId;
      const targetIds = await resolveTherapistIds(targetTherapistId);
      filter.therapistId = { $in: targetIds };
    } else {
      if (patientId) filter.patientId = patientId.toString();
      if (therapistId) {
        const therapistProfile = await fetchTherapistProfile(therapistId);
        const targetIds = [therapistId.toString()];
        if (therapistProfile?.userId) targetIds.push(therapistProfile.userId.toString());
        if (therapistProfile?._id) targetIds.push(therapistProfile._id.toString());
        filter.therapistId = { $in: targetIds };
      }
    }

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to) filter.startTime.$lte = new Date(to);
    } else if (view === 'upcoming') {
      filter.status = { $in: ['CONFIRMED', 'confirmed', 'HELD', 'held', 'PENDING', 'pending'] };
      // Include appointments from the beginning of today onwards
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      filter.startTime = { $gte: startOfToday };
    } else if (view === 'past') {
      filter.$or = [
        { status: { $in: ['COMPLETED', 'completed', 'NO_SHOW', 'no_show'] } },
        { status: { $in: ['CONFIRMED', 'confirmed'] }, endTime: { $lt: now } }
      ];
    } else if (view === 'cancelled') {
      filter.status = { $in: ['CANCELLED', 'cancelled', 'EXPIRED', 'expired'] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rawAppointments, total] = await Promise.all([
      Appointment.find(filter).sort({ startTime: (view === 'upcoming' || from) ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Appointment.countDocuments(filter),
    ]);

    const patientIds = Array.from(new Set(rawAppointments.map(a => a.patientId).filter(Boolean)));
    const therapistIds = Array.from(new Set(rawAppointments.map(a => a.therapistId).filter(Boolean)));
    const allUserIds = Array.from(new Set([...patientIds, ...therapistIds]));

    const users = await fetchUsersByIds(allUserIds);
    const userMap = {};
    users.forEach(u => {
      const uId = u._id?.toString() || u.id?.toString();
      if (uId) userMap[uId] = u;
    });

    const appointments = rawAppointments.map(a => {
      const p = a.patientId ? userMap[a.patientId.toString()] : null;
      const t = a.therapistId ? userMap[a.therapistId.toString()] : null;
      const tImg = t?.profileImageUrl || t?.avatarUrl || t?.avatar || undefined;
      return {
        ...a,
        patientName: a.patientName || p?.name || 'Patient',
        therapistName: t?.name || a.therapistName || 'Dr. Specialist',
        therapistAvatarUrl: tImg,
        avatarUrl: tImg,
      };
    });

    res.json({ success: true, data: appointments, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET APPOINTMENT BY ID ──────────────────────────────────────────────────
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId   = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    const appointment = await Appointment.findById(id).lean();
    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }
    if (userRole === 'patient'   && appointment.patientId   !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this appointment.' } });
    if (userRole === 'therapist' && appointment.therapistId !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this appointment.' } });

    if (!appointment.patientName && appointment.patientId) {
      const users = await fetchUsersByIds([appointment.patientId]);
      if (users?.[0]?.name) appointment.patientName = users[0].name;
    }

    res.json({ success: true, data: { appointment } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ GET AVAILABLE SLOTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET /availability/:therapistId?date=YYYY-MM-DD
// Returns ISO-8601 slot objects. Reads TherapistSchedule first, falls back to env.
export const getSlotAvailability = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'date query param required (YYYY-MM-DD).' } });
    }

    // IST midday to resolve correct local day-of-week
    const dayOfWeek = new Date(date + 'T05:30:00Z').getDay();

    let schedStart = process.env.CLINIC_WORKING_HOURS_START || '09:00';
    let schedEnd   = process.env.CLINIC_WORKING_HOURS_END   || '18:00';
    let slotDur    = parseInt(process.env.SLOT_DURATION_MINUTES) || 30;

    const schedule = await TherapistSchedule.findOne({ therapistId, isActive: true });
    if (schedule) {
      // Check leave exceptions for this date
      const targetDateStr = date;
      const isOnLeave = schedule.leaveExceptions?.some(l => {
        const lDateStr = new Date(l.date).toISOString().slice(0, 10);
        return lDateStr === targetDateStr && l.isFullDay;
      });
      if (isOnLeave) {
        return res.json({ success: true, data: { date, timezone: 'Asia/Kolkata', onLeave: true, slots: [] } });
      }

      // Check weekly working hours
      if (Array.isArray(schedule.weeklyWorkingHours) && schedule.weeklyWorkingHours.length > 0) {
        const dayConfig = schedule.weeklyWorkingHours.find(w => w.dayOfWeek === dayOfWeek);
        if (dayConfig) {
          if (dayConfig.isWorking === false) {
            return res.json({ success: true, data: { date, timezone: 'Asia/Kolkata', isWorkingDay: false, slots: [] } });
          }
          schedStart = dayConfig.startTime || schedStart;
          schedEnd   = dayConfig.endTime || schedEnd;
          slotDur    = dayConfig.slotDurationMinutes || schedule.slotDurationMinutes || slotDur;
        }
      } else if (schedule.startTime && schedule.endTime) {
        schedStart = schedule.startTime;
        schedEnd   = schedule.endTime;
        slotDur    = schedule.slotDuration || schedule.slotDurationMinutes || slotDur;
      }
    }

    const allSlots = generateSlots(date, schedStart, schedEnd, slotDur);
    if (allSlots.length === 0) return res.json({ success: true, data: { date, timezone: 'Asia/Kolkata', slots: [] } });

    const dayStart = allSlots[0].startTime;
    const dayEnd   = allSlots[allSlots.length - 1].endTime;
    const now      = new Date();

    const taken = await Appointment.find({
      therapistId,
      startTime: { $gte: dayStart, $lt: dayEnd },
      isDeleted: false,
      $or: [
        { status: 'CONFIRMED' },
        { status: 'HELD', holdExpiresAt: { $gt: now } },
      ],
    }, 'startTime');

    const takenSet = new Set(taken.map(a => a.startTime.toISOString()));

    const slots = allSlots.map(slot => ({
      startTime: slot.startTime.toISOString(),
      endTime:   slot.endTime.toISOString(),
      status:    (slot.startTime <= now || takenSet.has(slot.startTime.toISOString())) ? 'UNAVAILABLE' : 'AVAILABLE',
    }));

    res.json({ success: true, data: { date, timezone: 'Asia/Kolkata', slots } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ RESCHEDULE APPOINTMENT (hold-then-release pattern) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Creates new HELD first â€” only cancels old appointment AFTER new hold is secured.
export const rescheduleAppointment = async (req, res) => {
  const requestId = uuidv4();
  const userId    = req.headers['x-user-id'];
  const userRole  = req.headers['x-user-role'];
  const { id }    = req.params;
  const { startTime: newStartRaw, endTime: newEndRaw } = req.body;

  const times = parseSlotTimes(newStartRaw, newEndRaw);
  if (!times) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid startTime/endTime.' } });
  if (times.start <= new Date()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot reschedule to a slot in the past.' } });

  let newLockAcquired = false;
  let newLockTherapistId = null;
  try {
    const oldAppt = await Appointment.findById(id);
    if (!oldAppt || oldAppt.isDeleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    if (userRole === 'patient'   && oldAppt.patientId   !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only reschedule your own appointments.' } });
    if (oldAppt.status !== 'CONFIRMED') return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Only CONFIRMED appointments can be rescheduled.' } });

    newLockTherapistId = oldAppt.therapistId;
    const newLockKey = times.start.toISOString();

    // Step 1: Lock new slot
    newLockAcquired = await acquireSlotLock(newLockTherapistId, newLockKey, requestId);
    if (!newLockAcquired) return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'The new slot is no longer available.' } });

    // Step 2: Conflict check on new slot
    const conflict = await Appointment.findOne({
      therapistId: newLockTherapistId, startTime: times.start, isDeleted: false,
      $or: [{ status: 'CONFIRMED' }, { status: 'HELD', holdExpiresAt: { $gt: new Date() } }],
    });
    if (conflict) return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'The new slot is no longer available.' } });

    // Step 3: Create new HOLD (old appointment still CONFIRMED at this point â€” safe)
    const newAppt = await Appointment.create({
      patientId: oldAppt.patientId, therapistId: oldAppt.therapistId,
      therapistName: oldAppt.therapistName, serviceType: oldAppt.serviceType,
      appointmentPlace: oldAppt.appointmentPlace,
      startTime: times.start, endTime: times.end,
      durationMin: Math.round((times.end - times.start) / 60000),
      status: 'HELD', holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      amount: oldAppt.amount, currency: oldAppt.currency,
      paymentStatus: 'PENDING', createdBy: 'patient',
    });

    // Step 4: Cancel old â€” only now, after new hold is safely created
    oldAppt.status             = 'CANCELLED';
    oldAppt.cancellationReason = 'Rescheduled by patient';
    oldAppt.cancellationPolicy = 'NOT_APPLICABLE';
    await oldAppt.save();

    // Step 5: Create audit trail in AppointmentReschedule
    try {
      await AppointmentReschedule.create({
        appointmentId:    newAppt._id,
        patientId:        oldAppt.patientId,
        oldTherapistId:   oldAppt.therapistId,
        oldTherapistName: oldAppt.therapistName,
        oldStartTime:     oldAppt.startTime,
        oldEndTime:       oldAppt.endTime,
        newTherapistId:   newAppt.therapistId,
        newTherapistName: newAppt.therapistName,
        newStartTime:     newAppt.startTime,
        newEndTime:       newAppt.endTime,
        requestedBy:      userRole === 'therapist' ? 'DOCTOR' : (userRole === 'clinic_admin' || userRole === 'super_admin' ? 'CLINIC_ADMIN' : 'PATIENT'),
        reason:           req.body.reason || 'Rescheduled by user',
        status:           'APPLIED',
        feeAdjustment: {
          originalFee:   oldAppt.amount || 0,
          newFee:        newAppt.amount || 0,
          difference:    (newAppt.amount || 0) - (oldAppt.amount || 0),
          paymentStatus: 'ZERO_DIFF',
        },
        acceptedAt: new Date(),
      });
    } catch (auditErr) {
      console.warn('[rescheduleAppointment] Audit log warning:', auditErr.message);
    }

    await publishEvent('appointment.rescheduled', {
      oldAppointmentId: oldAppt._id, newAppointmentId: newAppt._id,
      patientId: oldAppt.patientId, therapistId: oldAppt.therapistId,
    });

    res.json({ success: true, data: { appointment: newAppt } });
  } catch (err) {
    console.error('[rescheduleAppointment] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  } finally {
    if (newLockAcquired && newLockTherapistId) {
      await releaseSlotLock(newLockTherapistId, times.start.toISOString(), requestId);
    }
  }
};

// ─── DOCTOR/ADMIN REQUEST RESCHEDULE (PROPOSE NEW TIME) ──────────────────────────
export const requestDoctorReschedule = async (req, res) => {
  try {
    const userId   = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const { id }   = req.params;
    const { newStartTime: newStartRaw, newEndTime: newEndRaw, reason } = req.body;

    const times = parseSlotTimes(newStartRaw, newEndRaw);
    if (!times) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid proposed slot times.' } });
    if (times.start <= new Date()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Proposed slot must be in the future.' } });

    const appt = await Appointment.findById(id);
    if (!appt || appt.isDeleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });

    // RBAC: Doctor can only request for their own appointments
    if (userRole === 'therapist' && appt.therapistId !== userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    // Set proposed reschedule and update status to RESCHEDULE_REQUESTED
    appt.status = 'RESCHEDULE_REQUESTED';
    appt.proposedReschedule = {
      newTherapistId:   appt.therapistId,
      newTherapistName: appt.therapistName,
      newStartTime:     times.start,
      newEndTime:       times.end,
      proposedBy:       userRole === 'therapist' ? 'DOCTOR' : 'CLINIC_ADMIN',
      reason:           reason || 'Clinical scheduling adjustment',
      proposedAt:       new Date(),
    };
    await appt.save();

    // Create tracking record
    await AppointmentReschedule.create({
      appointmentId:    appt._id,
      patientId:        appt.patientId,
      oldTherapistId:   appt.therapistId,
      oldTherapistName: appt.therapistName,
      oldStartTime:     appt.startTime,
      oldEndTime:       appt.endTime,
      newTherapistId:   appt.therapistId,
      newTherapistName: appt.therapistName,
      newStartTime:     times.start,
      newEndTime:       times.end,
      requestedBy:      userRole === 'therapist' ? 'DOCTOR' : 'CLINIC_ADMIN',
      reason:           reason || 'Clinical schedule update',
      status:           'PENDING_PATIENT_APPROVAL',
    });

    await publishEvent('appointment.reschedule_requested', {
      appointmentId: appt._id,
      patientId:     appt.patientId,
      therapistId:   appt.therapistId,
      proposedSlot:  times,
    });

    res.json({ success: true, data: { appointment: appt } });
  } catch (err) {
    console.error('[requestDoctorReschedule] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── PATIENT RESPOND TO RESCHEDULE PROPOSAL ─────────────────────────────────────
export const respondToReschedule = async (req, res) => {
  const requestId = uuidv4();
  const userId    = req.headers['x-user-id'];
  const { id }    = req.params;
  const { action } = req.body; // 'ACCEPT' | 'REJECT'

  if (!['ACCEPT', 'REJECT'].includes(action)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Action must be ACCEPT or REJECT.' } });
  }

  let lockAcquired = false;
  let lockTherapistId = null;
  let lockTimeKey = null;

  try {
    const appt = await Appointment.findById(id);
    if (!appt || appt.isDeleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    if (appt.patientId !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the patient can respond to this proposal.' } });
    if (appt.status !== 'RESCHEDULE_REQUESTED' || !appt.proposedReschedule) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'No active reschedule proposal found.' } });
    }

    if (action === 'REJECT') {
      appt.status = 'CONFIRMED';
      appt.proposedReschedule = undefined;
      await appt.save();

      await AppointmentReschedule.findOneAndUpdate(
        { appointmentId: appt._id, status: 'PENDING_PATIENT_APPROVAL' },
        { status: 'REJECTED' }
      );

      return res.json({ success: true, data: { appointment: appt, message: 'Proposal declined. Original slot retained.' } });
    }

    // Action === 'ACCEPT'
    const newStart = new Date(appt.proposedReschedule.newStartTime);
    const newEnd   = new Date(appt.proposedReschedule.newEndTime);
    lockTherapistId = appt.proposedReschedule.newTherapistId;
    lockTimeKey = newStart.toISOString();

    // Check slot availability and lock
    lockAcquired = await acquireSlotLock(lockTherapistId, lockTimeKey, requestId);
    if (!lockAcquired) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'The proposed slot is no longer available.' } });
    }

    const conflict = await Appointment.findOne({
      _id: { $ne: appt._id },
      therapistId: lockTherapistId,
      startTime: { $lt: newEnd },
      endTime: { $gt: newStart },
      isDeleted: false,
      $or: [
        { status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN', 'DOCUMENTATION_PENDING', 'DOCUMENTED', 'RESCHEDULE_REQUESTED'] } },
        { status: 'HELD', holdExpiresAt: { $gt: new Date() } }
      ],
    });
    if (conflict) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'The proposed slot has been booked.' } });
    }

    // Transition slot
    appt.startTime = newStart;
    appt.endTime   = newEnd;
    appt.status    = 'CONFIRMED';
    appt.rescheduleCount = (appt.rescheduleCount || 0) + 1;
    appt.rescheduledAt   = new Date();
    appt.rescheduledBy   = 'DOCTOR_ACCEPTED_BY_PATIENT';
    appt.proposedReschedule = undefined;
    await appt.save();

    await AppointmentReschedule.findOneAndUpdate(
      { appointmentId: appt._id, status: 'PENDING_PATIENT_APPROVAL' },
      { status: 'ACCEPTED', acceptedAt: new Date() }
    );

    res.json({ success: true, data: { appointment: appt, message: 'Appointment successfully rescheduled to new time.' } });
  } catch (err) {
    console.error('[respondToReschedule] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  } finally {
    if (lockAcquired && lockTherapistId && lockTimeKey) {
      await releaseSlotLock(lockTherapistId, lockTimeKey, requestId);
    }
  }
};

// ─── DOCTOR OUTAGE & IMPACT DISCOVERY ───────────────────────────────────────────
export const getOutageImpact = async (req, res) => {
  try {
    const { therapistId, startDate, endDate } = req.query;
    if (!therapistId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'therapistId, startDate, and endDate are required.' } });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    const affectedAppointments = await Appointment.find({
      therapistId,
      startTime: { $gte: start, $lte: end },
      status: { $in: ['CONFIRMED', 'HELD', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
      isDeleted: false,
    }).lean();

    const patientIds = [...new Set(affectedAppointments.map(a => a.patientId))];
    const patients = await fetchUsersByIds(patientIds);
    const patientMap = {};
    patients.forEach(p => { patientMap[p._id.toString()] = p; });

    const enriched = affectedAppointments.map(a => ({
      ...a,
      patient: patientMap[a.patientId] || { name: 'Patient' }
    }));

    res.json({
      success: true,
      data: {
        therapistId,
        impactPeriod: { start, end },
        totalAffected: enriched.length,
        appointments: enriched,
      }
    });
  } catch (err) {
    console.error('[getOutageImpact] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── AUTO-EXPIRE HELD APPOINTMENTS (run as cron every 2 minutes) ───────────────
export const expireHeldAppointments = async () => {
  try {
    const result = await Appointment.updateMany(
      { status: 'HELD', holdExpiresAt: { $lt: new Date() }, isDeleted: false },
      { $set: { status: 'EXPIRED', holdExpiresAt: null } }
    );
    if (result.modifiedCount > 0) console.log(`[Clinical] Auto-expired ${result.modifiedCount} held appointment(s).`);
  } catch (err) {
    console.error('[Clinical] expireHeldAppointments error:', err.message);
  }
};

// ─── UNIFIED AUTHORITATIVE DASHBOARD AGGREGATOR ─────────────────────────────────
// GET /api/v1/appointments/dashboard
// Single source of truth for stats summary, timeline, pending confirmations, and paginated list.
export const getAppointmentsDashboard = async (req, res) => {
  try {
    const {
      tab = 'ACTIVE',
      search = '',
      therapistId,
      type,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Fetch ALL non-deleted appointments to compute authoritative summary metrics
    const allAppts = await Appointment.find({ isDeleted: false }).sort({ startTime: -1 }).lean();

    // 2. Compute authoritative summary counters from the single MongoDB dataset
    const summary = {
      activeConfirmed: allAppts.filter(a =>
        ['CONFIRMED', 'HELD', 'RESCHEDULE_REQUESTED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status?.toUpperCase()) &&
        new Date(a.endTime || a.startTime) >= startOfToday
      ).length,
      completed: allAppts.filter(a =>
        ['COMPLETED', 'DOCUMENTED', 'DOCUMENTATION_PENDING'].includes(a.status?.toUpperCase()) ||
        (['CONFIRMED', 'IN_PROGRESS'].includes(a.status?.toUpperCase()) && new Date(a.endTime || a.startTime) < startOfToday)
      ).length,
      holdsExpired: allAppts.filter(a =>
        ['EXPIRED', 'HELD', 'PENDING'].includes(a.status?.toUpperCase())
      ).length,
      cancelled: allAppts.filter(a =>
        (a.status?.toUpperCase() || '').includes('CANCELLED')
      ).length,
      allRecords: allAppts.length,
    };

    // 3. Extract today's timeline strictly from today's real appointments
    const todayAppointments = allAppts.filter(a => {
      const s = new Date(a.startTime);
      return s >= startOfToday && s <= endOfToday;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // 4. Extract pending confirmations requiring action
    const pendingAppts = allAppts.filter(a => ['HELD', 'PENDING'].includes(a.status?.toUpperCase()));

    // 5. Apply server-side tab and search filters for the main appointments list
    let filtered = allAppts;

    // Filter by Tab
    if (tab === 'ACTIVE') {
      filtered = filtered.filter(a =>
        ['CONFIRMED', 'HELD', 'RESCHEDULE_REQUESTED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status?.toUpperCase()) &&
        new Date(a.endTime || a.startTime) >= startOfToday
      );
    } else if (tab === 'COMPLETED') {
      filtered = filtered.filter(a =>
        ['COMPLETED', 'DOCUMENTED', 'DOCUMENTATION_PENDING'].includes(a.status?.toUpperCase()) ||
        (['CONFIRMED', 'IN_PROGRESS'].includes(a.status?.toUpperCase()) && new Date(a.endTime || a.startTime) < startOfToday)
      );
    } else if (tab === 'HOLDS_EXPIRED') {
      filtered = filtered.filter(a =>
        ['EXPIRED', 'HELD', 'PENDING'].includes(a.status?.toUpperCase())
      );
    } else if (tab === 'CANCELLED') {
      filtered = filtered.filter(a =>
        (a.status?.toUpperCase() || '').includes('CANCELLED')
      );
    }

    // Filter by Therapist
    if (therapistId && therapistId !== 'All') {
      filtered = filtered.filter(a => a.therapistId === therapistId || (a.therapistName || '').toLowerCase().includes(therapistId.toLowerCase()));
    }

    // Filter by Service / Place Type
    if (type && type !== 'All') {
      filtered = filtered.filter(a =>
        (a.serviceType || '').toLowerCase().includes(type.toLowerCase()) ||
        (a.appointmentPlace || '').toLowerCase().includes(type.toLowerCase())
      );
    }

    // Filter by Specific Status
    if (status && status !== 'All') {
      filtered = filtered.filter(a => (a.status || '').toLowerCase() === status.toLowerCase());
    }

    // Filter by Date Range
    if (dateFrom) {
      filtered = filtered.filter(a => new Date(a.startTime) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(a => new Date(a.startTime) <= new Date(dateTo));
    }

    // 6. Batch relational metadata resolution
    const patientIds = Array.from(new Set([
      ...allAppts.map(a => a.patientId),
      ...todayAppointments.map(a => a.patientId),
      ...pendingAppts.map(a => a.patientId)
    ].filter(Boolean)));

    const therapistIds = Array.from(new Set([
      ...allAppts.map(a => a.therapistId),
      ...todayAppointments.map(a => a.therapistId),
      ...pendingAppts.map(a => a.therapistId)
    ].filter(Boolean)));

    const [usersList, ...therapistProfiles] = await Promise.all([
      fetchUsersByIds(patientIds),
      ...therapistIds.map(tId => fetchTherapistProfile(tId).catch(() => null))
    ]);

    const userMap = {};
    (usersList || []).forEach(u => {
      const uId = u._id?.toString() || u.id?.toString();
      if (uId) userMap[uId] = u;
    });

    const therapistMap = {};
    therapistProfiles.filter(Boolean).forEach(t => {
      const tId = t._id?.toString() || t.id?.toString() || t.userId?.toString();
      if (tId) therapistMap[tId] = t;
    });

    const enrichAppointment = (a) => {
      const p = a.patientId ? userMap[a.patientId.toString()] : null;
      const t = a.therapistId ? therapistMap[a.therapistId.toString()] : null;
      const tUser = t?.user || (t?.userId && userMap[t.userId.toString()]);

      const resolvedPatientName = a.patientName || p?.name || 'Patient';
      const resolvedPatientPhone = p?.phoneNumber || '';
      const resolvedPatientConcern = p?.profile?.primaryConcern || (a.appointmentPlace === 'HOME' ? 'Home Visit' : 'In-Clinic Consultation');

      const resolvedTherapistName = a.therapistName || tUser?.name || t?.name || 'Dr. Specialist';
      const resolvedSpecialization = t?.specializations?.[0] || 'Physiotherapy Specialist';
      const resolvedAvatar = tUser?.profileImageUrl || t?.avatarUrl || null;

      let effectiveStatus = a.status?.toUpperCase() || 'CONFIRMED';
      if (effectiveStatus === 'CONFIRMED' && new Date(a.endTime || a.startTime) < startOfToday) {
        effectiveStatus = 'COMPLETED';
      }

      return {
        _id: a._id,
        id: `#APT-${a._id.toString().slice(-6).toUpperCase()}`,
        patientId: a.patientId,
        patientName: resolvedPatientName,
        patientPhone: resolvedPatientPhone,
        patientSubtitle: resolvedPatientPhone ? `${resolvedPatientPhone} • ${resolvedPatientConcern}` : resolvedPatientConcern,
        therapistId: a.therapistId,
        therapistName: resolvedTherapistName,
        therapistSubtitle: resolvedSpecialization,
        therapistAvatar: resolvedAvatar,
        serviceType: a.serviceType,
        appointmentPlace: a.appointmentPlace,
        type: a.serviceType?.replace(/_/g, ' ') || a.appointmentPlace || 'Physiotherapy Session',
        startTime: a.startTime,
        endTime: a.endTime,
        durationMin: a.durationMin || 30,
        status: effectiveStatus,
        paymentStatus: a.paymentStatus || 'PENDING',
        amount: a.amount || 0,
        currency: a.currency || 'INR',
        holdExpiresAt: a.holdExpiresAt,
        createdAt: a.createdAt,
      };
    };

    // Filter by search term on enriched fields
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a => {
        const enriched = enrichAppointment(a);
        return (
          enriched.patientName.toLowerCase().includes(q) ||
          enriched.therapistName.toLowerCase().includes(q) ||
          enriched.patientSubtitle.toLowerCase().includes(q) ||
          enriched.type.toLowerCase().includes(q) ||
          enriched.id.toLowerCase().includes(q)
        );
      });
    }

    // Pagination
    const total = filtered.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAppts = filtered.slice(skip, skip + parseInt(limit)).map(enrichAppointment);

    // Enriched timeline & pending lists
    const enrichedTimeline = todayAppointments.map(enrichAppointment).map(a => ({
      id: a._id,
      name: a.patientName,
      detail: `${new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} - ${a.type}`,
      status: a.status,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

    const enrichedPending = pendingAppts.map(enrichAppointment);

    res.json({
      success: true,
      data: {
        summary,
        appointments: paginatedAppts,
        timeline: enrichedTimeline,
        pendingConfirmations: enrichedPending,
        meta: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error('[getAppointmentsDashboard] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── STRICT STATE MACHINE STATUS TRANSITION HANDLER ─────────────────────────────
// PATCH /api/v1/appointments/:id/status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: requestedStatus, reason } = req.body;
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    const appt = await Appointment.findById(id);
    if (!appt || appt.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    const currentStatus = appt.status?.toUpperCase();
    const nextStatus = requestedStatus?.toUpperCase();
    const now = new Date();

    // Allowed Transitions State Machine:
    const ALLOWED_TRANSITIONS = {
      'HELD': ['CONFIRMED', 'EXPIRED', 'CANCELLED'],
      'CONFIRMED': ['IN_PROGRESS', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW', 'RESCHEDULE_REQUESTED', 'COMPLETED'],
      'RESCHEDULE_REQUESTED': ['CONFIRMED', 'CANCELLED'],
      'CHECKED_IN': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      'IN_PROGRESS': ['DOCUMENTATION_PENDING', 'DOCUMENTED', 'COMPLETED', 'CANCELLED'],
      'DOCUMENTATION_PENDING': ['DOCUMENTED', 'COMPLETED'],
      'DOCUMENTED': ['COMPLETED'],
      // Terminal states cannot transition to anything
      'COMPLETED': [],
      'CANCELLED': [],
      'CANCELLED_BY_PATIENT': [],
      'CANCELLED_BY_DOCTOR': [],
      'CANCELLED_BY_CLINIC': [],
      'EXPIRED': [],
      'NO_SHOW': [],
    };

    if (!ALLOWED_TRANSITIONS[currentStatus] || !ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot transition appointment from status '${currentStatus}' to '${nextStatus}'.`,
          currentStatus,
          allowedTransitions: ALLOWED_TRANSITIONS[currentStatus] || []
        }
      });
    }

    // Timestamp Validations:
    if (nextStatus === 'IN_PROGRESS') {
      const startTime = new Date(appt.startTime);
      const endTime = new Date(appt.endTime);
      const allowedEarliest = new Date(startTime.getTime() - 15 * 60 * 1000);
      if (now < allowedEarliest) {
        return res.status(400).json({
          success: false,
          error: { code: 'TIMESTAMP_VALIDATION_ERROR', message: `Cannot start appointment before scheduled slot (${startTime.toLocaleTimeString()}).` }
        });
      }
      if (now > endTime) {
        return res.status(400).json({
          success: false,
          error: { code: 'TIMESTAMP_VALIDATION_ERROR', message: `Cannot start appointment as scheduled slot has ended (${endTime.toLocaleTimeString()}).` }
        });
      }
      appt.startedAt = now;
    }

    if (nextStatus === 'COMPLETED' || nextStatus === 'DOCUMENTED') {
      if (now < new Date(appt.startTime)) {
        return res.status(400).json({
          success: false,
          error: { code: 'TIMESTAMP_VALIDATION_ERROR', message: 'Cannot mark a future appointment as completed.' }
        });
      }
      appt.completedAt = now;
    }

    if (nextStatus.includes('CANCELLED')) {
      appt.cancelledAt = now;
      if (reason) appt.cancellationReason = reason;
    }

    if (nextStatus === 'CONFIRMED') {
      appt.confirmedAt = now;
      appt.holdExpiresAt = undefined;
    }

    appt.status = nextStatus;
    await appt.save();

    await publishEvent('appointment.status_updated', {
      appointmentId: appt._id,
      previousStatus: currentStatus,
      newStatus: nextStatus,
      updatedBy: userId,
      role: userRole,
      timestamp: now.toISOString()
    });

    res.json({ success: true, data: { appointment: appt } });
  } catch (err) {
    console.error('[updateAppointmentStatus] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};



