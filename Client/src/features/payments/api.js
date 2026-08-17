import { resilientFetch } from '../../shared/apiClient';

export const paymentApi = {
  // ─── Create Payment Order (Backend Authoritative) ──────────────────────────
  createOrder: async (appointmentId, token, options = {}) => {
    const res = await resilientFetch(
      '/payments/orders',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId,
          paymentMethod: options.paymentMethod || 'upi',
          paymentPlace: options.paymentPlace || 'online',
          idempotencyKey: options.idempotencyKey || appointmentId
        }),
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Verify Payment & Atomic Invoicing ──────────────────────────────────────
  verifyPayment: async (payloadOrOrderId, appointmentIdOrToken, tokenArg) => {
    let body = {};
    let authToken = tokenArg;

    if (typeof payloadOrOrderId === 'object' && payloadOrOrderId !== null) {
      body = payloadOrOrderId;
      authToken = appointmentIdOrToken; // passed as (payload, token)
    } else {
      body = {
        gatewayOrderId: payloadOrOrderId,
        appointmentId: appointmentIdOrToken
      };
    }

    const res = await resilientFetch(
      '/payments/verify',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      }
    );
    return { success: res.success, data: res.data, error: res.error, message: res.message };
  },

  // ─── Get My Transactions ───────────────────────────────────────────────────
  getMyTransactions: async (token) => {
    const res = await resilientFetch(
      '/payments/transactions/my',
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Get Invoices List ──────────────────────────────────────────────────────
  getInvoices: async (token) => {
    const res = await resilientFetch(
      '/payments/invoices',
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },

  // ─── Get Invoice Details By ID ──────────────────────────────────────────────
  getInvoiceById: async (invoiceOrTransactionId, token) => {
    const res = await resilientFetch(
      `/payments/invoices/${invoiceOrTransactionId}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    return { success: res.success, data: res.data, error: res.error };
  },
};

export default paymentApi;
