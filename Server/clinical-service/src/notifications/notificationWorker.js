import amqplib from 'amqplib';
import { processNotificationEvent } from './notificationManager.js';
import { EVENT_TYPES } from './notificationEvents.js';

const EXCHANGE = 'onemedical.events';
const QUEUE = 'clinical-service.notification.queue';

/**
 * Normalizes legacy event payloads into the standard event envelope if required
 */
const normalizeEnvelope = (routingKey, payload) => {
  if (payload.eventId && payload.recipients && Array.isArray(payload.recipients)) {
    return payload;
  }

  const recipients = [];
  if (payload.patientId) {
    recipients.push({ id: String(payload.patientId), role: 'patient' });
  }
  if (payload.therapistId) {
    recipients.push({ id: String(payload.therapistId), role: 'therapist' });
  }
  if (payload.userId) {
    recipients.push({ id: String(payload.userId), role: payload.userRole || 'patient' });
  }

  return {
    eventId: payload.eventId || `evt_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    event: routingKey || payload.event,
    version: 1,
    timestamp: new Date().toISOString(),
    recipients,
    data: {
      ...payload,
      appointmentId: payload.appointmentId || payload.id,
      patientId: payload.patientId,
      therapistId: payload.therapistId,
      transactionId: payload.transactionId,
      amountPaise: payload.amountPaise,
      painScore: payload.painLevel || payload.painScore,
    },
  };
};

export const startNotificationWorker = async () => {
  try {
    const connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });

    // Bind to all event types and wildcards
    await channel.bindQueue(QUEUE, EXCHANGE, '#');
    channel.prefetch(5);

    console.log(`[Notification Worker] Successfully subscribed to exchange "${EXCHANGE}" for all topics.`);

    channel.consume(QUEUE, async (msg) => {
      if (!msg) return;
      const routingKey = msg.fields.routingKey;
      try {
        const rawContent = msg.content.toString();
        const payload = JSON.parse(rawContent);
        const envelope = normalizeEnvelope(routingKey, payload);

        await processNotificationEvent(envelope);
        channel.ack(msg);
      } catch (err) {
        console.error(`[Notification Worker Error] Error handling ${routingKey}:`, err.message);
        // Acknowledge to prevent infinite poison pill loops
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.warn(`[Notification Worker] RabbitMQ offline (${err.message}) — notification worker will process via direct in-memory calls.`);
  }
};
