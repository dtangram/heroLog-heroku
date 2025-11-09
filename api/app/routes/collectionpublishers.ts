import { Router, Request, Response, NextFunction } from 'express';
import { optionalAuth, AuthRequest  } from '../middleware/auth';
import * as collectionpublisherCtrl from '../controllers/collectionpublishers';
import * as validationCtrl from '../controllers/validation';

console.log('🔵 COLLECTION PUBLISHERS ROUTES FILE LOADED');
console.log('🔵 Current time:', new Date().toISOString());

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// Apply auth middleware to all routes
router.use(optionalAuth);

// GET /collectionpublishers
// Get collection publishers for authenticated user
router.get(
  '/',
  collectionpublisherCtrl.getCollectionPublishers  // ✅ Changed from getAllCollectionPublishers
);

// POST /collectionpublishers/create
// Create a new publisher for authenticated user
router.post(
  '/create',
  (req: AuthRequest , res: Response, next: NextFunction) => {
    try {
      console.log('🚀 CREATE ROUTE HIT');
      console.log('User from token:', req.user);  // ✅ Log authenticated user
      console.log('Body:', req.body);
      next();
    } catch (error) {
      console.error('❌ MIDDLEWARE ERROR:', error);
      res.status(500).json({ error: 'Middleware failed' });
    }
  },
  validationCtrl.validate('createCollectionPublisher'),
  collectionpublisherCtrl.createCollectionPublisher
);

// TEST ENDPOINT - Remove after debugging
router.get('/test-logging', (_req: Request, res: Response) => {
  console.log('🧪 TEST ENDPOINT HIT');
  console.log('Logging is working!');
  return res.json({ message: 'Logging test successful' });
});

// GET /collectionpublishers/:id
// Get a single publisher by ID (must belong to user)
router.get(
  '/:id',
  collectionpublisherCtrl.getOneById
);

// PUT /collectionpublishers/:id
// Update a publisher (must belong to user)
router.put(
  '/:id',
  validationCtrl.validate('editCollectionPublisher'),
  collectionpublisherCtrl.updateCollectionPublisher
);

// DELETE /collectionpublishers/:id
// Delete a publisher (must belong to user)
router.delete(
  '/:id',
  validationCtrl.validate('deleteCollectionPublisher'),
  collectionpublisherCtrl.removeCollectionPublisher
);

console.log('🔵 COLLECTION PUBLISHERS ROUTER CONFIGURED');
console.log('🔵 Router has', router.stack.length, 'routes');

// ============================================================================
// EXPORTS
// ============================================================================

export default router;