import { verifyWebhookSignature } from '../services/razorpayService.js';
import { confirmAppointmentInternal, getAppointmentInternal, cancelAppointmentInternal } from '../services/appointmentConfirm.js';
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
    if (!isValid) {
      console.error('[Razorpay Webhook] Invalid signature rejected');
      return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } });
    }
  }

  // Step 2: Idempotency deduplication via event ID
  const eventId = req.body?.event_id || req.body?.id || `evt_${Date.now()}`;
  try {
    const existing = await WebhookEvent.findOne({ eventId });
    if (existing) {
      console.log(`[Razorpay Webhook] Duplicate event ${eventId} ignored (idempotent 200).`);
      return res.status(200).json({ success: true, deduplicated: true });
    }
    await WebhookEvent.create({ eventId, eventType: req.body?.event, payload: req.body });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ success: true, deduplicated: true });
    }
  }

  // Step 3: Handle event types
  try {
    const eventName = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const orderEntity = req.body?.payload?.order?.entity;

    const appointmentId = paymentEntity?.notes?.appointmentId || orderEntity?.notes?.appointmentId;
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const amountPaise = paymentEntity?.amount || orderEntity?.amount;

    if (!appointmentId) {
      console.log(`[Razorpay Webhook] Event ${eventName} received without appointmentId note.`);
      return res.status(200).json({ success: true, note: 'No appointmentId' });
    }

    const appointment = await getAppointmentInternal(appointmentId);

    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      console.log(`[Razorpay Webhook] Payment confirmed for appointment ${appointmentId}`);

      // 1. Update or create transaction record
      let transaction = await Transaction.findOne({ appointmentId });
      if (!transaction) {
        transaction = await Transaction.create({
          patientId: appointment?.patientId,
          appointmentId,
          therapistId: appointment?.therapistId,
          amountPaise: amountPaise || 75000,
          currency: 'INR',
          gateway: 'razorpay',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          gatewayOrderId: orderId,
          gatewayPaymentId: paymentId,
          paymentMethod: 'UPI',
          verificationSource: 'WEBHOOK',
          verifiedAt: new Date(),
          status: 'captured',
          capturedAt: new Date(),
          statusHistory: [{ status: 'captured', note: 'Webhook confirmed payment capture.' }],
        });
      } else if (transaction.status !== 'captured') {
        transaction.status = 'captured';
        transaction.razorpayPaymentId = paymentId;
        transaction.gatewayPaymentId = paymentId;
        transaction.verificationSource = 'WEBHOOK';
        transaction.verifiedAt = new Date();
        transaction.capturedAt = new Date();
        transaction.statusHistory.push({ status: 'captured', note: 'Webhook confirmed payment capture.', timestamp: new Date() });
        await transaction.save();
      }

      // 2. Authoritatively confirm the appointment in clinical-service (with transaction reference)
      try {
        await confirmAppointmentInternal(appointmentId, orderId, paymentId, transaction._id);
      } catch (err) {
        console.error('[Razorpay Webhook] Error confirming appointment:', err.message);
      }

      // 3. Atomically and idempotently create GST Tax Invoice
      let invoice = await Invoice.findOne({ $or: [{ transactionId: transaction._id }, { appointmentId }] });
      if (!invoice) {
        try {
          const seq = await getNextSequence('invoice_seq');
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
          const totalAmountPaise = amountPaise || 75000;
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
        } catch (invErr) {
          invoice = await Invoice.findOne({ $or: [{ transactionId: transaction._id }, { appointmentId }] });
        }
      }

      if (invoice && (!transaction.invoiceId || !transaction.invoiceNumber)) {
        transaction.invoiceId = invoice._id;
        transaction.invoiceNumber = invoice.invoiceNumber;
        await transaction.save();
      }

      // 4. Publish real-time event for Admin dashboard & notifications
      await publishEvent('payment.captured', {
        appointmentId,
        patientId: appointment?.patientId,
        therapistId: appointment?.therapistId,
        amount: (amountPaise || 75000) / 100,
        invoiceNumber: invoice?.invoiceNumber,
      });

    } else if (eventName === 'payment.failed') {
      console.log(`[Razorpay Webhook] Payment failed for appointment ${appointmentId}. Releasing held slot and notifying parties.`);
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

      // Release held slot in clinical service
      await cancelAppointmentInternal(appointmentId, `Payment failed: ${paymentEntity?.error_description || 'Declined by gateway'}`);

      // Dispatch payment.failed notification event to both patient and therapist
      await publishEvent('payment.failed', {
        appointmentId,
        patientId: appointment?.patientId,
        therapistId: appointment?.therapistId,
        patientName: appointment?.patientName,
        therapistName: appointment?.therapistName,
        reason: paymentEntity?.error_description || 'Payment declined by gateway/bank.',
      });
    }

    res.status(200).json({ success: true, received: true });
  } catch (err) {
    console.error('[Razorpay Webhook] Processing error:', err);
    // Return 200 to Razorpay so it doesn't trigger continuous retry storms for internal issues
    res.status(200).json({ success: false, received: true, error: err.message });
  }
};
