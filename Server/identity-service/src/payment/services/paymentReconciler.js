import Transaction from '../../models/Transaction.js';
import { Invoice } from '../../models/Billing.js';
import { getNextSequence } from '../../models/Counter.js';
import { getAppointmentInternal, confirmAppointmentInternal, cancelAppointmentInternal } from './appointmentConfirm.js';
import { publishEvent } from '../../utils/rabbitmq.js';

/**
 * Background Payment Reconciler Worker
 * Runs every 2 minutes to inspect stuck PENDING transactions and sync against Razorpay gateway truth.
 */
export const reconcilePendingPayments = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  try {
    // 1. Locate PENDING/CREATED transactions aged between 5m and 15m
    const pendingTxns = await Transaction.find({
      status: { $in: ['created', 'pending'] },
      createdAt: { $lte: fiveMinutesAgo },
      isDeleted: false,
    }).limit(20).lean();

    if (pendingTxns.length === 0) return { reconciledCount: 0 };

    let reconciledCount = 0;

    for (const txn of pendingTxns) {
      const appointmentId = txn.appointmentId;
      const orderId = txn.gatewayOrderId || txn.razorpayOrderId;

      if (!appointmentId || !orderId) continue;

      const appointment = await getAppointmentInternal(appointmentId);

      // If appointment was already confirmed elsewhere, sync transaction
      if (appointment?.status === 'CONFIRMED' && appointment?.paymentStatus === 'PAID') {
        await Transaction.updateOne(
          { _id: txn._id, status: { $ne: 'captured' } },
          {
            $set: {
              status: 'captured',
              verificationSource: 'RECONCILER',
              verifiedAt: new Date(),
              capturedAt: new Date(),
            },
            $inc: { version: 1 },
            $push: {
              statusHistory: { status: 'captured', note: 'Reconciler synced with confirmed appointment', timestamp: new Date() }
            }
          }
        );
        reconciledCount++;
        continue;
      }

      // If transaction is older than 15m and still not paid, expire hold cleanly
      if (new Date(txn.createdAt) <= fifteenMinutesAgo) {
        console.log(`[Payment Reconciler] Expiring stagnant transaction ${txn._id} for appointment ${appointmentId}`);

        await Transaction.updateOne(
          { _id: txn._id, status: { $ne: 'captured' } },
          {
            $set: {
              status: 'expired',
              failureCode: 'PAYMENT_TIMEOUT',
              failureReason: 'Transaction expired after 15m inactivity',
            },
            $inc: { version: 1 },
            $push: {
              statusHistory: { status: 'expired', note: 'Expired by Payment Reconciler', timestamp: new Date() }
            }
          }
        );

        await cancelAppointmentInternal(appointmentId, 'Payment expired after 15m inactivity.');

        await publishEvent('appointment.payment_expired', {
          appointmentId,
          patientId: txn.patientId,
          therapistId: txn.therapistId,
          reason: 'Hold expired without completed payment.',
        });

        reconciledCount++;
      }
    }

    // 2. Locate captured transactions where appointment might still be HELD (crash recovery)
    const capturedTxns = await Transaction.find({
      status: { $in: ['captured', 'PAID'] },
      createdAt: { $gte: fifteenMinutesAgo },
      isDeleted: false,
    }).limit(20).lean();

    for (const txn of capturedTxns) {
      const appointmentId = txn.appointmentId;
      if (!appointmentId) continue;
      const appointment = await getAppointmentInternal(appointmentId);
      if (appointment && (appointment.status === 'HELD' || appointment.status === 'RESCHEDULE_REQUESTED')) {
        console.log(`[Payment Reconciler] Healing unconfirmed appointment ${appointmentId} for captured transaction ${txn._id}`);
        await confirmAppointmentInternal(appointmentId, txn.gatewayOrderId || txn.razorpayOrderId, txn.gatewayPaymentId || txn.razorpayPaymentId, txn._id);
        reconciledCount++;
      }
    }

    return { reconciledCount };
  } catch (err) {
    console.error('[Payment Reconciler Error]:', err.message);
    return { error: err.message };
  }
};

/**
 * Start the periodic reconciliation scheduler (every 2 minutes)
 */
export const startPaymentReconciliationScheduler = () => {
  console.log('⚡ [Payment Reconciler] Scheduled background reconciler (every 2m)');
  // Initial run after 10s
  setTimeout(reconcilePendingPayments, 10000);
  setInterval(reconcilePendingPayments, 2 * 60 * 1000);
};
