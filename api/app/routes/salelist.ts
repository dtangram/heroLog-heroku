import { Router } from 'express';
import * as salelistCtrl from '../controllers/salelist';
import * as validationCtrl from '../controllers/validation';

const router = Router();

// GET /salelist/signups/:userId
// Get all sale lists for a specific user
router.get(
  '/signups/:userId',
  salelistCtrl.getSaleLists
);

// POST /salelist/
// ✅ FIXED: Create a new sale list (not search)
router.post(
  '/',
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
// Update a sale list
router.put(
  '/:id',
  validationCtrl.validate('editSaleList'),
  salelistCtrl.updateSaleList
);

// DELETE /salelist/:id
// Delete a sale list
router.delete(
  '/:id',
  validationCtrl.validate('deleteSaleList'),
  salelistCtrl.removeSaleList
);

export default router;