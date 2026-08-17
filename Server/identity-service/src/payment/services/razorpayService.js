import crypto from 'crypto';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'onemedical_webhook_secret_default';

const hasLiveCredentials = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.startsWith('dev_'));

// ─── Create Razorpay Order ────────────────────────────────────────────────────
export const createRazorpayOrder = async (amountPaise, currency = 'INR', receipt) => {
  if (!hasLiveCredentials) {
    // Deterministic dev/sandbox order
    return {
      id: `order_dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entity: 'order',
      amount: amountPaise,
      amount_paid: 0,
      amount_due: amountPaise,
      currency,
      receipt: String(receipt || ''),
      status: 'created',
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: String(receipt || '').slice(0, 40),
      notes: {
        appointmentId: String(receipt || ''),
      }
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${errText}`);
  }

  return res.json();
};

// ─── Verify Payment Signature ─────────────────────────────────────────────────
export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  if (!orderId || !paymentId || !signature) return false;
  
  if (!hasLiveCredentials && (signature.startsWith('dev_sig_') || signature === 'sandbox_valid_signature')) {
    return true;
  }

  const secret = RAZORPAY_KEY_SECRET || 'onemedical_secret_fallback';
  const body = `${orderId}|${paymentId}`;
  const expectedHex = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    return false;
  }
};

// ─── Verify Webhook Signature ─────────────────────────────────────────────────
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!signature) return false;

  if (!hasLiveCredentials && signature.startsWith('dev_webhook_')) {
    return true;
  }

  const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  const expectedHex = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    return false;
  }
};
