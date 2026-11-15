import { Response, NextFunction } from 'express';
import db from '../models';
import { AuthRequest } from './auth';

/**
 * Ownership checks for sale listings. Use after authenticateToken, which
 * puts the signed-in user's id on req.user.
 */

const getSaleListModel = () => (db as any).SaleLists || (db as any).SaleList;

/**
 * POST /salelist: a new listing always belongs to the signed-in user.
 * Rejects a request that tries to list a comic under someone else's account.
 * Runs before validation, so saleUsersId is always present.
 */
export const assignSaleListOwner = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Sign in to list a comic for sale' });
    return;
  }

  const requestedOwner = req.body?.saleUsersId;
  if (requestedOwner && requestedOwner !== userId) {
    res.status(403).json({ success: false, error: 'You can only list comics from your own account' });
    return;
  }

  req.body = { ...req.body, saleUsersId: userId };
  next();
};

/**
 * PUT and DELETE /salelist/:id: only the listing's seller can change or delete it.
 * Also stops an update from moving the listing to another account.
 */
export const requireSaleListOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, error: 'Sign in to change your listings' });
    return;
  }

  try {
    const listing = await getSaleListModel().findByPk(req.params.id, {
      attributes: ['id', 'saleUsersId'],
    });

    if (!listing) {
      res.status(404).json({ success: false, error: 'Sale listing not found' });
      return;
    }

    if (listing.saleUsersId !== userId) {
      res.status(403).json({ success: false, error: 'You can only change your own listings' });
      return;
    }

    // Ownership never changes through an update
    if (req.body && typeof req.body === 'object') {
      delete req.body.saleUsersId;
    }

    next();
  } catch (error) {
    console.error('Error checking sale listing owner:', error);
    res.status(500).json({ success: false, error: 'Could not check who owns this listing' });
  }
};