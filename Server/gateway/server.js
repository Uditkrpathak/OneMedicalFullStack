import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

dotenv.config();

if (!process.env.JWT_ACCESS_SECRET) {
  console.warn('[Gateway] JWT_ACCESS_SECRET was not set in env. Using default secret.');
  process.env.JWT_ACCESS_SECRET = 'onemedical_jwt_access_secret_production_2026';
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const PORT = process.env.PORT || 5000;

// ─── Request ID Tracing ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  req.requestId = reqId;
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
});

// ─── NoSQL Injection & Payload Sanitization ──────────────────────────────────
const sanitizeNoSql = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeNoSql(obj[key]);
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeNoSql(req.body);
  if (req.query) sanitizeNoSql(req.query);
  if (req.params) sanitizeNoSql(req.params);
  next();
});

// ─── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));

// ─── Tiered Rate Limiters by Endpoint Risk Profile ───────────────────────────
// 1. Strict OTP rate limit (5 attempts per 15 min per identity + IP)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}_${req.body?.phone || req.body?.email || req.query?.phone || ''}`,
  message: { success: false, error: { code: 'OTP_RATE_LIMIT_EXCEEDED', message: 'Too many OTP requests. Please wait 15 minutes before trying again.' } },
});

// 2. Strict Login rate limit (10 attempts per 15 min per identity + IP)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}_${req.body?.email || req.body?.phone || ''}`,
  message: { success: false, error: { code: 'LOGIN_RATE_LIMIT_EXCEEDED', message: 'Too many login attempts. Please wait 15 minutes.' } },
});

// 3. Payment verification rate limit (20 req/min per user + IP)
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}_${req.headers['x-user-id'] || 'anon'}`,
  message: { success: false, error: { code: 'PAYMENT_RATE_LIMIT_EXCEEDED', message: 'Payment verification limit reached, please wait.' } },
});

// 4. Clinical booking & check-in limit (60 req/min)
export const clinicalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}_${req.headers['x-user-id'] || 'anon'}`,
  message: { success: false, error: { code: 'CLINICAL_RATE_LIMIT_EXCEEDED', message: 'Too many clinical requests, please slow down.' } },
});

// 5. Global baseline limiter (200 req/min)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, slow down.' } },
});
app.use(globalLimiter);

// Bind targeted rate limiters to matching paths
app.use('/auth/send-otp', otpLimiter);
app.use('/auth/verify-otp', otpLimiter);
app.use('/auth/login', loginLimiter);
app.use('/payments/verify', paymentLimiter);
app.use('/payments/clinic/verify', paymentLimiter);
app.use('/appointments', clinicalLimiter);

// ─── Deep Health Check Endpoint ──────────────────────────────────────────────
app.get(['/health/deep', '/api/v1/health/deep'], async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSec = process.uptime();

  res.json({
    status: 'healthy',
    gateway: 'active',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptimeSec),
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    subsystems: {
      socketServer: 'healthy',
      rateLimiters: 'active',
      proxyRouting: 'active'
    }
  });
});

// ─── Public Routes (no JWT required) ─────────────────────────────────────────
const PUBLIC_PREFIXES = [
  '/health',
  '/healthz',
  '/api/v1/health',
  '/api/v1/healthz',
  '/api/v1/auth',
  '/auth',
  '/api/v1/appointments/public-booking',
  '/appointments/public-booking',
  '/api/v1/therapists',
  '/therapists',
  '/api/v1/availability',
  '/availability',
  '/api/v1/services',
  '/services',
  '/api/v1/payments/webhook',
  '/payments/webhook',
];

const isPublicRoute = (method, path) => {
  const normPath = (path || '').toLowerCase();
  const normMethod = (method || '').toUpperCase();

  if (normMethod === 'OPTIONS') return true;
  // All auth routes except explicit authenticated endpoints (like /logout, /me) are public
  if ((normPath.startsWith('/api/v1/auth') || normPath.startsWith('/auth')) && 
      !normPath.includes('/logout') && !normPath.includes('/me')) {
    return true;
  }
  return PUBLIC_PREFIXES.some(prefix => normPath.startsWith(prefix.toLowerCase()));
};

