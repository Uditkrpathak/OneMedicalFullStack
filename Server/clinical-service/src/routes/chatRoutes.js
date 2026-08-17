import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  uploadAttachment
} from '../controllers/chatController.js';

const router = express.Router();

router.get('/conversations', getConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/messages', sendMessage);
router.put('/conversations/:conversationId/read', markAsRead);
router.post('/upload', uploadAttachment);

export default router;
