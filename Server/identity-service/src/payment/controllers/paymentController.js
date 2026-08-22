import crypto from 'crypto';
import Transaction from '../../models/Transaction.js';
import PaymentAttempt from '../../models/PaymentAttempt.js';
import { Invoice, Refund, Payout } from '../../models/Billing.js';
import { getNextSequence } from '../../models/Counter.js';
import User from '../../models/User.js';
import TherapistProfile from '../../models/TherapistProfile.js';
import { createRazorpayOrder, verifyRazorpaySignature, createRazorpayRefund } from '../services/razorpayService.js';
import { confirmAppointmentInternal, getAppointmentInternal } from '../services/appointmentConfirm.js';
import { publishEvent } from '../../utils/rabbitmq.js';

const IS_DEV = process.env.NODE_ENV !== 'production';
const ALLOWED_ADMIN_ROLES = ['clinic_admin', 'super_admin', 'admin'];

export const isAdminRole = (role) => ALLOWED_ADMIN_ROLES.includes(role);

// ─── POST /payments/orders ────────────────────────────────────────────────────
// Server-side authoritative order generation — amount is never accepted from client
export const createOrder = async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
  try {
    const requesterId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const { appointmentId, paymentMethod = 'upi', paymentPlace = 'online', idempotencyKey, upiApp = 'OTHER' } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentId is required.' }, requestId });
    }

    // 1. Fetch appointment to get authoritative amount from backend database
    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found in clinical database.' }, requestId });
    }

    // 2. Validate patient ownership or administrative privilege
    if (userRole === 'patient' && requesterId && appointment.patientId && String(appointment.patientId) !== String(requesterId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only pay for your own appointments.' }, requestId });
    }

    if (appointment.status === 'EXPIRED' || appointment.status === 'PAYMENT_EXPIRED') {
      return res.status(400).json({ success: false, error: { code: 'PAYMENT_APPOINTMENT_EXPIRED', message: 'This appointment hold has expired. Please select a new slot.' }, requestId });
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: { code: 'PAYMENT_APPOINTMENT_CANCELLED', message: 'This appointment has been cancelled.' }, requestId });
    }

    if (appointment.status !== 'HELD' && appointment.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: `Appointment is not in a payable state (current: ${appointment.status}).` }, requestId });
    }

    // Authoritative Amount Resolution (No Arbitrary Hardcoded Default)
    const rawAmt = appointment.amountPaise || appointment.amount || (appointment.fee ? appointment.fee * 100 : undefined);
    if (!rawAmt || isNaN(rawAmt) || rawAmt <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_APPOINTMENT_AMOUNT', message: 'Authoritative appointment pricing is missing or invalid.' }, requestId });
    }
    const amountPaise = rawAmt < 5000 ? rawAmt * 100 : rawAmt;
    const currency = appointment.currency || 'INR';

    // 3. Idempotency: check if transaction already exists for this appointment
    const effectiveIdempotencyKey = idempotencyKey || appointmentId;
    let transaction = await Transaction.findOne({
      $or: [
        { appointmentId },
        { idempotencyKey: effectiveIdempotencyKey }
      ]
    });

    if (transaction && (transaction.status === 'captured' || transaction.status === 'PAID')) {
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
        },
        requestId
      });
    }

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
        status: 'pending',
        statusHistory: [{ status: 'pending', note: 'Payment order initiated by patient.' }]
      });
    }

    // Record Diagnostic Payment Attempt
    await PaymentAttempt.create({
      appointmentId,
      patientId: requesterId || appointment.patientId,
      therapistId: appointment.therapistId,
      transactionId: transaction._id,
      gatewayOrderId,
      method: 'UPI',
      upiApp: upiApp.toUpperCase(),
      amountPaise,
      currency,
      status: 'ATTEMPTED',
      requestId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(e => console.warn('[PaymentAttempt] Log error:', e.message));

    res.status(201).json({
      success: true,
      data: {
        transaction,
        gatewayOrderId,
        razorpayOrderId: gatewayOrderId,
        amount: amountPaise,
        currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'dev_key_id'
      },
      requestId
    });
  } catch (err) {
    console.error('[Payment] createOrder error:', err);
    res.status(500).json({ success: false, error: { code: 'PAYMENT_ORDER_CREATE_FAILED', message: err.message }, requestId });
  }
};

