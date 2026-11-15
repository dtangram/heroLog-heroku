import { Router } from 'express';
import * as salelistCtrl from '../controllers/salelist';
import * as validationCtrl from '../controllers/validation';
import { authenticateToken } from '../middleware/auth';
import { assignSaleListOwner, requireSaleListOwner } from '../middleware/saleListOwner';

const router = Router();

// GET /salelist/signups/:userId
// Get all sale lists for a specific user
router.get(
  '/signups/:userId',
  salelistCtrl.getSaleLists
);

// POST /salelist/
// Create a new sale list. Requires sign-in; the listing belongs to the signed-in user.
router.post(
  '/',
  authenticateToken,
  assignSaleListOwner,
  validationCtrl.validate('createSaleList'),
  salelistCtrl.createSaleList
);

// GET /salelist/:id
// Get a single sale list by ID
router.get(
  '/:id',
  salelistCtrl.getOneById
);

// PUT /salelist/:id
// Update a sale list. Requires sign-in; only the seller can update it.
router.put(
  '/:id',
  authenticateToken,
  validationCtrl.validate('editSaleList'),
  requireSaleListOwner,
  salelistCtrl.updateSaleList
);

// DELETE /salelist/:id
// Delete a sale list. Requires sign-in; only the seller can delete it.
router.delete(
  '/:id',
  authenticateToken,
  validationCtrl.validate('deleteSaleList'),
  requireSaleListOwner,
  salelistCtrl.removeSaleList
);

export default router;