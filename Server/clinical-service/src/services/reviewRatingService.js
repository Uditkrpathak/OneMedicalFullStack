import mongoose from 'mongoose';
import DoctorReview from '../models/DoctorReview.js';

/**
 * Authoritative recalculation of doctor ratings from PUBLISHED reviews only.
 * Race-safe MongoDB aggregation pipeline.
 *
 * @returns {Promise<{ ratingAvg: number, ratingCount: number, distribution: object }>}
 */
export const recalculateTherapistRating = async (therapistId) => {
  if (!therapistId) return { ratingAvg: 5.0, ratingCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

  const isObjId = typeof therapistId === 'string' ? mongoose.isValidObjectId(therapistId) : Boolean(therapistId);
  const targetId = (typeof therapistId === 'string' && mongoose.isValidObjectId(therapistId))
    ? new mongoose.Types.ObjectId(therapistId)
    : therapistId;

  const result = await DoctorReview.aggregate([
    {
      $match: {
        $or: [
          { therapistId: targetId },
          { therapistId: String(therapistId) },
        ],
        status: 'PUBLISHED',
      },
    },
    {
      $group: {
        _id: '$therapistId',
        ratingAvg: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  let ratingAvg = 5.0;
  let ratingCount = 0;
  let distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (result.length > 0) {
    const raw = result[0];
    ratingCount = raw.ratingCount || 0;
    ratingAvg = ratingCount > 0 ? Math.round(raw.ratingAvg * 10) / 10 : 5.0;
    distribution = {
      5: raw.star5 || 0,
      4: raw.star4 || 0,
      3: raw.star3 || 0,
      2: raw.star2 || 0,
      1: raw.star1 || 0,
    };
  }

  // Update TherapistProfile across identity_db / MongoDB connections
  try {
    const dbNames = ['identity_db', 'one_medical_identity', mongoose.connection.name].filter(Boolean);
    for (const dbName of dbNames) {
      try {
        const db = mongoose.connection.useDb(dbName);
        await db.collection('therapistprofiles').updateMany(
          { $or: [{ _id: targetId }, { userId: targetId }] },
          { $set: { ratingAvg, ratingCount, rating: ratingAvg, reviewsCount: ratingCount } }
        );
      } catch (err) {}
    }
  } catch (err) {
    console.warn('[recalculateTherapistRating] Profile update warning:', err.message);
  }

  return { ratingAvg, ratingCount, distribution };
};
