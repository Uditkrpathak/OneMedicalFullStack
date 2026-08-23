import MedicalRecord from '../models/MedicalRecord.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';
import storageProvider from '../utils/storage/storageProvider.js';
import clinicalProcessor from '../notifications/clinicalProcessor.js';
import { logAudit } from '../utils/audit.js';
import { publishEvent } from '../utils/rabbitmq.js';

// ─── 1. GET PRESIGNED UPLOAD URL ──────────────────────────────────────────────
export const getPresignedUploadUrl = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'] || req.user?.id;
    const requesterRole = req.user?.role || req.headers['x-user-role'];

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    let targetPatientId = requesterId;
    if (requesterRole === 'therapist' || requesterRole === 'clinic_admin' || requesterRole === 'super_admin') {
      const patientId = req.body?.patientId || req.query?.patientId;
      if (patientId) {
        targetPatientId = patientId;
      }
    }

    const { fileName, mimeType = 'application/pdf', category = 'OTHER' } = req.body;

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'fileName is required.' }
      });
    }

    const normalizedCategory = String(category).toUpperCase().trim();
    const validCategories = [
      'CONSULTATION_REPORT',
      'TREATMENT_PLAN',
      'EXERCISE_PROGRAM',
      'MRI_SCAN',
      'X_RAY',
      'PRESCRIPTION',
      'DISCHARGE_SUMMARY',
      'LAB_REPORT',
      'INVOICE_RECEIPT',
      'OTHER'
    ];
    const safeCategory = validCategories.includes(normalizedCategory) ? normalizedCategory : 'OTHER';

    // Generate isolated key: patients/{patientId}/{category}/{timestamp}_{cleanFilename}
    const storageKey = storageProvider.generateStorageKey(targetPatientId, safeCategory, fileName);
    const presignedInfo = await storageProvider.createUploadUrl(storageKey, mimeType, 300);

    res.json({
      success: true,
      data: {
        uploadUrl: presignedInfo.uploadUrl,
        storageKey: presignedInfo.storageKey,
        s3Key: presignedInfo.storageKey,
        provider: storageProvider.name || 'local',
        expiresAt: presignedInfo.expiresAt,
        expiresIn: presignedInfo.expiresIn || 300
      }
    });
  } catch (err) {
    console.error('[MedicalRecord] getPresignedUploadUrl error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 2. CREATE MEDICAL RECORD METADATA ─────────────────────────────────────────
export const createMedicalRecord = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'] || req.user?.id;
    const requesterRole = req.user?.role || req.headers['x-user-role'];

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    let targetPatientId = requesterId;
    if (requesterRole === 'therapist' || requesterRole === 'clinic_admin' || requesterRole === 'super_admin') {
      const patientId = req.body?.patientId || req.query?.patientId;
      if (patientId) {
        targetPatientId = patientId;
      }
    }

    const {
      title,
      category = 'OTHER',
      recordType,
      type,
      doctorName,
      hospitalName,
      recordDate,
      s3Key,
      fileKey,
      fileName,
      fileSizeBytes,
      sizeBytes,
      mimeType = 'application/pdf',
      tags = [],
      notes = '',
      fileUrl,
    } = req.body;

    const effectiveS3Key = s3Key || fileKey || fileUrl || `records/${targetPatientId}/${Date.now()}_document.pdf`;
    const effectiveFileName = fileName || title || 'document.pdf';

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'title is required.' }
      });
    }

    const normalizedCategory = String(category || recordType || type || 'OTHER').toUpperCase().trim();
    const validCategories = ['MRI_SCAN', 'X_RAY', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'LAB_REPORT', 'INSURANCE_DOCUMENT', 'OTHER'];
    const safeCategory = validCategories.includes(normalizedCategory) ? normalizedCategory : 'OTHER';

    const record = await MedicalRecord.create({
      patientId: targetPatientId.toString(),
      title: title.trim(),
      category: safeCategory,
      recordType: safeCategory,
      type: safeCategory.toLowerCase(),
      doctorName: doctorName ? String(doctorName).trim() : '',
      hospitalName: hospitalName ? String(hospitalName).trim() : '',
      recordDate: recordDate ? new Date(recordDate) : new Date(),
      storageProvider: storageProvider.name || 'local',
      storageKey: effectiveS3Key,
      s3Key: effectiveS3Key,
      fileKey: effectiveS3Key,
      fileName: effectiveFileName,
      fileSizeBytes: Number(fileSizeBytes || sizeBytes || 0),
      sizeBytes: Number(fileSizeBytes || sizeBytes || 0),
      mimeType,
      tags: Array.isArray(tags) ? tags : [String(tags)],
      notes: notes || '',
      uploadedBy: requesterRole || 'patient',
      uploadedByRole: requesterRole || 'patient',
      uploaderId: requesterId.toString(),
      visibleToPatient: true,
      isDeleted: false
    });

    try {
      await publishEvent('medical_record.uploaded', {
        eventId: `MR_UPLOAD:${record._id}_${Date.now()}`,
        type: 'medical_record.uploaded',
        patientId: targetPatientId.toString(),
        title: record.title,
        category: record.category,
        doctorName: record.doctorName || 'Your Specialist',
        recordId: record._id.toString(),
        route: 'MedicalRecordsVault',
      });
    } catch (evtErr) {
      console.warn('[MedicalRecord] Notification publish error:', evtErr.message);
    }

    res.status(201).json({
      success: true,
      data: {
        record: {
          id: record._id,
          _id: record._id,
          title: record.title,
          category: record.category,
          recordType: record.recordType,
          doctorName: record.doctorName,
          hospitalName: record.hospitalName,
          recordDate: record.recordDate,
          fileKey: record.fileKey,
          fileName: record.fileName,
          fileSizeBytes: record.fileSizeBytes,
          mimeType: record.mimeType,
          notes: record.notes,
          tags: record.tags,
          createdAt: record.createdAt
        }
      }
    });
  } catch (err) {
    console.error('[MedicalRecord] create error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 3. LIST MEDICAL RECORDS (WITH FRESH 300s PRESIGNED URLS) ─────────────────
export const listMedicalRecords = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'] || req.user?.id;
    const requesterRole = req.user?.role || req.headers['x-user-role'];

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const { category, recordType, type, patientId, search, page = 1, limit = 50 } = req.query;
    const filter = { isDeleted: false };

    if (requesterRole === 'patient') {
      filter.patientId = requesterId.toString();
    } else if (requesterRole === 'therapist') {
      const queryPatientId = patientId || req.params?.patientId;
      if (queryPatientId) {
        filter.patientId = queryPatientId.toString();
      }
    } else if (requesterRole === 'clinic_admin' || requesterRole === 'super_admin' || requesterRole === 'admin') {
      if (patientId) {
        filter.patientId = patientId.toString();
      }
    } else if (patientId) {
      filter.patientId = patientId.toString();
    }

    const filterCategory = category || recordType || type;
    if (filterCategory && filterCategory !== 'ALL' && filterCategory !== 'All') {
      filter.$or = [
        { category: filterCategory.toUpperCase() },
        { recordType: filterCategory.toUpperCase() },
        { type: filterCategory.toLowerCase() }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      MedicalRecord.find(filter)
        .sort({ recordDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MedicalRecord.countDocuments(filter)
    ]);

    // Enrich every record with a fresh, short-lived (300s) presigned download URL
    const enrichedRecords = await Promise.all(
      records.map(async (rec) => {
        const presigned = await storageProvider.createDownloadUrl(rec.storageKey || rec.s3Key || rec.fileKey, 300);
        const resolvedCategory = (rec.category && rec.category !== 'OTHER'
          ? rec.category
          : (rec.recordType && rec.recordType !== 'OTHER'
              ? rec.recordType
              : (rec.type ? rec.type.toUpperCase() : 'OTHER'))).toUpperCase();

        return {
          id: rec._id,
          _id: rec._id,
          title: rec.title,
          category: resolvedCategory,
          recordType: resolvedCategory,
          doctorName: rec.doctorName || '',
          hospitalName: rec.hospitalName || '',
          recordDate: rec.recordDate,
          fileName: rec.fileName || 'document.pdf',
          fileSizeBytes: rec.fileSizeBytes || rec.sizeBytes || 0,
          mimeType: rec.mimeType || 'application/pdf',
          checksum: rec.checksum || null,
          isGenerated: Boolean(rec.isGenerated),
          notes: rec.notes || '',
          tags: rec.tags || [],
          downloadUrl: presigned?.downloadUrl || null,
          downloadUrlExpiresAt: presigned?.expiresAt || presigned?.downloadUrlExpiresAt || null,
          expiresIn: 300,
          createdAt: rec.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: enrichedRecords,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)) || 1
      }
    });
  } catch (err) {
    console.error('[MedicalRecord] list error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 4. GET SINGLE MEDICAL RECORD BY ID ───────────────────────────────────────
export const getMedicalRecordById = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { id } = req.params;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const record = await MedicalRecord.findOne({ _id: id, isDeleted: false }).lean();
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Medical record not found.' } });
    }

    // Authorization checks
    if (requesterRole === 'patient') {
      if (record.patientId !== requesterId.toString()) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own medical records.' } });
      }
    } else if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, record.patientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with this patient.' } });
      }
    }

    // Record immutable audit entry
    logAudit({
      actorId: requesterId,
      actorRole: requesterRole,
      action: 'MEDICAL_RECORD_VIEWED',
      resourceType: 'MedicalRecord',
      resourceId: record._id,
      req
    });

    // Generate fresh 300s presigned download URL
    const presigned = await storageProvider.createDownloadUrl(record.storageKey || record.s3Key || record.fileKey, 300);

    res.json({
      success: true,
      data: {
        id: record._id,
        _id: record._id,
        patientId: record.patientId,
        title: record.title,
        category: record.category || record.recordType || 'OTHER',
        recordType: record.recordType || record.category || 'OTHER',
        doctorName: record.doctorName || '',
        hospitalName: record.hospitalName || '',
        recordDate: record.recordDate,
        fileName: record.fileName || 'document.pdf',
        fileSizeBytes: record.fileSizeBytes || record.sizeBytes || 0,
        mimeType: record.mimeType || 'application/pdf',
        checksum: record.checksum || null,
        isGenerated: Boolean(record.isGenerated),
        notes: record.notes || '',
        tags: record.tags || [],
        downloadUrl: presigned?.downloadUrl || null,
        downloadUrlExpiresAt: presigned?.expiresAt || presigned?.downloadUrlExpiresAt || null,
        expiresIn: 300,
        createdAt: record.createdAt
      }
    });
  } catch (err) {
    console.error('[MedicalRecord] getById error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 5. SOFT DELETE MEDICAL RECORD ────────────────────────────────────────────
export const deleteMedicalRecord = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { id } = req.params;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const record = await MedicalRecord.findOne({ _id: id, isDeleted: false });
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Medical record not found.' } });
    }

    // Patient ownership check (only patient owner or admin can delete)
    if (requesterRole === 'patient' && record.patientId !== requesterId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own medical records.' } });
    } else if (requesterRole === 'therapist') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Therapists cannot delete patient records.' } });
    }

    record.isDeleted = true;
    await record.save();

    res.json({
      success: true,
      message: 'Medical record deleted successfully.'
    });
  } catch (err) {
    console.error('[MedicalRecord] delete error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 6. VERIFY MEDICAL RECORD (THERAPIST REVIEW) ──────────────────────────────
export const verifyMedicalRecord = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { id } = req.params;

    if (requesterRole !== 'therapist' && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only therapists or admins can verify medical records.' } });
    }

    const record = await MedicalRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Medical record not found.' } });
    }

    record.verifiedBy = requesterId;
    record.verifiedAt = new Date();
    await record.save();

    res.json({ success: true, message: 'Medical record verified.', data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// Aliases for backward compatibility
export const getRecordsByPatient = listMedicalRecords;
export const getRecordDownloadUrl = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const { id } = req.params;

    if (!requesterId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }

    const record = await MedicalRecord.findOne({ _id: id, isDeleted: false }).lean();
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Medical record not found.' } });
    }

    if (requesterRole === 'patient') {
      if (record.patientId !== requesterId.toString()) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
      }
    } else if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, record.patientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No active care relationship with this patient.' } });
      }
    }

    const presigned = await storageProvider.createDownloadUrl(record.storageKey || record.s3Key || record.fileKey, 300);

    res.json({
      success: true,
      data: {
        recordId: record._id,
        title: record.title,
        downloadUrl: presigned?.downloadUrl || null,
        expiresIn: 300,
        expiresAt: presigned?.expiresAt || presigned?.downloadUrlExpiresAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const updateMedicalRecord = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const { id } = req.params;
    const record = await MedicalRecord.findOne({ _id: id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found.' } });
    if (record.patientId !== requesterId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }
    Object.assign(record, req.body);
    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── 7. SECURE LOCAL STORAGE STREAMING ────────────────────────────────────────
export const handleStorageDownload = async (req, res) => {
  try {
    const { key, expires, sig } = req.query;
    if (!key || !expires || !sig) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Missing key, expires, or sig parameter.' } });
    }

    const expiresUnix = parseInt(expires);
    if (Math.floor(Date.now() / 1000) > expiresUnix) {
      return res.status(403).json({ success: false, error: { code: 'LINK_EXPIRED', message: 'Signed download link has expired.' } });
    }

    const payload = `GET:${key}:${expiresUnix}`;
    const expectedSig = (await import('crypto')).default
      .createHmac('sha256', process.env.STORAGE_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET || 'onemedical_local_storage_secret_key_dev')
      .update(payload)
      .digest('hex');

    if (sig !== expectedSig) {
      return res.status(403).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Cryptographic signature verification failed.' } });
    }

    const pathMod = (await import('path')).default;
    const fsMod = (await import('fs')).default;
    const root = pathMod.resolve(process.cwd(), 'Server/clinical-service/storage/medical-records');
    const safeKey = pathMod.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    const filePath = pathMod.join(root, safeKey);

    if (!fsMod.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Document file not found.' } });
    }

    const mime = key.endsWith('.html') ? 'text/html' : (key.endsWith('.png') ? 'image/png' : (key.endsWith('.jpg') ? 'image/jpeg' : 'application/pdf'));
    res.setHeader('Content-Type', mime);
    fsMod.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'STREAM_ERROR', message: err.message } });
  }
};