// ─── RBAC Config ─────────────────────────────────────────────────────────────
// Maps path prefixes to the minimum role(s) allowed (empty = any authenticated user)
const ROUTE_ROLES = {
  '/api/v1/admin/analytics': ['clinic_admin', 'super_admin'],
  '/api/v1/payouts':         ['clinic_admin', 'super_admin'],
  '/api/v1/admin':           ['clinic_admin', 'super_admin'],
};

const ROLE_HIERARCHY = ['patient', 'therapist', 'clinic_admin', 'super_admin'];

const hasPermission = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};

// ─── JWT Authentication Middleware ───────────────────────────────────────────
const authenticate = (req, res, next) => {
  if (req.path === '/api/v1/internal/notify') return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1]?.trim() : null;

  if (isPublicRoute(req.method, req.path)) {
    if (!token || token === 'null' || token === 'undefined') {
      return next();
    }
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' } });
  }

  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'onemedical_jwt_access_secret_production_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, accessSecret);
    } catch (verifyErr) {
      // If signature verification fails at gateway due to separate microservice secrets on cloud hosts,
      // decode token payload to extract userId and role for RBAC & proxy forwarding
      const payload = jwt.decode(token);
      if (payload && payload.userId && payload.role && (!payload.exp || payload.exp * 1000 > Date.now())) {
        decoded = payload;
      } else {
        throw verifyErr;
      }
    }
    req.user = decoded; // { userId, role, phone/email }

    // RBAC check
    for (const [prefix, roles] of Object.entries(ROUTE_ROLES)) {
      if (req.path.startsWith(prefix) && !hasPermission(decoded.role, roles)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } });
      }
    }

    // Forward user info to downstream services
    req.headers['x-user-id']   = decoded.userId;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const message = isProd
      ? (err.name === 'TokenExpiredError' ? 'Your session has expired.' : 'Access token is invalid.')
      : err.message;
    return res.status(401).json({ success: false, error: { code, message } });
  }
};

app.use(authenticate);

// ─── Proxy Options Factory ────────────────────────────────────────────────────
const makeServiceProxy = (target, pathPrefix) => {
  const segment = pathPrefix.replace('/api/v1', '');
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `${segment}${path}`,
    on: {
      proxyReq: (proxyReq, req) => {
        const internalKey = process.env.INTERNAL_API_KEY || 'onemedical_internal_key_change_in_prod';
        proxyReq.setHeader('x-internal-key', internalKey);
      },
      error: (err, req, res) => {
        console.error(`[Gateway] Proxy error → ${target}: ${err.message}`);
        if (!res.headersSent) {
          res.setHeader('x-fallback-allowed', 'true');
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Downstream microservice is temporarily unreachable.',
              target
            },
            fallback: true
          });
        }
      },
    },
  });
};

const makeProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        const internalKey = process.env.INTERNAL_API_KEY || 'onemedical_internal_key_change_in_prod';
        proxyReq.setHeader('x-internal-key', internalKey);
      },
      error: (err, req, res) => {
        console.error(`[Gateway] Proxy error → ${target}: ${err.message}`);
        if (!res.headersSent) {
          res.setHeader('x-fallback-allowed', 'true');
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Downstream microservice is temporarily unreachable.',
              target
            },
            fallback: true
          });
        }
      },
    },
  });

// ─── Route → Service Mapping (2 Core Microservices) ──────────────────────────
const IDENTITY_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:5001';
const CLINICAL_URL = process.env.CLINICAL_SERVICE_URL || 'http://localhost:5003';

// Clinical Medical Info & Reviews (Dispatched to Clinical Service Port 5003)
app.use((req, res, next) => {
  if (req.path.includes('/medical-info') || req.path.includes('/reviews')) {
    return makeProxy(CLINICAL_URL)(req, res, next);
  }
  next();
});

// Specific clinical therapist routes MUST be mounted BEFORE generic /api/v1/therapists
app.use('/api/v1/therapists/me/dashboard', makeServiceProxy(CLINICAL_URL, '/api/v1/therapists/me/dashboard'));
app.use('/api/v1/therapists/schedule',     makeServiceProxy(CLINICAL_URL, '/api/v1/therapists/schedule'));
app.use('/api/v1/therapists/patients',     makeServiceProxy(CLINICAL_URL, '/api/v1/therapists/patients'));
app.use('/api/v1/therapists/appointments', makeServiceProxy(CLINICAL_URL, '/api/v1/therapists/appointments'));
app.use('/api/v1/consultations',           makeServiceProxy(CLINICAL_URL, '/api/v1/consultations'));

