import mongoose from 'mongoose';
import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import TherapistProfile from '../models/TherapistProfile.js';
import AuditLog from '../models/AuditLog.js';

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });

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
    const userId = req.headers['x-user-id'];
    const allowed = ['dob', 'gender', 'height', 'weight', 'bloodGroup', 'primaryConcern', 'medicalConditions', 'allergies', 'emergencyContact', 'address', 'consultationPreferences'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    // Handle heightCm / weightKg aliases
    if (req.body.heightCm !== undefined && updates.height === undefined) updates.height = req.body.heightCm;
    if (req.body.weightKg !== undefined && updates.weight === undefined) updates.weight = req.body.weightKg;

    // Update base user details including isProfileCompleted
    const userUpdates = { isProfileCompleted: true };
    if (req.body.name) userUpdates.name = req.body.name;
    if (req.body.email) userUpdates.email = req.body.email;
    if (req.body.avatarUrl) userUpdates.avatarUrl = req.body.avatarUrl;
    const updatedUser = await User.findByIdAndUpdate(userId, userUpdates, { new: true });

    const profile = await PatientProfile.findOneAndUpdate({ userId }, updates, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, data: { user: updatedUser ? updatedUser.toSafeObject() : null, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── UPDATE THERAPIST PROFILE ─────────────────────────────────────────────────
export const updateTherapistProfile = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const allowed = ['specializations', 'qualifications', 'experienceYears', 'languages', 'bio', 'profileImageUrl', 'clinicName', 'clinicLocation', 'consultationFee', 'availabilityTemplate', 'leaveExceptions', 'appointmentBuffer'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    const userUpdates = { isProfileCompleted: true };
    if (req.body.name) userUpdates.name = req.body.name;
    const updatedUser = await User.findByIdAndUpdate(userId, userUpdates, { new: true });

    const profile = await TherapistProfile.findOneAndUpdate({ userId }, updates, { new: true, upsert: true });
    res.json({ success: true, data: { user: updatedUser ? updatedUser.toSafeObject() : null, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── LIST THERAPISTS (public search) ─────────────────────────────────────────
export const listTherapists = async (req, res) => {
  try {
    const { specialization, language, page = 1, limit = 10 } = req.query;
    const filter = { verificationStatus: 'verified', isDeleted: false };
    if (specialization) filter.specializations = { $in: [new RegExp(specialization, 'i')] };
    if (language) filter.languages = { $in: [new RegExp(language, 'i')] };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [profiles, total] = await Promise.all([
      TherapistProfile.find(filter).skip(skip).limit(parseInt(limit)).lean(),
      TherapistProfile.countDocuments(filter),
    ]);

    // Enrich with user name and photo
    const userIds = profiles.map(p => p.userId);
    const users = await User.find({ _id: { $in: userIds } }, 'name email phoneNumber profileImageUrl').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const enriched = profiles.map(p => {
      const u = userMap[p.userId.toString()];
      const img = p.profileImageUrl || u?.profileImageUrl || null;
      return {
        ...p,
        name: u?.name || 'Dr. Specialist',
        email: u?.email,
        phoneNumber: u?.phoneNumber,
        profileImageUrl: img,
        avatarUrl: img,
        avatar: img,
        user: u ? { ...u, profileImageUrl: img, avatarUrl: img } : null
      };
    });
    res.json({ success: true, data: enriched, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET THERAPIST BY ID ──────────────────────────────────────────────────────
export const getTherapistById = async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid therapist ID required.' } });
    }

    let profile = null;
    if (mongoose.isValidObjectId(rawId)) {
      profile = await TherapistProfile.findById(rawId).lean();
      if (!profile) {
        profile = await TherapistProfile.findOne({ userId: rawId }).lean();
      }
      // Also check if rawId matches a therapist User by ID
      if (!profile) {
        const u = await User.findById(rawId).lean();
        if (u && (u.role === 'therapist' || u.role === 'doctor')) {
          profile = await TherapistProfile.findOne({ userId: u._id }).lean();
        }
      }
    }

    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Therapist profile not found.' } });
    }

    const user = await User.findById(profile.userId, 'name email phoneNumber profileImageUrl').lean();
    const img = profile.profileImageUrl || user?.profileImageUrl || null;
    res.json({ success: true, data: {
      ...profile,
      id: profile._id.toString(),
      therapistId: profile.userId?.toString() || profile._id.toString(),
      name: user?.name || profile.name || 'Dr. Specialist',
      email: user?.email || profile.email,
      phoneNumber: user?.phoneNumber || profile.phoneNumber,
      profileImageUrl: img,
      avatarUrl: img,
      avatar: img,
      user: user ? { ...user, profileImageUrl: img, avatarUrl: img } : null
    } });
  } catch (err) {
    console.error('[getTherapistById] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: LIST ALL USERS (paginated) ───────────────────────────────────────
export const adminListUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const filter = { isDeleted: false };
    if (role) filter.role = role;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { phoneNumber: new RegExp(search, 'i') }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter, '-passwordHash -otp -refreshTokens').skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── INTERNAL: GET USERS BY IDS ────────────────────────────────────────────────
export const internalGetUsersByIds = async (req, res) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',').filter(Boolean) : [];
    
    // 1. Fetch any therapist profiles matching these IDs (either by profile._id or profile.userId)
    const therapistProfiles = await TherapistProfile.find({
      $or: [{ userId: { $in: ids } }, { _id: { $in: ids } }]
    }).lean();

    // 2. Collect all potential user IDs
    const associatedUserIds = therapistProfiles.map(tp => tp.userId?.toString()).filter(Boolean);
    const allUserIds = Array.from(new Set([...ids, ...associatedUserIds]));

    // 3. Fetch users
    const users = await User.find({ _id: { $in: allUserIds } }, 'name phoneNumber email profileImageUrl role gender').lean();
    const userById = {};
    users.forEach(u => { userById[u._id.toString()] = u; });

    const result = [];
    const seenIds = new Set();

    // Process each requested ID
    for (const reqId of ids) {
      if (seenIds.has(reqId)) continue;
      seenIds.add(reqId);

      const tp = therapistProfiles.find(p => p._id?.toString() === reqId || p.userId?.toString() === reqId);
      const u = userById[reqId] || (tp?.userId ? userById[tp.userId.toString()] : null);

      const resolvedName = u?.name || tp?.name || 'Dr. Specialist';
      const resolvedImg = u?.profileImageUrl || tp?.profileImageUrl || null;

      result.push({
        _id: reqId,
        id: reqId,
        userId: u?._id?.toString() || tp?.userId?.toString() || reqId,
        name: resolvedName,
        phoneNumber: u?.phoneNumber || tp?.phoneNumber || '',
        email: u?.email || tp?.email || '',
        profileImageUrl: resolvedImg,
        avatarUrl: resolvedImg,
        avatar: resolvedImg,
        role: u?.role || 'therapist',
        specialization: tp?.specializations?.[0] || 'Physiotherapy',
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── SAVED THERAPISTS ─────────────────────────────────────────────────────────
export const getSavedTherapists = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

    const user = await User.findById(userId).populate('savedTherapists', 'name email phoneNumber profileImageUrl').lean();
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    
    // Fetch profiles for saved therapists
    const therapistIds = user.savedTherapists ? user.savedTherapists.map(t => t._id || t) : [];
    const profiles = await TherapistProfile.find({ userId: { $in: therapistIds } }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    const result = (user.savedTherapists || []).map(t => {
      const tId = t._id ? t._id.toString() : t.toString();
      const prof = profileMap[tId] || {};
      const img = prof.profileImageUrl || t.profileImageUrl || null;
      return {
        _id: tId,
        id: tId,
        therapistId: tId,
        name: t.name || prof.name || 'Dr. Specialist',
        email: t.email,
        phoneNumber: t.phoneNumber,
        profileImageUrl: img,
        avatarUrl: img,
        avatar: img,
        ...prof
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const saveTherapist = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const { therapistId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

    await User.findByIdAndUpdate(userId, { $addToSet: { savedTherapists: therapistId } });
    res.json({ success: true, message: 'Specialist saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const removeSavedTherapist = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const { therapistId } = req.params;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

    await User.findByIdAndUpdate(userId, { $pull: { savedTherapists: therapistId } });
    res.json({ success: true, message: 'Specialist removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────
export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    const user = await User.findById(userId).select('notificationPreferences').lean();
    res.json({
      success: true,
      data: user?.notificationPreferences || {
        push: true,
        email: true,
        sms: false,
        appointments: true,
        reminders: true,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    const prefs = req.body;
    const user = await User.findByIdAndUpdate(userId, { $set: { notificationPreferences: prefs } }, { new: true });
    res.json({ success: true, data: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ACCOUNT DELETION REQUEST ────────────────────────────────────────────────
export const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { reason } = req.body;
    await User.findByIdAndUpdate(userId, {
      $set: {
        'deletionRequest.requestedAt': new Date(),
        'deletionRequest.reason': reason || 'User requested deletion',
        'deletionRequest.status': 'pending',
        isActive: false,
        refreshTokens: []
      }
    });
    res.json({ success: true, message: 'Account deletion request submitted. Your account will be anonymized within 30 days.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: LIST PATIENTS WITH PROFILES ─────────────────────────────────────
export const listPatientsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { role: 'patient', isDeleted: false };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phoneNumber: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter, '-passwordHash -otp -refreshTokens').skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map(u => u._id);
    const profiles = await PatientProfile.find({ userId: { $in: userIds }, isDeleted: false }).lean();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    const enriched = users.map(u => ({
      ...u,
      profile: profileMap[u._id.toString()] || null
    }));

    res.json({ success: true, data: enriched, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: GET USER PROFILE BY ID ──────────────────────────────────────────
export const adminGetUserById = async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!rawId || rawId === 'undefined' || rawId === 'null') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid user ID required.' } });
    }

    let user = null;
    if (mongoose.isValidObjectId(rawId)) {
      user = await User.findById(rawId).lean();
    }
    
    // If not found by user ID, check if it's a patient or therapist profile ID
    let profile = null;
    if (!user && mongoose.isValidObjectId(rawId)) {
      profile = await PatientProfile.findById(rawId).lean() || await TherapistProfile.findById(rawId).lean();
      if (profile?.userId) {
        user = await User.findById(profile.userId).lean();
      }
    }

    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });

    if (!profile) {
      if (user.role === 'patient') {
        profile = await PatientProfile.findOne({ userId: user._id, isDeleted: false }).lean();
      } else if (user.role === 'therapist') {
        profile = await TherapistProfile.findOne({ userId: user._id, isDeleted: false }).lean();
      }
    }

    const { passwordHash, otp, refreshTokens, ...safeUser } = user;
    res.json({
      success: true,
      data: {
        ...safeUser,
        user: safeUser,
        profile,
        ...(profile || {}),
        _id: safeUser._id,
        id: safeUser._id
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: CREATE PATIENT ───────────────────────────────────────────────────
export const adminCreatePatient = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      dob,
      gender,
      weight,
      height,
      primaryConcern,
      address,
      medicalConditions,
      allergies,
      profileImageUrl,
      avatarUrl,
      avatar,
      profile: nestedProfile = {}
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid patient name (minimum 2 characters) is required.' } });
    }
    if (!phoneNumber || !/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/[\s\-()]/g, ''))) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid 10-15 digit phone number is required.' } });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email address format.' } });
    }

    const cleanName = name.trim();
    const cleanPhone = phoneNumber.trim().replace(/[\s\-()]/g, '');
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    const img = profileImageUrl || avatarUrl || avatar || nestedProfile.profileImageUrl || nestedProfile.avatar;

    let user = await User.findOne({ phoneNumber: cleanPhone });
    if (!user) {
      user = await User.create({
        role: 'patient',
        name: cleanName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        profileImageUrl: img || undefined,
        isPhoneVerified: true,
        isProfileCompleted: true,
      });
    } else {
      user.name = cleanName;
      if (cleanEmail) user.email = cleanEmail;
      if (img) user.profileImageUrl = img;
      await user.save();
    }

    const resolvedPrimaryConcern = primaryConcern || nestedProfile.primaryConcern || 'Rehabilitation Care';
    const resolvedTherapistId = nestedProfile.assignedTherapistId || req.body.assignedTherapistId || req.body.therapistId;
    const resolvedEmergency = nestedProfile.emergencyContact || req.body.emergencyContact || {};

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        dob: dob ? new Date(dob) : undefined,
        gender: (gender || 'male').toLowerCase(),
        weight: Number(weight) || 70,
        height: Number(height) || 175,
        primaryConcern: resolvedPrimaryConcern,
        assignedTherapistId: resolvedTherapistId || undefined,
        quickNotes: nestedProfile.quickNotes || req.body.quickNotes || '',
        recoveryScore: Number(nestedProfile.recoveryScore) || 70,
        profileImageUrl: img || undefined,
        address: address || '',
        emergencyContact: resolvedEmergency,
        medicalConditions: Array.isArray(medicalConditions) ? medicalConditions : medicalConditions ? [medicalConditions] : [],
        allergies: Array.isArray(allergies) ? allergies : allergies ? [allergies] : [],
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: { user: user.toSafeObject ? user.toSafeObject() : user, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: UPDATE PATIENT ───────────────────────────────────────────────────
export const adminUpdatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, ...profileUpdates } = req.body;

    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name must be at least 2 characters.' } });
    }
    if (phoneNumber && !/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/[\s\-()]/g, ''))) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid phone number format.' } });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email address format.' } });
    }

    let targetUserId = id;
    if (mongoose.isValidObjectId(id)) {
      const user = await User.findById(id);
      if (user) {
        if (name) user.name = name.trim();
        if (email) user.email = email.trim().toLowerCase();
        if (phoneNumber) user.phoneNumber = phoneNumber.trim().replace(/[\s\-()]/g, '');
        await user.save();
        targetUserId = user._id;
      } else {
        const p = await PatientProfile.findById(id);
        if (p) targetUserId = p.userId;
      }
    }

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: targetUserId },
      { $set: profileUpdates },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: DELETE PATIENT ───────────────────────────────────────────────────
export const adminDeletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.isValidObjectId(id)) {
      await Promise.all([
        User.findByIdAndUpdate(id, { isDeleted: true, isActive: false }),
        PatientProfile.findOneAndUpdate({ $or: [{ _id: id }, { userId: id }] }, { isDeleted: true })
      ]);
    }
    res.json({ success: true, message: 'Patient removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: CREATE THERAPIST ─────────────────────────────────────────────────
export const adminCreateTherapist = async (req, res) => {
  try {
    const { name, email, phoneNumber, specializations, qualifications, experienceYears, consultationFee, bio, languages, profileImageUrl } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Clinician name (minimum 2 characters) is required.' } });
    }
    if (!phoneNumber || !/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/[\s\-()]/g, ''))) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid 10-15 digit phone number is required.' } });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email address format.' } });
    }

    const cleanName = name.trim();
    const cleanPhone = phoneNumber.trim().replace(/[\s\-()]/g, '');
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const feeVal = consultationFee ? Number(consultationFee) * (consultationFee < 5000 ? 100 : 1) : 80000;

    let user = await User.findOne({ phoneNumber: cleanPhone });
    if (!user) {
      user = await User.create({
        role: 'therapist',
        name: cleanName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        passwordHash: 'password123',
        profileImageUrl: profileImageUrl || undefined,
        isPhoneVerified: true,
        isProfileCompleted: true,
      });
    } else {
      user.name = cleanName;
      user.role = 'therapist';
      if (cleanEmail) user.email = cleanEmail;
      if (profileImageUrl) user.profileImageUrl = profileImageUrl;
      await user.save();
    }

    const profile = await TherapistProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        specializations: Array.isArray(specializations) ? specializations : [specializations || 'Physiotherapy'],
        qualifications: Array.isArray(qualifications) ? qualifications : [qualifications || 'BPT'],
        experienceYears: Number(experienceYears) || 5,
        consultationFee: feeVal,
        bio: bio ? bio.trim() : 'Certified Rehabilitation Specialist',
        languages: Array.isArray(languages) ? languages : ['English', 'Hindi'],
        profileImageUrl: profileImageUrl || undefined,
        verificationStatus: req.body.verificationStatus || (req.body.isVerified ? 'verified' : 'pending'),
        isVerified: req.body.verificationStatus === 'verified' || req.body.isVerified === true,
        verifiedAt: (req.body.verificationStatus === 'verified' || req.body.isVerified === true) ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: { user: user.toSafeObject ? user.toSafeObject() : user, profile } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: UPDATE THERAPIST ─────────────────────────────────────────────────
export const adminUpdateTherapist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, ...profileUpdates } = req.body;

    let targetUserId = id;
    if (mongoose.isValidObjectId(id)) {
      const user = await User.findById(id);
      if (user) {
        if (name) user.name = name.trim();
        if (email) user.email = email.trim().toLowerCase();
        if (phoneNumber) user.phoneNumber = phoneNumber.trim().replace(/[\s\-()]/g, '');
        if (profileUpdates.profileImageUrl) user.profileImageUrl = profileUpdates.profileImageUrl;
        await user.save();
        targetUserId = user._id;
      } else {
        const p = await TherapistProfile.findById(id);
        if (p) {
          targetUserId = p.userId;
          if (profileUpdates.profileImageUrl) {
            await User.findByIdAndUpdate(p.userId, { profileImageUrl: profileUpdates.profileImageUrl });
          }
        }
      }
    }

    if (typeof profileUpdates.specializations === 'string') {
      profileUpdates.specializations = profileUpdates.specializations.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof profileUpdates.qualifications === 'string') {
      profileUpdates.qualifications = profileUpdates.qualifications.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof profileUpdates.languages === 'string') {
      profileUpdates.languages = profileUpdates.languages.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (profileUpdates.experienceYears !== undefined) {
      profileUpdates.experienceYears = Number(profileUpdates.experienceYears) || 0;
    }

    if (profileUpdates.consultationFee && profileUpdates.consultationFee < 5000) {
      profileUpdates.consultationFee = profileUpdates.consultationFee * 100;
    }

    const profile = await TherapistProfile.findOneAndUpdate(
      { $or: [{ userId: targetUserId }, { _id: id }] },
      { $set: profileUpdates },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: DELETE THERAPIST ─────────────────────────────────────────────────
export const adminDeleteTherapist = async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.isValidObjectId(id)) {
      await Promise.all([
        User.findByIdAndUpdate(id, { isDeleted: true, isActive: false }),
        TherapistProfile.findOneAndUpdate({ $or: [{ _id: id }, { userId: id }] }, { isDeleted: true })
      ]);
    }
    res.json({ success: true, message: 'Therapist removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: VERIFY THERAPIST ──────────────────────────────────────────────────
export const verifyTherapistAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, verificationNotes, registrationNumber, registrationAuthority } = req.body;

    const allowedStatuses = ['verified', 'rejected', 'under_review', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${allowedStatuses.join(', ')}` } });
    }

    const adminId = req.headers['x-user-id'];
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

    const profile = await TherapistProfile.findOneAndUpdate({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : new mongoose.Types.ObjectId() }, { userId: id }] }, updates, { new: true });
    if (!profile) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Therapist profile not found.' } });

    // Create Audit Log
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
    const profile = await TherapistProfile.findOne({
      $or: [{ userId: tId }, { _id: tId }]
    }).lean();

    res.json({
      success: true,
      data: {
        reviews: [],
        averageRating: profile?.ratingAvg || 4.9,
        reviewCount: profile?.ratingCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
