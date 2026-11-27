import { Router } from 'express';
import {
  getWishLists,
  getOneById,
  createWishList,
  updateWishList,
  removeWishList
} from '../controllers/wishlist';
import { validate } from '../controllers/validation';
import { requireAccount } from '../middleware/auth';
import { ownsBodyField, ownsParam, ownsRecord, wishOwner } from '../middleware/ownership';

const router = Router();

// A wish list is private to its signed-in owner. (GET /regular, GET /variant
// and POST /search read every user's wish list; nothing used them, so they're gone.)
router.use(requireAccount);

// GET /wishlist/signups/:userId
// Get all wish list comics for the signed-in user
router.get(
  '/signups/:userId',
  ownsParam('userId'),
  getWishLists
);

// POST /wishlist/
// Add a comic to your own wish list
router.post(
  '/',
  ownsBodyField('wishUsersId'),
  validate('createWishList'),
  createWishList
);

// GET /wishlist/:id
// Get one of your wish list comics
router.get(
  '/:id',
  ownsRecord(wishOwner),
  getOneById
);

// PUT /wishlist/:id
// Update one of your wish list comics
router.put(
  '/:id',
  ownsRecord(wishOwner),
  ownsBodyField('wishUsersId', undefined, false),
  validate('editWishList'),
  updateWishList
);

// DELETE /wishlist/:id
// Delete one of your wish list comics
router.delete(
  '/:id',
  ownsRecord(wishOwner),
  validate('deleteWishList'),
  removeWishList
);

export default router;