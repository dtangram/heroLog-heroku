import { Router } from 'express';
import * as salelistALLCtrl from '../controllers/salelistALL';

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /salelistall
// Get all sale lists from all users
router.get(
  '/',
  salelistALLCtrl.getAllSaleLists
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;