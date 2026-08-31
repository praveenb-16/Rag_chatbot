import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  listDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  scrapeUrl,
} from '../controllers/documents.controller';

const router = Router();

// All document routes require auth + admin role
router.use(requireAuth, requireAdmin);

router.get('/', listDocuments);
router.post('/', upload.single('file'), uploadDocument);
router.post('/scrape', scrapeUrl);          // URL-based ingestion
router.put('/:id', upload.single('file'), updateDocument);
router.delete('/:id', deleteDocument);

export default router;
