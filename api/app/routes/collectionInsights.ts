import { Router } from 'express';
import { getCollectionInsights } from '../controllers/collectionInsights';
import { requireIdentity } from '../middleware/auth';
import { ownsParam } from '../middleware/ownership';

const router = Router();

// GET /insights/:userId
// Only the collection's owner (signed in or guest) can see its Intel
router.get('/:userId', requireIdentity, ownsParam('userId'), getCollectionInsights);

export default router;