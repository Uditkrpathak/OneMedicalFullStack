import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
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
  
  // Complete address check (street, city, state, pincode)
  const addr = profile.address;
  const hasCompleteAddress = addr && (
    (typeof addr === 'string' && addr.trim().length > 5) ||
    (typeof addr === 'object' && hasValue(addr.addressLine1 || addr.street) && hasValue(addr.city) && hasValue(addr.state) && hasValue(addr.postalCode || addr.pincode))
  );

  return Boolean(hasBasicUser && hasDemographics && hasCompleteAddress);
};

const isAdminRole = (role) => ['super_admin', 'clinic_admin', 'admin'].includes(role);

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
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
    const requesterId = req.user?.userId || req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    // Role Guard: Only patients (or admins) can update patient profiles
    if (requesterRole !== 'patient' && !isAdminRole(requesterRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only patients can update patient profiles.' } });
    }

    const targetUserId = requesterId;

    const allowed = ['dob', 'gender', 'height', 'weight', 'bloodGroup', 'primaryConcern', 'medicalConditions', 'allergies', 'emergencyContact', 'address', 'consultationPreferences'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    // Handle heightCm / weightKg aliases
    if (req.body.heightCm !== undefined && updates.height === undefined) updates.height = req.body.heightCm;
    if (req.body.weightKg !== undefined && updates.weight === undefined) updates.weight = req.body.weightKg;

    // Normalize gender
    if (updates.gender) {
      const g = String(updates.gender).toLowerCase().trim();
      updates.gender = ['male', 'female', 'other', 'prefer_not_to_say'].includes(g) ? g : 'other';
    }

    // Normalize Date of Birth
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
    const requesterId = req.user?.userId || req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    // Role Guard: Only therapists (or admins) can update therapist profiles
    if (requesterRole !== 'therapist' && !isAdminRole(requesterRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only specialists can update therapist profiles.' } });
    }

    const allowed = ['specializations', 'qualifications', 'experienceYears', 'languages', 'bio', 'profileImageUrl', 'clinicName', 'clinicLocation', 'consultationFee', 'availabilityTemplate', 'leaveExceptions', 'appointmentBuffer'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

    // Canonical Consultation Fee in Paise integer
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

// ─── GET THERAPISTS (Public Catalog with Authentic Ratings) ────────────────────
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

    // Format with authentic data (NO fabricated ratings or fake availability)
    const formatted = profiles.map(prof => ({
      _id: prof._id,
      id: prof._id,
      userId: prof.userId?._id || prof.userId,
      name: prof.userId?.name || prof.name || 'Specialist',
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
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET SAVED THERAPISTS (Canonical User._id resolution) ──────────────────────
export const getSavedTherapists = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
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

// ─── SAVE THERAPIST (Deduplicated Canonical User._id) ──────────────────────────
export const saveTherapist = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { therapistId } = req.body;

    if (!userId || !therapistId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'therapistId is required.' } });
    }

    // Resolve canonical User._id
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
    const userId = req.user?.userId || req.user?.id;
    const { id: therapistId } = req.params;

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

// ─── NOTIFICATION PREFERENCES (Whitelist Filtered) ────────────────────────────
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
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

// ─── ACCOUNT DELETION (Session Revocation & Distributed Event) ────────────────
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    // 1. Revoke all active sessions
    await RefreshToken.deleteMany({ userId });

    // 2. Mark account as deleted and deactivated
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

    // 3. Publish distributed account deletion event
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

// ─── ADMIN: CREATE THERAPIST (Passwordless Onboarding) ────────────────────────
export const adminCreateTherapist = async (req, res) => {
  try {
    const adminRole = req.user?.role;
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { name, email, phoneNumber, specializations, qualifications, experienceYears, consultationFee, clinicName, clinicLocation, bio } = req.body;

    if (!name || (!email && !phoneNumber)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and email or phoneNumber are required.' } });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : undefined;
    const cleanPhone = phoneNumber ? normalizePhone(phoneNumber) : undefined;

    // Check duplicate
    const existing = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : [])
      ],
      isDeleted: false
    });

    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'USER_ALREADY_EXISTS', message: 'User with this email or mobile number already exists.' } });
    }

    const rawFee = Number(consultationFee || 80000);
    const feePaise = rawFee < 5000 ? rawFee * 100 : rawFee;

    // Create user in pending_onboarding status (NO default plaintext password!)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phoneNumber: cleanPhone,
      role: 'therapist',
      status: 'pending',
      isActive: false,
      isProfileCompleted: true,
    });

    const profile = await TherapistProfile.create({
      userId: user._id,
      name: name.trim(),
      specializations: Array.isArray(specializations) ? specializations : ['Orthopedic Physiotherapy'],
      qualifications: Array.isArray(qualifications) ? qualifications : ['MPT - Orthopedics'],
      experienceYears: Number(experienceYears) || 0,
      consultationFee: feePaise,
      clinicName: clinicName || 'OneMedical Care Center',
      clinicLocation: clinicLocation || 'Bengaluru, Karnataka',
      bio: bio || '',
      verificationStatus: 'verified',
      isVerified: true,
      verifiedAt: new Date(),
    });

    // Mark active now that profile is created and verified by admin
    user.isActive = true;
    user.status = 'active';
    await user.save();

    res.status(201).json({ success: true, data: { user: user.toSafeObject(), profile } });
  } catch (err) {
    console.error('[adminCreateTherapist] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── ADMIN: VERIFY THERAPIST ──────────────────────────────────────────────────
export const verifyTherapistAdmin = async (req, res) => {
  try {
    const adminRole = req.user?.role;
    if (!isAdminRole(adminRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const { status, rejectionReason, verificationNotes, registrationNumber, registrationAuthority } = req.body;

    const allowedStatuses = ['verified', 'rejected', 'under_review', 'suspended'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${allowedStatuses.join(', ')}` } });
    }

    const adminId = req.user?.userId || req.user?.id;
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

    // Synchronize User status
    if (profile.userId) {
      const userStatus = status === 'verified' ? 'active' : (status === 'rejected' ? 'rejected' : (status === 'suspended' ? 'suspended' : 'pending'));
      await User.findByIdAndUpdate(profile.userId, {
        status: userStatus,
        isActive: status === 'verified',
      });
    }

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

// ─── GET THERAPIST REVIEWS (Honest Review Summary) ─────────────────────────────
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
