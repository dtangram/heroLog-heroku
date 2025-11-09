import { Router } from 'express';
import * as comicbookCtrl from '../controllers/comicbook';
import * as validationCtrl from '../controllers/validation';

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /comicbook/titles/:coboTitleId
// Get all comic books for a specific title
router.get(
  '/titles/:coboTitleId',
  comicbookCtrl.getComicBooks
);

// GET /comicbook/regular
// Get regular (non-variant) comic books
router.get(
  '/regular',
  comicbookCtrl.getComicBookRegular
);

// GET /comicbook/variant
// Get variant comic books
router.get(
  '/variant',
  comicbookCtrl.getComicBookVariant
);

// POST /comicbook
// Create a new comic book
router.post(
  '/',
  validationCtrl.validate('createComicBook'),
  comicbookCtrl.createComicBook as any  // Type cast to fix Express typing issue
);

// GET /comicbook/:id
// Get a single comic book by ID
router.get(
  '/:id',
  comicbookCtrl.getOneById
);

// PUT /comicbook/:id
// Update a comic book
router.put(
  '/:id',
  validationCtrl.validate('editComicBook'),
  comicbookCtrl.updateComicBook as any  // Type cast to fix Express typing issue
);

// DELETE /comicbook/:id
// Delete a comic book
router.delete(
  '/:id',
  validationCtrl.validate('deleteComicBook'),
  comicbookCtrl.removeComicBook
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;