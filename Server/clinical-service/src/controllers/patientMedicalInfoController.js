import PatientMedicalInfo from '../models/PatientMedicalInfo.js';
import { hasActiveCareRelationship } from '../utils/careRelationship.js';
import { logAudit } from '../utils/audit.js';

export const getPatientMedicalInfo = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const targetPatientId = req.params.patientId || (requesterRole === 'patient' ? requesterId : null);

    if (!targetPatientId) {
      return res.status(400).json({ success: false, error: { code: 'PATIENT_ID_REQUIRED', message: 'patientId is required.' } });
    }

    if (requesterRole === 'patient' && requesterId !== targetPatientId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own medical info.' } });
    }

    if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, targetPatientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No care relationship found.' } });
      }
    }

    let info = await PatientMedicalInfo.findOne({ patientId: targetPatientId.toString(), isDeleted: false }).lean();
    if (!info) {
      // Return clean default structure
      info = {
        patientId: targetPatientId,
        medicalConditions: [],
        allergies: [],
        currentMedications: [],
        pastSurgeries: [],
        clinicalNotes: [],
        clinicalFlags: [],
        bloodGroup: ''
      };
    } else if (!info.clinicalNotes) {
      info.clinicalNotes = [];
    }

    res.json({ success: true, data: info });
  } catch (err) {
    console.error('[MedicalInfo] get error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const updatePatientMedicalInfo = async (req, res) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;
    const targetPatientId = req.params.patientId || (requesterRole === 'patient' ? requesterId : null);

    if (!targetPatientId) {
      return res.status(400).json({ success: false, error: { code: 'PATIENT_ID_REQUIRED', message: 'patientId is required.' } });
    }

    if (requesterRole === 'patient' && requesterId !== targetPatientId.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own medical info.' } });
    }

    if (requesterRole === 'therapist') {
      const hasCare = await hasActiveCareRelationship(requesterId, targetPatientId);
      if (!hasCare) {
        return res.status(403).json({ success: false, error: { code: 'CARE_RELATIONSHIP_REQUIRED', message: 'No care relationship found.' } });
      }
    }

    const {
      medicalConditions,
      allergies,
      currentMedications,
      pastSurgeries,
      clinicalNotes,
      notes,
      note,
      newNote,
      clinicalFlags,
      bloodGroup
    } = req.body;

    const updates = {
      updatedBy: requesterId,
      isDeleted: false
    };

    if (medicalConditions !== undefined) updates.medicalConditions = medicalConditions;
    if (allergies !== undefined) updates.allergies = allergies;
    if (currentMedications !== undefined) updates.currentMedications = currentMedications;
    if (pastSurgeries !== undefined) updates.pastSurgeries = pastSurgeries;
    if (clinicalFlags !== undefined) updates.clinicalFlags = clinicalFlags;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;
    if (clinicalNotes !== undefined && Array.isArray(clinicalNotes)) updates.clinicalNotes = clinicalNotes;

    // Handle single note entry submission
    const singleNoteText = notes || note || newNote;
    let pushUpdate = null;
    if (singleNoteText && typeof singleNoteText === 'string' && singleNoteText.trim()) {
      let authorName = 'Clinic Specialist';
      if (requesterRole === 'clinic_admin' || requesterRole === 'super_admin') authorName = 'Clinic Administrator';
      else if (requesterRole === 'therapist') authorName = 'Physical Therapist';

      pushUpdate = {
        clinicalNotes: {
          text: singleNoteText.trim(),
          author: authorName,
          authorRole: requesterRole || 'staff',
          createdAt: new Date()
        }
      };
    }

    const updateQuery = { $set: updates };
    if (pushUpdate) {
      updateQuery.$push = pushUpdate;
    }

    const updated = await PatientMedicalInfo.findOneAndUpdate(
      { patientId: targetPatientId.toString() },
      updateQuery,
      { new: true, upsert: true }
    );

    if (requesterRole === 'clinic_admin' || requesterRole === 'super_admin') {
      await logAudit({
        userId: requesterId,
        action: 'UPDATE_PATIENT_MEDICAL_INFO',
        resourceType: 'PatientMedicalInfo',
        resourceId: updated._id,
        details: updates,
        ip: req.ip
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[MedicalInfo] update error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
