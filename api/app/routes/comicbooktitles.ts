import { Router } from 'express';
import * as comicbooktitleCtrl from '../controllers/comicbooktitles';
import * as validationCtrl from '../controllers/validation';

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /comicbooktitles/publishers/:pubId
// Get all comic book titles for a specific publisher
router.get(
  '/publishers/:pubId',
  comicbooktitleCtrl.getCollectPublisherComicBookTitles
);

// POST /comicbooktitles
// Create a new comic book title
router.post(
  '/',
  validationCtrl.validate('createComicBookTitle'),
  comicbooktitleCtrl.createComicBookTitle
);

// GET /comicbooktitles/:id
// Get a single comic book title by ID
router.get(
  '/:id',
  comicbooktitleCtrl.getOneById
);

// PUT /comicbooktitles/:id
// Update a comic book title
router.put(
  '/:id',
  validationCtrl.validate('editComicBookTitle'),
  comicbooktitleCtrl.updateComicBookTitle
);

// DELETE /comicbooktitles/:id
// Delete a comic book title
router.delete(
  '/:id',
  validationCtrl.validate('deleteComicBookTitle'),
  comicbooktitleCtrl.removeComicBookTitle
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;