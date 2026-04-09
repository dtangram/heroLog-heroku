import { Router } from 'express';
import * as emailPasswordResetCtrl from '../controllers/emailpasswordreset';

const router = Router();

// GET /emailpasswordreset
router.get('/', emailPasswordResetCtrl.emailPasswordReset);

// POST /emailpasswordreset
router.post('/', emailPasswordResetCtrl.emailPasswordReset);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;