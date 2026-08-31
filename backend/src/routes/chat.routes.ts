import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createSession,
  listSessions,
  getSession,
  deleteSession,
  postMessage,
} from '../controllers/chat.controller';

const router = Router();

// All chat routes require auth (both student and admin)
router.use(requireAuth);

router.post('/sessions', createSession);
router.get('/sessions', listSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/messages', postMessage);

export default router;
