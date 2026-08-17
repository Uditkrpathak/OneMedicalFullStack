import mongoose from 'mongoose';
import ClinicalConsultation from '../models/ClinicalConsultation.js';
import MedicalRecord from '../models/MedicalRecord.js';
import AuditLog from '../models/AuditLog.js';
import { generateAndStoreConsultationReport } from '../services/consultationReportService.js';
import notificationManager from './notificationManager.js';
import { EVENT_TYPES } from './notificationEvents.js';

/**
 * Clinical Domain Event Processor
 * Asynchronously processes consultation submission, atomic sealing, report generation, and vault notifications.
 */
export class ClinicalProcessor {
  /**
   * Process consultation submission
   */
  async processConsultationSubmitted({ consultationId, appointmentId, patientId, therapistId }) {
    if (!consultationId) return;

    try {
      // 1. Atomic State Transition: SUBMITTED -> SEALED
      // Ensures idempotency: duplicate deliveries will return null and safely skip
      const sealedConsultation = await ClinicalConsultation.findOneAndUpdate(
        {
          _id: consultationId,
          status: { $in: ['SUBMITTED', 'IN_PROGRESS', 'DRAFT'] },
          isSealed: { $ne: true },
        },
        {
          $set: {
            status: 'SEALED',
            isSealed: true,
            sealedAt: new Date(),
            sealedBy: therapistId,
          },
        },
        { new: true }
      );

      if (!sealedConsultation) {
        console.log(`[ClinicalProcessor] Consultation ${consultationId} is already SEALED or not found. Skipping duplicate.`);
        return;
      }

      // 2. Fetch patient and therapist identity data for report branding
      const identityDb = mongoose.connection.useDb('identity_db');
      const [patientUser, therapistUser] = await Promise.all([
        mongoose.Types.ObjectId.isValid(patientId) ? identityDb.collection('users').findOne({ _id: new mongoose.Types.ObjectId(patientId) }) : null,
        mongoose.Types.ObjectId.isValid(therapistId) ? identityDb.collection('users').findOne({ _id: new mongoose.Types.ObjectId(therapistId) }) : null,
      ]);

      const patientName = patientUser?.name || 'Patient';
      const therapistName = therapistUser?.name || 'Dr. Sarah Jenkins';

      // 3. Generate deterministic Consultation Report & Ingest into Patient Vault
      const reportResult = await generateAndStoreConsultationReport(
        sealedConsultation,
        patientUser || { name: patientName },
        therapistUser || { name: therapistName }
      );

      // 4. Link report ID back to consultation
      if (reportResult?.medicalRecord?._id) {
        await ClinicalConsultation.findByIdAndUpdate(consultationId, {
          $set: { reportMedicalRecordId: reportResult.medicalRecord._id },
        });
      }

      // 5. Immutable Audit Log
      await AuditLog.create({
        actorId: therapistId,
        action: 'CLINICAL_CONSULTATION_SEALED',
        resourceType: 'ClinicalConsultation',
        resourceId: consultationId.toString(),
        metadata: {
          appointmentId,
          patientId,
          medicalRecordId: reportResult?.medicalRecord?._id?.toString(),
          checksum: reportResult?.checksum,
        },
      }).catch(() => {});

      // 6. Trigger Privacy-Safe Patient Notification
      await notificationManager.processEvent({
        eventId: `evt_vault_${reportResult?.medicalRecord?._id}_${Date.now()}`,
        event: EVENT_TYPES.MEDICAL_RECORD_ADDED_TO_VAULT,
        sourceService: 'clinical-service',
        recipients: [
          {
            recipientId: String(patientId),
            role: 'patient',
            name: patientName,
            email: patientUser?.email || '',
            phoneNumber: patientUser?.phoneNumber || '',
          },
        ],
        data: {
          doctorName: therapistName,
          title: 'Physiotherapy Consultation Report',
          patientName,
          category: 'CONSULTATION_REPORT',
          recordId: reportResult?.medicalRecord?._id?.toString(),
          deepLink: {
            screen: 'MedicalRecordViewer',
            params: { recordId: reportResult?.medicalRecord?._id?.toString() },
          },
        },
      });

      console.log(`[ClinicalProcessor] Consultation ${consultationId} sealed & report ingested into Vault for patient ${patientId}`);
    } catch (err) {
      console.error(`[ClinicalProcessor] Failed to process consultation ${consultationId}:`, err.message);
    }
  }

  /**
   * Process patient uploaded medical record
   */
  async processMedicalRecordUploaded({ recordId, patientId, category, title }) {
    if (!recordId) return;

    try {
      const record = await MedicalRecord.findById(recordId);
      if (!record) return;

      const identityDb = mongoose.connection.useDb('identity_db');
      const patientUser = mongoose.Types.ObjectId.isValid(patientId)
        ? await identityDb.collection('users').findOne({ _id: new mongoose.Types.ObjectId(patientId) })
        : null;

      const patientName = patientUser?.name || 'Patient';

      // Find treating therapists from appointments/programs
      const appointments = await mongoose.connection.collection('appointments').find({
        patientId: String(patientId),
        status: { $in: ['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'] },
      }).toArray();

      const therapistIds = Array.from(new Set(appointments.map((a) => a.therapistId).filter(Boolean)));

      if (therapistIds.length > 0) {
        for (const tId of therapistIds) {
          const tUser = mongoose.Types.ObjectId.isValid(tId)
            ? await identityDb.collection('users').findOne({ _id: new mongoose.Types.ObjectId(tId) })
            : null;

          await notificationManager.processEvent({
            eventId: `evt_rec_upload_${recordId}_${tId}_${Date.now()}`,
            event: EVENT_TYPES.MEDICAL_RECORD_UPLOADED,
            sourceService: 'clinical-service',
            recipients: [
              {
                recipientId: String(tId),
                role: 'therapist',
                name: tUser?.name || 'Therapist',
                email: tUser?.email || '',
                phoneNumber: tUser?.phoneNumber || '',
              },
            ],
            data: {
              patientName,
              recordTitle: title || record.title || 'Medical Record',
              category: category || record.category || 'MRI_SCAN',
              recordId: String(recordId),
              deepLink: {
                screen: 'MedicalRecordViewer',
                params: { recordId: String(recordId), patientId: String(patientId) },
              },
            },
          });
        }
      }
    } catch (err) {
      console.error(`[ClinicalProcessor] Failed to process record uploaded ${recordId}:`, err.message);
    }
  }
}

export const clinicalProcessor = new ClinicalProcessor();
export default clinicalProcessor;
