import express from 'express';
import { createExercise, listExercises, getExerciseById, updateExercise, deleteExercise } from '../controllers/exerciseController.js';
import {
  createProgram,
  listPrograms,
  getProgramById,
  assignProgram,
  getMyActiveProgram,
  getMyPrograms,
  getPatientPrograms,
  getPatientActiveProgram,
  getTodaysExercises,
  updateProgramStatus,
  getAssignedPatients,
  addExercisePrescription,
  modifyExercisePrescription,
  replaceExercisePrescription,
  logExerciseSession,
  getProgramAdherence,
} from '../controllers/programController.js';
import {
  logSession,
  getSessionHistory,
  getSessionById,
  updateSession,
  deleteSession,
  getPainTrend
} from '../controllers/sessionController.js';
import {
  listMedicalRecords,
  createMedicalRecord,
  getMedicalRecordById,
  getRecordDownloadUrl,
  getPresignedUploadUrl,
  updateMedicalRecord,
  deleteMedicalRecord,
  verifyMedicalRecord,
  handleStorageDownload,
  getRecordsByPatient
} from '../controllers/medicalRecordController.js';
import {
  createPainAssessment,
  getPainAssessments
} from '../controllers/painAssessmentController.js';
import {
  getRecoveryProgress,
  getAnalyticsSummary,
  getRevenueChart,
  getTherapistStats,
  getAdminAuditLog
} from '../controllers/analyticsController.js';
import {
  getMySchedule,
  updateMySchedule,
  addLeaveException,
  removeLeaveException,
  getTherapistAvailability,
  getAssignedPatientsRoster,
  getPatientClinicalOverview,
  getConsultationQueue,
  getTherapistReviews,
} from '../controllers/scheduleController.js';
import {
  getPatientMedicalInfo,
  updatePatientMedicalInfo
} from '../controllers/patientMedicalInfoController.js';
import { listServices } from '../controllers/serviceController.js';

const router = express.Router();

// ─── CLINICAL SERVICES CATALOG ───────────────────────────────────────────────
router.get('/services',                               listServices);
router.get('/api/v1/services',                        listServices);
router.get('/therapists/:therapistId/reviews',        getTherapistReviews);
router.get('/api/v1/therapists/:therapistId/reviews', getTherapistReviews);

// ─── SESSIONS & WORKOUT TRACKING ──────────────────────────────────────────────
router.post('/sessions',                              logSession);
router.post('/sessions/log',                          logSession);
router.get('/sessions',                               getSessionHistory);
router.get('/sessions/pain-trend/:patientProgramId',  getPainTrend);
router.get('/sessions/:id',                           getSessionById);
router.patch('/sessions/:id',                         updateSession);
router.delete('/sessions/:id',                        deleteSession);

router.post('/api/v1/sessions',                       logSession);
router.post('/api/v1/sessions/log',                   logSession);
router.post('/api/v1/clinical/sessions/log',          logSession);
router.get('/api/v1/sessions',                        getSessionHistory);
router.get('/api/v1/sessions/pain-trend/:patientProgramId', getPainTrend);

// ─── INDEPENDENT PAIN ASSESSMENTS (Phase 3F) ──────────────────────────────────
router.post('/pain-assessments',                      createPainAssessment);
router.get('/pain-assessments',                       getPainAssessments);
router.post('/api/v1/pain-assessments',               createPainAssessment);
router.get('/api/v1/pain-assessments',                getPainAssessments);

// ─── RECOVERY ANALYTICS (Phase 3F) & ADMIN ANALYTICS ──────────────────────────
router.get('/analytics/recovery-progress/:patientId', getRecoveryProgress);
router.get('/analytics/recovery-progress',            getRecoveryProgress);
router.get('/api/v1/analytics/recovery-progress/:patientId', getRecoveryProgress);
router.get('/api/v1/analytics/recovery-progress',     getRecoveryProgress);

router.get('/analytics/summary',                      getAnalyticsSummary);
router.get('/api/v1/analytics/summary',               getAnalyticsSummary);
router.get('/analytics/revenue',                      getRevenueChart);
router.get('/api/v1/analytics/revenue',               getRevenueChart);
router.get('/analytics/therapists',                   getTherapistStats);
router.get('/api/v1/analytics/therapists',            getTherapistStats);

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
router.get('/admin/audit-log',                        getAdminAuditLog);
router.get('/api/v1/admin/audit-log',                 getAdminAuditLog);
router.get('/audit-logs',                             getAdminAuditLog);
router.get('/api/v1/audit-logs',                      getAdminAuditLog);

// ─── RECOVERY PROGRAMS & ASSIGNMENTS ──────────────────────────────────────────
router.get('/programs/my/active',                     getMyActiveProgram);
router.get('/programs/active',                        getMyActiveProgram);
router.get('/programs/my',                            getMyPrograms);
router.get('/my/active',                              getMyActiveProgram);
router.get('/programs/patient/:patientId',            getPatientPrograms);
router.get('/api/v1/programs/patient/:patientId',     getPatientPrograms);
router.get('/programs/patient/:patientId/active',     getPatientActiveProgram);
router.get('/api/v1/programs/patient/:patientId/active', getPatientActiveProgram);
router.get('/programs/my/today',                      getTodaysExercises);
router.get('/my/today',                               getTodaysExercises);

router.get('/programs',                               listPrograms);
router.get('/programs/:id',                           getProgramById);
router.get('/programs/:id/adherence',                 getProgramAdherence);
router.post('/programs',                              createProgram);
router.post('/programs/:programId/assign',            assignProgram);
router.post('/programs/:id/assign',                   assignProgram);
router.post('/programs/:id/prescriptions',            addExercisePrescription);
router.put('/programs/exercises/:exerciseId/modify',  modifyExercisePrescription);
router.post('/programs/exercises/:exerciseId/replace', replaceExercisePrescription);
router.patch('/programs/:id/status',                  updateProgramStatus);

