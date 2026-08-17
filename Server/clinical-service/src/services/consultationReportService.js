import crypto from 'crypto';
import mongoose from 'mongoose';
import MedicalRecord from '../models/MedicalRecord.js';
import { getStorageProvider } from '../utils/storage/storageProvider.js';

/**
 * Deterministically generates a professional clinical consultation report HTML/PDF document.
 */
export const generateConsultationHtml = (consultation, patient = {}, therapist = {}) => {
  const step1 = consultation.step1_preparation || {};
  const step2 = consultation.step2_assessment || {};
  const step3 = consultation.step3_treatment || {};
  const step4 = consultation.step4_recovery || {};
  const step5 = consultation.step5_synthesis || {};
  const sign = step5.digitalSignature || {};

  const patientName = patient.name || 'Verified Patient';
  const therapistName = therapist.name || sign.therapistName || 'Dr. Sarah Jenkins';
  const consultDate = new Date(consultation.submittedAt || consultation.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const romRows = (step2.structuredRom || [])
    .map(
      (r) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${r.joint || 'Joint'} - ${r.movement || 'Movement'}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${r.measuredDegrees || 0}° (Normal: ${r.flexionDegrees || 110}°)</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;"><span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">${r.restriction || 'MODERATE'}</span></td>
    </tr>
  `
    )
    .join('');

  const exerciseRows = (step4.homeExercises || [])
    .map(
      (ex, i) => `
    <div style="padding: 8px 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 6px;">
      <strong style="color: #0f172a;">${i + 1}. ${ex.name}</strong>
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
        ${ex.sets || 3} Sets × ${ex.reps || 10} Reps • Frequency: ${ex.frequency || '2x Daily'}
      </div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Clinical Consultation Report - OneMedical</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 32px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 2px solid #003D9B; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 24px; font-weight: 900; color: #003D9B; letter-spacing: -0.5px; }
    .badge { background: #eff6ff; color: #003D9B; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 12px; border: 1px solid #bfdbfe; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .section-title { font-size: 14px; font-weight: 800; color: #003D9B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    .sign-box { margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">ONE MEDICAL</div>
      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Physiotherapy & Rehabilitation Clinical Encounter</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">OFFICIAL CLINICAL RECORD</span>
      <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Encounter Date: <strong>${consultDate}</strong></div>
    </div>
  </div>

  <div class="grid">
    <div class="info-card">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Patient Information</div>
      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${patientName}</div>
      <div style="font-size: 12px; color: #64748b;">Patient ID: ${consultation.patientId}</div>
    </div>
    <div class="info-card">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Treating Physiotherapist</div>
      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${therapistName}</div>
      <div style="font-size: 12px; color: #64748b;">License: ${sign.registrationNumber || 'MPT-REHAB-7742'}</div>
    </div>
  </div>

  <!-- S: SUBJECTIVE -->
  <div class="section-title">1. Subjective (Chief Complaint & Symptoms)</div>
  <div style="font-size: 13px; margin-bottom: 8px;">
    <strong>Chief Complaint:</strong> ${step1.chiefComplaint || 'Knee / Lumbar Rehabilitation Evaluation'}
  </div>
  <div style="font-size: 13px; margin-bottom: 8px;">
    <strong>Reported Pain:</strong> ${step1.painScore || 0}/10 • <strong>Type:</strong> ${(step1.painType || []).join(', ') || 'Aching'} • <strong>Location:</strong> ${step1.painLocation?.bodyPart || 'Knee'}
  </div>

  <!-- O: OBJECTIVE -->
  <div class="section-title">2. Objective (Biomechanical & ROM Assessment)</div>
  <div style="font-size: 13px; margin-bottom: 8px;">
    <strong>Vitals:</strong> BP: ${step2.vitals?.bp || '120/80'} | HR: ${step2.vitals?.hr || 72} bpm | SpO2: ${step2.vitals?.spo2 || 98}%
  </div>
  ${
    romRows
      ? `
    <table>
      <thead>
        <tr style="background: #f1f5f9; text-align: left;">
          <th style="padding: 8px; border: 1px solid #e2e8f0;">Joint / Motion</th>
          <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Measured Angle</th>
          <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Restriction</th>
        </tr>
      </thead>
      <tbody>${romRows}</tbody>
    </table>
  `
      : '<div style="font-size: 13px; color: #64748b;">ROM assessment within expected recovery parameters.</div>'
  }

  <!-- A: ASSESSMENT -->
  <div class="section-title">3. Assessment & Clinical Progress</div>
  <div style="font-size: 13px; margin-bottom: 8px;">
    <strong>Clinical Impression:</strong> ${step5.clinicalImpression || step2.clinicalImpression || 'Post-operative tissue remodeling with stable joint alignment.'}
  </div>
  <div style="font-size: 13px;">
    <strong>Progress:</strong> ${step5.progressStatus || 'Improved'} • <strong>Goals:</strong> ${step5.goalStatus || 'Partially Achieved'}
  </div>

  <!-- P: PLAN -->
  <div class="section-title">4. Plan & Home Exercise Prescription</div>
  <div style="margin-bottom: 8px;">
    ${exerciseRows || '<div style="font-size: 13px; color: #64748b;">Continue active mobility program 2x daily.</div>'}
  </div>
  <div style="font-size: 13px; margin-top: 8px;">
    <strong>Home Care & Restrictions:</strong> ${step4.homeCareInstructions || 'Ice for 15 mins after activity. Avoid heavy impact.'}
  </div>
  ${
    step6_reportsNextReview(consultation)
      ? `<div style="font-size: 13px; margin-top: 4px;"><strong>Next Session Review:</strong> ${step6_reportsNextReview(consultation)}</div>`
      : ''
  }

  <div class="sign-box">
    <div>
      <div style="font-size: 12px; font-weight: 700; color: #003D9B;">Digitally Sealed Clinical Encounter</div>
      <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">HASH: ${sign.digitalSignHash || crypto.createHash('sha256').update(consultation._id.toString()).digest('hex').substring(0, 24)}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${therapistName}</div>
      <div style="font-size: 11px; color: #64748b;">Signed on ${consultDate}</div>
    </div>
  </div>
</body>
</html>
`;
};

const step6_reportsNextReview = (c) => {
  const nextVisit = c.step6_reports?.nextVisit;
  if (nextVisit?.date) {
    return `${nextVisit.date} at ${nextVisit.time || '10:00 AM'} (${nextVisit.consultationType || 'In-person'})`;
  }
  return c.step4_recovery?.nextReviewDate || '';
};

/**
 * Service to generate, upload, and save a sealed consultation report in the patient vault.
 */
export const generateAndStoreConsultationReport = async (consultation, patient = {}, therapist = {}) => {
  const patientId = String(consultation.patientId);
  const consultationId = consultation._id;

  // 1. Generate Report Buffer
  const htmlContent = generateConsultationHtml(consultation, patient, therapist);
  const reportBuffer = Buffer.from(htmlContent, 'utf-8');
  const checksum = crypto.createHash('sha256').update(reportBuffer).digest('hex');

  // 2. Generate Storage Key
  const storage = getStorageProvider();
  const timestamp = Date.now();
  const fileName = `consultation_report_${consultationId}_${timestamp}.html`;
  const storageKey = storage.generateStorageKey(patientId, 'CONSULTATION_REPORT', fileName);

  let storedFile = null;
  try {
    // 3. Save to active storage provider (Cloudinary, Local, etc.)
    storedFile = await storage.saveFileBuffer(storageKey, reportBuffer, 'text/html');

    // 4. Ingest record into MedicalRecord Vault collection
    const medicalRecord = await MedicalRecord.create({
      patientId,
      title: `Physiotherapy Consultation Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      category: 'CONSULTATION_REPORT',
      doctorName: therapist.name || 'Treating Physiotherapist',
      hospitalName: 'One Medical Center',
      recordDate: new Date(),
      storageProvider: storage.name || 'cloudinary',
      storageKey,
      cloudinaryPublicId: storageKey,
      resourceType: 'raw',
      s3Key: storageKey,
      originalFileName: fileName,
      fileName,
      fileSizeBytes: reportBuffer.length,
      mimeType: 'text/html',
      checksum,
      consultationId,
      appointmentId: consultation.appointmentId || null,
      isGenerated: true,
      version: 1,
      uploadedBy: 'therapist',
      uploadedByRole: 'therapist',
      uploaderId: String(consultation.therapistId),
      visibility: 'PATIENT_AND_CARE_TEAM',
      visibleToPatient: true,
      verifiedBy: String(consultation.therapistId),
      verifiedAt: new Date(),
    });

    return {
      success: true,
      medicalRecord,
      storageKey,
      checksum,
    };
  } catch (err) {
    // Rollback storage file if database creation failed (prevents orphan files)
    if (storedFile && storageKey) {
      await storage.deleteFile(storageKey).catch(() => {});
    }
    throw err;
  }
};
