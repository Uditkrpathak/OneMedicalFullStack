import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

const resolveLinkedIds = async (id) => {
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
  } catch (e) {}
  return Array.from(new Set(ids));
};

/**
 * Get all conversations for current user with unread counts
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role;
    const isAdmin = userRole === 'clinic_admin' || userRole === 'super_admin';

    if (!userId && !isAdmin) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User identity required' } });
    }

    const myLinkedIds = userId ? await resolveLinkedIds(userId) : [];

    // Admins see all non-closed conversations across the clinic; regular users see their own
    const filter = isAdmin
      ? { status: { $ne: 'closed' } }
      : { participants: { $in: myLinkedIds }, status: { $ne: 'closed' } };

    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = conversations.map((conv) => {
      // For regular user: pick the other participant
      // For admin: prefer the patient participant or the first participant detail
      let otherParticipant = null;
      if (isAdmin) {
        otherParticipant = conv.participantDetails?.find(p => p.role === 'patient') ||
          conv.participantDetails?.[0] || {
            userId: conv.participants?.[0] || 'unknown',
            name: 'Patient Consultation',
            role: 'patient',
          };
      } else {
        otherParticipant = conv.participantDetails?.find((p) => !myLinkedIds.includes(p.userId)) || {
          userId: conv.participants.find((p) => !myLinkedIds.includes(p)) || 'unknown',
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

/**
 * Get or create a conversation between participants
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';
    const { recipientId, recipientName, recipientRole, appointmentId, myName } = req.body;

    if (!userId || !recipientId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'recipientId is required' } });
    }

    const myLinkedIds = await resolveLinkedIds(userId);
    const theirLinkedIds = await resolveLinkedIds(recipientId);

    let query = {
      $and: [
        { participants: { $in: myLinkedIds } },
        { participants: { $in: theirLinkedIds } }
      ]
    };
    if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
      query.appointmentId = appointmentId;
    }

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      conversation = await Conversation.create({
        participants: Array.from(new Set([...myLinkedIds, ...theirLinkedIds])),
        participantDetails: [
          { userId, name: myName || (userRole === 'therapist' ? 'Therapist' : 'Patient'), role: userRole },
          { userId: recipientId, name: recipientName || 'Consultant', role: recipientRole || 'therapist' }
        ],
        appointmentId: appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) ? appointmentId : null,
        unreadCounts: { [userId]: 0, [recipientId]: 0 },
        lastMessage: {
          text: 'Conversation started',
          senderId: userId,
          senderRole: userRole,
          createdAt: new Date(),
        }
      });
    } else {
      const merged = Array.from(new Set([...(conversation.participants || []), ...myLinkedIds, ...theirLinkedIds]));
      if (merged.length > (conversation.participants || []).length) {
        await Conversation.findByIdAndUpdate(conversation._id, { $set: { participants: merged } });
      }
    }

    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error('[ChatController] getOrCreateConversation error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Get cursor-paginated messages for a conversation
 */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;
    const userId = req.headers['x-user-id'] || req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid conversationId' } });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const userRole = req.headers['x-user-role'] || req.user?.role;
    const isAdmin = userRole === 'clinic_admin' || userRole === 'super_admin';

    const myLinkedIds = userId ? await resolveLinkedIds(userId) : [];
    if (!isAdmin && userId && !conversation.participants.some(p => myLinkedIds.includes(p))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this conversation' } });
    }

    const filter = { conversationId };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      filter._id = { $lt: before };
    }

    const messages = await ChatMessage.find(filter)
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    // Reverse to chronological order (oldest -> newest) for easy frontend display
    messages.reverse();

    const hasMore = messages.length === Number(limit);
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

/**
 * Send a message via REST (with idempotency support via clientMsgId)
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.userId;
    const userRole = req.headers['x-user-role'] || req.user?.role || 'patient';
    const { conversationId, text, attachments = [], clientMsgId, recipientId } = req.body;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Valid conversationId is required' } });
    }

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Message cannot be empty' } });
    }

    // Idempotency check
    if (clientMsgId) {
      const existing = await ChatMessage.findOne({ clientMsgId });
      if (existing) {
        return res.json({ success: true, data: existing, duplicate: true });
      }
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const otherParticipantId = recipientId || conversation.participants.find((p) => p !== userId);

    const message = await ChatMessage.create({
      clientMsgId: clientMsgId || undefined,
      conversationId,
      senderId: userId,
      senderRole: userRole,
      recipientId: otherParticipantId,
      text: text || '',
      attachments: attachments || [],
      status: 'sent',
      readBy: [{ userId, readAt: new Date() }]
    });

    // Update conversation metadata and increment recipient's unread count
    const unreadKey = `unreadCounts.${otherParticipantId}`;
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        lastMessage: {
          text: text || (attachments.length > 0 ? `[Attachment: ${attachments[0].name || 'File'}]` : ''),
          senderId: userId,
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
      // Caught race condition idempotency
      const existing = await ChatMessage.findOne({ clientMsgId: req.body.clientMsgId });
      return res.json({ success: true, data: existing, duplicate: true });
    }
    console.error('[ChatController] sendMessage error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Mark messages in a conversation as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid conversationId' } });
    }

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCounts.${userId}`]: 0 }
    });

    // Mark unread messages
    await ChatMessage.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId }
      },
      {
        $set: { status: 'read' },
        $push: { readBy: { userId, readAt: new Date() } }
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('[ChatController] markAsRead error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Upload an attachment with size and MIME validation
 */
export const uploadAttachment = async (req, res) => {
  try {
    const { fileName, fileType, base64Data, sizeBytes } = req.body;

    if (!fileName || !fileType || !base64Data) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'fileName, fileType, and base64Data required' } });
    }

    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/jpg'];
    if (!ALLOWED_MIME.includes(fileType.toLowerCase())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only JPG, PNG, WEBP, and PDF files are permitted' } });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (sizeBytes && sizeBytes > MAX_SIZE) {
      return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Maximum attachment size is 10MB' } });
    }

    // For local/dev server zero-hosting, data URI or persistent URL payload is returned
    const isPdf = fileType.includes('pdf');
    const attachmentPayload = {
      url: base64Data.startsWith('data:') ? base64Data : `data:${fileType};base64,${base64Data}`,
      type: isPdf ? 'pdf' : 'image',
      name: fileName,
      size: sizeBytes || Math.round((base64Data.length * 3) / 4),
    };

    res.json({ success: true, data: attachmentPayload });
  } catch (err) {
    console.error('[ChatController] uploadAttachment error:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
