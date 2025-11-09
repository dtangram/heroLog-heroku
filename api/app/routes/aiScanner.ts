import { Router } from 'express';
import { scanComicCover } from '../controllers/aiScanner';

const router = Router();

// POST /ai/scan-comic-cover
// Scan a comic book cover and extract metadata
router.post('/scan-comic-cover', scanComicCover);

export default router;