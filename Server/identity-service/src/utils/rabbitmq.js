import amqplib from 'amqplib';

let channel = null;

export const connectRabbitMQ = async () => {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await conn.createChannel();
    await channel.assertExchange('onemedical.events', 'topic', { durable: true });
    console.log('[Identity Service] RabbitMQ connected');
  } catch (err) {
    console.warn('[Identity Service] RabbitMQ unavailable — events will be skipped:', err.message);
  }
};

export const publishEvent = async (routingKey, payload) => {
  if (!channel) return;
  try {
    channel.publish('onemedical.events', routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
    console.log(`[Identity Service] Event published: ${routingKey}`);
  } catch (err) {
    console.error('[Identity Service] Event publish error:', err.message);
  }
};
