/**
 * Gateway Socket.IO Real-time Notification Provider
 * Dispatches live real-time notifications to user room (user:${userId}).
 */
export const sendRealtimeNotification = async ({
  userId,
  notification,
  unreadCount,
}) => {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:5000';
  const secret = process.env.INTERNAL_SERVICE_SECRET || 'internal_secret_key_123';

  try {
    const payload = {
      userId: String(userId),
      event: 'notification:new',
      payload: {
        notification,
        unreadCount,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await fetch(`${gatewayUrl}/api/v1/internal/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Gateway may not be running or room is empty
      return { status: 'skipped', provider: 'socket.io' };
    }

    return { status: 'delivered', provider: 'socket.io' };
  } catch (err) {
    // Non-fatal if gateway is offline during dev
    return { status: 'skipped', provider: 'socket.io', error: err.message };
  }
};
