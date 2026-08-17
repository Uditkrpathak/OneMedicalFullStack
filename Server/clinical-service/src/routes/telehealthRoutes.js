import express from 'express';
import {
  getIceServers,
  authorizeCall,
  startSession,
  endSession,
  saveSoapNotes,
  getSessionsHistory
} from '../controllers/telehealthController.js';

const router = express.Router();

router.get('/ice-servers', getIceServers);
router.post('/authorize', authorizeCall);
router.post('/sessions', startSession);
router.post('/sessions/end', endSession);
router.post('/sessions/:sessionId/soap-notes', saveSoapNotes);
router.get('/sessions', getSessionsHistory);

export default router;
