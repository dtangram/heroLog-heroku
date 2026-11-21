import { Router } from 'express';
import * as salelistCtrl from '../controllers/salelist';
import * as validationCtrl from '../controllers/validation';
import { requireAccount } from '../middleware/auth';
import { ownsParam, ownsRecord, saleOwner } from '../middleware/ownership';
import { assignSaleListOwner, requireSaleListOwner } from '../middleware/saleListOwner';

const router = Router();

// GET /salelist/signups/:userId
// Get all sale lists for a specific user
// Your sale list is yours alone (the public list is /salelistALL)
router.get(
  '/signups/:userId',
  requireAccount,
  ownsParam('userId'),
  salelistCtrl.getSaleLists
);

// POST /salelist/
// Create a new sale list. Requires sign-in; the listing belongs to the signed-in user.
router.post(
  '/',
  requireAccount,
  assignSaleListOwner,
  validationCtrl.validate('createSaleList'),
  salelistCtrl.createSaleList
);

// GET /salelist/:id
// Get a single sale list by ID
router.get(
  '/:id',
  requireAccount,
  ownsRecord(saleOwner),
  salelistCtrl.getOneById
);

// PUT /salelist/:id
// Update a sale list. Requires sign-in; only the seller can update it.
router.put(
  '/:id',
  requireAccount,
  validationCtrl.validate('editSaleList'),
  requireSaleListOwner,
  salelistCtrl.updateSaleList
);

// DELETE /salelist/:id
// Delete a sale list. Requires sign-in; only the seller can delete it.
router.delete(
  '/:id',
  requireAccount,
  validationCtrl.validate('deleteSaleList'),
  requireSaleListOwner,
  salelistCtrl.removeSaleList
);

export default router;