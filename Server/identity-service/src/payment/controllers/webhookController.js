import { verifyWebhookSignature } from '../services/razorpayService.js';
import { confirmAppointmentInternal, getAppointmentInternal, cancelAppointmentInternal } from '../services/appointmentConfirm.js';
import WebhookEvent from '../../models/WebhookEvent.js';
import Transaction from '../../models/Transaction.js';
import { Invoice } from '../../models/Billing.js';
import { getNextSequence } from '../../models/Counter.js';
import { publishEvent } from '../../utils/rabbitmq.js';

// ─── POST /payments/webhook/razorpay ─────────────────────────────────────────
// Authoritative payment reconciliation from Razorpay Webhook
export const razorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || req.headers['x-signature'];
  const rawBody   = req.rawBody || req.body;
  const isProd    = process.env.NODE_ENV === 'production';

  // 1. Explicit Webhook Signature Verification
  if (isProd && !signature) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEBHOOK_SIGNATURE_MISSING', message: 'Webhook signature is required in production.' }
    });
  }

  if (signature || isProd) {
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('[Razorpay Webhook] Invalid signature rejected');
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' }
      });
    }
  }

  // 2. Validate Genuine Event ID (No Fabricated IDs)
  const eventId = req.body?.id || req.body?.event_id;
  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEBHOOK_EVENT_ID_MISSING', message: 'Webhook event ID is required.' }
    });
  }

  const eventName = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;
  const orderEntity = req.body?.payload?.order?.entity;

  const appointmentId = paymentEntity?.notes?.appointmentId || orderEntity?.notes?.appointmentId;
  const paymentId = paymentEntity?.id;
  const orderId = paymentEntity?.order_id || orderEntity?.id;

  // 3. Webhook Lifecycle Management (RECEIVED -> PROCESSED / FAILED)
  let webhookRecord;
  try {
    webhookRecord = await WebhookEvent.findOneAndUpdate(
      { eventId },
      {
        $setOnInsert: {
          eventId,
          eventName: eventName || 'unknown',
          eventType: eventName,
          appointmentId: appointmentId || null,
          entityId: paymentId || orderId || null,
          payload: req.body,
          status: 'RECEIVED',
          attempts: 1,
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      webhookRecord = await WebhookEvent.findOne({ eventId });
    }
  }

  if (webhookRecord && (webhookRecord.status === 'PROCESSED' || webhookRecord.status === 'processed')) {
    console.log(`[Razorpay Webhook] Duplicate event ${eventId} already PROCESSED. Returning idempotent 200.`);
    return res.status(200).json({ success: true, deduplicated: true });
  }

  // 4. Process Event Payload
  try {
    if (!appointmentId) {
      console.log(`[Razorpay Webhook] Event ${eventName} received without appointmentId note.`);
      if (webhookRecord) {
        await WebhookEvent.updateOne({ _id: webhookRecord._id }, { $set: { status: 'IGNORED' } });
      }
      return res.status(200).json({ success: true, note: 'No appointmentId' });
    }

    // 5. Authoritative Appointment Lookup
    const appointment = await getAppointmentInternal(appointmentId);
    if (!appointment) {
      console.error(`[Razorpay Webhook] Appointment ${appointmentId} not found in clinical database.`);
      if (webhookRecord) {
        await WebhookEvent.updateOne({ _id: webhookRecord._id }, { $set: { status: 'FAILED', lastError: 'APPOINTMENT_NOT_FOUND' } });
      }
      return res.status(200).json({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found.' } });
    }

    // ─── EVENT: payment.captured / order.paid ────────────────────────────────
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      if (!paymentId || !orderId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MALFORMED_EVENT', message: 'paymentId and orderId required for captured payment.' }
        });
      }

      // Currency Validation
      const gatewayCurrency = (paymentEntity?.currency || orderEntity?.currency || 'INR').toUpperCase();
      if (gatewayCurrency !== 'INR') {
        if (webhookRecord) {
          await WebhookEvent.updateOne({ _id: webhookRecord._id }, { $set: { status: 'FAILED', lastError: 'CURRENCY_MISMATCH' } });
        }
        return res.status(400).json({ success: false, error: { code: 'INVALID_CURRENCY', message: 'Only INR transactions are supported.' } });
      }

      // Authoritative Pricing vs Gateway Amount Validation (No Arbitrary Defaults)
      const rawAuthoritativeAmt = appointment.amountPaise || appointment.amount;
      if (!rawAuthoritativeAmt || isNaN(rawAuthoritativeAmt) || rawAuthoritativeAmt <= 0) {
        console.error(`[Razorpay Webhook] Invalid authoritative amount for appointment ${appointmentId}`);
        if (webhookRecord) {
          await WebhookEvent.updateOne({ _id: webhookRecord._id }, { $set: { status: 'FAILED', lastError: 'INVALID_AUTHORITATIVE_AMOUNT' } });
        }
        return res.status(200).json({ success: false, error: { code: 'INVALID_AUTHORITATIVE_AMOUNT' } });
      }

      const expectedAmountPaise = rawAuthoritativeAmt < 5000 ? rawAuthoritativeAmt * 100 : rawAuthoritativeAmt;
      const gatewayAmountPaise = paymentEntity?.amount || orderEntity?.amount;

      if (gatewayAmountPaise && gatewayAmountPaise !== expectedAmountPaise) {
        console.error(`[Razorpay Webhook] Amount mismatch for ${appointmentId}: expected ${expectedAmountPaise}, got ${gatewayAmountPaise}`);
        if (webhookRecord) {
          await WebhookEvent.updateOne({ _id: webhookRecord._id }, { $set: { status: 'FAILED', lastError: 'PAYMENT_AMOUNT_MISMATCH' } });
        }
        return res.status(200).json({ success: false, error: { code: 'PAYMENT_AMOUNT_MISMATCH' } });
      }

      // 6. Order / Transaction Binding & Atomic State Transition
      let transaction = await Transaction.findOne({ appointmentId });
      if (transaction?.gatewayOrderId && orderId !== transaction.gatewayOrderId && !orderId.startsWith('order_clinic_')) {
        console.error(`[Razorpay Webhook] Order mismatch: expected ${transaction.gatewayOrderId}, got ${orderId}`);
        if (webhookRecord) {
          await WebhookEvent.updateOne({ _id: webhookRecord._id }, { $set: { status: 'FAILED', lastError: 'ORDER_MISMATCH' } });
        }
        return res.status(200).json({ success: false, error: { code: 'ORDER_MISMATCH' } });
      }

      if (!transaction) {
        transaction = await Transaction.create({
          patientId: appointment.patientId,
          appointmentId,
          therapistId: appointment.therapistId,
          amountPaise: expectedAmountPaise,
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
      } else {
        // Atomic transition from uncaptured state
        await Transaction.findOneAndUpdate(
          {
            _id: transaction._id,
            status: { $nin: ['captured', 'PAID'] }
          },
          {
            $set: {
              status: 'captured',
              razorpayPaymentId: paymentId,
              gatewayPaymentId: paymentId,
              verificationSource: 'WEBHOOK',
              verifiedAt: new Date(),
              capturedAt: new Date()
            },
            $push: {
              statusHistory: { status: 'captured', note: 'Webhook confirmed payment capture.', timestamp: new Date() }
            },
            $inc: { version: 1 }
          }
        );
      }

      // 7. Authoritatively confirm the appointment in clinical-service
      try {
        await confirmAppointmentInternal(appointmentId, orderId, paymentId, transaction._id);
      } catch (err) {
        console.error('[Razorpay Webhook] Error confirming appointment:', err.message);
      }

      // 8. Idempotently generate GST Tax Invoice
      let invoice = await Invoice.findOne({ $or: [{ transactionId: transaction._id }, { appointmentId }] });
      if (!invoice) {
        try {
          const seq = await getNextSequence('invoice_seq');
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
          const totalAmountPaise = expectedAmountPaise;
          const consultationFeePaise = Math.round(totalAmountPaise / 1.18);
          const taxesPaise = totalAmountPaise - consultationFeePaise;

          invoice = await Invoice.create({
            invoiceNumber,
            transactionId: transaction._id,
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
        } catch (invErr) {
          invoice = await Invoice.findOne({ $or: [{ transactionId: transaction._id }, { appointmentId }] });
        }
      }

      if (invoice && (!transaction.invoiceId || !transaction.invoiceNumber)) {
        await Transaction.findByIdAndUpdate(transaction._id, {
          $set: { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber }
        });
      }

      // 9. Safe Asynchronous Event Publishing
      await publishEvent('payment.captured', {
        appointmentId,
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        amount: Math.round(expectedAmountPaise / 100),
        invoiceNumber: invoice?.invoiceNumber,
      }).catch(e => console.warn('[Webhook] Event publish warning:', e.message));

      // Mark Webhook Record as PROCESSED
      if (webhookRecord) {
        await WebhookEvent.updateOne(
          { _id: webhookRecord._id },
          { $set: { status: 'PROCESSED', processedAt: new Date() } }
        );
      }

      console.log(`[Razorpay Webhook] Successfully processed payment.captured for appointment ${appointmentId}`);

    // ─── EVENT: payment.failed ───────────────────────────────────────────────
    } else if (eventName === 'payment.failed') {
      console.log(`[Razorpay Webhook] Payment failed for appointment ${appointmentId}`);

      // Guarded Transaction Transition: ONLY transition from pending/created/attempted states
      const updatedTxn = await Transaction.findOneAndUpdate(
        {
          appointmentId,
          status: { $in: ['created', 'pending', 'attempted'] }
        },
        {
          $set: { status: 'failed' },
          $push: {
            statusHistory: {
              status: 'failed',
              note: `Payment failed from gateway: ${paymentEntity?.error_description || 'Declined'}`,
              timestamp: new Date()
            }
          },
          $inc: { version: 1 }
        },
        { new: true }
      );

      // State-Guarded Appointment Cancellation: ONLY cancel if appointment is still HELD
      if (appointment.status === 'HELD') {
        await cancelAppointmentInternal(appointmentId, `Payment failed: ${paymentEntity?.error_description || 'Declined by gateway'}`);
      }

      // Dispatch failure event
      await publishEvent('payment.failed', {
        appointmentId,
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        patientName: appointment.patientName,
        therapistName: appointment.therapistName,
        reason: paymentEntity?.error_description || 'Payment declined by gateway/bank.',
      }).catch(e => console.warn('[Webhook] Event publish warning:', e.message));

      if (webhookRecord) {
        await WebhookEvent.updateOne(
          { _id: webhookRecord._id },
          { $set: { status: 'PROCESSED', processedAt: new Date() } }
        );
      }
    }

    res.status(200).json({ success: true, received: true });
  } catch (err) {
    console.error('[Razorpay Webhook] Processing error:', err);
    if (webhookRecord) {
      await WebhookEvent.updateOne(
        { _id: webhookRecord._id },
        {
          $set: { status: 'FAILED', lastError: err.message, failedAt: new Date() },
          $inc: { attempts: 1 }
        }
      );
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
