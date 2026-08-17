import express from 'express';
import {
  getTherapistDashboard,
  getAppointmentClinicalContext,
  getOrCreateConsultation,
  getConsultationById,
  autosaveConsultation,
  signConsultation,
  submitConsultation,
  amendConsultation,
} from '../controllers/consultationController.js';

const router = express.Router();

// Dashboard & Context
router.get('/therapists/me/dashboard', getTherapistDashboard);
router.get('/appointments/:appointmentId/clinical-context', getAppointmentClinicalContext);

// 6-Step Consultation State Machine
router.post('/consultations', getOrCreateConsultation);
router.get('/consultations/:id', getConsultationById);
router.patch('/consultations/:id', autosaveConsultation);
router.post('/consultations/:id/sign', signConsultation);
router.post('/consultations/:id/submit', submitConsultation);
router.post('/consultations/:id/amend', amendConsultation);

export default router;