// ─── POST /payments/verify (STRICT GATEWAY VERIFICATION) ──────────────────────
export const verifyPayment = async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
  try {
    const requesterId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const {
      appointmentId,
      gatewayOrderId,
      razorpayOrderId,
      paymentId,
      razorpayPaymentId,
      signature,
      razorpaySignature,
      paymentMethod = 'upi',
      upiApp = 'OTHER'
    } = req.body;

    const effectiveOrderId = razorpayOrderId || gatewayOrderId;
    const effectiveSignature = razorpaySignature || signature;
    let effectivePaymentId = razorpayPaymentId || paymentId;

    if (!appointmentId || !effectiveOrderId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentId and orderId are required.' }, requestId });
    }

    // Strict Gateway Signature Verification in Production
    if (process.env.NODE_ENV === 'production') {
      if (!effectivePaymentId || !effectiveSignature) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_VERIFICATION_DATA_MISSING',
            message: 'Payment verification data is incomplete (paymentId and signature are required).'
          },
          requestId
        });
      }

      const isValid = verifyRazorpaySignature(effectiveOrderId, effectivePaymentId, effectiveSignature);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: { code: 'PAYMENT_SIGNATURE_INVALID', message: 'Razorpay HMAC signature verification failed.' },
          requestId
        });
      }
    } else {
      // Isolated development simulation only when no real payment ID provided
      if (!effectivePaymentId) {
        effectivePaymentId = `pay_sim_${Date.now()}`;
      }
    }

    // 1. Fast Idempotency Check on Transaction
    const existingTxn = await Transaction.findOne({
      $or: [
        { appointmentId, status: { $in: ['captured', 'PAID'] } },
        { razorpayPaymentId: effectivePaymentId, status: { $in: ['captured', 'PAID'] } },
        { gatewayPaymentId: effectivePaymentId, status: { $in: ['captured', 'PAID'] } }
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
        },
        requestId
      });
    }

    // 2. Locate the existing Transaction and Clinical Appointment
    let transaction = await Transaction.findOne({
      $or: [
        { appointmentId },
        { razorpayOrderId: effectiveOrderId },
        { gatewayOrderId: effectiveOrderId }
      ]
    });

    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found in clinical service.' }, requestId });
    }

    if (appointment.status === 'EXPIRED' || appointment.status === 'PAYMENT_EXPIRED') {
      return res.status(400).json({ success: false, error: { code: 'PAYMENT_APPOINTMENT_EXPIRED', message: 'Cannot verify payment on expired appointment.' }, requestId });
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: { code: 'PAYMENT_APPOINTMENT_CANCELLED', message: 'Cannot verify payment on cancelled appointment.' }, requestId });
    }

    const rawAmt = appointment.amountPaise || appointment.amount || transaction?.amountPaise;
    if (!rawAmt || isNaN(rawAmt) || rawAmt <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Appointment pricing is missing.' }, requestId });
    }
    const amountPaise = rawAmt < 5000 ? rawAmt * 100 : rawAmt;
    const currency = appointment.currency || 'INR';

    // 3. Strict Amount Validation
    if (transaction?.amountPaise && amountPaise && transaction.amountPaise !== amountPaise) {
      await PaymentAttempt.create({
        appointmentId,
        patientId: requesterId || appointment.patientId,
        gatewayOrderId: effectiveOrderId,
        gatewayPaymentId: effectivePaymentId,
        amountPaise,
        status: 'FAILED',
        failureCode: 'PAYMENT_AMOUNT_MISMATCH',
        failureReason: 'Payment amount mismatch with authoritative appointment pricing.',
        requestId,
      }).catch(() => null);

      return res.status(400).json({ success: false, error: { code: 'PAYMENT_AMOUNT_MISMATCH', message: 'Payment amount mismatch with authoritative appointment pricing.' }, requestId });
    }

    // 4. Atomic Transition on Transaction (Optimistic versioning)
    let capturedTxn;
    if (transaction) {
      capturedTxn = await Transaction.findOneAndUpdate(
        {
          _id: transaction._id,
          status: { $nin: ['captured', 'PAID'] }
        },
        {
          $set: {
            status: 'captured',
            razorpayPaymentId: effectivePaymentId,
            gatewayPaymentId: effectivePaymentId,
            razorpayOrderId: effectiveOrderId,
            gatewayOrderId: effectiveOrderId,
            paymentMethod: 'UPI',
            verificationSource: 'SERVER_VERIFY',
            verifiedAt: new Date(),
            capturedAt: new Date()
          },
          $inc: { version: 1 },
          $push: {
            statusHistory: { status: 'captured', note: `UPI payment verified via gateway (${effectivePaymentId})`, timestamp: new Date() }
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
        paymentMethod: 'UPI',
        verificationSource: 'SERVER_VERIFY',
        verifiedAt: new Date(),
        status: 'captured',
        capturedAt: new Date(),
        statusHistory: [{ status: 'captured', note: `UPI payment created and verified directly (${effectivePaymentId})` }]
      });
    }

    // Record Successful Payment Attempt
    await PaymentAttempt.create({
      appointmentId,
      patientId: requesterId || appointment.patientId,
      therapistId: appointment.therapistId,
      transactionId: capturedTxn._id,
      gatewayOrderId: effectiveOrderId,
      gatewayPaymentId: effectivePaymentId,
      method: 'UPI',
      upiApp: upiApp.toUpperCase(),
      amountPaise,
      status: 'SUCCESS',
      completedAt: new Date(),
      requestId,
    }).catch(() => null);

    // 5. Authoritatively Confirm Appointment in Clinical Service (with transaction reference)
    await confirmAppointmentInternal(appointmentId, effectiveOrderId, effectivePaymentId, capturedTxn._id);

    // 6. Generate GST Tax Invoice atomically & idempotently
    let invoice = await Invoice.findOne({ $or: [{ transactionId: capturedTxn._id }, { appointmentId }] });
    if (!invoice) {
      try {
        const seq = await getNextSequence('invoice_seq');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
        const totalAmountPaise = amountPaise;
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
      } catch (invoiceErr) {
        invoice = await Invoice.findOne({ $or: [{ transactionId: capturedTxn._id }, { appointmentId }] });
      }
    }

    if (invoice && (!capturedTxn.invoiceId || !capturedTxn.invoiceNumber)) {
      capturedTxn.invoiceId = invoice._id;
      capturedTxn.invoiceNumber = invoice.invoiceNumber;
      await capturedTxn.save();
    }

    // 7. Publish live payment confirmed event
    await publishEvent('payment.captured', {
      appointmentId,
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      amount: invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: effectivePaymentId
    }).catch(e => console.warn('[Payment] Event publish warning:', e.message));

    res.json({
      success: true,
      message: 'UPI payment verified and appointment confirmed successfully.',
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

// ─── POST /payments/clinic/dynamic-qr ─────────────────────────────────────────
export const generateClinicDynamicQr = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentId is required.' } });
    }

    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
    }

    const place = String(appointment.appointmentPlace || 'CLINIC').toUpperCase();
    if (['VIDEO', 'ONLINE', 'TELEHEALTH', 'HOME'].includes(place)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPFRONT_PAYMENT_REQUIRED',
          message: `Pay-at-clinic is not permitted for ${place} appointments. Upfront online payment is required.`
        }
      });
    }

    const rawAmt = appointment.amountPaise || appointment.amount || (appointment.fee ? appointment.fee * 100 : undefined);
    if (!rawAmt || isNaN(rawAmt) || rawAmt <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Appointment amount is invalid.' } });
    }
    const amountPaise = rawAmt < 5000 ? rawAmt * 100 : rawAmt;
    const amountRupees = Math.round(amountPaise / 100);

    let transaction = await Transaction.findOne({ appointmentId });
    let gatewayOrderId = transaction?.gatewayOrderId || transaction?.razorpayOrderId;

    if (!gatewayOrderId) {
      gatewayOrderId = `order_clinic_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      try {
        const order = await createRazorpayOrder(amountPaise, 'INR', appointmentId);
        if (order?.id) gatewayOrderId = order.id;
      } catch (e) {
        console.warn('[generateClinicDynamicQr] Gateway order generation note:', e.message);
      }

      if (!transaction) {
        transaction = await Transaction.create({
          patientId: appointment.patientId,
          appointmentId,
          therapistId: appointment.therapistId,
          amountPaise,
          currency: 'INR',
          gateway: 'razorpay',
          razorpayOrderId: gatewayOrderId,
          gatewayOrderId,
          paymentMethod: 'UPI',
          paymentPlace: 'clinic',
          status: 'created',
          statusHistory: [{ status: 'created', note: 'Dynamic Clinic UPI QR generated.' }]
        });
      }
    }

    const upiVpa = 'onemedical.pay@icici';
    const upiQrPayload = `upi://pay?pa=${upiVpa}&pn=One%20Medical%20Clinic&am=${amountRupees}&cu=INR&tr=${gatewayOrderId}&tn=OneMedical%20Consultation%20APT-${String(appointmentId).slice(-6).toUpperCase()}`;

    if (transaction) {
      transaction.qrPayload = upiQrPayload;
      transaction.upiVpa = upiVpa;
      await transaction.save();
    }

    res.json({
      success: true,
      data: {
        appointmentId,
        gatewayOrderId,
        amountRupees,
        amount: amountRupees,
        amountPaise,
        currency: 'INR',
        upiVpa,
        vpa: upiVpa,
        upiQrPayload,
        qrPayload: upiQrPayload,
        patientName: appointment.patientName || 'Patient',
        therapistName: appointment.therapistName || 'Specialist',
      }
    });
  } catch (err) {
    console.error('[Payment] generateClinicDynamicQr error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── POST /payments/clinic/verify ─────────────────────────────────────────────
export const verifyClinicPayment = async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
  try {
    const requesterId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'clinic_admin';
    const { appointmentId, paymentMethod = 'UPI', notes, collectedBy } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'appointmentId is required.' }, requestId });
    }

    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found in clinical database.' }, requestId });
    }

    const place = String(appointment.appointmentPlace || 'CLINIC').toUpperCase();
    if (['VIDEO', 'ONLINE', 'TELEHEALTH', 'HOME'].includes(place)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPFRONT_PAYMENT_REQUIRED',
          message: `Pay-at-clinic is not permitted for ${place} appointments. Upfront online payment is required.`
        },
        requestId
      });
    }

    const rawAmt = appointment.amountPaise || appointment.amount || (appointment.fee ? appointment.fee * 100 : 80000);
    const amountPaise = rawAmt < 5000 ? rawAmt * 100 : rawAmt;
    const effectiveMethod = (paymentMethod || 'UPI').toUpperCase();

    let transaction = await Transaction.findOne({ appointmentId });
    if (transaction && (transaction.status === 'captured' || transaction.status === 'PAID')) {
      const existingInvoice = await Invoice.findOne({ $or: [{ transactionId: transaction._id }, { appointmentId }] }).lean();
      return res.json({
        success: true,
        data: {
          verified: true,
          status: 'PAID',
          transaction,
          invoice: existingInvoice,
        },
        message: 'Payment already verified.',
        requestId
      });
    }

    const paymentRef = `clinic_pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const orderRef = transaction?.gatewayOrderId || `order_clinic_${Date.now()}`;

    if (transaction) {
      transaction.status = 'captured';
      transaction.gatewayPaymentId = paymentRef;
      transaction.razorpayPaymentId = paymentRef;
      transaction.paymentMethod = effectiveMethod;
      transaction.paymentPlace = 'clinic';
      transaction.verificationSource = 'CLINIC_COUNTER';
      transaction.verifiedAt = new Date();
      transaction.capturedAt = new Date();
      transaction.statusHistory.push({
        status: 'captured',
        note: `Clinic payment verified via ${effectiveMethod} (${notes || 'Reception Desk Settlement'})`,
        timestamp: new Date()
      });
      await transaction.save();
    } else {
      transaction = await Transaction.create({
        patientId: appointment.patientId,
        appointmentId,
        therapistId: appointment.therapistId,
        amountPaise,
        currency: 'INR',
        gateway: 'clinic_counter',
        gatewayOrderId: orderRef,
        razorpayOrderId: orderRef,
        gatewayPaymentId: paymentRef,
        razorpayPaymentId: paymentRef,
        paymentMethod: effectiveMethod,
        paymentPlace: 'clinic',
        verificationSource: 'CLINIC_COUNTER',
        verifiedAt: new Date(),
        status: 'captured',
        capturedAt: new Date(),
        statusHistory: [{
          status: 'captured',
          note: `Clinic payment registered via ${effectiveMethod} (${notes || 'Reception Desk Settlement'})`
        }]
      });
    }

    // Confirm Appointment in clinical service
    await confirmAppointmentInternal(appointmentId, orderRef, paymentRef, transaction._id).catch(err => {
      console.warn('[verifyClinicPayment] confirmAppointmentInternal note:', err.message);
    });

    // Generate GST Tax Invoice
    let invoice = await Invoice.findOne({ $or: [{ transactionId: transaction._id }, { appointmentId }] });
    if (!invoice) {
      try {
        const seq = await getNextSequence('invoice_seq');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
        const totalAmountPaise = amountPaise;
        const consultationFeePaise = Math.round(totalAmountPaise / 1.18);
        const taxesPaise = totalAmountPaise - consultationFeePaise;

        invoice = await Invoice.create({
          invoiceNumber,
          transactionId: transaction._id,
          appointmentId,
          patientId: appointment.patientId,
          therapistId: appointment.therapistId,
          totalAmount: totalAmountPaise,
          consultationFee: consultationFeePaise,
          taxes: taxesPaise,
          discount: 0,
          currency: 'INR',
          status: 'PAID',
          paymentMethod: effectiveMethod,
          generatedAt: new Date(),
        });
      } catch (invErr) {
        console.warn('[verifyClinicPayment] Invoice creation note:', invErr.message);
      }
    }

    // Publish event
    await publishEvent('payment.captured', {
      appointmentId,
      transactionId: transaction._id,
      amountPaise,
      paymentMethod: effectiveMethod,
      source: 'clinic_counter',
      timestamp: new Date().toISOString()
    }).catch(() => null);

    res.json({
      success: true,
      data: {
        verified: true,
        status: 'PAID',
        transaction,
        invoice,
        amount: Math.round(amountPaise / 100),
      },
      message: 'Clinic payment verified and session confirmed.',
      requestId
    });
  } catch (err) {
    console.error('[Payment] verifyClinicPayment error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message }, requestId });
  }
};

// ─── GET /payments/health ────────────────────────────────────────────────────
export const getPaymentHealth = async (req, res) => {
  res.json({
    success: true,
    service: 'identity-service:payments',
    status: 'healthy',
    gateway: 'razorpay',
    timestamp: new Date().toISOString()
  });
};

// ─── GET /payments/transactions/my (GET MY TRANSACTIONS) ──────────────────────
export const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const isAdmin = isAdminRole(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const filter = isAdmin ? {} : { patientId: String(userId) };
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).lean();

    const formatted = transactions.map(t => ({
      ...t,
      id: t._id,
      amountRupees: t.amountPaise ? Math.round(t.amountPaise / 100) : 0,
      amountFormatted: `₹${(t.amountPaise ? Math.round(t.amountPaise / 100) : 0).toLocaleString('en-IN')}`,
      dateFormatted: new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('[Payment] getMyTransactions error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/invoices/my ────────────────────────────────────────────────
export const getMyInvoices = async (req, res) => {
  return getInvoices(req, res);
};

// ─── GET /payments/invoices ───────────────────────────────────────────────────
export const getInvoices = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const isAdmin = isAdminRole(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const filter = isAdmin ? {} : { patientId: String(userId) };
    let invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();

    // Enrich therapist details and formatting
    const therapistIds = Array.from(new Set(invoices.map(i => i.therapistId).filter(Boolean)));
    const tMap = new Map();
    if (therapistIds.length > 0) {
      const therapists = await TherapistProfile.find({
        $or: [{ userId: { $in: therapistIds } }, { _id: { $in: therapistIds } }]
      }).populate('userId', 'name').lean();

      therapists.forEach(t => {
        const name = t.userId?.name || t.fullName || t.name;
        if (t.userId?._id) tMap.set(t.userId._id.toString(), name);
        if (t._id) tMap.set(t._id.toString(), name);
      });
    }

    // Fetch patient user info
    let patientName = 'Patient';
    let patientPhone = '';
    if (userId) {
      const u = await User.findById(userId).lean();
      if (u) {
        patientName = u.name || patientName;
        patientPhone = u.phoneNumber || '';
      }
    }

    const enrichedInvoices = invoices.map((inv) => {
      const amtVal = inv.totalAmount > 5000 ? Math.round(inv.totalAmount / 100) : (inv.totalAmount || 0);
      const feeVal = inv.consultationFee > 5000 ? Math.round(inv.consultationFee / 100) : (inv.consultationFee || amtVal);
      const taxVal = inv.taxes > 5000 ? Math.round(inv.taxes / 100) : (inv.taxes || 0);

      const dName = tMap.get(inv.therapistId?.toString()) || inv.doctorName || 'Attending Specialist';
      const genDate = inv.generatedAt || inv.createdAt || new Date();
      const isRefunded = inv.status === 'REFUNDED' || inv.status === 'refunded';

      return {
        ...inv,
        doctorName: dName,
        patientName: inv.patientName || patientName,
        patientPhone: inv.patientPhone || patientPhone,
        service: inv.service || 'Physiotherapy Consultation & Rehabilitation',
        serviceName: inv.serviceName || 'Physiotherapy Consultation & Rehabilitation',
        clinicName: inv.clinicName || 'ONE MEDICAL Central Hub',
        address: inv.address || '4th Floor, Health Tower, Indiranagar, Bengaluru, 560038',
        gstin: inv.gstin || '29AABCU9603R1ZM',
        department: inv.department || 'Orthopedic Physiotherapy',
        totalAmount: amtVal,
        amountRupees: amtVal,
        consultationFee: feeVal,
        taxes: taxVal,
        discount: inv.discount || 0,
        amountFormatted: `₹${amtVal.toLocaleString('en-IN')}`,
        dateFormatted: new Date(genDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        paymentMethod: inv.paymentMethod || 'UPI (ONLINE)',
        status: isRefunded ? 'REFUNDED' : (inv.status || 'PAID'),
        isRefunded,
      };
    });

    res.json({ success: true, data: enrichedInvoices });
  } catch (err) {
    console.error('[Payment] getInvoices error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/invoices/:id (AUTHORIZATION VERIFIED) ──────────────────────
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const isAdmin = isAdminRole(userRole);

    let invoice = null;
    try {
      invoice = await Invoice.findById(id).lean();
    } catch {}

    if (!invoice) {
      invoice = await Invoice.findOne({ $or: [{ transactionId: id }, { appointmentId: id }, { invoiceNumber: id }] }).lean();
    }

    let txn = null;
    if (invoice?.transactionId) {
      txn = await Transaction.findById(invoice.transactionId).lean();
    } else {
      try {
        txn = await Transaction.findOne({ $or: [{ _id: id }, { appointmentId: id }, { gatewayOrderId: id }, { razorpayOrderId: id }] }).lean();
      } catch {}
    }

    let appt = null;
    const targetApptId = invoice?.appointmentId || txn?.appointmentId || id;
    if (targetApptId) {
      try {
        appt = await getAppointmentInternal(targetApptId);
      } catch {}
    }

    if (!invoice && !txn && !appt) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found for the requested transaction.' } });
    }

    // Ownership & Privacy Authorization Check
    const targetPatientId = String(invoice?.patientId || txn?.patientId || appt?.patientId || '');
    if (!isAdmin && userId && targetPatientId && String(userId) !== targetPatientId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not authorized to view this invoice.' } });
    }

    // Resolve therapist name
    let therapistName = appt?.therapistName || 'Attending Specialist';
    const targetTherapistId = invoice?.therapistId || txn?.therapistId || appt?.therapistId;
    if (targetTherapistId) {
      const t = await TherapistProfile.findOne({
        $or: [{ userId: targetTherapistId }, { _id: targetTherapistId }]
      }).populate('userId', 'name').lean();
      if (t) therapistName = t.userId?.name || t.fullName || t.name || therapistName;
    }

    // Resolve patient details
    let patientName = appt?.patientName || 'Patient';
    let patientPhone = '';
    if (targetPatientId) {
      const pUser = await User.findById(targetPatientId).lean();
      if (pUser) {
        patientName = pUser.name || patientName;
        patientPhone = pUser.phoneNumber || '';
      }
    }

    const rawAmount = invoice?.totalAmount || txn?.amountPaise || appt?.amount || 0;
    const totalAmount = rawAmount > 5000 ? Math.round(rawAmount / 100) : rawAmount;
    const consultationFee = invoice?.consultationFee
      ? (invoice.consultationFee > 5000 ? Math.round(invoice.consultationFee / 100) : invoice.consultationFee)
      : totalAmount;
    const taxes = invoice?.taxes ? (invoice.taxes > 5000 ? Math.round(invoice.taxes / 100) : invoice.taxes) : 0;
    const discount = invoice?.discount ? (invoice.discount > 5000 ? Math.round(invoice.discount / 100) : invoice.discount) : 0;

    const isRefunded = txn?.status === 'refunded' || txn?.status === 'REFUNDED' || appt?.paymentStatus === 'REFUNDED' || invoice?.status === 'REFUNDED';
    const invNumber = invoice?.invoiceNumber || txn?.invoiceNumber || `INV-${new Date().getFullYear()}-${String(id).slice(-5).toUpperCase()}`;
    const genDate = invoice?.generatedAt || txn?.capturedAt || txn?.createdAt || appt?.createdAt || new Date();

    const result = {
      invoiceId: invoice?._id || txn?._id,
      invoiceNumber: invNumber,
      transactionId: txn?._id || invoice?.transactionId,
      gatewayOrderId: txn?.gatewayOrderId || txn?.razorpayOrderId,
      gatewayPaymentId: txn?.gatewayPaymentId || txn?.razorpayPaymentId,
      appointmentId: targetApptId,
      patientId: targetPatientId,
      patientName,
      patientPhone,
      therapistName,
      totalAmount,
      consultationFee,
      taxes,
      discount,
      currency: 'INR',
      status: isRefunded ? 'REFUNDED' : 'PAID',
      issuedDate: new Date(genDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      issuedTime: new Date(genDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isComputerGenerated: true,
    };

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Payment] getInvoiceById error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payments/status/:id (AUTHORIZATION VERIFIED) ────────────────────────
export const getPaymentStatus = async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const isAdmin = isAdminRole(userRole);

    if (!id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id is required' }, requestId });
    }

    let txn = null;
    try {
      txn = await Transaction.findOne({
        $or: [
          { appointmentId: id },
          { _id: id },
          { gatewayOrderId: id },
          { razorpayOrderId: id }
        ]
      }).lean();
    } catch {
      txn = await Transaction.findOne({
        $or: [
          { appointmentId: id },
          { gatewayOrderId: id },
          { razorpayOrderId: id }
        ]
      }).lean();
    }

    if (!txn) {
      return res.json({
        success: true,
        data: {
          status: 'NOT_INITIATED',
          isPaid: false,
          appointmentId: id,
        },
        requestId
      });
    }

    // Ownership Verification
    if (!isAdmin && userId && txn.patientId && String(txn.patientId) !== String(userId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' }, requestId });
    }

    const isPaid = txn.status === 'captured' || txn.status === 'PAID';
    const invoice = isPaid ? await Invoice.findOne({ transactionId: txn._id }).lean() : null;

    res.json({
      success: true,
      data: {
        appointmentId: txn.appointmentId,
        transactionId: txn._id,
        status: isPaid ? 'PAID' : (txn.status?.toUpperCase() || 'PENDING'),
        isPaid,
        gatewayOrderId: txn.gatewayOrderId || txn.razorpayOrderId,
        gatewayPaymentId: txn.gatewayPaymentId || txn.razorpayPaymentId,
        amount: txn.amountPaise,
        currency: txn.currency,
        invoice,
        verifiedAt: txn.verifiedAt,
      },
      requestId
    });
  } catch (err) {
    console.error('[Payment] getPaymentStatus error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /internal/transactions/:idOrApptId (SECURED INTERNAL KEY) ────────────
export const getTransactionInternal = async (req, res) => {
  const internalKey = req.headers['x-internal-key'];
  const configuredKey = process.env.INTERNAL_API_KEY;

  if (!configuredKey || internalKey !== configuredKey) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized internal service access.' } });
  }

  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { appointmentId: id },
        { gatewayOrderId: id },
        { razorpayOrderId: id }
      ].filter(Boolean)
    }).lean();

    if (!transaction) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found.' } });
    }

    return res.json({ success: true, data: { transaction } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /refunds (ADMIN RBAC PROTECTED) ───────────────────────────────────────
export const listRefunds = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const refunds = await Refund.find().sort({ createdAt: -1 }).populate('transactionId').lean();
    res.json({ success: true, data: refunds });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── POST /refunds (ADMIN RBAC PROTECTED) ──────────────────────────────────────
export const initiateRefund = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { transactionId, amountPaise, reason } = req.body;
    if (!transactionId || !amountPaise || isNaN(amountPaise) || amountPaise <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid transactionId and amountPaise are required.' } });
    }

    const refund = await Refund.create({
      transactionId,
      amountPaise,
      reason: reason || 'Admin initiated refund',
      status: 'initiated',
      isManualReview: true,
    });
    res.status(201).json({ success: true, data: refund });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── PATCH /refunds/:id/approve (ADMIN RBAC & GATEWAY EXECUTED) ───────────────
export const approveRefund = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const apptId = id.startsWith('ref_appt_') ? id.replace('ref_appt_', '') : id;
    const CLINICAL_URL = process.env.CLINICAL_SERVICE_URL || process.env.CLINICAL_SERVICE_INTERNAL_URL || 'http://localhost:5003';
    const internalKey = process.env.INTERNAL_API_KEY;

    // 1. Locate existing transaction
    const transaction = await Transaction.findOne({
      $or: [{ appointmentId: apptId }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }].filter(Boolean)
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Transaction for refund not found.' } });
    }

    if (transaction.status === 'refunded' || transaction.status === 'REFUNDED') {
      return res.json({ success: true, message: 'Refund already processed (idempotent)', transaction });
    }

    // 2. Authoritatively Execute Gateway Refund through Razorpay API
    const paymentId = transaction.gatewayPaymentId || transaction.razorpayPaymentId;
    const refundAmtPaise = transaction.amountPaise;

    let gatewayRefundRes = null;
    try {
      gatewayRefundRes = await createRazorpayRefund(paymentId, refundAmtPaise, { appointmentId: apptId });
    } catch (gwErr) {
      console.error('[approveRefund] Gateway refund call error:', gwErr.message);
      // In production, reject if gateway rejects refund
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({
          success: false,
          error: { code: 'GATEWAY_REFUND_FAILED', message: `Gateway refund failed: ${gwErr.message}` }
        });
      }
      gatewayRefundRes = { id: `rfnd_sim_${Date.now()}`, status: 'processed' };
    }

    // 3. Update clinical appointment paymentStatus in clinical service
    try {
      const headers = { 'Content-Type': 'application/json', 'x-user-role': 'clinic_admin', 'x-user-id': 'system' };
      if (internalKey) headers['x-internal-key'] = internalKey;

      await fetch(`${CLINICAL_URL}/appointments/${apptId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ paymentStatus: 'REFUNDED', cancellationPolicy: 'REFUND_ELIGIBLE' }),
      });
    } catch (err) {
      console.warn('[approveRefund] Warning updating clinical appointment:', err.message);
    }

    // 4. Update matching transaction(s) with gateway refund reference
    transaction.status = 'refunded';
    transaction.refundedAt = new Date();
    transaction.gatewayRefundId = gatewayRefundRes?.id;
    transaction.statusHistory.push({
      status: 'refunded',
      note: `Gateway refund processed (${gatewayRefundRes?.id || 'simulated'})`,
      timestamp: new Date()
    });
    await transaction.save();

    // 5. Update refund document if exists
    let refund = null;
    if (id.match(/^[0-9a-fA-F]{24}$/) && !id.startsWith('ref_appt_')) {
      refund = await Refund.findByIdAndUpdate(id, {
        $set: { status: 'processed', gatewayRefundId: gatewayRefundRes?.id, processedAt: new Date() }
      }, { new: true });
    }

    return res.json({
      success: true,
      data: {
        refund,
        transaction,
        gatewayRefundId: gatewayRefundRes?.id
      },
      message: 'Refund approved, executed on gateway, and transaction settled.'
    });
  } catch (err) {
    console.error('[approveRefund] Error:', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── GET /payouts (ADMIN RBAC PROTECTED) ──────────────────────────────────────
export const listPayouts = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const payouts = await Payout.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: payouts });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ─── POST /payouts/compute (ADMIN RBAC PROTECTED) ─────────────────────────────
export const computePayout = async (req, res) => {
  try {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } });
    }

    const { therapistId, periodStart, periodEnd, grossAmountPaise, commissionPaise } = req.body;
    if (!therapistId || !grossAmountPaise) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'therapistId and grossAmountPaise are required.' } });
    }

    const gross = Number(grossAmountPaise);
    const comm = Number(commissionPaise || 0);
    const net = gross - comm;

    const payout = await Payout.create({
      therapistId,
      periodStart: periodStart || new Date(),
      periodEnd: periodEnd || new Date(),
      grossAmountPaise: gross,
      commissionPaise: comm,
      netAmountPaise: net,
      status: 'pending',
    });

    res.json({ success: true, data: payout });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
