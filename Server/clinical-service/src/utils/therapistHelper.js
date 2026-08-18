import mongoose from 'mongoose';

const IDENTITY_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';

/**
 * Resolves all linked identifier strings for a therapist
 * (both user account ID and therapist profile document ID).
 */
export const resolveTherapistIds = async (therapistId) => {
  if (!therapistId) return [];
  const idStr = therapistId.toString();
  const ids = new Set([idStr]);

  // 1. Database cross-lookup if connected
  if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.isValidObjectId(idStr)) {
    const objId = new mongoose.Types.ObjectId(idStr);
    const dbNames = ['one_medical_identity', 'identity_db', mongoose.connection.name].filter(Boolean);
    for (const dbName of dbNames) {
      try {
        const db = mongoose.connection.useDb(dbName);
        const therapistProf = await db.collection('therapistprofiles').findOne({
          $or: [{ _id: objId }, { userId: objId }, { userId: idStr }]
        });
        if (therapistProf) {
          if (therapistProf._id) ids.add(therapistProf._id.toString());
          if (therapistProf.userId) ids.add(therapistProf.userId.toString());
          break;
        }
      } catch (e) {}
    }
  }

  // 2. HTTP lookup against identity service
  try {
    const res = await fetch(`${IDENTITY_URL}/therapists/${idStr}`, {
      headers: {
        'x-internal-key': process.env.INTERNAL_API_KEY || 'onemedical_internal_key_production_2026',
        'x-user-role': 'clinic_admin',
        'x-user-id': 'system',
      }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data._id) ids.add(json.data._id.toString());
        if (json.data.id) ids.add(json.data.id.toString());
        if (json.data.userId) {
          const uId = json.data.userId._id || json.data.userId;
          ids.add(uId.toString());
        }
        if (json.data.therapistId) ids.add(json.data.therapistId.toString());
      }
    }
  } catch (e) {}

  return Array.from(ids);
};

/**
 * Fetches user profile objects from identity service for a list of user IDs.
 */
export const fetchUsersByIds = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(userIds.map(id => id?.toString()).filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  // 1. Try internal HTTP API on identity service
  try {
    const res = await fetch(`${IDENTITY_URL}/internal/users?ids=${uniqueIds.join(',')}`, {
      headers: {
        'x-internal-key': process.env.INTERNAL_API_KEY || 'onemedical_internal_key_production_2026',
        'x-user-role': 'clinic_admin',
        'x-user-id': 'system',
      }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (e) {}

  // 2. Direct MongoDB fallback
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const validObjIds = uniqueIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id));
    if (validObjIds.length > 0) {
      const dbNames = ['one_medical_identity', 'identity_db', mongoose.connection.name].filter(Boolean);
      for (const dbName of dbNames) {
        try {
          const db = mongoose.connection.useDb(dbName);
          const [users, patientProfiles] = await Promise.all([
            db.collection('users').find({ _id: { $in: validObjIds } }).toArray(),
            db.collection('patientprofiles').find({ $or: [{ _id: { $in: validObjIds } }, { userId: { $in: validObjIds } }] }).toArray(),
          ]);
          if (users.length > 0 || patientProfiles.length > 0) {
            const userMap = new Map();
            users.forEach(u => userMap.set(u._id.toString(), u));
            patientProfiles.forEach(p => {
              const uId = p.userId?.toString() || p._id.toString();
              if (!userMap.has(uId)) {
                userMap.set(uId, { ...p, _id: p._id, name: p.name || 'Patient' });
              }
            });
            return Array.from(userMap.values());
          }
        } catch (e) {}
      }
    }
  }

  return [];
};