router.get('/api/v1/programs/my/active',              getMyActiveProgram);
router.get('/api/v1/programs/active',                 getMyActiveProgram);
router.get('/api/v1/programs/my',                     getMyPrograms);
router.get('/api/v1/clinical/programs/active',         getMyActiveProgram);
router.get('/api/v1/programs/my/today',               getTodaysExercises);
router.get('/api/v1/programs',                        listPrograms);
router.get('/api/v1/programs/:id',                    getProgramById);
router.get('/api/v1/programs/:id/adherence',          getProgramAdherence);
router.post('/api/v1/programs/:programId/assign',     assignProgram);
router.post('/api/v1/programs/:id/assign',            assignProgram);
router.post('/api/v1/programs/:id/prescriptions',     addExercisePrescription);
router.put('/api/v1/programs/exercises/:exerciseId/modify', modifyExercisePrescription);
router.post('/api/v1/programs/exercises/:exerciseId/replace', replaceExercisePrescription);
router.post('/api/v1/exercises/sessions/log',         logExerciseSession);
router.post('/exercises/sessions/log',                 logExerciseSession);

// ─── EXERCISES CATALOG ────────────────────────────────────────────────────────
router.get('/exercises',                              listExercises);
router.post('/exercises',                             createExercise);
router.get('/exercises/:id',                          getExerciseById);
router.patch('/exercises/:id',                        updateExercise);
router.delete('/exercises/:id',                       deleteExercise);

router.get('/api/v1/exercises',                       listExercises);
router.post('/api/v1/exercises',                      createExercise);

// ─── MEDICAL RECORDS & SIGNED URLS (Phase 3G & Phase 8) ───────────────────────
router.post('/medical-records/upload-url',            getPresignedUploadUrl);
router.get('/medical-records',                        listMedicalRecords);
router.post('/medical-records',                       createMedicalRecord);
router.get('/medical-records/patient/:patientId',     getRecordsByPatient);
router.get('/medical-records/:id',                    getMedicalRecordById);
router.get('/medical-records/:id/download-url',       getRecordDownloadUrl);
router.post('/medical-records/:id/verify',             verifyMedicalRecord);
router.patch('/medical-records/:id',                  updateMedicalRecord);
router.delete('/medical-records/:id',                 deleteMedicalRecord);

router.post('/api/v1/medical-records/upload-url',     getPresignedUploadUrl);
router.get('/api/v1/medical-records',                 listMedicalRecords);
router.post('/api/v1/medical-records',                createMedicalRecord);
router.get('/api/v1/medical-records/:id',             getMedicalRecordById);
router.get('/api/v1/medical-records/:id/download-url', getRecordDownloadUrl);
router.post('/api/v1/medical-records/:id/verify',      verifyMedicalRecord);
router.delete('/api/v1/medical-records/:id',          deleteMedicalRecord);

// Secure storage streaming
router.get('/storage/download',                       handleStorageDownload);
router.get('/api/v1/storage/download',                handleStorageDownload);

// ─── PATIENT MEDICAL INFO (Clinical Conditions / Meds) ────────────────────────
router.get('/patients/:patientId/medical-info',       getPatientMedicalInfo);
router.put('/patients/:patientId/medical-info',       updatePatientMedicalInfo);
router.patch('/patients/:patientId/medical-info',     updatePatientMedicalInfo);
router.get('/medical-info/me',                        getPatientMedicalInfo);
router.put('/medical-info/me',                        updatePatientMedicalInfo);
router.get('/api/v1/patients/:patientId/medical-info', getPatientMedicalInfo);
router.put('/api/v1/patients/:patientId/medical-info', updatePatientMedicalInfo);

// ─── THERAPIST OPERATIONS & SCHEDULING (Phase 9) ──────────────────────────────
router.get('/therapists/schedule/me',                 getMySchedule);
router.put('/therapists/schedule/me',                 updateMySchedule);
router.post('/therapists/schedule/leave',             addLeaveException);
router.delete('/therapists/schedule/leave/:leaveId',  removeLeaveException);
router.get('/therapists/schedule/:therapistId',       getTherapistAvailability);
router.get('/therapists/:therapistId/availability',   getTherapistAvailability);
router.get('/therapists/patients/assigned',           getAssignedPatientsRoster);
router.get('/therapists/patients/assigned/:patientId', getPatientClinicalOverview);
router.get('/therapists/appointments/queue',          getConsultationQueue);

router.get('/api/v1/therapists/schedule/me',                 getMySchedule);
router.put('/api/v1/therapists/schedule/me',                 updateMySchedule);
router.post('/api/v1/therapists/schedule/leave',             addLeaveException);
router.delete('/api/v1/therapists/schedule/leave/:leaveId',  removeLeaveException);
router.get('/api/v1/therapists/schedule/:therapistId',       getTherapistAvailability);
router.get('/api/v1/therapists/patients/assigned',           getAssignedPatientsRoster);
router.get('/api/v1/therapists/patients/assigned/:patientId', getPatientClinicalOverview);
router.get('/api/v1/therapists/appointments/queue',          getConsultationQueue);

// Legacy aliases
router.get('/admin/patients',                         getAssignedPatientsRoster);
router.get('/patients/assigned',                      getAssignedPatientsRoster);
router.get('/api/v1/clinical/patients/assigned',     getAssignedPatientsRoster);

// Service Root Info
router.get('/', (req, res) => {
  res.json({ service: 'clinical-service', version: '1.0.0', status: 'healthy' });
});

export default router;