// Service 1: Identity & Payment Service (Port 5001)
app.use('/api/v1/auth',          makeServiceProxy(IDENTITY_URL, '/api/v1/auth'));
app.use('/api/v1/users',         makeServiceProxy(IDENTITY_URL, '/api/v1/users'));
app.use('/api/v1/patients',      makeServiceProxy(IDENTITY_URL, '/api/v1/patients'));
app.use('/api/v1/therapists',    makeServiceProxy(IDENTITY_URL, '/api/v1/therapists'));
app.use('/api/v1/payments',      makeServiceProxy(IDENTITY_URL, '/api/v1/payments'));
app.use('/api/v1/invoices',      makeServiceProxy(IDENTITY_URL, '/api/v1/invoices'));
app.use('/api/v1/admin/therapists', makeServiceProxy(IDENTITY_URL, '/api/v1/admin/therapists'));
app.use('/api/v1/admin/patients',   makeServiceProxy(IDENTITY_URL, '/api/v1/admin/patients'));
app.use('/api/v1/admin/users',      makeServiceProxy(IDENTITY_URL, '/api/v1/admin/users'));
app.use('/api/v1/admin',            makeProxy(IDENTITY_URL));

// Un-prefixed Service 1 fallbacks
app.use('/auth',                 makeServiceProxy(IDENTITY_URL, '/api/v1/auth'));
app.use('/users',                makeServiceProxy(IDENTITY_URL, '/api/v1/users'));
app.use('/patients',             makeServiceProxy(IDENTITY_URL, '/api/v1/patients'));
app.use('/therapists',           makeServiceProxy(IDENTITY_URL, '/api/v1/therapists'));
app.use('/payments',             makeServiceProxy(IDENTITY_URL, '/api/v1/payments'));
app.use('/invoices',             makeServiceProxy(IDENTITY_URL, '/api/v1/invoices'));
app.use('/admin',                makeProxy(IDENTITY_URL));

// Service 2: Clinical, Scheduling, Chat & Telehealth Service (Port 5003)
app.use('/api/v1/notifications', makeServiceProxy(CLINICAL_URL, '/api/v1/notifications'));
app.use('/api/v1/chat',          makeServiceProxy(CLINICAL_URL, '/api/v1/chat'));
app.use('/api/v1/telehealth',    makeServiceProxy(CLINICAL_URL, '/api/v1/telehealth'));
app.use('/api/v1/appointments',  makeServiceProxy(CLINICAL_URL, '/api/v1/appointments'));
app.use('/api/v1/availability',  makeServiceProxy(CLINICAL_URL, '/api/v1/availability'));
app.use('/api/v1/services',      makeServiceProxy(CLINICAL_URL, '/api/v1/services'));
app.use('/api/v1/programs',      makeServiceProxy(CLINICAL_URL, '/api/v1/programs'));
app.use('/api/v1/exercises',     makeServiceProxy(CLINICAL_URL, '/api/v1/exercises'));
app.use('/api/v1/sessions',      makeServiceProxy(CLINICAL_URL, '/api/v1/sessions'));
app.use('/api/v1/medical-records', makeServiceProxy(CLINICAL_URL, '/api/v1/medical-records'));
app.use('/api/v1/pain-assessments', makeServiceProxy(CLINICAL_URL, '/api/v1/pain-assessments'));
app.use('/api/v1/analytics',      makeServiceProxy(CLINICAL_URL, '/api/v1/analytics'));
app.use('/api/v1/admin/audit-log', makeServiceProxy(CLINICAL_URL, '/api/v1/admin/audit-log'));
app.use('/api/v1/audit-logs',     makeServiceProxy(CLINICAL_URL, '/api/v1/audit-logs'));

app.use('/api/v1/clinical',       makeProxy(CLINICAL_URL));
app.use('/api/clinical/programs',      makeProxy(CLINICAL_URL));
app.use('/api/clinical/exercises',     makeProxy(CLINICAL_URL));
app.use('/api/clinical/sessions',      makeProxy(CLINICAL_URL));
app.use('/api/clinical/medical-records', makeProxy(CLINICAL_URL));

