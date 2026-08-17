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
  if (!channel) return;
  try {
    channel.publish(
      'onemedical.events',
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
  } catch (err) {
    console.error('[Clinical] Event publish error:', err.message);
  }
};
