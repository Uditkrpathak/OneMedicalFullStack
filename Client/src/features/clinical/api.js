import { resilientFetch } from '../../shared/apiClient';

export const clinicalApi = {
  // ── Recovery Programs ──
  getActiveProgram: async (token) => {
    const res = await resilientFetch(
      '/programs/my/active',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getMyPrograms: async (token) => {
    const res = await resilientFetch(
      '/programs/my',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getPatientActiveProgram: async (patientId, token) => {
    const res = await resilientFetch(
      `/programs/patient/${patientId}/active`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getTodaysExercises: async (token) => {
    const res = await resilientFetch(
      '/programs/my/today',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  listPrograms: async (token) => {
    const res = await resilientFetch(
      '/programs',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getProgramById: async (programId, token) => {
    const res = await resilientFetch(
      `/programs/${programId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  prescribeProgram: async (prescriptionData, token) => {
    const res = await resilientFetch(
      `/programs/${prescriptionData.programId}/assign`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(prescriptionData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, isOfflineQueued: res.isOfflineQueued, error: res.error };
  },

  // ── Exercises ──
  getExercises: async (token) => {
    const res = await resilientFetch(
      '/exercises',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getExerciseById: async (exerciseId, token) => {
    const res = await resilientFetch(
      `/exercises/${exerciseId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  // ── Sessions & Logs ──
  logSession: async (sessionData, token) => {
    const res = await resilientFetch(
      '/sessions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(sessionData)
      }
    );

    return {
      success: res.success,
      data: res.data,
      source: res.source,
      isOfflineQueued: res.isOfflineQueued,
      message: res.message,
      error: res.error
    };
  },

  getSessionHistory: async (token) => {
    const res = await resilientFetch(
      '/sessions',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getPainTrend: async (patientProgramId, token) => {
    const res = await resilientFetch(
      `/sessions/pain-trend/${patientProgramId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  // ── Independent Pain Assessments (Phase 3F) ──
  createPainAssessment: async (assessmentData, token) => {
    const res = await resilientFetch(
      '/pain-assessments',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(assessmentData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, isOfflineQueued: res.isOfflineQueued, error: res.error };
  },

  getPainAssessments: async (params = {}, token) => {
    const query = new URLSearchParams(params).toString();
    const res = await resilientFetch(
      `/pain-assessments${query ? '?' + query : ''}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  // ── Recovery Analytics (Phase 3F) ──
  getRecoveryProgress: async (patientId, programId = '', token) => {
    const query = programId ? `?programId=${programId}` : '';
    const res = await resilientFetch(
      `/analytics/recovery-progress/${patientId}${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  // ── Patient Medical Info (Phase 3G) ──
  getPatientMedicalInfo: async (patientId, token) => {
    const res = await resilientFetch(
      `/patients/${patientId}/medical-info`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  updatePatientMedicalInfo: async (patientId, medicalData, token) => {
    const res = await resilientFetch(
      `/patients/${patientId}/medical-info`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(medicalData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, isOfflineQueued: res.isOfflineQueued, error: res.error };
  },

  // ── Medical Records & Private S3 Vault (Phase 8) ──
  getPresignedUploadUrl: async (fileName, mimeType = 'application/pdf', category = 'OTHER', token, patientId = null) => {
    const payload = { fileName, mimeType, category };
    if (patientId) payload.patientId = patientId;
    const res = await resilientFetch(
      '/medical-records/upload-url',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  listMedicalRecords: async (params = {}, token) => {
    let authToken = token;
    let queryParams = params;
    if (typeof params === 'string' && (params.startsWith('ey') || params.includes('.'))) {
      authToken = params;
      queryParams = {};
    }
    const query = typeof queryParams === 'string'
      ? `?category=${queryParams}`
      : (queryParams && typeof queryParams === 'object' && Object.keys(queryParams).length > 0 ? `?${new URLSearchParams(queryParams).toString()}` : '');

    const res = await resilientFetch(
      `/medical-records${query}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return { success: res.success, data: res.data, pagination: res.pagination, source: res.source, error: res.error };
  },

  getMedicalRecordById: async (id, token) => {
    const res = await resilientFetch(
      `/medical-records/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getRecordDownloadUrl: async (id, token) => {
    const res = await resilientFetch(
      `/medical-records/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  createMedicalRecord: async (recordData, token) => {
    const res = await resilientFetch(
      '/medical-records',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(recordData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, isOfflineQueued: res.isOfflineQueued, error: res.error };
  },

  deleteMedicalRecord: async (id, token) => {
    const res = await resilientFetch(
      `/medical-records/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  // ── Therapist Operations & Scheduling (Phase 9) ──
  getTherapistSchedule: async (token) => {
    const res = await resilientFetch(
      '/therapists/schedule/me',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  updateTherapistSchedule: async (scheduleData, token) => {
    const res = await resilientFetch(
      '/therapists/schedule/me',
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(scheduleData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  addTherapistLeave: async (leaveData, token) => {
    const res = await resilientFetch(
      '/therapists/schedule/leave',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(leaveData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  removeTherapistLeave: async (leaveId, token) => {
    const res = await resilientFetch(
      `/therapists/schedule/leave/${leaveId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getTherapistAvailability: async (therapistId, token, date = '') => {
    const query = date ? `?date=${date}` : '';
    const res = await resilientFetch(
      `/therapists/schedule/${therapistId}${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getAssignedPatientsRoster: async (token) => {
    const res = await resilientFetch(
      '/therapists/patients/assigned',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getAssignedPatients: async (token) => {
    const res = await resilientFetch(
      '/therapists/patients/assigned',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getPatientClinicalOverview: async (patientId, token) => {
    const res = await resilientFetch(
      `/therapists/patients/assigned/${patientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getConsultationQueue: async (params = {}, token) => {
    const query = typeof params === 'string' ? `?date=${params}` : (params && Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : '');
    const res = await resilientFetch(
      `/therapists/appointments/queue${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  // ── Emergency Triage ──
  submitEmergencyTriage: async (triageData, token) => {
    const res = await resilientFetch(
      '/clinical/emergency-triage',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(triageData)
      }
    );
    return { success: res.success, data: res.data, source: res.source, isOfflineQueued: res.isOfflineQueued, error: res.error };
  }
};

export default clinicalApi;
