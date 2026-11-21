import { Router } from 'express';
import * as salelistALLCtrl from '../controllers/salelistALL';
import { requireAccount } from '../middleware/auth';

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /salelistALL/preview?limit=8
// The newest listings for the Landing page. Public: no seller details.
router.get(
  '/preview',
  salelistALLCtrl.getSalePreview
);

// GET /salelistALL
// Every listing with its seller's username (Home). Signed-in members only.
router.get(
  '/',
  requireAccount,
  salelistALLCtrl.getAllSaleLists
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;