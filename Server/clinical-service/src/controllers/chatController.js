import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import AuditLog from '../models/AuditLog.js';
import Appointment from '../models/Appointment.js';
import mongoose from 'mongoose';

// ─── LINKED ID RESOLUTION (USER ID <-> THERAPIST/PATIENT PROFILE ID) ───────────
export const resolveLinkedIds = async (id) => {
  if (!id) return [];
  const ids = [String(id)];
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const objId = new mongoose.Types.ObjectId(String(id));
      const identityDb = mongoose.connection.useDb('identity_db');
      const [therapistProf, patientProf] = await Promise.all([
        identityDb.collection('therapistprofiles').findOne({ $or: [{ _id: objId }, { userId: objId }] }),
        identityDb.collection('patientprofiles').findOne({ $or: [{ _id: objId }, { userId: objId }] }),
      ]);
      if (therapistProf) {
        if (therapistProf._id) ids.push(therapistProf._id.toString());
        if (therapistProf.userId) ids.push(therapistProf.userId.toString());
      }
      if (patientProf) {
        if (patientProf._id) ids.push(patientProf._id.toString());
        if (patientProf.userId) ids.push(patientProf.userId.toString());
      }
    }
  } catch (err) {
    console.error('[ChatController] resolveLinkedIds database error:', err.message);
    // Do not swallow silently; preserve initial ID but log failure
  }
  return Array.from(new Set(ids));
};

// ─── MAGIC BYTES INSPECTION ───────────────────────────────────────────────────
export const validateMagicBytes = (buffer, mimeType) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  const mime = (mimeType || '').toLowerCase().trim();

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (mime === 'image/png') {
    return buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
  }
  if (mime === 'application/pdf') {
    return buffer.length >= 4 &&
      buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
  }
  if (mime === 'image/webp') {
    return buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
};

