import express from 'express';
import {
  getMyProfile,
  updatePatientProfile,
  updateTherapistProfile,
  listTherapists,
  getTherapistById,
  adminListUsers,
  internalGetUsersByIds,
  getSavedTherapists,
  saveTherapist,
  removeSavedTherapist,
  getNotificationPreferences,
  updateNotificationPreferences,
  requestAccountDeletion,
  listPatientsAdmin,
  adminGetUserById,
  adminCreatePatient,
  adminUpdatePatient,
  adminDeletePatient,
  adminCreateTherapist,
  adminUpdateTherapist,
  adminDeleteTherapist,
  verifyTherapistAdmin,
  getTherapistReviews,
} from '../controllers/userController.js';

const router = express.Router();

// Authenticated user profile
router.get('/me', getMyProfile);
router.patch('/me', (req, res, next) => (req.headers['x-user-role'] === 'therapist' ? updateTherapistProfile(req, res, next) : updatePatientProfile(req, res, next)));
router.patch('/profile', (req, res, next) => (req.headers['x-user-role'] === 'therapist' ? updateTherapistProfile(req, res, next) : updatePatientProfile(req, res, next)));
router.patch('/patients/me', updatePatientProfile);
router.patch('/therapists/me', updateTherapistProfile);

// Saved Specialists
router.get('/me/saved-therapists', getSavedTherapists);
router.post('/me/saved-therapists/:therapistId', saveTherapist);
router.delete('/me/saved-therapists/:therapistId', removeSavedTherapist);

// Preferences & Lifecycle
router.get('/me/notifications', getNotificationPreferences);
router.patch('/me/notifications', updateNotificationPreferences);
router.post('/me/delete-request', requestAccountDeletion);

// Public therapist search & CRUD
router.get('/therapists', listTherapists);
router.post('/therapists', adminCreateTherapist);
router.get('/therapists/:id', getTherapistById);
router.patch('/therapists/:id', adminUpdateTherapist);
router.put('/therapists/:id', adminUpdateTherapist);
router.delete('/therapists/:id', adminDeleteTherapist);
router.get('/therapists/:id/reviews', getTherapistReviews);

// Patients search & CRUD
router.get('/patients', listPatientsAdmin);
router.post('/patients', adminCreatePatient);
router.get('/patients/:id', adminGetUserById);
router.patch('/patients/:id', adminUpdatePatient);
router.put('/patients/:id', adminUpdatePatient);
router.delete('/patients/:id', adminDeletePatient);

// Internal — called by other services via API key
router.get('/internal/therapists/:id', getTherapistById);
router.get('/internal/users', internalGetUsersByIds);

// Admin / Patient endpoints
router.get('/admin/users', adminListUsers);
router.get('/admin/users/:id', adminGetUserById);
router.post('/admin/therapists', adminCreateTherapist);
router.post('/admin/therapists/:id/verify', verifyTherapistAdmin);
router.post('/therapists/:id/verify', verifyTherapistAdmin);
router.post('/:id/verify', (req, res, next) => {
  if (req.baseUrl?.includes('therapists')) return verifyTherapistAdmin(req, res, next);
  next();
});

router.get('/:id', (req, res, next) => {
  if (req.baseUrl?.includes('therapists')) return getTherapistById(req, res, next);
  return adminGetUserById(req, res, next);
});
router.patch('/:id', (req, res, next) => {
  if (req.baseUrl?.includes('therapists')) return adminUpdateTherapist(req, res, next);
  if (req.baseUrl?.includes('patients')) return adminUpdatePatient(req, res, next);
  next();
});
router.delete('/:id', (req, res, next) => {
  if (req.baseUrl?.includes('therapists')) return adminDeleteTherapist(req, res, next);
  if (req.baseUrl?.includes('patients')) return adminDeletePatient(req, res, next);
  next();
});

router.get('/', (req, res, next) => {
  if (req.baseUrl?.includes('patients') || req.baseUrl?.includes('users')) {
    return listPatientsAdmin(req, res, next);
  }
  return listTherapists(req, res, next);
});

router.post('/', (req, res, next) => {
  if (req.baseUrl?.includes('patients')) return adminCreatePatient(req, res, next);
  if (req.baseUrl?.includes('therapists')) return adminCreateTherapist(req, res, next);
  next();
});

export default router;
