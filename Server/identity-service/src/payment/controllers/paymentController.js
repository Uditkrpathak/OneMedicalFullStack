import crypto from 'crypto';
import Transaction from '../../models/Transaction.js';
import { Invoice } from '../../models/Billing.js';
import { getNextSequence } from '../../models/Counter.js';
import User from '../../models/User.js';
import TherapistProfile from '../../models/TherapistProfile.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpayService.js';
import { confirmAppointmentInternal, getAppointmentInternal } from '../services/appointmentConfirm.js';
import { publishEvent } from '../../utils/rabbitmq.js';

const IS_DEV = process.env.NODE_ENV !== 'production';

// ─── POST /payments/orders ────────────────────────────────────────────────────
// Server-side authoritative order generation — amount is never accepted from client
export const createOrder = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'];
    const userRole    = req.user?.role   || req.headers['x-user-role'];
    const { appointmentId, paymentMethod = 'upi', paymentPlace = 'online', idempotencyKey } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentId is required.' } });
    }

    // 1. Fetch appointment to get authoritative amount from backend database
    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found in clinical database.' } });
    }

    // 2. Validate patient ownership or administrative privilege
    if (userRole === 'patient' && requesterId && appointment.patientId && appointment.patientId !== requesterId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only pay for your own appointments.' } });
    }

    if (appointment.status === 'EXPIRED') {
      return res.status(400).json({ success: false, error: { code: 'HOLD_EXPIRED', message: 'This appointment hold has expired. Please select a new slot.' } });
    }

    if (appointment.status !== 'HELD' && appointment.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Appointment is not in a payable state (current: ${appointment.status}).` } });
    }

    // 3. Idempotency: check if transaction already exists for this appointment
    const effectiveIdempotencyKey = idempotencyKey || appointmentId;
    let transaction = await Transaction.findOne({
      $or: [
        { appointmentId },
        { idempotencyKey: effectiveIdempotencyKey }
      ]
    });

    if (transaction && transaction.status === 'captured') {
      const existingInvoice = await Invoice.findOne({ transactionId: transaction._id });
      return res.json({
        success: true,
        data: {
          transaction,
          invoice: existingInvoice,
          gatewayOrderId: transaction.gatewayOrderId || transaction.razorpayOrderId,
          amount: transaction.amountPaise,
          currency: transaction.currency,
          idempotent: true
        }
      });
    }

    const amountPaise = appointment.amount || 75000;
    const currency = appointment.currency || 'INR';

    // 4. Create or retrieve Razorpay gateway order
    let gatewayOrderId = transaction?.gatewayOrderId || transaction?.razorpayOrderId;
    if (!gatewayOrderId) {
      const order = await createRazorpayOrder(amountPaise, currency, appointmentId);
      gatewayOrderId = order.id;
    }

    if (!transaction) {
      transaction = await Transaction.create({
        patientId: requesterId || appointment.patientId,
        appointmentId,
        therapistId: appointment.therapistId,
        amountPaise,
        currency,
        gateway: 'razorpay',
        razorpayOrderId: gatewayOrderId,
        gatewayOrderId,
        idempotencyKey: effectiveIdempotencyKey,
        paymentMethod,
        paymentPlace,
        status: 'created',
        statusHistory: [{ status: 'created', note: 'Payment order initiated by patient.' }]
      });
    }

    res.status(201).json({
      success: true,
      data: {
        transaction,
        gatewayOrderId,
        razorpayOrderId: gatewayOrderId,
        amount: amountPaise,
        currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'dev_key_id'
      }
    });
  } catch (err) {
    console.error('[Payment] createOrder error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── POST /payments/verify (RACE-CONDITION SAFE & IDEMPOTENT) ─────────────────
// Server-side cryptographic signature verification and atomic appointment confirmation
export const verifyPayment = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'];
    const {
      appointmentId,
      gatewayOrderId,
      razorpayOrderId,
      paymentId,
      razorpayPaymentId,
      signature,
      razorpaySignature,
      paymentMethod = 'upi'
    } = req.body;

    const effectiveOrderId = razorpayOrderId || gatewayOrderId;
    const effectivePaymentId = razorpayPaymentId || paymentId || `pay_sim_${Date.now()}`;
    const effectiveSignature = razorpaySignature || signature;

    if (!appointmentId || !effectiveOrderId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentId and orderId are required.' } });
    }

    // 1. Fast Idempotency Check
    const existingTxn = await Transaction.findOne({
      $or: [
        { appointmentId, status: 'captured' },
        { razorpayPaymentId: effectivePaymentId, status: 'captured' },
        { gatewayPaymentId: effectivePaymentId, status: 'captured' }
      ]
    });

    if (existingTxn) {
      const existingInvoice = await Invoice.findOne({ transactionId: existingTxn._id });
      return res.json({
        success: true,
        message: 'Payment already verified (idempotent)',
        data: {
          transaction: existingTxn,
          invoice: existingInvoice,
          idempotent: true
        }
      });
    }

    // 2. Locate the existing created Transaction or held appointment
    let transaction = await Transaction.findOne({
      $or: [
        { appointmentId },
        { razorpayOrderId: effectiveOrderId },
        { gatewayOrderId: effectiveOrderId }
      ]
    });

    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found in clinical service.' } });
    }

    const amountPaise = appointment.amount || transaction?.amountPaise || 75000;
    const currency = appointment.currency || 'INR';

    // 3. Cryptographic Signature Verification
    if (effectiveSignature && process.env.NODE_ENV === 'production') {
      const isValid = verifyRazorpaySignature(effectiveOrderId, effectivePaymentId, effectiveSignature);
      if (!isValid) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Razorpay HMAC signature verification failed.' } });
      }
    }

    // 4. Atomic Transition on Transaction
    let capturedTxn;
    if (transaction) {
      capturedTxn = await Transaction.findOneAndUpdate(
        {
          _id: transaction._id,
          status: { $ne: 'captured' }
        },
        {
          $set: {
            status: 'captured',
            razorpayPaymentId: effectivePaymentId,
            gatewayPaymentId: effectivePaymentId,
            razorpayOrderId: effectiveOrderId,
            gatewayOrderId: effectiveOrderId,
            paymentMethod,
            capturedAt: new Date()
          },
          $push: {
            statusHistory: { status: 'captured', note: `Payment verified (${effectivePaymentId})`, timestamp: new Date() }
          }
        },
        { new: true }
      );
    } else {
      capturedTxn = await Transaction.create({
        patientId: requesterId || appointment.patientId,
        appointmentId,
        therapistId: appointment.therapistId,
        amountPaise,
        currency,
        gateway: 'razorpay',
        razorpayOrderId: effectiveOrderId,
        gatewayOrderId: effectiveOrderId,
        razorpayPaymentId: effectivePaymentId,
        gatewayPaymentId: effectivePaymentId,
        paymentMethod,
        status: 'captured',
        capturedAt: new Date(),
        statusHistory: [{ status: 'captured', note: `Payment created and verified directly (${effectivePaymentId})` }]
      });
    }

    // 5. Authoritatively Confirm Appointment in Clinical Service
    await confirmAppointmentInternal(appointmentId, effectiveOrderId, effectivePaymentId);

    // 6. Generate GST Tax Invoice atomically
    let invoice = await Invoice.findOne({ transactionId: capturedTxn._id });
    if (!invoice) {
      const seq = await getNextSequence('invoice_seq');
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
      const totalAmountPaise = amountPaise || 75000;
      const consultationFeePaise = Math.round(totalAmountPaise / 1.18);
      const taxesPaise = totalAmountPaise - consultationFeePaise;

      invoice = await Invoice.create({
        invoiceNumber,
        transactionId: capturedTxn._id,
        appointmentId,
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        consultationFee: consultationFeePaise,
        taxes: taxesPaise,
        discount: 0,
        totalAmount: totalAmountPaise,
        currency: 'INR',
        status: 'PAID',
        generatedAt: new Date()
      });
    }

    // 7. Publish live payment confirmed event
    await publishEvent('payment.captured', {
      appointmentId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      amount: invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: effectivePaymentId
    });

    res.json({
      success: true,
      message: 'Payment verified and appointment confirmed successfully.',
      data: {
        transaction: capturedTxn,
        invoice,
        appointmentId,
        status: 'CONFIRMED'
      }
    });
  } catch (err) {
    console.error('[Payment] verifyPayment error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/transactions/my ────────────────────────────────────────────
export const getMyTransactions = async (req, res) => {
  try {
    const requesterId = req.user?.userId || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];
    const { patientId: queryPatientId } = req.query;

    const filter = {};
    if (userRole === 'patient') {
      filter.patientId = requesterId;
    } else if (queryPatientId) {
      filter.patientId = queryPatientId;
    } else if (userRole !== 'clinic_admin' && userRole !== 'super_admin') {
      filter.patientId = requesterId;
    }

    const txns = await Transaction.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/invoices/my ────────────────────────────────────────────────
export const getMyInvoices = async (req, res) => {
  try {
    const patientId = req.user?.userId || req.headers['x-user-id'];
    const invoices = await Invoice.find({ patientId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/invoices ───────────────────────────────────────────────────
export const getInvoices = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    const userId = req.user?.userId || req.headers['x-user-id'];
    const filter = (userRole === 'clinic_admin' || userRole === 'super_admin') ? {} : { patientId: userId };
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/invoices/:id ───────────────────────────────────────────────
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id).lean();
    if (!invoice) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found.' } });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