// ─── 1. GET CONVERSATIONS (JWT PRECEDENCE & ADMIN SCOPE) ──────────────────────
export const getConversations = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];
    const isAdmin = ['clinic_admin', 'super_admin', 'admin'].includes(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User identity required' } });
    }

    const myLinkedIds = userId ? await resolveLinkedIds(userId) : [];

    // Admins see all active clinic conversations; participants see only their own
    const filter = isAdmin
      ? { status: { $ne: 'closed' } }
      : { participants: { $in: myLinkedIds }, status: { $ne: 'closed' } };

    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = conversations.map((conv) => {
      let otherParticipant = null;
      if (isAdmin) {
        otherParticipant = conv.participantDetails?.find(p => p.role === 'patient') ||
          conv.participantDetails?.[0] || {
            userId: conv.participants?.[0] || 'unknown',
            name: 'Patient Consultation',
            role: 'patient',
          };
      } else {
        otherParticipant = conv.participantDetails?.find((p) => !myLinkedIds.includes(String(p.userId))) || {
          userId: conv.participants?.find((p) => !myLinkedIds.includes(String(p))) || 'unknown',
          name: 'Consultation Partner',
          role: 'therapist',
        };
      }

      let unread = 0;
      if (myLinkedIds.length > 0) {
        for (const id of myLinkedIds) {
          if (conv.unreadCounts?.[id]) unread += conv.unreadCounts[id];
        }
      }

      return {
        ...conv,
        otherParticipant,
        unreadCount: unread,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('[ChatController] getConversations error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── 2. GET OR CREATE CONVERSATION (ATOMIC IDENTITY & VERIFIED RECIPIENT) ────
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const { recipientId, appointmentId, myName } = req.body;

    if (!userId || !recipientId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'recipientId is required' } });
    }

    if (String(userId) === String(recipientId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cannot create conversation with yourself.' } });
    }

    const myLinkedIds = await resolveLinkedIds(userId);
    const theirLinkedIds = await resolveLinkedIds(recipientId);

    // Verify recipient existence and genuine role from identity_db
    const identityDb = mongoose.connection.useDb('identity_db');
    let recipientUser = null;
    if (mongoose.Types.ObjectId.isValid(recipientId)) {
      const rObjId = new mongoose.Types.ObjectId(String(recipientId));
      recipientUser = await identityDb.collection('users').findOne({ _id: rObjId });
      if (!recipientUser) {
        const [tp, pp] = await Promise.all([
          identityDb.collection('therapistprofiles').findOne({ $or: [{ _id: rObjId }, { userId: rObjId }] }),
          identityDb.collection('patientprofiles').findOne({ $or: [{ _id: rObjId }, { userId: rObjId }] }),
        ]);
        if (tp) recipientUser = { name: tp.fullName || tp.name || 'Specialist', role: 'therapist' };
        if (pp) recipientUser = { name: pp.name || 'Patient', role: 'patient' };
      }
    }

    const resolvedRecipientName = recipientUser?.name || recipientUser?.fullName || 'Consultant';
    const resolvedRecipientRole = recipientUser?.role || (userRole === 'patient' ? 'therapist' : 'patient');

    // Deterministic unique conversationKey
    const sortedPair = [String(myLinkedIds[0] || userId), String(theirLinkedIds[0] || recipientId)].sort();
    const conversationKey = appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)
      ? `${appointmentId}:${sortedPair.join(':')}`
      : sortedPair.join(':');

    const mergedParticipants = Array.from(new Set([...myLinkedIds, ...theirLinkedIds]));

    // Atomic findOneAndUpdate with upsert to prevent race condition duplicates
    const conversation = await Conversation.findOneAndUpdate(
      { conversationKey },
      {
        $setOnInsert: {
          conversationKey,
          appointmentId: appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) ? appointmentId : null,
          participantDetails: [
            { userId: String(userId), name: myName || (userRole === 'therapist' ? 'Dr. Specialist' : 'Patient'), role: userRole },
            { userId: String(recipientId), name: resolvedRecipientName, role: resolvedRecipientRole }
          ],
          unreadCounts: { [String(userId)]: 0, [String(recipientId)]: 0 },
          lastMessage: {
            text: 'Conversation started',
            senderId: String(userId),
            senderRole: userRole,
            createdAt: new Date(),
            hasAttachments: false
          },
          status: 'active'
        },
        $addToSet: { participants: { $each: mergedParticipants } }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error('[ChatController] getOrCreateConversation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── 3. GET MESSAGES (MEMBERSHIP AUTH & BOUNDED PAGINATION) ───────────────────
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit } = req.query;
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];
    const isAdmin = ['clinic_admin', 'super_admin', 'admin'].includes(userRole);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid conversationId' } });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const myLinkedIds = userId ? await resolveLinkedIds(userId) : [];
    if (!isAdmin && (!userId || !conversation.participants.some(p => myLinkedIds.includes(String(p))))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this conversation' } });
    }

    // Bounded pagination: 1 <= limit <= 100 (default: 50)
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;

    const filter = { conversationId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(String(before)) };
    }

    const messages = await ChatMessage.find(filter)
      .sort({ _id: -1 })
      .limit(safeLimit)
      .lean();

    messages.reverse();

    const hasMore = messages.length === safeLimit;
    const nextCursor = messages.length > 0 ? messages[0]._id : null;

    res.json({
      success: true,
      data: messages,
      pagination: {
        hasMore,
        nextCursor,
        count: messages.length,
      }
    });
  } catch (err) {
    console.error('[ChatController] getMessages error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── 4. SEND MESSAGE (MEMBERSHIP AUTH, SCOPED IDEMPOTENCY & SENDER VERIFICATION)
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'] || 'patient';
    const { conversationId, text, attachments = [], clientMsgId } = req.body;
    const isAdmin = ['clinic_admin', 'super_admin', 'admin'].includes(userRole);

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User identity required' } });
    }

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Valid conversationId is required' } });
    }

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Message cannot be empty' } });
    }

    if (text && typeof text === 'string' && text.length > 5000) {
      return res.status(400).json({ success: false, error: { code: 'TEXT_TOO_LONG', message: 'Message text cannot exceed 5000 characters.' } });
    }

    if (Array.isArray(attachments) && attachments.length > 5) {
      return res.status(400).json({ success: false, error: { code: 'TOO_MANY_ATTACHMENTS', message: 'Maximum 5 attachments allowed per message.' } });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const myLinkedIds = await resolveLinkedIds(userId);

    // Strict Membership Authorization
    const isParticipant = conversation.participants.some(p => myLinkedIds.includes(String(p)));
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not a participant in this conversation.' } });
    }

    // Scoped Idempotency Check
    if (clientMsgId) {
      const existing = await ChatMessage.findOne({
        clientMsgId,
        conversationId,
        senderId: { $in: myLinkedIds }
      });
      if (existing) {
        return res.json({ success: true, data: existing, duplicate: true });
      }
    }

    // Authoritative Recipient: derived strictly from conversation participants excluding sender
    const otherParticipantId = conversation.participants.find(p => !myLinkedIds.includes(String(p))) || 'unknown';

    const message = await ChatMessage.create({
      clientMsgId: clientMsgId || undefined,
      conversationId,
      senderId: String(userId),
      senderRole: userRole,
      recipientId: otherParticipantId,
      text: text ? String(text).trim() : '',
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'sent',
      readBy: [{ userId: String(userId), readAt: new Date() }]
    });

    // Update conversation metadata & increment recipient unread count
    const unreadKey = `unreadCounts.${otherParticipantId}`;
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        lastMessage: {
          text: text || (attachments.length > 0 ? `[Attachment: ${attachments[0].name || 'File'}]` : ''),
          senderId: String(userId),
          senderRole: userRole,
          createdAt: new Date(),
          hasAttachments: attachments.length > 0
        }
      },
      $inc: { [unreadKey]: 1 }
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    if (err.code === 11000 && req.body.clientMsgId) {
      const existing = await ChatMessage.findOne({ clientMsgId: req.body.clientMsgId });
      return res.json({ success: true, data: existing, duplicate: true });
    }
    console.error('[ChatController] sendMessage error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── 5. MARK AS READ (MEMBERSHIP AUTHORIZATION) ───────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.headers['x-user-id'];
    const userRole = req.user?.role || req.headers['x-user-role'];
    const isAdmin = ['clinic_admin', 'super_admin', 'admin'].includes(userRole);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid conversationId' } });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const myLinkedIds = await resolveLinkedIds(userId);
    const isParticipant = conversation.participants.some(p => myLinkedIds.includes(String(p)));
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not a participant in this conversation.' } });
    }

    // Reset unread counts for all of user's linked IDs
    const resetObj = {};
    for (const id of myLinkedIds) {
      resetObj[`unreadCounts.${id}`] = 0;
    }

    await Conversation.findByIdAndUpdate(conversationId, { $set: resetObj });

    // Mark unread messages as read
    await ChatMessage.updateMany(
      {
        conversationId,
        senderId: { $nin: myLinkedIds },
        'readBy.userId': { $nin: myLinkedIds }
      },
      {
        $set: { status: 'read' },
        $push: { readBy: { userId: String(userId), readAt: new Date() } }
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('[ChatController] markAsRead error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── 6. UPLOAD ATTACHMENT (BINARY BYTE DECODING & MAGIC HEADER INSPECTION) ─────
export const uploadAttachment = async (req, res) => {
  try {
    const { fileName, fileType, base64Data } = req.body;

    if (!fileName || !fileType || !base64Data) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'fileName, fileType, and base64Data required' } });
    }

    const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const normalizedType = fileType.toLowerCase().trim();
    if (!ALLOWED_MIME.includes(normalizedType)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only JPG, PNG, WEBP, and PDF files are permitted' } });
    }

    // Strip Data URI prefix
    const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');

    // Validate Base64 characters
    if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64.replace(/\s+/g, ''))) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_BASE64', message: 'Malformed base64 payload' } });
    }

    // Decode actual binary buffer
    const buffer = Buffer.from(cleanBase64, 'base64');
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_FILE', message: 'Attachment file cannot be empty' } });
    }

    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Maximum attachment size is 10MB' } });
    }

    // Inspect Magic Bytes against claimed MIME type
    const isMagicValid = validateMagicBytes(buffer, normalizedType);
    if (!isMagicValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MIME_MISMATCH',
          message: `File content bytes do not match declared MIME type ${normalizedType}. Disguised or corrupted files are prohibited.`
        }
      });
    }

    const isPdf = normalizedType.includes('pdf');
    const attachmentPayload = {
      url: base64Data.startsWith('data:') ? base64Data : `data:${normalizedType};base64,${cleanBase64}`,
      type: isPdf ? 'pdf' : 'image',
      name: String(fileName).replace(/[^\w.-]/g, '_'),
      size: buffer.length,
    };

    res.json({ success: true, data: attachmentPayload });
  } catch (err) {
    console.error('[ChatController] uploadAttachment error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
