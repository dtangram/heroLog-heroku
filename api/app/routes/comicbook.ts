import { Router } from 'express';
import * as comicbookCtrl from '../controllers/comicbook';
import * as validationCtrl from '../controllers/validation';
import { requireIdentity } from '../middleware/auth';
import { comicOwner, ownsBodyField, ownsRecord, titleOwner } from '../middleware/ownership';

const router = Router();

// Comics belong to the owner of their title's publisher (a signed-in user or a guest).
// (GET /regular and /variant listed every user's comics; nothing used them, so they're gone.)
router.use(requireIdentity);

// GET /comicbook/titles/:coboTitleId
// Get all comic books for a specific title
router.get(
  '/titles/:coboTitleId',
  ownsRecord(titleOwner, 'coboTitleId'),
  comicbookCtrl.getComicBooks
);

// POST /comicbook
// Create a new comic book
router.post(
  '/',
  ownsBodyField('titleID', titleOwner),
  validationCtrl.validate('createComicBook'),
  comicbookCtrl.createComicBook
);

// GET /comicbook/:id
// Get a single comic book by ID
router.get(
  '/:id',
  ownsRecord(comicOwner),
  comicbookCtrl.getOneById
);

// PUT /comicbook/:id
// Update a comic book
router.put(
  '/:id',
  ownsRecord(comicOwner),
  ownsBodyField('comicbooktitlerelId', titleOwner, false),
  validationCtrl.validate('editComicBook'),
  comicbookCtrl.updateComicBook
);

// DELETE /comicbook/:id
// Delete a comic book
router.delete(
  '/:id',
  ownsRecord(comicOwner),
  validationCtrl.validate('deleteComicBook'),
  comicbookCtrl.removeComicBook
);

export default router;