import { verifyWebhookSignature } from '../services/razorpayService.js';
import { confirmAppointmentInternal, getAppointmentInternal } from '../services/appointmentConfirm.js';
import WebhookEvent from '../../models/WebhookEvent.js';
import Transaction from '../../models/Transaction.js';
import { Invoice } from '../../models/Billing.js';
import { getNextSequence } from '../../models/Counter.js';
import User from '../../models/User.js';
import TherapistProfile from '../../models/TherapistProfile.js';
import { publishEvent } from '../../utils/rabbitmq.js';

// ─── POST /payments/webhook/razorpay ─────────────────────────────────────────
// Authoritative payment confirmation from Razorpay webhook
export const razorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || req.headers['x-signature'];
  const rawBody   = req.rawBody || req.body;

  // Step 1: Verify webhook cryptographic signature
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd || signature) {
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid && isProd) {
      console.warn('[Razorpay Webhook] Invalid signature rejected.');
      return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } });
    }
  }

  let event;
  try {
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PAYLOAD', message: 'Failed to parse webhook JSON payload.' } });
  }

  if (!event || !event.event) {
    return res.status(200).json({ received: true, note: 'Empty event' });
  }

  const eventName     = event.event;
  const eventId       = event.id || `evt_${event.created_at}_${Math.random().toString(36).substring(2, 8)}`;
  const paymentEntity = event.payload?.payment?.entity || event.payload?.order?.entity;

  // Step 2: Webhook Event Deduplication
  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    console.log(`[Razorpay Webhook] Duplicate event ${eventId} (${eventName}) ignored.`);
    return res.status(200).json({ received: true, deduplicated: true });
  }

  const appointmentId  = paymentEntity?.receipt || paymentEntity?.notes?.appointmentId;
  const gatewayOrderId = paymentEntity?.order_id || paymentEntity?.id;
  const paymentId      = paymentEntity?.id;
  const amountPaise    = paymentEntity?.amount || 0;
  const paymentMethod  = paymentEntity?.method || 'upi';

  // Save event record
  await WebhookEvent.create({
    eventId,
    eventName,
    entityId: paymentId || gatewayOrderId,
    appointmentId,
    payload: event,
    status: 'processed'
  });

  if (!appointmentId) {
    console.log(`[Razorpay Webhook] Event ${eventName} received without appointmentId — acknowledged.`);
    return res.status(200).json({ received: true });
  }

  try {
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      // 1. Check idempotency on appointment state
      const appointment = await getAppointmentInternal(appointmentId);
      if (appointment?.status === 'CONFIRMED' && appointment?.paymentStatus === 'PAID') {
        console.log(`[Razorpay Webhook] Appointment ${appointmentId} already CONFIRMED (Idempotent).`);
        return res.status(200).json({ received: true, idempotent: true });
      }

      // 2. Locate or atomically create Transaction
      let transaction = await Transaction.findOne({
        $or: [
          { appointmentId },
          { razorpayOrderId: gatewayOrderId },
          { gatewayOrderId }
        ]
      });

      if (transaction) {
        transaction.status = 'captured';
        transaction.razorpayPaymentId = paymentId;
        transaction.gatewayPaymentId = paymentId;
        transaction.paymentMethod = paymentMethod;
        transaction.capturedAt = new Date();
        transaction.statusHistory.push({
          status: 'captured',
          note: `Webhook verified (${eventName})`,
          timestamp: new Date()
        });
        await transaction.save();
      } else {
        transaction = await Transaction.create({
          patientId: appointment?.patientId || 'unknown',
          appointmentId,
          therapistId: appointment?.therapistId,
          amountPaise: amountPaise || appointment?.amount || 50000,
          currency: paymentEntity?.currency || 'INR',
          gateway: 'razorpay',
          razorpayOrderId: gatewayOrderId,
          gatewayOrderId,
          razorpayPaymentId: paymentId,
          gatewayPaymentId: paymentId,
          paymentMethod,
          status: 'captured',
          capturedAt: new Date(),
          statusHistory: [{ status: 'captured', note: `Created and captured via webhook (${eventName})` }]
        });
      }

      // 3. Confirm Appointment in Clinical Service
      await confirmAppointmentInternal(appointmentId, gatewayOrderId, paymentId);
      console.log(`[Razorpay Webhook] Appointment ${appointmentId} authoritatively CONFIRMED.`);

      // 4. Generate GST Invoice atomically
      let invoice = await Invoice.findOne({ transactionId: transaction._id });
      if (!invoice) {
        const seq = await getNextSequence('invoice_seq');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
        const totalAmountPaise = amountPaise || appointment?.amount || 75000;
        const consultationFeePaise = Math.round(totalAmountPaise / 1.18);
        const taxesPaise = totalAmountPaise - consultationFeePaise;

        invoice = await Invoice.create({
          invoiceNumber,
          transactionId: transaction._id,
          appointmentId,
          patientId: appointment?.patientId,
          therapistId: appointment?.therapistId,
          consultationFee: consultationFeePaise,
          taxes: taxesPaise,
          discount: 0,
          totalAmount: totalAmountPaise,
          currency: 'INR',
          status: 'PAID',
          generatedAt: new Date()
        });
        console.log(`[Razorpay Webhook] Generated Invoice ${invoiceNumber} for Appointment ${appointmentId}.`);
      }

      // 5. Publish real-time event for Admin dashboard
      await publishEvent('payment.captured', {
        appointmentId,
        patientId: appointment?.patientId,
        therapistId: appointment?.therapistId,
        amount: (amountPaise || 75000) / 100,
        invoiceNumber: invoice?.invoiceNumber,
      });

    } else if (eventName === 'payment.failed') {
      console.log(`[Razorpay Webhook] Payment failed for appointment ${appointmentId}. Hold will expire automatically.`);
      const transaction = await Transaction.findOne({ appointmentId });
      if (transaction && transaction.status !== 'captured') {
        transaction.status = 'failed';
        transaction.statusHistory.push({
          status: 'failed',
          note: `Payment failed from Razorpay: ${paymentEntity?.error_description || 'Declined'}`,
          timestamp: new Date()
        });
        await transaction.save();
      }
    }

    res.status(200).json({ success: true, received: true });
  } catch (err) {
    console.error('[Razorpay Webhook] Processing error:', err);
    // Return 200 to Razorpay so it doesn't trigger continuous retry storms for internal issues
    res.status(200).json({ success: false, received: true, error: err.message });
  }
};
