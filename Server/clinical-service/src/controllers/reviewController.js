import mongoose from 'mongoose';
import DoctorReview from '../models/DoctorReview.js';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import { recalculateTherapistRating } from '../services/reviewRatingService.js';
import { fetchUsersByIds } from '../utils/therapistHelper.js';

const INELIGIBLE_STATUSES = [
  'PROVIDER_NO_SHOW',
  'PATIENT_NO_SHOW',
  'NO_ATTENDANCE',
  'TECHNICAL_FAILURE',
  'CANCELLED',
  'EXPIRED',
  'HELD',
  'PENDING',
];

const isAdminRole = (role) => ['super_admin', 'clinic_admin', 'admin'].includes(role);

/**
 * Sanitizes review for public feeds respecting patient anonymity
 */
const sanitizePublicReview = (r, currentUserId = null) => {
  const isAnon = Boolean(r.isAnonymous);
  const isOwner = currentUserId && r.patientId && r.patientId.toString() === currentUserId.toString();

  let displayName = r.patientName || 'Verified Patient';
  let avatar = r.patientAvatarUrl || null;

  if (isAnon) {
    displayName = isOwner ? `${r.patientName} (Posted Anonymously)` : 'Anonymous Patient';
    avatar = isOwner ? r.patientAvatarUrl : null;
  }

  return {
    _id: r._id,
    id: r._id,
    appointmentId: r.appointmentId,
    therapistId: r.therapistId,
    doctorName: r.doctorName,
    displayName,
    patientName: displayName,
    avatarUrl: avatar,
    rating: r.rating,
    communicationRating: r.communicationRating,
    explanationRating: r.explanationRating,
    waitTimeRating: r.waitTimeRating,
    comment: r.reviewText,
    reviewText: r.reviewText,
    tags: r.tags || [],
    npsScore: r.npsScore,
    isAnonymous: isAnon,
    isVerifiedConsultation: r.isVerifiedConsultation !== false,
    helpfulCount: r.helpfulUsers?.length || r.helpfulCount || 0,
    isHelpful: currentUserId && Array.isArray(r.helpfulUsers) ? r.helpfulUsers.some(u => u.toString() === currentUserId.toString()) : false,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

/**
 * POST /api/v1/clinical/reviews
 * Submit a verified consultation review
 */
export const submitReview = async (req, res) => {
  try {
    const patientId = req.headers['x-user-id'] || req.user?.userId || req.user?.id;
    if (!patientId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required to submit review.' } });
    }

    const {
      appointmentId,
      therapistId,
      rating,
      communicationRating = 5,
      explanationRating = 5,
      waitTimeRating = '< 15 mins',
      reviewText,
      feedback,
      tags = [],
      npsScore = 10,
      isAnonymous = false,
    } = req.body;

    const comment = (reviewText || feedback || '').trim();
    if (!appointmentId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_APPOINTMENT', message: 'appointmentId is required.' } });
    }
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5.' } });
    }
    if (comment.length < 5) {
      return res.status(400).json({ success: false, error: { code: 'REVIEW_TOO_SHORT', message: 'Please provide at least 5 characters of feedback.' } });
    }

    // 1. Fetch & Validate Appointment (with ObjectId validation and automatic resolution)
    let appointment = null;
    if (appointmentId && mongoose.isValidObjectId(appointmentId)) {
      appointment = await Appointment.findById(appointmentId);
    }

    if (!appointment) {
      // Find latest completed/confirmed consultation for this patient with the therapist
      const targetTherapistId = therapistId || req.body.doctorId;
      const query = {
        patientId: patientId.toString(),
        isDeleted: false,
      };
      if (targetTherapistId && mongoose.isValidObjectId(targetTherapistId)) {
        query.$or = [
          { therapistId: targetTherapistId },
          { therapistProfileId: targetTherapistId },
        ];
      }
      appointment = await Appointment.findOne(query).sort({ startTime: -1, createdAt: -1 });
    }

    if (!appointment || appointment.isDeleted) {
      return res.status(404).json({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'No eligible consultation found for this doctor.' } });
    }

    // 2. Ownership verification
    if (appointment.patientId?.toString() !== patientId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only review consultations you attended.' } });
    }

    // 3. Completion & Attendance Eligibility Gate
    const apptStatus = (appointment.status || '').toUpperCase();
    const attendanceOutcome = (appointment.attendanceOutcome || '').toUpperCase();

    if (apptStatus !== 'COMPLETED' && apptStatus !== 'DOCUMENTED') {
      return res.status(400).json({
        success: false,
        error: { code: 'INELIGIBLE_APPOINTMENT', message: 'Only fully completed consultations are eligible for reviews.' },
      });
    }

    if (INELIGIBLE_STATUSES.includes(apptStatus) || INELIGIBLE_STATUSES.includes(attendanceOutcome)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INELIGIBLE_CONSULTATION', message: 'Consultations with no-show or technical cancellation cannot be reviewed.' },
      });
    }

    // 4. Duplicate Check (One appointment = one review)
    const existingReview = await DoctorReview.findOne({ appointmentId: appointment._id });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: { code: 'REVIEW_ALREADY_EXISTS', message: 'You have already submitted a review for this consultation.' },
      });
    }

    // 5. Resolve user and doctor snapshots
    const resolvedTherapistId = appointment.therapistId || therapistId;
    let patientName = appointment.patientName || 'Patient';
    let patientAvatarUrl = appointment.patientAvatarUrl || null;
    let doctorName = appointment.therapistName || 'Doctor';

    try {
      const users = await fetchUsersByIds([patientId, resolvedTherapistId].filter(Boolean));
      const pUser = users.find(u => (u._id?.toString() || u.id?.toString()) === patientId.toString());
      const tUser = users.find(u => (u._id?.toString() || u.id?.toString()) === resolvedTherapistId?.toString());
      if (pUser) {
        patientName = pUser.name || patientName;
        patientAvatarUrl = pUser.profileImageUrl || pUser.avatarUrl || patientAvatarUrl;
      }
      if (tUser) {
        doctorName = tUser.name || doctorName;
      }
    } catch (e) {}

    // 6. Authoritative creation (isVerifiedConsultation is computed on server)
    const review = await DoctorReview.create({
      appointmentId: appointment._id,
      patientId: appointment.patientId || patientId,
      patientName,
      patientAvatarUrl,
      therapistId: resolvedTherapistId,
      doctorName,
      rating: Number(rating),
      communicationRating: Math.min(5, Math.max(1, Number(communicationRating))),
      explanationRating: Math.min(5, Math.max(1, Number(explanationRating))),
      waitTimeRating: String(waitTimeRating || '< 15 mins'),
      reviewText: comment,
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      npsScore: Number(npsScore) || 10,
      isAnonymous: Boolean(isAnonymous),
      isVerifiedConsultation: true,
      status: 'PUBLISHED',
    });

    // 7. Authoritative race-safe rating recalculation
    const updatedStats = await recalculateTherapistRating(resolvedTherapistId);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your verified review has been published.',
      data: {
        review: sanitizePublicReview(review, patientId),
        therapistStats: updatedStats,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: { code: 'REVIEW_ALREADY_EXISTS', message: 'A review for this appointment already exists.' } });
    }
    console.error('[submitReview] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * GET /api/v1/clinical/therapists/:therapistId/reviews
 * Public reviews list with rating breakdown and privacy sanitization
 */
export const getTherapistReviews = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const currentUserId = req.headers['x-user-id'] || req.user?.userId;

    if (!therapistId || !mongoose.isValidObjectId(therapistId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Valid therapistId is required.' } });
    }

    const tId = new mongoose.Types.ObjectId(therapistId);

    const [reviews, stats] = await Promise.all([
      DoctorReview.find({ therapistId: tId, status: 'PUBLISHED' }).sort({ createdAt: -1 }).lean(),
      recalculateTherapistRating(tId),
    ]);

    const sanitizedReviews = reviews.map(r => sanitizePublicReview(r, currentUserId));

    res.json({
      success: true,
      data: {
        reviews: sanitizedReviews,
        averageRating: stats.ratingAvg,
        reviewCount: stats.ratingCount,
        distribution: stats.distribution,
      },
    });
  } catch (err) {
    console.error('[getTherapistReviews] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * GET /api/v1/clinical/appointments/:appointmentId/review
 * Check review status for a completed appointment
 */
export const getAppointmentReview = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const currentUserId = req.headers['x-user-id'] || req.user?.userId;

    if (!appointmentId || !mongoose.isValidObjectId(appointmentId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Valid appointmentId required.' } });
    }

    const review = await DoctorReview.findOne({ appointmentId: new mongoose.Types.ObjectId(appointmentId) }).lean();

    res.json({
      success: true,
      data: {
        hasReviewed: Boolean(review),
        review: review ? sanitizePublicReview(review, currentUserId) : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * PUT /api/v1/clinical/reviews/:id/helpful
 * Atomically add helpful vote
 */
export const addHelpfulVote = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const review = await DoctorReview.findByIdAndUpdate(
      id,
      { $addToSet: { helpfulUsers: userObjId } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found.' } });
    }

    const count = review.helpfulUsers?.length || 0;
    await DoctorReview.updateOne({ _id: review._id }, { $set: { helpfulCount: count } });

    res.json({
      success: true,
      data: {
        reviewId: review._id,
        helpfulCount: count,
        isHelpful: true,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * DELETE /api/v1/clinical/reviews/:id/helpful
 * Atomically remove helpful vote
 */
export const removeHelpfulVote = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId || req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const review = await DoctorReview.findByIdAndUpdate(
      id,
      { $pull: { helpfulUsers: userObjId } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found.' } });
    }

    const count = review.helpfulUsers?.length || 0;
    await DoctorReview.updateOne({ _id: review._id }, { $set: { helpfulCount: count } });

    res.json({
      success: true,
      data: {
        reviewId: review._id,
        helpfulCount: count,
        isHelpful: false,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * GET /api/v1/clinical/admin/reviews
 * RBAC-protected full review feed for admin moderation
 */
export const getAdminReviews = async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || req.user?.role;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const {
      therapistId,
      status,
      rating,
      search = '',
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (therapistId && therapistId !== 'All' && mongoose.isValidObjectId(therapistId)) {
      filter.therapistId = new mongoose.Types.ObjectId(therapistId);
    }
    if (status && status !== 'All') {
      filter.status = status.toUpperCase();
    }
    if (rating && rating !== 'All') {
      filter.rating = Number(rating);
    }
    if (search) {
      filter.$or = [
        { doctorName: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { reviewText: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total, totalPublished, totalFlagged, totalHidden] = await Promise.all([
      DoctorReview.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      DoctorReview.countDocuments(filter),
      DoctorReview.countDocuments({ status: 'PUBLISHED' }),
      DoctorReview.countDocuments({ status: 'FLAGGED' }),
      DoctorReview.countDocuments({ status: 'HIDDEN' }),
    ]);

    res.json({
      success: true,
      data: reviews,
      summary: {
        total,
        published: totalPublished,
        flagged: totalFlagged,
        hidden: totalHidden,
      },
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      },
    });
  } catch (err) {
    console.error('[getAdminReviews] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

/**
 * PATCH /api/v1/clinical/admin/reviews/:id/status
 * Moderate review status + AuditLog + immediate rating recomputation
 */
export const moderateReviewStatus = async (req, res) => {
  try {
    const adminId = req.headers['x-user-id'] || req.user?.userId || 'admin';
    const userRole = req.headers['x-user-role'] || req.user?.role;

    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    const normalizedStatus = (status || '').toUpperCase();
    if (!['PUBLISHED', 'FLAGGED', 'HIDDEN'].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be PUBLISHED, FLAGGED, or HIDDEN.' } });
    }

    const review = await DoctorReview.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found.' } });
    }

    const previousStatus = review.status;
    review.status = normalizedStatus;
    review.moderationReason = reason || `Status changed from ${previousStatus} to ${normalizedStatus}`;
    review.moderatedBy = mongoose.isValidObjectId(adminId) ? new mongoose.Types.ObjectId(adminId) : null;
    review.moderatedAt = new Date();
    await review.save();

    // Audit log
    try {
      if (AuditLog) {
        await AuditLog.create({
          action: 'REVIEW_MODERATED',
          entityType: 'DoctorReview',
          entityId: review._id.toString(),
          performedBy: adminId,
          details: { previousStatus, newStatus: normalizedStatus, reason },
        });
      }
    } catch (e) {}

    // Invariant: Immediately recalculate doctor's published rating
    const updatedStats = await recalculateTherapistRating(review.therapistId);

    res.json({
      success: true,
      message: `Review status updated to ${normalizedStatus}. Doctor ratings updated.`,
      data: {
        review,
        therapistStats: updatedStats,
      },
    });
  } catch (err) {
    console.error('[moderateReviewStatus] Error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
