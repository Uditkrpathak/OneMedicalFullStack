import fetch from 'node-fetch';

const CLINICAL_URL = process.env.CLINICAL_SERVICE_URL || process.env.CLINICAL_SERVICE_INTERNAL_URL || 'http://localhost:5003';

// Called after payment verification — tells clinical service to confirm the appointment
export const confirmAppointmentInternal = async (appointmentId, paymentOrderId, paymentId) => {
  const internalKey = process.env.INTERNAL_API_KEY || 'onemedical_internal_key_production_2026';
  const res = await fetch(`${CLINICAL_URL}/appointments/${appointmentId}/confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': internalKey,
      'x-user-role': 'clinic_admin',
      'x-user-id': 'system'
    },
    body: JSON.stringify({ paymentOrderId, paymentId }),
  });
  const json = await res.json();
  if (!res.ok && !json.idempotent) throw new Error(json.error?.message || 'Failed to confirm appointment');
  return json;
};

// Fetch appointment details from clinical service (for amount verification)
export const getAppointmentInternal = async (appointmentId) => {
  const internalKey = process.env.INTERNAL_API_KEY || 'onemedical_internal_key_production_2026';
  const res = await fetch(`${CLINICAL_URL}/appointments/${appointmentId}`, {
    headers: { 'x-internal-key': internalKey, 'x-user-role': 'clinic_admin', 'x-user-id': 'system' },
  });
  const json = await res.json();
  return json.success ? (json.data?.appointment || json.data) : null;
};

// Called after payment failure/cancellation — tells clinical service to release held slot
export const cancelAppointmentInternal = async (appointmentId, reason) => {
  const internalKey = process.env.INTERNAL_API_KEY || 'onemedical_internal_key_production_2026';
  try {
    const res = await fetch(`${CLINICAL_URL}/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': internalKey,
        'x-user-role': 'clinic_admin',
        'x-user-id': 'system'
      },
      body: JSON.stringify({ reason: reason || 'Payment failed or declined.' }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[cancelAppointmentInternal] Warning:', err.message);
    return null;
  }
};

