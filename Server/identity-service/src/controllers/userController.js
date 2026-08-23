import mongoose from 'mongoose';
import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import TherapistProfile from '../models/TherapistProfile.js';
import RefreshToken from '../models/RefreshToken.js';
import AuditLog from '../models/AuditLog.js';
import { publishEvent } from '../utils/rabbitmq.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hasValue = (v) => {
  if (typeof v === 'string') return v.trim().length > 0;
  return v !== null && v !== undefined;
};

export const calculatePatientProfileCompletion = (user, profile) => {
  if (!user || !profile) return false;
  const hasBasicUser = hasValue(user.name) && hasValue(user.phoneNumber);
  const hasDemographics = hasValue(profile.gender) && hasValue(profile.dob);
  
  const addr = profile.address;
  const hasCompleteAddress = addr && (
    (typeof addr === 'string' && addr.trim().length > 5) ||
    (typeof addr === 'object' && hasValue(addr.addressLine1 || addr.street) && hasValue(addr.city) && hasValue(addr.state) && hasValue(addr.postalCode || addr.pincode))
  );

  return Boolean(hasBasicUser && hasDemographics && hasCompleteAddress);
};

const isAdminRole = (role) => ['super_admin', 'clinic_admin', 'admin'].includes(role);

const normalizePhone = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) return `+91${clean}`;
  return `+${clean}`;
};

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const user = await User.findById(userId).lean();
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    let profile = null;
    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId }).lean();
    } else if (user.role === 'therapist') {
      profile = await TherapistProfile.findOne({ userId }).lean();
    }

    const { passwordHash, otp, refreshTokens, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE PATIENT PROFILE ───────────────────────────────────────────────────
export const updatePatientProfile = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const requesterRole = req.user?.role || req.headers['x-user-role'];

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (requesterRole !== 'patient' && !isAdminRole(requesterRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only patients can update patient profiles.' } });
    }

    const targetUserId = requesterId;

    const allowed = ['dob', 'gender', 'height', 'weight', 'bloodGroup', 'primaryConcern', 'medicalConditions', 'allergies', 'emergencyContact', 'address', 'consultationPreferences'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    if (req.body.heightCm !== undefined && updates.height === undefined) updates.height = req.body.heightCm;
    if (req.body.weightKg !== undefined && updates.weight === undefined) updates.weight = req.body.weightKg;

    if (updates.gender) {
      const g = String(updates.gender).toLowerCase().trim();
      updates.gender = ['male', 'female', 'other', 'prefer_not_to_say'].includes(g) ? g : 'other';
    }

    if (updates.dob) {
      const parsedDate = new Date(updates.dob);
      if (!isNaN(parsedDate.getTime())) {
        updates.dob = parsedDate;
      } else {
        delete updates.dob;
      }
    }

    const userUpdates = {};
    if (req.body.name) userUpdates.name = req.body.name.trim();
    if (req.body.fullName) userUpdates.name = req.body.fullName.trim();
    if (req.body.avatarUrl || req.body.profileImageUrl) {
      const img = req.body.avatarUrl || req.body.profileImageUrl;
      userUpdates.avatarUrl = img;
      userUpdates.profileImageUrl = img;
      updates.profileImageUrl = img;
      updates.avatarUrl = img;
    }

    const updatedProfile = await PatientProfile.findOneAndUpdate({ userId: targetUserId }, updates, { new: true, upsert: true, runValidators: true });
    let existingUser = await User.findById(targetUserId);

    if (existingUser) {
      Object.assign(existingUser, userUpdates);
      existingUser.isProfileCompleted = calculatePatientProfileCompletion(existingUser, updatedProfile);
      await existingUser.save();
    }

    res.json({ success: true, data: { user: existingUser ? existingUser.toSafeObject() : null, profile: updatedProfile } });
  } catch (err) {
    console.error('[Update Patient Profile Error]:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE THERAPIST PROFILE ─────────────────────────────────────────────────
export const updateTherapistProfile = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const requesterRole = req.user?.role || req.headers['x-user-role'];

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    if (requesterRole !== 'therapist' && !isAdminRole(requesterRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only specialists can update therapist profiles.' } });
    }

    const allowed = ['specializations', 'qualifications', 'experienceYears', 'languages', 'bio', 'profileImageUrl', 'clinicName', 'clinicLocation', 'consultationFee', 'availabilityTemplate', 'leaveExceptions', 'appointmentBuffer'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    if (updates.consultationFee !== undefined) {
      const rawFee = Number(updates.consultationFee);
      if (!isNaN(rawFee) && rawFee > 0) {
        updates.consultationFee = rawFee < 5000 ? rawFee * 100 : rawFee;
      }
    }

    const profile = await TherapistProfile.findOneAndUpdate(
      { userId: requesterId },
      updates,
      { new: true, upsert: true, runValidators: true }
    );

    if (req.body.name) {
      await User.findByIdAndUpdate(requesterId, { $set: { name: req.body.name.trim() } });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('[Update Therapist Profile Error]:', err.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET THERAPISTS (Public Catalog) ──────────────────────────────────────────
export const getTherapists = async (req, res) => {
  try {
    const { specialization, isVerified, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isDeleted: { $ne: true } };
    if (isVerified === 'true') filter.verificationStatus = 'verified';
    if (specialization) filter.specializations = { $in: [specialization] };

    const profiles = await TherapistProfile.find(filter)
      .populate('userId', 'name email phoneNumber profileImageUrl status isActive')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await TherapistProfile.countDocuments(filter);

    const formatted = profiles.map(prof => ({
      _id: prof._id,
      id: prof._id,
      userId: prof.userId?._id || prof.userId,
      name: prof.userId?.name || prof.name || 'Specialist',
      email: prof.userId?.email || prof.email || '',
      phoneNumber: prof.userId?.phoneNumber || prof.phoneNumber || '',
      phone: prof.userId?.phoneNumber || prof.phoneNumber || '',
      profileImageUrl: prof.profileImageUrl || prof.userId?.profileImageUrl || null,
      avatarUrl: prof.profileImageUrl || prof.userId?.profileImageUrl || null,
      avatar: prof.profileImageUrl || prof.userId?.profileImageUrl || null,
      specializations: prof.specializations || ['Orthopedic Physiotherapy'],
      qualifications: prof.qualifications || [],
      experienceYears: prof.experienceYears !== undefined ? prof.experienceYears : null,
      ratingAvg: prof.ratingAvg !== undefined ? prof.ratingAvg : null,
      reviewCount: prof.ratingCount || 0,
      fee: prof.consultationFee ? Math.round(prof.consultationFee / 100) : 800,
      consultationFee: prof.consultationFee || 80000,
      bio: prof.bio || '',
      clinicName: prof.clinicName || 'OneMedical Care Center',
      clinicLocation: prof.clinicLocation || 'Bengaluru, Karnataka',
      verificationStatus: prof.verificationStatus || 'verified',
      user: prof.userId ? {
        _id: prof.userId._id || prof.userId,
        name: prof.userId.name || prof.name,
        email: prof.userId.email,
        phoneNumber: prof.userId.phoneNumber,
        profileImageUrl: prof.profileImageUrl || prof.userId.profileImageUrl,
      } : undefined,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const listTherapists = getTherapists;

// ─── GET THERAPIST BY ID ──────────────────────────────────────────────────────
export const getTherapistById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    const profile = await TherapistProfile.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }, { userId: id }] : [{ userId: id }])
      ],
      isDeleted: { $ne: true }
    }).populate('userId', 'name email phoneNumber profileImageUrl status isActive').lean();

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Specialist profile not found.' } });
    }

    const data = {
      _id: profile._id,
      id: profile._id,
      userId: profile.userId?._id || profile.userId,
      name: profile.userId?.name || profile.name || 'Specialist',
      email: profile.userId?.email || profile.email || '',
      phoneNumber: profile.userId?.phoneNumber || profile.phoneNumber || '',
      phone: profile.userId?.phoneNumber || profile.phoneNumber || '',
      profileImageUrl: profile.profileImageUrl || profile.userId?.profileImageUrl || null,
      avatarUrl: profile.profileImageUrl || profile.userId?.profileImageUrl || null,
      avatar: profile.profileImageUrl || profile.userId?.profileImageUrl || null,
      specializations: profile.specializations || ['Orthopedic Physiotherapy'],
      qualifications: profile.qualifications || [],
      experienceYears: profile.experienceYears !== undefined ? profile.experienceYears : null,
      ratingAvg: profile.ratingAvg !== undefined ? profile.ratingAvg : null,
      reviewCount: profile.ratingCount || 0,
      fee: profile.consultationFee ? Math.round(profile.consultationFee / 100) : 800,
      consultationFee: profile.consultationFee || 80000,
      bio: profile.bio || '',
      clinicName: profile.clinicName || 'OneMedical Care Center',
      clinicLocation: profile.clinicLocation || 'Bengaluru, Karnataka',
      verificationStatus: profile.verificationStatus || 'verified',
      availabilityTemplate: profile.availabilityTemplate || {},
      leaveExceptions: profile.leaveExceptions || [],
      user: profile.userId ? {
        _id: profile.userId._id || profile.userId,
        name: profile.userId.name || profile.name,
        email: profile.userId.email,
        phoneNumber: profile.userId.phoneNumber,
        profileImageUrl: profile.profileImageUrl || profile.userId.profileImageUrl,
      } : undefined,
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── INTERNAL: GET USERS BY IDS ──────────────────────────────────────────────
export const internalGetUsersByIds = async (req, res) => {
  try {
    const rawIds = (req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
    const validObjIds = rawIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));

    if (validObjIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const [users, therapistProfiles, patientProfiles] = await Promise.all([
      User.find({ _id: { $in: validObjIds } }, 'name email phoneNumber profileImageUrl role status').lean(),
      TherapistProfile.find({ $or: [{ _id: { $in: validObjIds } }, { userId: { $in: validObjIds } }] })
        .populate('userId', 'name email phoneNumber profileImageUrl role status')
        .lean(),
      PatientProfile.find({ $or: [{ _id: { $in: validObjIds } }, { userId: { $in: validObjIds } }] })
        .populate('userId', 'name email phoneNumber profileImageUrl role status')
        .lean(),
    ]);

    const resultMap = new Map();

    // 1. Add direct users
    users.forEach(u => {
      const uId = u._id.toString();
      resultMap.set(uId, {
        _id: u._id,
        id: u._id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        phone: u.phoneNumber,
        profileImageUrl: u.profileImageUrl || null,
        avatarUrl: u.profileImageUrl || null,
        role: u.role,
        status: u.status,
      });
    });

    // 2. Add therapist profiles (keyed by both therapistProfile._id AND userId)
    therapistProfiles.forEach(tp => {
      const u = tp.userId && typeof tp.userId === 'object' ? tp.userId : {};
      const tpId = tp._id.toString();
      const uId = (u._id || tp.userId)?.toString();
      const img = tp.profileImageUrl || u.profileImageUrl || null;
      const tData = {
        _id: tp._id,
        id: tp._id,
        therapistId: tp._id,
        userId: uId,
        name: u.name || tp.name || 'Specialist',
        email: u.email || tp.email || '',
        phoneNumber: u.phoneNumber || tp.phoneNumber || '',
        phone: u.phoneNumber || tp.phoneNumber || '',
        profileImageUrl: img,
        avatarUrl: img,
        avatar: img,
        role: 'therapist',
        specializations: tp.specializations || [],
        clinicName: tp.clinicName,
      };

      resultMap.set(tpId, tData);
      if (uId) {
        resultMap.set(uId, { ...tData, _id: u._id || uId });
      }
    });

    // 3. Add patient profiles
    patientProfiles.forEach(pp => {
      const u = pp.userId && typeof pp.userId === 'object' ? pp.userId : {};
      const ppId = pp._id.toString();
      const uId = (u._id || pp.userId)?.toString();
      const img = pp.profileImageUrl || u.profileImageUrl || null;
      const pData = {
        _id: pp._id,
        id: pp._id,
        patientId: pp._id,
        userId: uId,
        name: u.name || pp.name || 'Patient',
        email: u.email || '',
        phoneNumber: u.phoneNumber || '',
        phone: u.phoneNumber || '',
        profileImageUrl: img,
        avatarUrl: img,
        role: 'patient',
      };

      resultMap.set(ppId, pData);
      if (uId) {
        resultMap.set(uId, { ...pData, _id: u._id || uId });
      }
    });

    res.json({ success: true, data: Array.from(resultMap.values()) });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET SAVED THERAPISTS ─────────────────────────────────────────────────────
export const getSavedTherapists = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const user = await User.findById(userId).populate('savedTherapists', 'name email phoneNumber profileImageUrl').lean();
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    const savedUserIds = (user.savedTherapists || []).map(t => (t._id || t).toString());
    const profiles = await TherapistProfile.find({ userId: { $in: savedUserIds }, isDeleted: { $ne: true } }).lean();
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.userId.toString(), p));

    const result = (user.savedTherapists || []).map(u => {
      const uId = (u._id || u).toString();
      const prof = profileMap.get(uId);
      return {
        userId: uId,
        therapistId: prof?._id || uId,
        name: u.name || prof?.name || 'Specialist',
        specializations: prof?.specializations || ['Physiotherapy'],
        ratingAvg: prof?.ratingAvg !== undefined ? prof.ratingAvg : null,
        reviewCount: prof?.ratingCount || 0,
        fee: prof?.consultationFee ? Math.round(prof.consultationFee / 100) : 800,
        profileImageUrl: u.profileImageUrl || prof?.profileImageUrl || null,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── SAVE THERAPIST ───────────────────────────────────────────────────────────
export const saveTherapist = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const therapistId = req.body?.therapistId || req.params?.therapistId;

    if (!userId || !therapistId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'therapistId is required.' } });
    }

    let canonicalUserId = therapistId;
    if (mongoose.isValidObjectId(therapistId)) {
      const prof = await TherapistProfile.findById(therapistId);
      if (prof?.userId) canonicalUserId = prof.userId.toString();
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { savedTherapists: new mongoose.Types.ObjectId(canonicalUserId) }
    });

    res.json({ success: true, message: 'Specialist saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── REMOVE SAVED THERAPIST ───────────────────────────────────────────────────
export const removeSavedTherapist = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const therapistId = req.params?.id || req.params?.therapistId || req.body?.therapistId;

    if (!userId || !therapistId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'therapistId is required.' } });
    }

    let canonicalUserId = therapistId;
    if (mongoose.isValidObjectId(therapistId)) {
      const prof = await TherapistProfile.findById(therapistId);
      if (prof?.userId) canonicalUserId = prof.userId.toString();
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { savedTherapists: { $in: [therapistId, canonicalUserId].filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id)) } }
    });

    res.json({ success: true, message: 'Specialist removed from saved list.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET NOTIFICATION PREFERENCES ────────────────────────────────────────────
export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const user = await User.findById(userId, 'notificationPreferences').lean();
    res.json({ success: true, data: user?.notificationPreferences || {} });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE NOTIFICATION PREFERENCES ─────────────────────────────────────────
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const allowed = [
      'upcomingAppointment', 'appointmentConfirmation', 'appointmentRescheduled',
      'appointmentCancelled', 'todayExercise', 'recoveryProgramUpdates',
      'weeklyProgressSummary', 'achievementNotifications', 'newMedicalReports',
      'paymentConfirmation', 'invoiceAvailable', 'healthTips', 'newFeatures', 'promotions'
    ];

    const prefs = {};
    for (const key of allowed) {
      if (typeof req.body[key] === 'boolean') {
        prefs[`notificationPreferences.${key}`] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: prefs }, { new: true });
    res.json({ success: true, data: user?.notificationPreferences || {} });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── REQUEST ACCOUNT DELETION ─────────────────────────────────────────────────
export const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    await RefreshToken.deleteMany({ userId });

    await User.findByIdAndUpdate(userId, {
      $set: {
        isDeleted: true,
        isActive: false,
        status: 'deactivated',
        deletedAt: new Date(),
        'deletionRequest.requestedAt': new Date(),
        'deletionRequest.reason': reason || 'User requested account closure.',
        'deletionRequest.status': 'processed'
      }
    });

    await publishEvent('identity.account.deleted', {
      userId,
      deletedAt: new Date().toISOString(),
      reason
    }).catch(e => console.warn('[Account Deletion] Event publish warning:', e.message));

    res.json({ success: true, message: 'Account deactivated and all sessions terminated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const deleteAccount = requestAccountDeletion;

// ─── ADMIN: LIST PATIENTS ─────────────────────────────────────────────────────
export const listPatientsAdmin = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole) && adminRole !== 'therapist') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin or specialist access required.' } });
    }

    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { role: 'patient', isDeleted: { $ne: true } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('name email phoneNumber profileImageUrl avatarUrl status isActive isProfileCompleted createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map(u => u._id);
    const profiles = await PatientProfile.find({ userId: { $in: userIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.userId.toString()] = p;
    });

    const enriched = users.map(u => {
      const prof = profileMap[u._id.toString()] || {};
      let age = null;
      if (prof.dob) {
        const diff = Date.now() - new Date(prof.dob).getTime();
        age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      }
      return {
        ...u,
        phone: u.phoneNumber || '',
        phoneNumber: u.phoneNumber || '',
        avatar: u.profileImageUrl || prof.profileImageUrl || u.avatarUrl || null,
        profileImageUrl: u.profileImageUrl || prof.profileImageUrl || u.avatarUrl || null,
        profile: {
          ...prof,
          age,
          gender: prof.gender || 'Not Specified',
          primaryConcern: prof.primaryConcern || 'Physiotherapy Care',
          recoveryScore: prof.recoveryScore || 70,
        }
      };
    });

    const total = await User.countDocuments(filter);
    res.json({ success: true, data: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: LIST USERS ────────────────────────────────────────────────────────
export const adminListUsers = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { role, status, page = 1, limit = 50 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (role) filter.role = role;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter).select('-passwordHash -otp').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean();
    const total = await User.countDocuments(filter);

    res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: GET USER BY ID ────────────────────────────────────────────────────
export const adminGetUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    let user = await User.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : [])
      ]
    }).select('-passwordHash -otp').lean();

    let profile = null;
    if (!user) {
      profile = await PatientProfile.findById(id).lean() || await TherapistProfile.findById(id).lean();
      if (profile?.userId) {
        user = await User.findById(profile.userId).select('-passwordHash -otp').lean();
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    if (user.role === 'patient') {
      profile = profile || await PatientProfile.findOne({ userId: user._id }).lean();
    } else if (user.role === 'therapist') {
      profile = profile || await TherapistProfile.findOne({ userId: user._id }).lean();
    }

    res.json({ success: true, data: { user, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: CREATE PATIENT ────────────────────────────────────────────────────
export const adminCreatePatient = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const {
      name, email, phoneNumber, phone,
      profileImageUrl, avatarUrl, photoUrl,
      dob, gender, address, primaryConcern
    } = req.body;

    const rawPhone = phoneNumber || phone;
    if (!name || (!email && !rawPhone)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and email or phoneNumber required.' } });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : undefined;
    const cleanPhone = rawPhone ? normalizePhone(rawPhone) : undefined;
    const cleanImg = profileImageUrl || avatarUrl || photoUrl || undefined;

    const existing = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : [])
      ],
      isDeleted: false
    });

    let user = existing;
    if (existing) {
      const existingProfile = await PatientProfile.findOne({ userId: existing._id, isDeleted: false });
      if (existingProfile) {
        return res.status(400).json({ success: false, error: { code: 'USER_ALREADY_EXISTS', message: 'Patient with this email or mobile number already exists.' } });
      }
      user.name = name.trim();
      if (cleanEmail) user.email = cleanEmail;
      if (cleanPhone) user.phoneNumber = cleanPhone;
      if (cleanImg) user.profileImageUrl = cleanImg;
      user.role = 'patient';
      user.isActive = true;
      user.status = 'active';
      user.isProfileCompleted = true;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        phoneNumber: cleanPhone,
        profileImageUrl: cleanImg,
        role: 'patient',
        isActive: true,
        status: 'active',
        isProfileCompleted: true,
      });
    }

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        dob: dob ? new Date(dob) : undefined,
        gender: gender || 'other',
        address,
        primaryConcern,
        profileImageUrl: cleanImg,
        isDeleted: false
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: { user: user.toSafeObject(), profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: UPDATE PATIENT ────────────────────────────────────────────────────
export const adminUpdatePatient = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const userUpdates = {};
    if (req.body.name) userUpdates.name = req.body.name.trim();
    if (req.body.phoneNumber || req.body.phone) userUpdates.phoneNumber = normalizePhone(req.body.phoneNumber || req.body.phone);
    if (req.body.email) userUpdates.email = req.body.email.trim().toLowerCase();
    if (req.body.profileImageUrl || req.body.avatarUrl || req.body.photoUrl) {
      const img = req.body.profileImageUrl || req.body.avatarUrl || req.body.photoUrl;
      userUpdates.profileImageUrl = img;
    }
    if (req.body.status) userUpdates.status = req.body.status;
    if (req.body.isActive !== undefined) userUpdates.isActive = req.body.isActive;

    const profileUpdates = { ...req.body };
    delete profileUpdates.name;
    delete profileUpdates.status;
    delete profileUpdates.isActive;
    if (userUpdates.profileImageUrl) profileUpdates.profileImageUrl = userUpdates.profileImageUrl;

    const profile = await PatientProfile.findOneAndUpdate(
      { $or: [{ _id: mongoose.isValidObjectId(id) ? id : new mongoose.Types.ObjectId() }, { userId: id }] },
      profileUpdates,
      { new: true, upsert: true }
    );

    const effectiveUserId = profile?.userId || id;
    const updatedUser = await User.findByIdAndUpdate(effectiveUserId, userUpdates, { new: true });

    res.json({ success: true, data: { user: updatedUser ? updatedUser.toSafeObject() : null, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: DELETE PATIENT ────────────────────────────────────────────────────
export const adminDeletePatient = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    await Promise.all([
      User.findByIdAndUpdate(id, { isDeleted: true, isActive: false, status: 'deactivated' }),
      PatientProfile.findOneAndUpdate({ userId: id }, { isDeleted: true }),
      RefreshToken.deleteMany({ userId: id })
    ]);

    res.json({ success: true, message: 'Patient deactivated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: CREATE THERAPIST ──────────────────────────────────────────────────
export const adminCreateTherapist = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const {
      name, email, phoneNumber, phone,
      profileImageUrl, avatarUrl, photoUrl,
      specializations, qualifications, experienceYears,
      consultationFee, clinicName, clinicLocation, bio
    } = req.body;

    const rawPhone = phoneNumber || phone;
    if (!name || (!email && !rawPhone)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and email or phoneNumber are required.' } });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : undefined;
    const cleanPhone = rawPhone ? normalizePhone(rawPhone) : undefined;
    const cleanImg = profileImageUrl || avatarUrl || photoUrl || undefined;

    const existing = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : [])
      ],
      isDeleted: false
    });

    let user = existing;
    if (existing) {
      const existingProfile = await TherapistProfile.findOne({ userId: existing._id, isDeleted: false });
      if (existingProfile) {
        return res.status(400).json({ success: false, error: { code: 'USER_ALREADY_EXISTS', message: 'Specialist with this email or mobile number already exists.' } });
      }
      // Re-use existing orphaned user account
      user.name = name.trim();
      if (cleanEmail) user.email = cleanEmail;
      if (cleanPhone) user.phoneNumber = cleanPhone;
      if (cleanImg) user.profileImageUrl = cleanImg;
      user.role = 'therapist';
      user.isActive = true;
      user.status = 'active';
      user.isProfileCompleted = true;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        phoneNumber: cleanPhone,
        profileImageUrl: cleanImg,
        role: 'therapist',
        status: 'active',
        isActive: true,
        isProfileCompleted: true,
      });
    }

    const rawFee = Number(consultationFee || 80000);
    const feePaise = rawFee < 5000 ? rawFee * 100 : rawFee;

    const resolvedLocation = typeof clinicLocation === 'object' && clinicLocation !== null
      ? { address: clinicLocation.address || 'Bengaluru, Karnataka', lat: Number(clinicLocation.lat || 12.9716), lng: Number(clinicLocation.lng || 77.5946) }
      : { address: clinicLocation || 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 };

    const profile = await TherapistProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        name: name.trim(),
        profileImageUrl: cleanImg,
        specializations: Array.isArray(specializations) ? specializations : ['Orthopedic Physiotherapy'],
        qualifications: Array.isArray(qualifications) ? qualifications : ['MPT - Orthopedics'],
        experienceYears: Number(experienceYears) || 0,
        consultationFee: feePaise,
        clinicName: clinicName || 'OneMedical Care Center',
        clinicLocation: resolvedLocation,
        bio: bio || '',
        verificationStatus: 'verified',
        isVerified: true,
        verifiedAt: new Date(),
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: { user: user.toSafeObject(), profile } });
  } catch (err) {
    console.error('[adminCreateTherapist] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: UPDATE THERAPIST ──────────────────────────────────────────────────
export const adminUpdateTherapist = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const userUpdates = {};
    if (req.body.name) userUpdates.name = req.body.name.trim();
    if (req.body.phoneNumber || req.body.phone) userUpdates.phoneNumber = normalizePhone(req.body.phoneNumber || req.body.phone);
    if (req.body.email) userUpdates.email = req.body.email.trim().toLowerCase();
    if (req.body.profileImageUrl || req.body.avatarUrl || req.body.photoUrl) {
      const img = req.body.profileImageUrl || req.body.avatarUrl || req.body.photoUrl;
      userUpdates.profileImageUrl = img;
    }
    if (req.body.status) userUpdates.status = req.body.status;
    if (req.body.isActive !== undefined) userUpdates.isActive = req.body.isActive;

    const updates = { ...req.body };
    if (userUpdates.profileImageUrl) updates.profileImageUrl = userUpdates.profileImageUrl;
    if (updates.clinicLocation && typeof updates.clinicLocation === 'string') {
      updates.clinicLocation = { address: updates.clinicLocation, lat: 12.9716, lng: 77.5946 };
    }

    const profile = await TherapistProfile.findOneAndUpdate(
      { $or: [{ _id: mongoose.isValidObjectId(id) ? id : new mongoose.Types.ObjectId() }, { userId: id }] },
      updates,
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Therapist profile not found.' } });
    }

    if (profile.userId && Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(profile.userId, userUpdates);
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: DELETE THERAPIST ──────────────────────────────────────────────────
export const adminDeleteTherapist = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const profile = await TherapistProfile.findOneAndUpdate(
      { $or: [{ _id: mongoose.isValidObjectId(id) ? id : new mongoose.Types.ObjectId() }, { userId: id }] },
      { isDeleted: true }
    );

    if (profile?.userId) {
      await Promise.all([
        User.findByIdAndUpdate(profile.userId, { isDeleted: true, isActive: false, status: 'deactivated' }),
        RefreshToken.deleteMany({ userId: profile.userId })
      ]);
    }

    res.json({ success: true, message: 'Specialist deactivated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: VERIFY THERAPIST ──────────────────────────────────────────────────
export const verifyTherapistAdmin = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const { status, rejectionReason, verificationNotes, registrationNumber, registrationAuthority } = req.body;

    const allowedStatuses = ['verified', 'rejected', 'under_review', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${allowedStatuses.join(', ')}` } });
    }

    const adminId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const notes = verificationNotes || rejectionReason || '';
    const updates = {
      verificationStatus: status,
      isVerified: status === 'verified',
      verifiedAt: status === 'verified' ? new Date() : undefined,
      verifiedBy: (status === 'verified' && adminId && mongoose.isValidObjectId(adminId)) ? adminId : undefined,
      verificationNotes: notes,
      rejectionReason: status === 'rejected' ? (rejectionReason || notes) : undefined,
    };

    if (registrationNumber) updates.registrationNumber = registrationNumber;
    if (registrationAuthority) updates.registrationAuthority = registrationAuthority;

    const profile = await TherapistProfile.findOneAndUpdate(
      { $or: [{ _id: mongoose.isValidObjectId(id) ? id : new mongoose.Types.ObjectId() }, { userId: id }] },
      updates,
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Therapist profile not found.' } });
    }

    if (profile.userId) {
      const userStatus = status === 'verified' ? 'active' : (status === 'rejected' ? 'rejected' : (status === 'suspended' ? 'suspended' : 'pending'));
      await User.findByIdAndUpdate(profile.userId, {
        status: userStatus,
        isActive: status === 'verified',
      });
    }

    if (adminId && mongoose.isValidObjectId(adminId)) {
      try {
        await AuditLog.create({
          actorId: adminId,
          action: `DOCTOR_${status.toUpperCase()}`,
          resourceType: 'TherapistProfile',
          resourceId: profile._id.toString(),
          ipAddress: req.ip,
          metadata: {
            newStatus: status,
            notes,
            therapistUserId: profile.userId?.toString(),
          }
        });
      } catch (auditErr) {
        console.warn('[verifyTherapistAdmin] Audit log warning:', auditErr.message);
      }
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET THERAPIST REVIEWS ───────────────────────────────────────────────────
export const getTherapistReviews = async (req, res) => {
  try {
    const { id, therapistId } = req.params;
    const tId = id || therapistId;
    const isObjectId = mongoose.isValidObjectId(tId);

    const profile = await TherapistProfile.findOne({
      $or: [
        ...(isObjectId ? [{ _id: tId }, { userId: tId }] : [{ userId: tId }])
      ]
    }).lean();

    res.json({
      success: true,
      data: {
        reviews: [],
        averageRating: profile?.ratingAvg !== undefined ? profile.ratingAvg : null,
        reviewCount: profile?.ratingCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
