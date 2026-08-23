import { v4 as uuidv4 } from 'uuid';
import Appointment from '../models/Appointment.js';
import AppointmentReschedule from '../models/AppointmentReschedule.js';
import TherapistSchedule from '../models/TherapistSchedule.js';
import ConsultationLead from '../models/ConsultationLead.js';
import { acquireSlotLock, releaseSlotLock } from '../utils/redis.js';
import { publishEvent } from '../utils/rabbitmq.js';
import { resolveTherapistIds, fetchUsersByIds } from '../utils/therapistHelper.js';
import { assertAppointmentTransition } from '../utils/stateTransitions.js';
import { logAudit } from '../utils/auditLogger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const requesterId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
  const userRole    = req.user?.role || req.headers['x-user-role'];

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

  const resolvedPlace = (appointmentPlace || 'CLINIC').toUpperCase();
  const isHomeVisit = resolvedPlace === 'HOME';
  const HOME_VISIT_TRAVEL_BUFFER_MS = 30 * 60 * 1000;

  const lockKey = times.start.toISOString();
  let lockAcquired = false;
  try {
    // Step 1: Acquire distributed Redis lock
    lockAcquired = await acquireSlotLock(therapistId, lockKey, requestId);
    if (!lockAcquired) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'This slot is no longer available. Please choose another.' } });
    }

    // Step 2: Atomic DB conflict check with Travel Buffer support
    const checkStart = new Date(times.start.getTime() - (isHomeVisit ? HOME_VISIT_TRAVEL_BUFFER_MS : 0));
    const checkEnd   = new Date(times.end.getTime()   + (isHomeVisit ? HOME_VISIT_TRAVEL_BUFFER_MS : 0));

    const potentialConflicts = await Appointment.find({
      therapistId,
      isDeleted: false,
      startTime: { $lt: checkEnd },
      endTime: { $gt: checkStart },
      $or: [
        { status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN', 'DOCUMENTATION_PENDING', 'DOCUMENTED', 'RESCHEDULE_REQUESTED'] } },
        { status: 'HELD', holdExpiresAt: { $gt: new Date() } },
      ],
    });

    const hasConflict = potentialConflicts.some(existing => {
      const isExistingHome = (existing.appointmentPlace || '').toUpperCase() === 'HOME' || existing.serviceType === 'HOME_VISIT';
      const effExistingStart = isExistingHome ? new Date(existing.startTime.getTime() - HOME_VISIT_TRAVEL_BUFFER_MS) : existing.startTime;
      const effExistingEnd   = isExistingHome ? new Date(existing.endTime.getTime()   + HOME_VISIT_TRAVEL_BUFFER_MS) : existing.endTime;

      const effReqStart = isHomeVisit ? new Date(times.start.getTime() - HOME_VISIT_TRAVEL_BUFFER_MS) : times.start;
      const effReqEnd   = isHomeVisit ? new Date(times.end.getTime()   + HOME_VISIT_TRAVEL_BUFFER_MS) : times.end;

      return effExistingStart < effReqEnd && effExistingEnd > effReqStart;
    });

    if (hasConflict) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'This slot (or required travel buffer for Home Visit) is unavailable. Please choose another.' } });
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

    // Extract & Authoritatively Construct Home Visit Address Snapshot
    let patientAddressSnapshot = undefined;

    if (isHomeVisit) {
      const rawAddr = req.body.homeVisitAddress || req.body.address || req.body.patientAddress || req.body.patientAddressSnapshot || {};
      const addrLine1 = typeof rawAddr === 'string' ? rawAddr.trim() : String(rawAddr.addressLine1 || rawAddr.street || rawAddr.address || '').trim();
      const addrLine2 = typeof rawAddr === 'object' ? String(rawAddr.addressLine2 || '').trim() : '';
      const landmark = typeof rawAddr === 'object' ? String(rawAddr.landmark || '').trim() : '';
      const city = typeof rawAddr === 'object' ? String(rawAddr.city || '').trim() : '';
      const state = typeof rawAddr === 'object' ? String(rawAddr.state || '').trim() : '';
      const postalCode = typeof rawAddr === 'object' ? String(rawAddr.postalCode || rawAddr.pincode || '').trim() : '';
      const country = typeof rawAddr === 'object' ? String(rawAddr.country || 'India').trim() : 'India';

      if (!addrLine1 || !city || !state || !postalCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'ADDRESS_INCOMPLETE', message: 'Complete address (Street, City, State, Pincode) is required for Home Visit consultations.' }
        });
      }

      const hasRawCoords = typeof rawAddr === 'object' && (rawAddr.latitude !== undefined || rawAddr.lat !== undefined || rawAddr.longitude !== undefined || rawAddr.lng !== undefined);
      let lat = typeof rawAddr === 'object' ? Number(rawAddr.latitude ?? rawAddr.lat) : NaN;
      let lng = typeof rawAddr === 'object' ? Number(rawAddr.longitude ?? rawAddr.lng) : NaN;

      if (hasRawCoords) {
        const areCoordsValid =
          Number.isFinite(lat) && Number.isFinite(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180;

        if (!areCoordsValid) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_COORDINATES', message: 'Invalid GPS coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.' }
          });
        }
      }

      const hasValidCoords =
        Number.isFinite(lat) && Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180;

      patientAddressSnapshot = {
        addressLine1: addrLine1,
        addressLine2: addrLine2 || undefined,
        landmark: landmark || undefined,
        city,
        state,
        postalCode,
        country,
        location: hasValidCoords ? {
          type: 'Point',
          coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
        } : undefined,
        latitude: hasValidCoords ? lat : undefined,
        longitude: hasValidCoords ? lng : undefined,
        capturedAt: new Date(),
      };

      // Non-blocking asynchronous update to Identity Service if saveToProfile requested
      if (req.body.saveToProfile && patientId) {
        (async () => {
          const normalizedAddress = {
            addressLine1: addrLine1,
            addressLine2: addrLine2,
            landmark,
            city: city || 'Bengaluru',
            state: state || 'Karnataka',
            postalCode: postalCode || '560038',
            country: country || 'India',
          };
          const eventId = `evt_addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

          // Publish event to RabbitMQ event bus
          try {
            await publishEvent('patient.address_updated', {
              eventId,
              patientId,
              address: normalizedAddress,
              timestamp: new Date().toISOString(),
            });
          } catch (evtErr) {
            // Silently fall back to direct internal API if broker is unreachable
            try {
              const identityUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
              await fetch(`${identityUrl}/api/v1/patients/${patientId}/profile`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'x-internal-key': process.env.INTERNAL_API_KEY || 'onemedical_internal_key_change_in_prod',
                  'x-user-role': 'patient',
                  'x-user-id': patientId,
                },
                body: JSON.stringify({ address: normalizedAddress, eventId })
              });
            } catch (httpErr) {
              console.warn('[holdAppointment] Non-blocking profile address sync failed:', httpErr.message);
            }
          }
        })();
      }
    } else {
      patientAddressSnapshot = undefined;
    }

    const therapistAvatarUrl = therapistProfile.profileImageUrl || therapistProfile.avatarUrl || therapistProfile.avatar || therapistProfile.user?.profileImageUrl || undefined;

    const appointment = await Appointment.create({
      patientId,
      patientName:  resolvedPatientName || undefined,
      therapistId,
      therapistName,
      therapistAvatarUrl,
      serviceType:  normalizedServiceType,
      appointmentPlace: resolvedPlace,
      patientAddressSnapshot,
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

    const payAmt = appointment.amount ? (appointment.amount > 5000 ? Math.round(appointment.amount / 100) : appointment.amount) : 500;
    const isPaid = appointment.paymentStatus === 'PAID';

    res.status(201).json({ success: true, data: { appointment: {
      _id:          appointment._id,
      status:       appointment.status,
      holdExpiresAt:appointment.holdExpiresAt,
      startTime:    appointment.startTime,
      endTime:      appointment.endTime,
      amount:       payAmt,
      paymentAmount:payAmt,
      currency:     appointment.currency,
      paymentStatus:appointment.paymentStatus,
      paymentRequired: !isPaid,
      appointmentPlace: (appointment.appointmentPlace || 'CLINIC').toUpperCase(),
      invoiceStatus: isPaid ? 'PAID' : 'PENDING',
      therapistName:appointment.therapistName,
      therapistAvatarUrl: appointment.therapistAvatarUrl,
      patientName:  appointment.patientName,
      serviceType:  appointment.serviceType,
      patientAddressSnapshot: appointment.patientAddressSnapshot,
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
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const validKeys = [
      process.env.INTERNAL_API_KEY,
      'onemedical_internal_key_change_in_prod',
      'onemedical_internal_key_production_2026'
    ].filter(Boolean);

    const allowedRoles = ['clinic_admin', 'super_admin', 'admin', 'therapist', 'system'];
    if (!validKeys.includes(internalKey) && !allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to confirm appointments.' } });
    }

    const { id } = req.params;
    const { paymentOrderId, paymentId, transactionId } = req.body;

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

    // Check payment capture flags
    const isPaid = Boolean(paymentId || transactionId || req.body.paymentStatus === 'PAID');

    // If already confirmed: check if we are settling payment
    if (appointment.status === 'CONFIRMED') {
      if (isPaid) {
        appointment.paymentStatus = 'PAID';
        appointment.paymentOrderId = paymentOrderId || appointment.paymentOrderId;
        appointment.paymentId = paymentId || appointment.paymentId;
        appointment.transactionId = transactionId || appointment.transactionId;
        appointment.holdExpiresAt = null;
        await appointment.save();

        const appointmentDate = appointment.startTime
          ? new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
          : '';
        const appointmentTime = appointment.startTime
          ? new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
          : '';

        await publishEvent('appointment.confirmed', {
          eventId: `APPT_CONFIRMED:${appointment._id}`,
          type: 'appointment.confirmed',
          appointmentId: appointment._id,
          transactionId: transactionId || appointment.transactionId,
          patientId: appointment.patientId,
          therapistId: appointment.therapistId,
          patientName: appointment.patientName,
          therapistName: appointment.therapistName,
          serviceName: appointment.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Consultation',
          startTime: appointment.startTime,
          appointmentPlace: appointment.appointmentPlace || 'CLINIC',
          appointmentDate,
          appointmentTime,
        });

        return res.json({ success: true, message: 'Payment settled on confirmed appointment.', data: { appointment } });
      }

      await appointment.save();
      return res.json({ success: true, data: { appointment }, idempotent: true });
    }

    if (appointment.status === 'EXPIRED') {
      return res.status(400).json({ success: false, error: { code: 'HOLD_EXPIRED', message: 'This appointment hold has expired.' } });
    }
    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: { code: 'CANNOT_CONFIRM_CANCELLED', message: 'Cannot confirm a cancelled appointment.' } });
    }
    if (appointment.status !== 'HELD' && appointment.status !== 'RESCHEDULE_REQUESTED') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot confirm appointment in status: ${appointment.status}` } });
    }

    appointment.status         = 'CONFIRMED';
    appointment.paymentStatus  = isPaid ? 'PAID' : (appointment.paymentStatus || 'PENDING');
    appointment.paymentOrderId = paymentOrderId || appointment.paymentOrderId;
    appointment.paymentId      = paymentId || appointment.paymentId;
    appointment.transactionId  = transactionId || appointment.transactionId;
    appointment.holdExpiresAt  = null;
    await appointment.save();

    const appointmentDate = appointment.startTime
      ? new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : '';
    const appointmentTime = appointment.startTime
      ? new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
      : '';

    if (appointment.paymentStatus === 'PAID') {
      await publishEvent('appointment.confirmed', {
        eventId:         `APPT_CONFIRMED:${appointment._id}`,
        type:            'appointment.confirmed',
        appointmentId:   appointment._id,
        transactionId:   transactionId || appointment.transactionId,
        patientId:       appointment.patientId,
        therapistId:     appointment.therapistId,
        patientName:     appointment.patientName,
        therapistName:   appointment.therapistName,
        serviceName:     appointment.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Consultation',
        startTime:       appointment.startTime,
        appointmentPlace: appointment.appointmentPlace || 'CLINIC',
        appointmentDate,
        appointmentTime,
      });
    } else {
      // Emit idempotent PAYMENT_DUE notification for unpaid confirmed booking
      await publishEvent('payment.due', {
        eventId:         `PAYMENT_DUE:${appointment._id}`,
        type:            'payment.due',
        appointmentId:   appointment._id,
        patientId:       appointment.patientId,
        therapistId:     appointment.therapistId,
        patientName:     appointment.patientName,
        therapistName:   appointment.therapistName,
        amount:          appointment.amount,
        appointmentPlace: appointment.appointmentPlace || 'CLINIC',
        serviceType:     appointment.serviceType,
        startTime:       appointment.startTime,
        appointmentDate,
        appointmentTime,
      });
    }

    const apptObj = appointment.toObject ? appointment.toObject() : { ...appointment };
    const payAmt = apptObj.amount ? (apptObj.amount > 5000 ? Math.round(apptObj.amount / 100) : apptObj.amount) : 500;
    const isPaidAppt = apptObj.paymentStatus === 'PAID';
    apptObj.paymentAmount = payAmt;
    apptObj.paymentRequired = !isPaidAppt;
    apptObj.appointmentPlace = (apptObj.appointmentPlace || 'CLINIC').toUpperCase();
    apptObj.invoiceStatus = isPaidAppt ? 'PAID' : (apptObj.paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING');

    res.json({ success: true, data: { appointment: apptObj } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ CANCEL APPOINTMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId   = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    const appointment = await Appointment.findById(id);
    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    if (userRole === 'patient'   && appointment.patientId?.toString()   !== userId?.toString()) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only cancel your own appointments.' } });
    if (userRole === 'therapist' && appointment.therapistId?.toString() !== userId?.toString()) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only cancel appointments on your schedule.' } });

    const isClinicAdmin = userRole === 'clinic_admin' || userRole === 'super_admin' || Boolean(req.headers['x-internal-key']);
    const isTherapist = userRole === 'therapist';
    const isProviderFault = /therapist|doctor|clinic|admin|emergency|not join|no show|absent|hospital/i.test(reason || '');

    // State machine check
    assertAppointmentTransition(appointment.status, 'CANCELLED', isClinicAdmin);

    let cancellationPolicy = 'NOT_APPLICABLE';
    let eventName = 'appointment.cancelled';

    if (appointment.status === 'CONFIRMED' || appointment.status === 'HELD') {
      const hoursAway = (appointment.startTime - new Date()) / (1000 * 60 * 60);

      // If cancelled by admin/therapist or due to provider fault, ALWAYS 100% refund eligible
      if (isClinicAdmin || isTherapist || isProviderFault) {
        cancellationPolicy = 'REFUND_ELIGIBLE';
        eventName = 'appointment.cancelled_refund_eligible';
      } else {
        cancellationPolicy = hoursAway > 24 ? 'REFUND_ELIGIBLE' : 'NO_REFUND';
        eventName = hoursAway > 24 ? 'appointment.cancelled_refund_eligible' : 'appointment.cancelled_no_refund';
      }
    }

    appointment.status             = 'CANCELLED';
    appointment.cancellationReason = reason || (isClinicAdmin ? 'Cancelled by administrator' : '');
    appointment.cancellationPolicy = cancellationPolicy;
    appointment.paymentStatus      = (appointment.paymentStatus === 'PAID' || appointment.amount > 0)
      ? (cancellationPolicy === 'REFUND_ELIGIBLE' ? 'REFUND_PENDING' : 'NOT_APPLICABLE')
      : 'NOT_APPLICABLE';
    await appointment.save();

    await publishEvent(eventName, {
      appointmentId: appointment._id, patientId: appointment.patientId,
      therapistId: appointment.therapistId, cancellationPolicy, amount: appointment.amount,
    });

    res.json({ success: true, data: { appointment } });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ COMPLETE APPOINTMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionSummary } = req.body;
    const userId   = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];

    const appointment = await Appointment.findById(id);
    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    const isAdmin = ['clinic_admin', 'super_admin', 'admin'].includes(userRole);
    if (userRole === 'therapist' && appointment.therapistId?.toString() !== userId?.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only complete appointments on your own schedule.' } });
    }

    // State machine validation
    assertAppointmentTransition(appointment.status, 'COMPLETED', isAdmin);

    appointment.status = 'COMPLETED';
    appointment.completedAt = new Date();
    if (sessionSummary) appointment.sessionSummary = sessionSummary;
    await appointment.save();

    await publishEvent('appointment.completed', {
      appointmentId: id,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      completedAt: appointment.completedAt,
    });

    // Invariant: Idempotent review prompt event with unique eventId
    await publishEvent('appointment.review_prompt', {
      eventId: `REVIEW_PROMPT:${appointment._id}`,
      type: 'appointment.review_prompt',
      appointmentId: appointment._id.toString(),
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      doctorName: appointment.therapistName,
      patientName: appointment.patientName,
      serviceType: appointment.serviceType,
    });

    res.json({ success: true, data: { appointment } });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
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
      filter.status = {
        $in: [
          'CONFIRMED', 'confirmed',
          'CHECKED_IN', 'checked_in',
          'IN_PROGRESS', 'in_progress',
          'HELD', 'held',
          'RESCHEDULED', 'rescheduled',
          'PENDING', 'pending'
        ]
      };
      // Include appointments from the beginning of today onwards (IST)
      const nowIST = new Date(Date.now() + 5.5 * 60 * 1000);
      const startOfTodayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - 5.5 * 60 * 60 * 1000);
      filter.startTime = { $gte: startOfTodayIST };
    } else if (view === 'past') {
      const nowIST = new Date(Date.now() + 5.5 * 60 * 1000);
      const startOfTodayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - 5.5 * 60 * 60 * 1000);
      filter.$or = [
        { status: { $in: ['COMPLETED', 'completed', 'DOCUMENTED', 'documented', 'DOCUMENTATION_PENDING', 'documentation_pending', 'NO_SHOW', 'no_show', 'PROVIDER_NO_SHOW', 'PATIENT_NO_SHOW', 'NO_ATTENDANCE', 'TECHNICAL_FAILURE'] } },
        { endTime: { $lt: now } },
        { startTime: { $lt: startOfTodayIST } },
      ];
    } else if (view === 'cancelled') {
      filter.$or = [
        { status: { $in: ['CANCELLED', 'cancelled', 'EXPIRED', 'expired', 'PAYMENT_EXPIRED', 'payment_expired', 'PROVIDER_NO_SHOW', 'NO_ATTENDANCE', 'PATIENT_NO_SHOW'] } },
        { cancellationPolicy: 'REFUND_ELIGIBLE' },
        { paymentStatus: { $in: ['REFUND_PENDING', 'REFUNDED'] } }
      ];
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
      const tImg = t?.profileImageUrl || t?.avatarUrl || t?.avatar || a.therapistAvatarUrl || undefined;
      const pImg = p?.profileImageUrl || p?.avatarUrl || p?.avatar || a.patientAvatarUrl || undefined;
      const payStatus = a.paymentStatus || 'PENDING';
      const isPaid = payStatus === 'PAID';
      const amtClean = a.amount ? (a.amount > 5000 ? Math.round(a.amount / 100) : a.amount) : 500;
      return {
        ...a,
        patientName: a.patientName || p?.name || 'Patient',
        therapistName: t?.name || a.therapistName || 'Dr. Specialist',
        therapistAvatarUrl: tImg,
        avatarUrl: tImg,
        patientAvatarUrl: pImg,
        paymentStatus: payStatus,
        paymentRequired: !isPaid,
        paymentAmount: amtClean,
        appointmentPlace: (a.appointmentPlace || 'CLINIC').toUpperCase(),
        invoiceStatus: isPaid ? 'PAID' : (payStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING'),
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
    const userId   = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;

    const appointment = await Appointment.findById(id).lean();
    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    // Role check (allow admin or matched user)
    const isAdmin = ['clinic_admin', 'super_admin'].includes(userRole);
    if (!isAdmin && userRole === 'patient' && appointment.patientId && appointment.patientId !== userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this appointment.' } });
    }

    // Enrich patient name and profile if missing
    if (appointment.patientId) {
      try {
        const users = await fetchUsersByIds([appointment.patientId]);
        if (users?.[0]) {
          appointment.patientName = appointment.patientName || users[0].name || undefined;
          appointment.patientPhone = users[0].phoneNumber || undefined;
          appointment.patientAge = users[0].age || users[0].profile?.age || undefined;
          appointment.patientGender = users[0].gender || users[0].profile?.gender || undefined;
          appointment.patientAvatarUrl = appointment.patientAvatarUrl || users[0].profileImageUrl || users[0].avatarUrl || users[0].avatar || users[0].profile?.profileImageUrl || undefined;
        }
      } catch (err) {
        console.warn('[getAppointmentById] Error fetching patient info:', err.message);
      }
    }

    // Enrich therapist profile and clinic details
    if (appointment.therapistId) {
      try {
        const therapistProfile = await fetchTherapistProfile(appointment.therapistId);
        if (therapistProfile) {
          appointment.therapistName = therapistProfile.name || therapistProfile.fullName || appointment.therapistName || undefined;
          appointment.therapistSpecialty = therapistProfile.specialty || therapistProfile.specialization || undefined;
          appointment.therapistAvatarUrl = therapistProfile.profileImageUrl || therapistProfile.avatarUrl || therapistProfile.avatar || undefined;
          appointment.therapistPhone = therapistProfile.phoneNumber || therapistProfile.phone || undefined;
          appointment.clinicLocation = therapistProfile.clinicLocation || undefined;
          appointment.doctorRegNo = therapistProfile.registrationNumber || therapistProfile.regNumber || undefined;
          appointment.ratingAvg = therapistProfile.ratingAvg || undefined;
        }
      } catch (err) {
        console.warn('[getAppointmentById] Error fetching therapist info:', err.message);
      }
    }

    // Formatted IST timestamps
    if (appointment.startTime) {
      const sDate = new Date(appointment.startTime);
      const eDate = appointment.endTime ? new Date(appointment.endTime) : new Date(sDate.getTime() + (appointment.durationMin || 30) * 60000);

      appointment.formattedDate = sDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });

      appointment.formattedTime = `${sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} - ${eDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}`;
      appointment.dateString = `${appointment.formattedDate} • ${sDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}`;
    }

    const payStatus = appointment.paymentStatus || 'PENDING';
    const isPaid = payStatus === 'PAID';
    const amtClean = appointment.amount ? (appointment.amount > 5000 ? Math.round(appointment.amount / 100) : appointment.amount) : 500;

    appointment.paymentStatus = payStatus;
    appointment.paymentRequired = !isPaid;
    appointment.paymentAmount = amtClean;
    appointment.appointmentPlace = (appointment.appointmentPlace || 'CLINIC').toUpperCase();
    appointment.invoiceStatus = isPaid ? 'PAID' : (payStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING');

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

// ─── RESCHEDULE APPOINTMENT (In-Place Mutation Pattern) ─────────────────────────
// Mutates existing appointment slot in-place: preserves appointmentId, financial fields,
// paymentStatus, and transaction reference without generating duplicate records.
export const rescheduleAppointment = async (req, res) => {
  const requestId = uuidv4();
  const userId    = req.user?.userId || req.user?.id || req.headers['x-user-id'];
  const userRole  = req.user?.role || req.headers['x-user-role'];
  const { id }    = req.params;

  let newLockAcquired = false;
  let newLockTherapistId = null;
  let times = null;

  try {
    const appt = await Appointment.findById(id);
    if (!appt || appt.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    if (userRole === 'patient' && appt.patientId?.toString() !== userId?.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only reschedule your own appointments.' } });
    }

    const reschedulableStatuses = ['CONFIRMED', 'HELD', 'SCHEDULED', 'RESCHEDULE_REQUESTED'];
    if (!reschedulableStatuses.includes(appt.status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Cannot reschedule appointment in ${appt.status} status.` } });
    }

    const rawStart = req.body.startTime || req.body.newStartTime;
    let rawEnd   = req.body.endTime || req.body.newEndTime;

    if (rawStart && !rawEnd) {
      const s = new Date(rawStart);
      const dur = appt.durationMin || 45;
      rawEnd = new Date(s.getTime() + dur * 60 * 1000).toISOString();
    }

    times = parseSlotTimes(rawStart, rawEnd);
    if (!times) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid startTime/endTime.' } });
    }
    if (times.start <= new Date()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot reschedule to a slot in the past.' } });
    }

    newLockTherapistId = appt.therapistId;
    const newLockKey = times.start.toISOString();

    // Step 1: Lock new slot
    newLockAcquired = await acquireSlotLock(newLockTherapistId, newLockKey, requestId);
    if (!newLockAcquired) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'The new slot is no longer available.' } });
    }

    // Step 2: Conflict check with Travel Buffer (strictly exclude current appointment ID)
    const isReschedHome = (appt.appointmentPlace || '').toUpperCase() === 'HOME' || appt.serviceType === 'HOME_VISIT';
    const HOME_VISIT_TRAVEL_BUFFER_MS = 30 * 60 * 1000;
    const checkStart = new Date(times.start.getTime() - (isReschedHome ? HOME_VISIT_TRAVEL_BUFFER_MS : 0));
    const checkEnd   = new Date(times.end.getTime()   + (isReschedHome ? HOME_VISIT_TRAVEL_BUFFER_MS : 0));

    const potentialConflicts = await Appointment.find({
      _id: { $ne: appt._id },
      therapistId: newLockTherapistId,
      startTime: { $lt: checkEnd },
      endTime: { $gt: checkStart },
      isDeleted: false,
      $or: [
        { status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'CHECKED_IN', 'DOCUMENTATION_PENDING', 'DOCUMENTED', 'RESCHEDULE_REQUESTED'] } },
        { status: 'HELD', holdExpiresAt: { $gt: new Date() } }
      ],
    });

    const hasConflict = potentialConflicts.some(existing => {
      const isExistingHome = (existing.appointmentPlace || '').toUpperCase() === 'HOME' || existing.serviceType === 'HOME_VISIT';
      const effExistingStart = isExistingHome ? new Date(existing.startTime.getTime() - HOME_VISIT_TRAVEL_BUFFER_MS) : existing.startTime;
      const effExistingEnd   = isExistingHome ? new Date(existing.endTime.getTime()   + HOME_VISIT_TRAVEL_BUFFER_MS) : existing.endTime;

      const effReqStart = isReschedHome ? new Date(times.start.getTime() - HOME_VISIT_TRAVEL_BUFFER_MS) : times.start;
      const effReqEnd   = isReschedHome ? new Date(times.end.getTime()   + HOME_VISIT_TRAVEL_BUFFER_MS) : times.end;

      return effExistingStart < effReqEnd && effExistingEnd > effReqStart;
    });

    if (hasConflict) {
      return res.status(409).json({ success: false, error: { code: 'SLOT_UNAVAILABLE', message: 'The new slot (or required travel buffer for Home Visit) is unavailable.' } });
    }

    // Capture old time window for audit record
    const oldStartTime = appt.startTime;
    const oldEndTime   = appt.endTime;

    // Step 3: In-Place Mutation on SAME appointment record
    appt.startTime       = times.start;
    appt.endTime         = times.end;
    appt.durationMin     = Math.round((times.end - times.start) / 60000);
    appt.status          = 'CONFIRMED';
    appt.holdExpiresAt   = null;
    appt.rescheduleCount = (appt.rescheduleCount || 0) + 1;
    appt.rescheduledAt   = new Date();
    appt.rescheduledBy   = userRole === 'therapist' ? 'DOCTOR' : (userRole === 'clinic_admin' || userRole === 'super_admin' ? 'CLINIC_ADMIN' : 'PATIENT');
    appt.proposedReschedule = undefined;
    appt.cancellationReason = undefined;
    appt.cancellationPolicy = undefined;
    // Retain all existing financial fields unchanged (amount, currency, paymentStatus, transactionId, paymentOrderId, paymentId)
    await appt.save();

    // Step 4: Record audit trail in AppointmentReschedule with ZERO fee difference
    try {
      await AppointmentReschedule.create({
        appointmentId:    appt._id,
        patientId:        appt.patientId,
        oldTherapistId:   appt.therapistId,
        oldTherapistName: appt.therapistName,
        oldStartTime,
        oldEndTime,
        newTherapistId:   appt.therapistId,
        newTherapistName: appt.therapistName,
        newStartTime:     appt.startTime,
        newEndTime:       appt.endTime,
        requestedBy:      appt.rescheduledBy,
        reason:           req.body.reason || req.body.notes || 'Rescheduled by user',
        status:           'APPLIED',
        feeAdjustment: {
          originalFee:   appt.amount || 0,
          newFee:        appt.amount || 0,
          difference:    0,
          paymentStatus: 'ZERO_DIFF',
        },
        acceptedAt: new Date(),
      });
    } catch (auditErr) {
      console.warn('[rescheduleAppointment] Audit log warning:', auditErr.message);
    }

    const appointmentDate = appt.startTime
      ? new Date(appt.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : '';
    const appointmentTime = appt.startTime
      ? new Date(appt.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
      : '';

    // Step 5: Publish domain event with complete clinical context for multi-channel notifications
    await publishEvent('appointment.rescheduled', {
      appointmentId:   appt._id,
      patientId:       appt.patientId,
      therapistId:     appt.therapistId,
      patientName:     appt.patientName,
      therapistName:   appt.therapistName,
      serviceName:     appt.serviceType?.replace(/_/g, ' ') || 'Physiotherapy Consultation',
      serviceType:     appt.serviceType,
      oldStartTime,
      newStartTime:    appt.startTime,
      startTime:       appt.startTime,
      endTime:         appt.endTime,
      appointmentDate,
      appointmentTime,
      newDate:         appointmentDate,
      newTime:         appointmentTime,
      rescheduledBy:   userRole,
    });

    res.json({ success: true, data: { appointment: appt } });
  } catch (err) {
    console.error('[rescheduleAppointment] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  } finally {
    if (newLockAcquired && newLockTherapistId && times?.start) {
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
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const startOfToday = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - 5.5 * 60 * 60 * 1000);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

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
      const resolvedPatientAvatar = a.patientAvatarUrl || p?.profileImageUrl || p?.avatarUrl || p?.avatar || p?.profile?.profileImageUrl || null;

      const resolvedTherapistName = a.therapistName || tUser?.name || t?.name || 'Dr. Specialist';
      const resolvedSpecialization = t?.specializations?.[0] || 'Physiotherapy Specialist';
      const resolvedAvatar = a.therapistAvatarUrl || tUser?.profileImageUrl || tUser?.avatarUrl || t?.profileImageUrl || t?.avatarUrl || t?.avatar || null;

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
        patientAvatar: resolvedPatientAvatar,
        patientAvatarUrl: resolvedPatientAvatar,
        therapistId: a.therapistId,
        therapistName: resolvedTherapistName,
        therapistSubtitle: resolvedSpecialization,
        therapistAvatar: resolvedAvatar,
        therapistAvatarUrl: resolvedAvatar,
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
      detail: `${new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} - ${a.type}`,
      status: a.status,
      sessionStatus: a.sessionStatus || 'NOT_STARTED',
      attendanceOutcome: a.attendanceOutcome || null,
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
      'CONFIRMED': ['EN_ROUTE', 'ARRIVED', 'CHECKED_IN', 'IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'PROVIDER_NO_SHOW', 'PATIENT_NO_SHOW', 'NO_ATTENDANCE', 'TECHNICAL_FAILURE', 'RESCHEDULE_REQUESTED', 'COMPLETED'],
      'RESCHEDULE_REQUESTED': ['CONFIRMED', 'CANCELLED', 'HELD'],
      'EN_ROUTE': ['ARRIVED', 'CHECKED_IN', 'CANCELLED'],
      'ARRIVED': ['CHECKED_IN', 'IN_PROGRESS', 'CANCELLED'],
      'CHECKED_IN': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'PROVIDER_NO_SHOW', 'PATIENT_NO_SHOW', 'TECHNICAL_FAILURE'],
      'IN_PROGRESS': ['DOCUMENTATION_PENDING', 'DOCUMENTED', 'COMPLETED', 'TECHNICAL_FAILURE', 'CANCELLED'],
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
      'PROVIDER_NO_SHOW': [],
      'PATIENT_NO_SHOW': [],
      'NO_ATTENDANCE': [],
      'TECHNICAL_FAILURE': [],
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

    // Capture Home Visit Arrival & Check-In Verification
    if (nextStatus === 'ARRIVED' || nextStatus === 'CHECKED_IN') {
      const lat = Number(req.body.latitude ?? req.body.lat);
      const lng = Number(req.body.longitude ?? req.body.lng);
      const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      appt.arrivalLocation = {
        latitude: hasValidCoords ? lat : (appt.arrivalLocation?.latitude || appt.patientAddressSnapshot?.latitude),
        longitude: hasValidCoords ? lng : (appt.arrivalLocation?.longitude || appt.patientAddressSnapshot?.longitude),
        capturedAt: now,
      };
      if (nextStatus === 'CHECKED_IN') {
        appt.checkedInAt = now;
      }
    }

    // Timestamp Validations:
    if (nextStatus === 'IN_PROGRESS') {
      const startTime = new Date(appt.startTime);
      const endTime = new Date(appt.endTime);
      const allowedEarliest = new Date(startTime.getTime() - 15 * 60 * 1000);
      if (now < allowedEarliest) {
        return res.status(400).json({
          success: false,
          error: { code: 'TIMESTAMP_VALIDATION_ERROR', message: `Cannot start appointment before scheduled slot (${startTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}).` }
        });
      }
      appt.startedAt = now;
      appt.therapistJoinedAt = now;
      appt.sessionStatus = 'IN_PROGRESS';
    }

    if (nextStatus === 'COMPLETED' || nextStatus === 'DOCUMENTED') {
      if (now < new Date(appt.startTime)) {
        return res.status(400).json({
          success: false,
          error: { code: 'TIMESTAMP_VALIDATION_ERROR', message: 'Cannot mark a future appointment as completed.' }
        });
      }
      appt.completedAt = now;
      appt.sessionStatus = 'ENDED';
      appt.attendanceOutcome = 'COMPLETED';
    }

    if (nextStatus.includes('CANCELLED')) {
      appt.cancelledAt = now;
      appt.sessionStatus = 'ENDED';
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

// ─── UPDATE APPOINTMENT (INTERNAL / ADMIN) ───────────────────────────────────
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const appointment = await Appointment.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }
    res.json({ success: true, data: { appointment } });
  } catch (err) {
    console.error('[updateAppointment] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── PATIENT CHECK-IN ENDPOINT ────────────────────────────────────────────────
// POST /api/v1/appointments/:id/check-in
export const patientCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const now = new Date();

    const appt = await Appointment.findById(id);
    if (!appt || appt.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    if (appt.patientId !== userId && req.headers['x-user-role'] === 'patient') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only check in for your own appointment.' } });
    }

    // Telehealth Upfront Payment Enforcement
    const isTelehealth = appt.appointmentPlace === 'telehealth' || appt.serviceType === 'online_consultation' || appt.appointmentType === 'telehealth';
    if (isTelehealth && appt.paymentStatus !== 'PAID') {
      return res.status(402).json({
        success: false,
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Online telehealth consultations require upfront UPI payment before entering the session.',
        },
      });
    }

    // Check-in allowed from T - 15m onwards
    const allowedCheckInEarliest = new Date(new Date(appt.startTime).getTime() - 15 * 60 * 1000);
    if (now < allowedCheckInEarliest) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EARLY_CHECK_IN',
          message: `Check-in opens 15 minutes prior to session (${new Date(appt.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}).`,
        },
      });
    }

    const previousStatus = appt.status;
    const targetStatus = appt.status === 'CONFIRMED' ? 'CHECKED_IN' : appt.status;
    assertAppointmentTransition(previousStatus, targetStatus);

    const updatedAppt = await Appointment.findOneAndUpdate(
      { _id: id, version: appt.version || 1 },
      {
        $set: {
          patientCheckedInAt: now,
          patientJoinedAt: now,
          sessionStatus: 'WAITING',
          status: targetStatus,
        },
        $inc: { version: 1 }
      },
      { new: true }
    );

    if (!updatedAppt) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONCURRENCY_CONFLICT', message: 'Appointment was modified concurrently. Please refresh.' }
      });
    }

    logAudit({
      actorId: userId,
      actorRole: 'patient',
      action: 'PATIENT_CHECK_IN',
      resourceType: 'Appointment',
      resourceId: updatedAppt._id,
      beforeState: { status: previousStatus },
      afterState: { status: targetStatus, sessionStatus: 'WAITING' },
      req
    });

    await publishEvent('appointment.patient_checked_in', {
      appointmentId: updatedAppt._id,
      patientId: updatedAppt.patientId,
      therapistId: updatedAppt.therapistId,
      timestamp: now.toISOString(),
    });

    res.json({
      success: true,
      data: {
        message: 'Checked in successfully. Please wait for your therapist to join.',
        appointment: updatedAppt,
      },
    });
  } catch (err) {
    console.error('[patientCheckIn] Error:', err);
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── THERAPIST JOIN SESSION ENDPOINT ──────────────────────────────────────────
// POST /api/v1/appointments/:id/join
export const therapistJoinSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const now = new Date();

    const appt = await Appointment.findById(id);
    if (!appt || appt.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    if (userRole === 'therapist' && appt.therapistId !== userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not assigned to this appointment session.' } });
    }

    // Telehealth Upfront Payment Enforcement
    const isTelehealth = appt.appointmentPlace === 'telehealth' || appt.serviceType === 'online_consultation' || appt.appointmentType === 'telehealth';
    if (isTelehealth && appt.paymentStatus !== 'PAID') {
      return res.status(402).json({
        success: false,
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Online telehealth consultations require verified UPI payment before starting.',
        },
      });
    }

    const previousStatus = appt.status;
    assertAppointmentTransition(previousStatus, 'IN_PROGRESS');

    const updatedAppt = await Appointment.findOneAndUpdate(
      { _id: id, version: appt.version || 1 },
      {
        $set: {
          therapistJoinedAt: now,
          startedAt: appt.startedAt || now,
          sessionStatus: 'IN_PROGRESS',
          status: 'IN_PROGRESS',
        },
        $inc: { version: 1 }
      },
      { new: true }
    );

    if (!updatedAppt) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONCURRENCY_CONFLICT', message: 'Appointment was modified concurrently. Please refresh.' }
      });
    }

    logAudit({
      actorId: userId,
      actorRole: userRole || 'therapist',
      action: 'THERAPIST_JOIN_SESSION',
      resourceType: 'Appointment',
      resourceId: updatedAppt._id,
      beforeState: { status: previousStatus },
      afterState: { status: 'IN_PROGRESS', sessionStatus: 'IN_PROGRESS' },
      req
    });

    await publishEvent('clinical.consultation_started', {
      appointmentId: updatedAppt._id,
      patientId: updatedAppt.patientId,
      therapistId: updatedAppt.therapistId,
      timestamp: now.toISOString(),
    });

    res.json({
      success: true,
      data: {
        message: 'Joined consultation successfully.',
        appointment: updatedAppt,
      },
    });
  } catch (err) {
    console.error('[therapistJoinSession] Error:', err);
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * POST /appointments/public-booking
 * Public web consultation lead / enquiry for landing page visitors
 */
export const publicBooking = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      therapistId,
      preferredDoctor,
      serviceType = 'online',
      date = '',
      timeSlot = '',
      notes = '',
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Full name is required.' },
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone number is required.' },
      });
    }

    // Extract last 10 digits regardless of +91, 91, 0, or spaces
    const digitsOnly = phone.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid 10-digit mobile number.' },
      });
    }

    const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;

    // Resolve therapist info if provided
    let resolvedTherapistName = 'Specialist Team';
    let resolvedTherapistId = null;

    if (therapistId && therapistId !== 'undefined' && therapistId !== 'null') {
      const therapistProfile = await fetchTherapistProfile(therapistId);
      if (therapistProfile) {
        resolvedTherapistName = therapistProfile.name || therapistProfile.user?.name || preferredDoctor || 'Dr. Specialist';
        resolvedTherapistId = therapistProfile._id?.toString() || therapistProfile.userId?.toString() || therapistId;
      } else if (preferredDoctor) {
        resolvedTherapistName = preferredDoctor.includes('(') ? preferredDoctor.split('(')[0].trim() : preferredDoctor;
        resolvedTherapistId = therapistId;
      }
    } else if (preferredDoctor) {
      resolvedTherapistName = preferredDoctor.includes('(') ? preferredDoctor.split('(')[0].trim() : preferredDoctor;
    }

    const normService = (serviceType || '').toLowerCase();
    const mode = normService === 'online' || normService === 'video' ? 'VIDEO' : normService === 'home' ? 'HOME' : 'CLINIC';

    // Store consultation lead with status PENDING
    const lead = await ConsultationLead.create({
      name: name.trim(),
      phone: formattedPhone,
      email: email ? email.trim().toLowerCase() : '',
      therapistId: resolvedTherapistId,
      therapistName: resolvedTherapistName,
      serviceType: 'INITIAL_ASSESSMENT',
      appointmentPlace: mode,
      preferredDate: date || '',
      preferredTime: timeSlot || '',
      notes: notes ? notes.trim() : '',
      status: 'PENDING',
      source: 'LANDING_PAGE',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });

    logAudit({
      actorId: `lead_${cleanPhone.slice(-10)}`,
      actorRole: 'patient',
      action: 'PUBLIC_LANDING_LEAD_CREATED',
      resourceType: 'ConsultationLead',
      resourceId: lead._id,
      afterState: {
        status: 'PENDING',
        patientName: lead.name,
        therapistName: resolvedTherapistName,
        preferredDate: date,
        preferredTime: timeSlot,
      },
      req,
    });

    await publishEvent('clinical.consultation_lead_created', {
      leadId: lead._id,
      patientName: lead.name,
      patientPhone: lead.phone,
      patientEmail: lead.email,
      therapistId: resolvedTherapistId,
      therapistName: resolvedTherapistName,
      preferredDate: date,
      preferredTime: timeSlot,
      source: 'landing_page',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Your consultation request has been received.',
      data: {
        leadId: lead._id,
        patientName: lead.name,
        therapistName: resolvedTherapistName,
        preferredDate: lead.preferredDate,
        preferredTime: lead.preferredTime,
        appointmentPlace: lead.appointmentPlace,
        status: 'PENDING',
      },
    });
  } catch (err) {
    console.error('[publicBooking] error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to process consultation request. Please try again.' } });
  }
};

/**
 * GET /appointments/leads
 * List landing page consultation leads (Staff / Admin)
 */
export const listConsultationLeads = async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ name: q }, { phone: q }, { email: q }, { therapistName: q }, { notes: q }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leads, total, pendingCount] = await Promise.all([
      ConsultationLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ConsultationLead.countDocuments(filter),
      ConsultationLead.countDocuments({ status: 'PENDING' }),
    ]);

    res.json({
      success: true,
      data: leads,
      summary: {
        total,
        pendingCount,
      },
      meta: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * PATCH /appointments/leads/:id/status
 * Update consultation lead status
 */
export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = await ConsultationLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation lead not found.' } });
    }

    if (status) lead.status = status;
    if (notes) lead.notes = lead.notes ? `${lead.notes}\n[Update]: ${notes}` : notes;
    await lead.save();

    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * POST /appointments/:id/reminder
 * Send manual payment due or session reminder to patient from admin / clinician portal
 */
export const sendAppointmentReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderType, methods = { sms: true, email: true } } = req.body;
    const appointment = await Appointment.findById(id);

    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
    }

    // Resolve patient details
    let patientName = appointment.patientName || 'Patient';
    let patientPhone = '';
    let patientEmail = '';
    if (appointment.patientId) {
      try {
        const users = await fetchUsersByIds([appointment.patientId]);
        if (users?.[0]) {
          patientName = users[0].name || patientName;
          patientPhone = users[0].phoneNumber || '';
          patientEmail = users[0].email || '';
        }
      } catch (err) {
        console.warn('[sendAppointmentReminder] User lookup err:', err.message);
      }
    }

    const appointmentDate = appointment.startTime
      ? new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
      : '';
    const appointmentTime = appointment.startTime
      ? new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
      : '';

    const isUnpaid = (appointment.paymentStatus || 'PENDING') === 'PENDING';
    const isPaymentReminder = reminderType === 'PAYMENT_DUE' || (isUnpaid && reminderType !== 'SESSION');

    const eventId = isPaymentReminder
      ? `REMINDER_PAYMENT_DUE_${appointment._id}_${Date.now()}`
      : `REMINDER_SESSION_${appointment._id}_${Date.now()}`;

    if (isPaymentReminder) {
      await publishEvent('payment.due', {
        eventId,
        type: 'payment.due',
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        patientName,
        therapistName: appointment.therapistName,
        amount: appointment.amount,
        appointmentPlace: appointment.appointmentPlace || 'CLINIC',
        serviceType: appointment.serviceType,
        action: 'PAY_NOW',
        startTime: appointment.startTime,
        appointmentDate,
        appointmentTime,
        channels: methods,
      });
    } else {
      await publishEvent('appointment.reminder_1h', {
        eventId,
        type: 'appointment.reminder_1h',
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        patientName,
        therapistName: appointment.therapistName,
        appointmentPlace: appointment.appointmentPlace || 'CLINIC',
        startTime: appointment.startTime,
        appointmentDate,
        appointmentTime,
        channels: methods,
      });
    }

    res.json({
      success: true,
      message: isPaymentReminder ? 'Payment due reminder sent to patient.' : 'Session reminder sent to patient.',
      data: {
        appointmentId: appointment._id,
        reminderType: isPaymentReminder ? 'PAYMENT_DUE' : 'SESSION',
        channels: methods,
        sentAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    console.error('[sendAppointmentReminder] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};





