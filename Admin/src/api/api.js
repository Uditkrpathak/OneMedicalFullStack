const API_GATEWAY = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://onemedical-v2-gateway.onrender.com');
const BASE_URL = `${API_GATEWAY}/api/v1`;

/**
 * Standardized API client for Admin Dashboard.
 * Throws structured backend errors: { status, code, message, data }
 * Always forwards JWT token when provided.
 */
const request = async (path, options = {}, token = null) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = body?.error?.message || body?.message || `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.code = body?.error?.code || 'API_ERROR';
    err.data = body;
    throw err;
  }

  return body;
};

export const api = {
  // ── Auth & Identity ──────────────────────────────────────────────────────────
  requestOtp: (body)                   => request('/auth/otp/request', { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp:  (body)                   => request('/auth/otp/verify', { method: 'POST', body: JSON.stringify(body) }),
  login:      (body)                   => request('/auth/otp/verify', { method: 'POST', body: JSON.stringify(body) }),
  me:         (token)                  => request('/users/me', {}, token),

  // ── Patients ─────────────────────────────────────────────────────────────────
  listPatients:           (token, params = {}) => request(`/patients?${new URLSearchParams(params)}`, {}, token),
  getPatientDetail:       (token, id)          => request(`/patients/${id}`, {}, token),
  createPatient:          (token, body)        => request('/patients', { method: 'POST', body: JSON.stringify(body) }, token),
  updatePatient:          (token, id, body)    => request(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  deletePatient:          (token, id)          => request(`/patients/${id}`, { method: 'DELETE' }, token),
  getPatientMedicalInfo:  (token, patientId)   => request(`/patients/${patientId}/medical-info`, {}, token),
  updatePatientMedicalInfo:(token, patientId, body) => request(`/patients/${patientId}/medical-info`, { method: 'PUT', body: JSON.stringify(body) }, token),

  // ── Therapists ───────────────────────────────────────────────────────────────
  listTherapists:         (token, params = {}) => request(`/therapists?${new URLSearchParams(params)}`, {}, token),
  getTherapist:           (token, id)          => request(`/therapists/${id}`, {}, token),
  createTherapist:        (token, body)        => request('/therapists', { method: 'POST', body: JSON.stringify(body) }, token),
  updateTherapist:        (token, id, body)    => request(`/therapists/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  deleteTherapist:        (token, id)          => request(`/therapists/${id}`, { method: 'DELETE' }, token),
  verifyTherapist:        (token, id, body)    => request(`/admin/therapists/${id}/verify`, { method: 'POST', body: JSON.stringify(body) }, token),
  getTherapistSlots:      (token, therapistId, date) => request(`/availability/${therapistId}?date=${date}`, {}, token),
  getTherapistSchedule:   (token, therapistId) => request(`/therapists/schedule/${therapistId}`, {}, token),
  getTherapistPatients:   (token)              => request('/therapists/patients/assigned', {}, token),
  getTherapistReviews:    (token, id)          => request(`/therapists/${id}/reviews`, {}, token),

  // ── Appointments & Scheduling ─────────────────────────────────────────────────
  getAppointmentsDashboard:(token, params = {}) => request(`/appointments/dashboard?${new URLSearchParams(params)}`, {}, token),
  listAppointments:       (token, params = {}) => request(`/appointments?${new URLSearchParams(params)}`, {}, token),
  getAppointmentDetail:   (token, id)          => request(`/appointments/${id}`, {}, token),
  createAppointment:      (token, body)        => request('/appointments/hold', { method: 'POST', body: JSON.stringify(body) }, token),
  updateAppointmentStatus:(token, id, body)    => request(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  confirmAppointment:     (token, id, body)    => request(`/appointments/${id}/confirm`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  rescheduleAppointment:  (token, id, body)    => request(`/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify(body) }, token),
  cancelAppointment:      (token, id, body)    => request(`/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify(body) }, token),
  completeAppointment:    (token, id, body)    => request(`/appointments/${id}/complete`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  sendReminder:           (token, id, body)    => request(`/appointments/${id}/reminder`, { method: 'POST', body: JSON.stringify(body) }, token),
  saveSessionSummary:     (token, id, body)    => request(`/appointments/${id}/session-summary`, { method: 'POST', body: JSON.stringify(body) }, token),

  // ── Exercises ────────────────────────────────────────────────────────────────
  listExercises:          (token, params = {}) => request(`/exercises?${new URLSearchParams(params)}`, {}, token),
  getExercise:            (token, id)          => request(`/exercises/${id}`, {}, token),
  createExercise:         (token, body)        => request('/exercises', { method: 'POST', body: JSON.stringify(body) }, token),
  updateExercise:         (token, id, body)    => request(`/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  deleteExercise:         (token, id)          => request(`/exercises/${id}`, { method: 'DELETE' }, token),

  // ── Rehabilitation Programs ──────────────────────────────────────────────────
  listPrograms:           (token, params = {}) => request(`/programs?${new URLSearchParams(params)}`, {}, token),
  getProgramDetail:       (token, id)          => request(`/programs/${id}`, {}, token),
  createProgram:          (token, body)        => request('/programs', { method: 'POST', body: JSON.stringify(body) }, token),
  updateProgram:          (token, id, body)    => request(`/programs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  deleteProgram:          (token, id)          => request(`/programs/${id}`, { method: 'DELETE' }, token),
  assignProgram:          (token, programId, body) => request(`/programs/${programId}/assign`, { method: 'POST', body: JSON.stringify(body) }, token),
  getPatientPrograms:     (token, patientId)   => request(`/programs/patient/${patientId}`, {}, token),
  getPatientActiveProgram:(token, patientId)   => request(`/programs/patient/${patientId}/active`, {}, token),
  updateProgramStatus:    (token, id, body)    => request(`/programs/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  // ── Sessions & Pain Assessments ──────────────────────────────────────────────
  getSessionHistory:      (token, params = {}) => request(`/sessions?${new URLSearchParams(params)}`, {}, token),
  getSessionById:         (token, id)          => request(`/sessions/${id}`, {}, token),
  logSession:             (token, body)        => request('/sessions/log', { method: 'POST', body: JSON.stringify(body) }, token),
  getPainAssessments:     (token, params = {}) => request(`/pain-assessments?${new URLSearchParams(params)}`, {}, token),
  createPainAssessment:   (token, body)        => request('/pain-assessments', { method: 'POST', body: JSON.stringify(body) }, token),
  getPainTrend:           (token, programId)   => request(`/sessions/pain-trend/${programId}`, {}, token),

  // ── Medical Records & Document Vault ─────────────────────────────────────────
  listMedicalRecords:     (token, params = {}) => request(`/medical-records?${new URLSearchParams(params)}`, {}, token),
  getRecordsByPatient:    (token, patientId)   => request(`/medical-records/patient/${patientId}`, {}, token),
  getMedicalRecordById:   (token, id)          => request(`/medical-records/${id}`, {}, token),
  getPresignedUploadUrl:  (token, body)        => request('/medical-records/upload-url', { method: 'POST', body: JSON.stringify(body) }, token),
  createMedicalRecord:    (token, body)        => request('/medical-records', { method: 'POST', body: JSON.stringify(body) }, token),
  getRecordDownloadUrl:   (token, id)          => request(`/medical-records/${id}/download-url`, {}, token),
  deleteMedicalRecord:    (token, id)          => request(`/medical-records/${id}`, { method: 'DELETE' }, token),

  // ── Payments & Financials ────────────────────────────────────────────────────
  listPayments:           (token, params = {}) => request(`/payments?${new URLSearchParams(params)}`, {}, token),
  listInvoices:           (token, params = {}) => request(`/invoices?${new URLSearchParams(params)}`, {}, token),
  getInvoiceById:         (token, id)          => request(`/invoices/${id}`, {}, token),
  createInvoice:          (token, body)        => request('/invoices', { method: 'POST', body: JSON.stringify(body) }, token),
  listPayouts:            (token, params = {}) => request(`/payouts?${new URLSearchParams(params)}`, {}, token),
  computePayout:          (token, body)        => request('/payouts/compute', { method: 'POST', body: JSON.stringify(body) }, token),
  listRefunds:            (token, params = {}) => request(`/refunds?${new URLSearchParams(params)}`, {}, token),
  initiateRefund:         (token, body)        => request('/refunds', { method: 'POST', body: JSON.stringify(body) }, token),
  approveRefund:          (token, id)          => request(`/refunds/${id}/approve`, { method: 'PATCH' }, token),

  // ── Analytics ────────────────────────────────────────────────────────────────
  getAnalyticsSummary:    (token, params = {}) => request(`/analytics/summary?${new URLSearchParams(params)}`, {}, token),
  getRevenueChart:        (token, params = {}) => request(`/analytics/revenue?${new URLSearchParams(params)}`, {}, token),
  getTherapistStats:      (token, params = {}) => request(`/analytics/therapists?${new URLSearchParams(params)}`, {}, token),
  getRecoveryProgress:    (token, patientId)   => request(`/analytics/recovery-progress/${patientId}`, {}, token),

  // ── Notifications ────────────────────────────────────────────────────────────
  listNotifications:      (token, params = {}) => request(`/notifications?${new URLSearchParams(params)}`, {}, token),
  markNotificationRead:   (token, id)          => request(`/notifications/${id}/read`, { method: 'PATCH' }, token),
  markAllRead:            (token)              => request('/notifications/read-all', { method: 'PATCH' }, token),

  // ── Staff & Audit Logs ───────────────────────────────────────────────────────
  listUsers:              (token, params = {}) => request(`/admin/users?${new URLSearchParams(params)}`, {}, token),
  listStaff:              (token, params = {}) => request(`/admin/users?${new URLSearchParams(params)}`, {}, token),
  createStaffUser:        (token, body)        => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }, token),
  updateStaffUser:        (token, id, body)    => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  deleteStaffUser:        (token, id)          => request(`/admin/users/${id}`, { method: 'DELETE' }, token),
  getAuditLog:            (token, params = {}) => request(`/admin/audit-log?${new URLSearchParams(params)}`, {}, token),
};