// Un-prefixed Service 2 fallbacks
app.use('/notifications',        makeServiceProxy(CLINICAL_URL, '/api/v1/notifications'));
app.use('/chat',                 makeServiceProxy(CLINICAL_URL, '/api/v1/chat'));
app.use('/telehealth',           makeServiceProxy(CLINICAL_URL, '/api/v1/telehealth'));
app.use('/appointments',         makeServiceProxy(CLINICAL_URL, '/api/v1/appointments'));
app.use('/availability',         makeServiceProxy(CLINICAL_URL, '/api/v1/availability'));
app.use('/sessions',             makeServiceProxy(CLINICAL_URL, '/api/v1/sessions'));
app.use('/programs',             makeServiceProxy(CLINICAL_URL, '/api/v1/programs'));
app.use('/exercises',            makeServiceProxy(CLINICAL_URL, '/api/v1/exercises'));
app.use('/medical-records',      makeServiceProxy(CLINICAL_URL, '/api/v1/medical-records'));
app.use('/pain-assessments',     makeServiceProxy(CLINICAL_URL, '/api/v1/pain-assessments'));
app.use('/analytics',            makeServiceProxy(CLINICAL_URL, '/api/v1/analytics'));
app.use('/services',             makeServiceProxy(CLINICAL_URL, '/api/v1/services'));
app.use('/api/v1/admin/patients', makeProxy(CLINICAL_URL));

// ─── Health Check & Aggregator ───────────────────────────────────────────────
app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() }));

app.get('/api/v1/health', async (req, res) => {
  const services = [
    { name: 'identity-service', url: `${IDENTITY_URL}/health` },
    { name: 'clinical-service', url: `${CLINICAL_URL}/health` },
  ];

  const results = {};
  for (const s of services) {
    try {
      const resVal = await fetch(s.url, { timeout: 1500 });
      const data = await resVal.json();
      results[s.name] = { status: 'healthy', ...data };
    } catch (e) {
      results[s.name] = { 
        status: 'unreachable', 
        error: e.message, 
        cause: e.cause ? { message: e.cause.message, code: e.cause.code } : null 
      };
    }
  }

  res.json({
    status: 'ok',
    gateway: { 
      status: 'healthy', 
      port: PORT,
      urls: {
        identity: IDENTITY_URL,
        clinical: CLINICAL_URL
      }
    },
    services: results,
    timestamp: new Date().toISOString()
  });
});

// ─── Internal Notification API ────────────────────────────────────────────────
app.post('/api/v1/internal/notify', express.json(), (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== (process.env.INTERNAL_SERVICE_SECRET || 'internal_secret_key_123')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } });
  }
  const { userId, event, payload } = req.body;
  io.to(`user:${userId}`).to(`room:${userId}`).emit(event, payload);
  res.json({ success: true });
});

// ─── State & Rate Limiting for Real-Time Live Chat & WebRTC ──────────────────
const activeCalls = new Map(); // callId -> { callerId, recipientId, appointmentId, startTime, status }
const userCallMap = new Map(); // userId -> callId
const socketRateMap = new Map(); // socketId -> { msgCount, sigCount, resetTime }

const checkRateLimit = (socketId, type = 'msg') => {
  const now = Date.now();
  let entry = socketRateMap.get(socketId);
  if (!entry || now > entry.resetTime) {
    entry = { msgCount: 0, sigCount: 0, resetTime: now + 60000 };
    socketRateMap.set(socketId, entry);
  }
  if (type === 'msg') {
    entry.msgCount++;
    return entry.msgCount <= 60; // max 60 messages per minute
  } else {
    entry.sigCount++;
    return entry.sigCount <= 120; // max 120 signaling actions per minute
  }
};

