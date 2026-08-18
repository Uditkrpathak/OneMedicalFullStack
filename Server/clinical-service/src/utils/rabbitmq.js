import amqplib from 'amqplib';

let channel = null;

export const connectRabbitMQ = async () => {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await conn.createChannel();
    await channel.assertExchange('onemedical.events', 'topic', { durable: true });
    console.log('[Clinical] RabbitMQ connected');
    return channel;
  } catch (err) {
    console.warn('[Clinical] RabbitMQ unavailable — events will be skipped:', err.message);
    return null;
  }
};

export const publishEvent = async (routingKey, payload) => {
  if (channel) {
    try {
      channel.publish(
        'onemedical.events',
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );
      return;
    } catch (err) {
      console.error('[Clinical] Event publish error via RabbitMQ, falling back to in-memory:', err.message);
    }
  }

  // Graceful in-process direct notification processing when RabbitMQ is offline/unprovisioned
  try {
    const { processNotificationEvent } = await import('../notifications/notificationManager.js');
    const { normalizeEnvelope } = await import('../notifications/notificationWorker.js');
    const envelope = normalizeEnvelope(routingKey, payload);
    await processNotificationEvent(envelope);
  } catch (directErr) {
    console.error('[Clinical] Direct in-memory event dispatch error:', directErr.message);
  }
};
