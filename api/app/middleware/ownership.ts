import { Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import db from '../models';
import type { AuthRequest } from './auth';
import type { ApiResult } from '../types/api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the owner's user (or guest) id, or null if not found. */
export type OwnerLookup = (id: string) => Promise<string | null>;

const ownerQuery = (sql: string): OwnerLookup => async id => {
  if (!UUID.test(String(id))) return null;
  const rows = await db.sequelize.query<{ owner: string | null }>(sql, {
    replacements: { id },
    type: QueryTypes.SELECT,
  });
  return rows[0]?.owner ?? null;
};

export const publisherOwner: OwnerLookup = ownerQuery(
  `SELECT "collectpubUsersId" AS owner FROM "CollectionPublishers" WHERE id = :id`
);

export const titleOwner: OwnerLookup = ownerQuery(
  `SELECT cp."collectpubUsersId" AS owner
     FROM "ComicBookTitles" cbt
     JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
    WHERE cbt.id = :id`
);

export const comicOwner: OwnerLookup = ownerQuery(
  `SELECT cp."collectpubUsersId" AS owner
     FROM "ComicBooks" cb
     JOIN "ComicBookTitles" cbt ON cb."comicbooktitlerelId" = cbt.id
     JOIN "CollectionPublishers" cp ON cbt."collectpubId" = cp.id
    WHERE cb.id = :id`
);

export const saleOwner: OwnerLookup = ownerQuery(
  `SELECT "saleUsersId" AS owner FROM "SaleLists" WHERE id = :id`
);

export const wishOwner: OwnerLookup = ownerQuery(
  `SELECT "wishUsersId" AS owner FROM "WishLists" WHERE id = :id`
);

/** A message belongs to its recipient */
export const messageRecipient: OwnerLookup = ownerQuery(
  `SELECT "messageUsersId" AS owner FROM "Messagings" WHERE id = :id`
);

const notFound = (res: Response<ApiResult>) => res.status(404).json({ success: false, error: 'Not found' });

const sameId = (a: string | null | undefined, b: string | null | undefined) =>
  typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();

/** The route's :param must be the requester's own id (e.g. /api/insights/:userId). */
export const ownsParam = (param: string) =>
  (req: AuthRequest, res: Response<ApiResult>, next: NextFunction): void => {
    if (!sameId(req.params[param], req.user?.id)) {
      notFound(res);
      return;
    }
    next();
  };

/** The record named by :param must belong to the requester. */
export const ownsRecord = (lookup: OwnerLookup, param = 'id') =>
  async (req: AuthRequest, res: Response<ApiResult>, next: NextFunction): Promise<void> => {
    try {
      const owner = await lookup(req.params[param]);
      if (!sameId(owner, req.user?.id)) {
        notFound(res);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/**
 * A body field that sets ownership must point at the requester:
 * - without lookup, the field is a user id (collectpubUsersId)
 * - with lookup, the field names a record they must own (collectpubId)
 * required: the field must be present (creating); otherwise only checked if sent (updating).
 */
export const ownsBodyField = (field: string, lookup?: OwnerLookup, required = true) =>
  async (req: AuthRequest, res: Response<ApiResult>, next: NextFunction): Promise<void> => {
    const value = req.body?.[field];

    if (value === undefined || value === null || value === '') {
      if (required) {
        res.status(400).json({ success: false, error: `${field} is required` });
        return;
      }
      next();
      return;
    }

    try {
      const owner = lookup ? await lookup(String(value)) : String(value);
      if (!sameId(owner, req.user?.id)) {
        notFound(res);
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };