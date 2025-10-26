import { Router, Request, Response, NextFunction } from 'express';
import * as collectionpublisherCtrl from '../controllers/collectionpublishers';
import * as validationCtrl from '../controllers/validation';

console.log('🔵 COLLECTION PUBLISHERS ROUTES FILE LOADED');
console.log('🔵 Current time:', new Date().toISOString());

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /collectionpublishers
// Get all collection publishers
router.get(
  '/',
  collectionpublisherCtrl.getAllCollectionPublishers
);

// POST /collectionpublishers/create
// Create a new publisher
router.post(
  '/create',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🚀 ROUTE HIT');
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
// Get a single publisher by ID
router.get(
  '/:id',
  collectionpublisherCtrl.getOneById
);

// PUT /collectionpublishers/:id
// Update a publisher
router.put(
  '/:id',
  validationCtrl.validate('editCollectionPublisher'),
  collectionpublisherCtrl.updateCollectionPublisher
);

// DELETE /collectionpublishers/:id
// Delete a publisher
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