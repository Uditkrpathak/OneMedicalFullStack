import TelehealthSession from '../models/TelehealthSession.js';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Get dynamic ICE Servers (STUN + Dynamic TURN Fallback)
 * Provides reliable NAT traversal across symmetric NATs and mobile cellular firewalls.
 */
export const getIceServers = async (req, res) => {
  try {
    // Dynamic Ephemeral TURN Token generation if TURN_SECRET configured, or free OpenRelay fallback
    const turnSecret = process.env.TURN_SECRET || 'onemedical_telehealth_turn_secret_2026';
    const turnDomain = process.env.TURN_DOMAIN || 'openrelay.metered.ca';
    
    const expiry = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours expiry
    const username = `${expiry}:${req.headers['x-user-id'] || 'guest'}`;
    const hmac = crypto.createHmac('sha1', turnSecret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    const iceServers = [
      // Primary public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // STUN / TURN fallback relay servers
      {
        urls: [
          `turn:${turnDomain}:80`,
          `turn:${turnDomain}:443`,
          `turn:${turnDomain}:443?transport=tcp`,
          `turns:${turnDomain}:443?transport=tcp`
        ],
        username,
        credential,
      },
      // Standard Free Tier Metered OpenRelay Fallback
      {
        urls: 'stun:relay.metered.ca:80'
      },
      {
        urls: 'turn:relay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:relay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:relay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ];

    res.json({
      success: true,
      data: {
        iceServers,
        iceCandidatePoolSize: 10,
        expiresAt: new Date(expiry * 1000).toISOString(),
      },
    });
  } catch (err) {
    console.error('[TelehealthController] getIceServers error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Authorize call between patient and therapist for an appointment
 */
export const authorizeCall = async (req, res) => {
  try {
    const { appointmentId, recipientId } = req.body;
    const userId = req.headers['x-user-id'] || req.user?.userId;

    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      // Direct call fallback without strict appointment ID
      return res.json({ success: true, authorized: true, directMode: true });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found' } });
    }

    const patientId = appointment.patientId?.toString();
    const therapistId = appointment.therapistId?.toString();

    const isCallerValid = userId === patientId || userId === therapistId;
    const isRecipientValid = recipientId === patientId || recipientId === therapistId;

    if (!isCallerValid || !isRecipientValid) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_CALL', message: 'You are not authorized to start a telehealth consultation for this appointment.' }
      });
    }

    res.json({
      success: true,
      authorized: true,
      appointment: {
        id: appointment._id,
        serviceName: appointment.serviceName,
        status: appointment.status,
        startTime: appointment.startTime,
      }
    });
  } catch (err) {
    console.error('[TelehealthController] authorizeCall error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Start or record telehealth session initiation
 */
export const startSession = async (req, res) => {
  try {
    const { callId, appointmentId, therapistId, patientId } = req.body;
    const actorId = req.headers['x-user-id'] || req.user?.userId || therapistId;

    if (!callId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'callId is required' } });
    }

    let session = await TelehealthSession.findOne({ callId });

    if (!session) {
      session = await TelehealthSession.create({
        callId,
        appointmentId: appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) ? appointmentId : new mongoose.Types.ObjectId(),
        therapistId: therapistId || actorId,
        patientId: patientId || 'unknown_patient',
        status: 'connected',
        startTime: new Date(),
      });

      // Audit Log entry
      await AuditLog.create({
        actorId,
        action: 'TELEHEALTH_CALL_STARTED',
        resourceType: 'TelehealthSession',
        resourceId: session._id.toString(),
        metadata: { callId, appointmentId, therapistId, patientId }
      }).catch((e) => console.warn('[Telehealth] Audit log error:', e.message));
    } else {
      session.status = 'connected';
      if (!session.startTime) session.startTime = new Date();
      await session.save();
    }

    res.json({ success: true, data: session });
  } catch (err) {
    console.error('[TelehealthController] startSession error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * End a telehealth consultation session
 */
export const endSession = async (req, res) => {
  try {
    const { callId, durationSeconds, endReason, iceConnectionType } = req.body;
    const actorId = req.headers['x-user-id'] || req.user?.userId || 'system';

    if (!callId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'callId is required' } });
    }

    let session = await TelehealthSession.findOne({ callId });
    const now = new Date();

    if (!session) {
      session = await TelehealthSession.create({
        callId,
        appointmentId: new mongoose.Types.ObjectId(),
        therapistId: actorId,
        patientId: 'patient_auto',
        status: 'completed',
        startTime: new Date(Date.now() - (durationSeconds || 0) * 1000),
        endTime: now,
        durationSeconds: durationSeconds || 0,
        endReason: endReason || 'user_ended',
        qualityMetrics: { iceConnectionType: iceConnectionType || 'unknown' }
      });
    } else {
      session.status = session.status === 'ringing' ? 'missed' : 'completed';
      session.endTime = now;
      if (durationSeconds !== undefined) {
        session.durationSeconds = durationSeconds;
      } else if (session.startTime) {
        session.durationSeconds = Math.round((now.getTime() - session.startTime.getTime()) / 1000);
      }
      if (endReason) session.endReason = endReason;
      if (iceConnectionType) session.qualityMetrics.iceConnectionType = iceConnectionType;
      await session.save();

      // Transition linked appointment to DOCUMENTATION_PENDING if currently IN_PROGRESS
      if (session.appointmentId) {
        await Appointment.findOneAndUpdate(
          { _id: session.appointmentId, status: { $in: ['IN_PROGRESS', 'CONFIRMED', 'CHECKED_IN'] } },
          { $set: { status: 'DOCUMENTATION_PENDING', sessionStatus: 'ENDED' } }
        ).catch((e) => console.warn('[Telehealth] Appointment status update warning:', e.message));
      }
    }

    // Audit Log entry
    await AuditLog.create({
      actorId,
      action: 'TELEHEALTH_CALL_ENDED',
      resourceType: 'TelehealthSession',
      resourceId: session._id.toString(),
      metadata: { callId, durationSeconds: session.durationSeconds, endReason: session.endReason }
    }).catch((e) => console.warn('[Telehealth] Audit log error:', e.message));

    res.json({ success: true, data: session });
  } catch (err) {
    console.error('[TelehealthController] endSession error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Save Post-Consultation SOAP Notes & Range of Motion assessment
 */
export const saveSoapNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { subjective, objective, assessment, plan, rangeOfMotionScore } = req.body;
    const actorId = req.headers['x-user-id'] || req.user?.userId;
    const actorRole = req.headers['x-user-role'] || req.user?.role;

    if (actorRole === 'patient') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Patients are not permitted to author or modify clinical SOAP notes.' },
      });
    }

    let session = null;
    if (mongoose.Types.ObjectId.isValid(sessionId)) {
      session = await TelehealthSession.findById(sessionId);
    }
    if (!session) {
      session = await TelehealthSession.findOne({ callId: sessionId });
    }

    if (!session) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Telehealth session not found' } });
    }

    session.soapNotes = {
      subjective: subjective || session.soapNotes?.subjective || '',
      objective: objective || session.soapNotes?.objective || '',
      assessment: assessment || session.soapNotes?.assessment || '',
      plan: plan || session.soapNotes?.plan || '',
      rangeOfMotionScore: rangeOfMotionScore !== undefined ? rangeOfMotionScore : session.soapNotes?.rangeOfMotionScore,
      recordedAt: new Date(),
    };

    await session.save();

    // Audit Log entry
    await AuditLog.create({
      actorId: actorId || session.therapistId,
      action: 'SOAP_NOTES_RECORDED',
      resourceType: 'TelehealthSession',
      resourceId: session._id.toString(),
      metadata: { rangeOfMotionScore, patientId: session.patientId }
    }).catch((e) => console.warn('[Telehealth] Audit log error:', e.message));

    res.json({ success: true, data: session, message: 'SOAP notes recorded successfully' });
  } catch (err) {
    console.error('[TelehealthController] saveSoapNotes error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Get Telehealth consultation session logs
 */
export const getSessionsHistory = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;

    const query = {};
    if (userRole === 'therapist') {
      query.therapistId = userId;
    } else if (userRole === 'patient') {
      query.patientId = userId;
    }

    const sessions = await TelehealthSession.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('appointmentId')
      .lean();

    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[TelehealthController] getSessionsHistory error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