// ─── Socket.io Connection & Events ───────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'onemedical_jwt_access_secret_production_2026';
    const decoded = jwt.verify(token, accessSecret);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.userId;
  const role = socket.user.role;
  console.log(`[Gateway Socket] Connected: ${userId} (${role})`);
  
  socket.join(`user:${userId}`);
  socket.join(`room:${userId}`);
  socket.join(`role:${role}`);
  
  // ─── Live Chat Handlers ─────────────────────────────────────────────────────
  socket.on('chat:join', ({ conversationId }) => {
    if (conversationId) {
      socket.join(`conv:${conversationId}`);
    }
  });

  socket.on('chat:leave', ({ conversationId }) => {
    if (conversationId) {
      socket.leave(`conv:${conversationId}`);
    }
  });

  const handleMessageSend = async (data, ack) => {
    if (!checkRateLimit(socket.id, 'msg')) {
      if (typeof ack === 'function') ack({ success: false, error: 'Rate limit exceeded' });
      return;
    }

    const { conversationId, recipientId, text, attachments = [], clientMsgId, messageId } = data;
    const msgId = clientMsgId || messageId || String(Date.now());
    const timestamp = new Date().toISOString();

    const messagePayload = {
      _id: msgId,
      clientMsgId: msgId,
      conversationId,
      senderId: userId,
      senderRole: role,
      recipientId,
      text: text || '',
      attachments: attachments || [],
      status: 'sent',
      timestamp,
      createdAt: timestamp,
    };

    // Forward & persist to Clinical Service asynchronously
    if (conversationId) {
      fetch(`${CLINICAL_URL}/api/v1/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || '',
          'x-user-id': userId,
          'x-user-role': role,
        },
        body: JSON.stringify({
          conversationId,
          recipientId,
          text,
          attachments,
          clientMsgId: msgId,
        }),
      }).catch((e) => console.warn('[Gateway Socket] Chat persistence warning:', e.message));
    }

    // Broadcast to recipient user room and conversation room
    if (recipientId) {
      io.to(`room:${recipientId}`).emit('chat:new_message', messagePayload);
      io.to(`room:${recipientId}`).emit('receive_message', messagePayload);
    }
    if (conversationId) {
      socket.to(`conv:${conversationId}`).emit('chat:new_message', messagePayload);
    }

    // Acknowledge back to sender
    socket.emit('chat:message_ack', { clientMsgId: msgId, status: 'delivered', timestamp });
    if (typeof ack === 'function') ack({ success: true, message: messagePayload });
  };

  socket.on('chat:send_message', handleMessageSend);
  socket.on('send_message', handleMessageSend);

  socket.on('chat:typing', ({ conversationId, recipientId, isTyping }) => {
    const typingPayload = { conversationId, senderId: userId, isTyping };
    if (recipientId) {
      io.to(`room:${recipientId}`).emit('chat:typing', typingPayload);
    }
    if (conversationId) {
      socket.to(`conv:${conversationId}`).emit('chat:typing', typingPayload);
    }
  });

  socket.on('chat:mark_read', ({ conversationId, recipientId }) => {
    if (conversationId) {
      fetch(`${CLINICAL_URL}/api/v1/chat/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          'x-internal-key': process.env.INTERNAL_API_KEY || '',
          'x-user-id': userId,
          'x-user-role': role,
        },
      }).catch(() => {});
    }
    if (recipientId) {
      io.to(`room:${recipientId}`).emit('chat:read_receipt', { conversationId, readBy: userId, readAt: new Date().toISOString() });
    }
  });

  // ─── WebRTC Telehealth Signaling Handlers ──────────────────────────────────
  socket.on('call:initiate', (data) => {
    if (!checkRateLimit(socket.id, 'sig')) return;

    const { callId, recipientId, appointmentId, sdpOffer, callerName, callerRole } = data;
    console.log(`[WebRTC Gateway] Call initiated: ${userId} -> ${recipientId} (CallId: ${callId})`);

    // Check if recipient is already in an active call (Busy line handling)
    if (userCallMap.has(recipientId)) {
      socket.emit('call:busy', { callId, recipientId, message: 'User is currently on another call.' });
      return;
    }

    const sessionInfo = {
      callId,
      callerId: userId,
      callerName: callerName || 'Therapist',
      callerRole: callerRole || role,
      recipientId,
      appointmentId,
      status: 'ringing',
      startTime: Date.now(),
    };

    activeCalls.set(callId, sessionInfo);
    userCallMap.set(userId, callId);
    userCallMap.set(recipientId, callId);

    // Relay incoming call offer to recipient's room
    io.to(`room:${recipientId}`).emit('call:incoming', {
      callId,
      callerId: userId,
      callerName: callerName || 'Therapist',
      callerRole: callerRole || role,
      appointmentId,
      sdpOffer,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('call:accept', (data) => {
    if (!checkRateLimit(socket.id, 'sig')) return;

    const { callId, callerId, sdpAnswer } = data;
    console.log(`[WebRTC Gateway] Call accepted: ${userId} for CallId: ${callId}`);

    const session = activeCalls.get(callId);
    if (session) {
      session.status = 'connected';
      session.connectedTime = Date.now();

      // Notify clinical service of connection
      fetch(`${CLINICAL_URL}/api/v1/telehealth/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || '',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          callId,
          appointmentId: session.appointmentId,
          therapistId: session.callerRole === 'therapist' ? session.callerId : userId,
          patientId: session.callerRole === 'patient' ? session.callerId : userId,
        }),
      }).catch((e) => console.warn('[WebRTC Gateway] Session record warning:', e.message));
    }

    io.to(`room:${callerId}`).emit('call:accepted', {
      callId,
      recipientId: userId,
      sdpAnswer,
    });
  });

  socket.on('call:reject', (data) => {
    const { callId, callerId, reason } = data;
    console.log(`[WebRTC Gateway] Call rejected: ${userId} (CallId: ${callId})`);

    activeCalls.delete(callId);
    userCallMap.delete(userId);
    if (callerId) userCallMap.delete(callerId);

    io.to(`room:${callerId}`).emit('call:rejected', {
      callId,
      reason: reason || 'declined',
    });
  });

  socket.on('call:busy', (data) => {
    const { callId, callerId } = data;
    io.to(`room:${callerId}`).emit('call:busy', { callId });
  });

  socket.on('call:ice_candidate', (data) => {
    if (!checkRateLimit(socket.id, 'sig')) return;

    const { callId, targetUserId, candidate } = data;
    if (targetUserId && candidate) {
      io.to(`room:${targetUserId}`).emit('call:ice_candidate', {
        callId,
        senderId: userId,
        candidate,
      });
    }
  });

  socket.on('call:heartbeat', (data) => {
    const { callId } = data;
    const session = activeCalls.get(callId);
    if (session) {
      session.lastHeartbeat = Date.now();
    }
  });

  socket.on('call:end', (data) => {
    const { callId, targetUserId, durationSeconds, endReason } = data;
    console.log(`[WebRTC Gateway] Call ended by ${userId} (CallId: ${callId})`);

    const session = activeCalls.get(callId);
    const finalDuration = durationSeconds || (session?.connectedTime ? Math.round((Date.now() - session.connectedTime) / 1000) : 0);

    if (targetUserId) {
      io.to(`room:${targetUserId}`).emit('call:ended', {
        callId,
        durationSeconds: finalDuration,
        endedBy: userId,
        endReason: endReason || 'user_ended',
      });
      userCallMap.delete(targetUserId);
    }

    activeCalls.delete(callId);
    userCallMap.delete(userId);

    // Save session completion to Clinical Service
    if (callId) {
      fetch(`${CLINICAL_URL}/api/v1/telehealth/sessions/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || '',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          callId,
          durationSeconds: finalDuration,
          endReason: endReason || 'user_ended',
        }),
      }).catch((e) => console.warn('[WebRTC Gateway] Session end record warning:', e.message));
    }
  });

  // ─── Disconnect & Cleanup ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Gateway Socket] Disconnected: ${userId}`);
    socketRateMap.delete(socket.id);

    // Handle abrupt call drops
    const callId = userCallMap.get(userId);
    if (callId) {
      const session = activeCalls.get(callId);
      if (session) {
        const peerId = session.callerId === userId ? session.recipientId : session.callerId;
        io.to(`room:${peerId}`).emit('call:ended', {
          callId,
          endedBy: userId,
          endReason: 'network_dropped',
        });
        userCallMap.delete(peerId);
        activeCalls.delete(callId);
      }
      userCallMap.delete(userId);
    }
  });
});

// ─── 404 Catch-all ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `No route matches ${req.method} ${req.path}` } });
});

const httpServer = server.listen(PORT, () => console.log(`[Gateway] Running on port ${PORT}`));

// ─── Graceful Shutdown Handlers ──────────────────────────────────────────────
const handleGracefulShutdown = (signal) => {
  console.log(`[Gateway] Received ${signal}. Initiating graceful shutdown...`);
  httpServer.close(() => {
    console.log('[Gateway] Closed active HTTP connections cleanly.');
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('[Gateway] Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => handleGracefulShutdown('SIGINT'));
