import { Router } from 'express';
import { getCollectionInsights } from '../controllers/collectionInsights';

const router = Router();

// GET /insights/:userId
router.get('/:userId', getCollectionInsights);

export default router;