import { resilientFetch } from '../../shared/apiClient';

const authHeaders = (token) => (token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {});
const jsonHeaders = (token) => (token && token !== 'null' && token !== 'undefined' ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' });

export const appointmentApi = {
  // ─── Therapists Discovery ──────────────────────────────────────────
  getTherapists: async (token) => {
    const res = await resilientFetch('/therapists', { headers: authHeaders(token) });
    return { success: res.success, data: res.data, source: res.source, error: res.error };
  },

  getTherapistById: async (therapistId, token) => {
    const res = await resilientFetch(`/therapists/${therapistId}`, { headers: authHeaders(token) });
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Slot Availability (ISO-8601 slots from Redis & Schedule) ──────
  getSlotAvailability: async (therapistId, date, token) => {
    const res = await resilientFetch(
      `/availability/${therapistId}?date=${date}`,
      { headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  getAvailability: async (therapistId, date, token) => {
    return appointmentApi.getSlotAvailability(therapistId, date, token);
  },

  // ─── Create 10-Minute Hold (Backend-Authoritative) ──────────────────
  // POST /appointments/hold
  createHold: async (holdData, token) => {
    const res = await resilientFetch(
      '/appointments/hold',
      {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify(holdData),
      }
    );
    return {
      success: res.success,
      data: res.data,
      error: res.error,
    };
  },

  // ─── Get Appointment By ID ─────────────────────────────────────────
  getAppointmentById: async (appointmentId, token) => {
    const res = await resilientFetch(
      `/appointments/${appointmentId}`,
      { headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data?.appointment || res.data, error: res.error };
  },

  // ─── Get My Appointments (view: 'upcoming' | 'past' | 'cancelled') ─
  getMyAppointments: async (view = 'upcoming', token) => {
    const res = await resilientFetch(
      `/appointments?view=${view}`,
      { headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data, meta: res.meta, error: res.error };
  },

  getAppointments: async (token) => {
    return appointmentApi.getMyAppointments('upcoming', token);
  },

  // ─── Cancel Appointment (Evaluates backend policy) ─────────────────
  cancelAppointment: async (appointmentId, reason, token) => {
    const res = await resilientFetch(
      `/appointments/${appointmentId}/cancel`,
      {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ reason }),
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Reschedule Appointment (Atomic hold-swap & price delta) ───────
  rescheduleAppointment: async (appointmentId, newStartTime, newEndTime, token) => {
    const res = await resilientFetch(
      `/appointments/${appointmentId}/reschedule`,
      {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ startTime: newStartTime, endTime: newEndTime }),
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Phase 2 Payment Orders & Cryptographic Verification ───────────
  createPaymentOrder: async (appointmentId, token) => {
    const res = await resilientFetch(
      '/payments/orders',
      {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ appointmentId }),
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  verifyPayment: async (paymentData, token) => {
    const res = await resilientFetch(
      '/payments/verify',
      {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify(paymentData),
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Clinical Reviews (Gated by COMPLETED appointment ownership) ───
  submitReview: async (reviewData, token) => {
    const res = await resilientFetch(
      '/clinical/reviews',
      {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify(reviewData),
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Services Catalog ─────────────────────────────────────────────
  getServices: async (token) => {
    const res = await resilientFetch('/services', { headers: authHeaders(token) });
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Therapist Reviews ────────────────────────────────────────────
  getTherapistReviews: async (therapistId, token) => {
    const res = await resilientFetch(
      `/therapists/${therapistId}/reviews`,
      { headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Saved Specialists ─────────────────────────────────────────────
  getSavedSpecialists: async (token) => {
    const res = await resilientFetch(
      '/users/me/saved-therapists',
      { headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  saveSpecialist: async (therapistId, token) => {
    const res = await resilientFetch(
      `/users/me/saved-therapists/${therapistId}`,
      { method: 'POST', headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  removeSavedSpecialist: async (therapistId, token) => {
    const res = await resilientFetch(
      `/users/me/saved-therapists/${therapistId}`,
      { method: 'DELETE', headers: authHeaders(token) }
    );
    return { success: res.success, data: res.data, error: res.error };
  },
};

export default appointmentApi;
