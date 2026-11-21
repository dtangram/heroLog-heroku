/**
 * Guest sessions: people can build a collection, see their Intel and search
 * it without an account. Each guest gets a token for their anonymous ID, and
 * the API only shows a collection to the token's owner (middleware/ownership.ts).
 *
 * When a guest signs in or signs up, claimGuestCollection moves their
 * collection to the account, so nothing is lost.
 */
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { QueryTypes, Transaction } from 'sequelize';
import db from '../models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guests keep their collection until they clear their browser, so the token lasts. */
const GUEST_TOKEN_LIFETIME = '3650d';

export interface GuestSession {
  id: string;
  token: string;
}

const secret = (): string => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
};

const signGuestToken = (id: string): string =>
  jwt.sign({ id, guest: true }, secret(), { expiresIn: GUEST_TOKEN_LIFETIME } as jwt.SignOptions);

/** Records the id as handed out; false if it already was. */
const reserve = async (id: string): Promise<boolean> => {
  const rows = await db.sequelize.query<{ id: string }>(
    `INSERT INTO "GuestSessions" (id, "createdAt", "updatedAt")
     VALUES (:id, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    { replacements: { id }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
};

const isAccountId = async (id: string): Promise<boolean> => {
  const rows = await db.sequelize.query(`SELECT 1 FROM "Users" WHERE id = :id`, {
    replacements: { id },
    type: QueryTypes.SELECT,
  });
  return rows.length > 0;
};

/**
 * Starts a guest session. A guest from before sessions existed sends the
 * anonymous ID their browser already has, and keeps their collection if
 * that ID hasn't been handed out yet. Anyone else gets a new, empty one.
 */
export const startGuestSession = async (requestedId?: unknown): Promise<GuestSession> => {
  if (typeof requestedId === 'string' && UUID.test(requestedId)) {
    const id = requestedId.toLowerCase();
    if (!(await isAccountId(id)) && (await reserve(id))) {
      return { id, token: signGuestToken(id) };
    }
  }

  const id = randomUUID();
  await reserve(id);
  return { id, token: signGuestToken(id) };
};

/** The guest id from a guest token, or null if it isn't a valid one. */
export const readGuestToken = (token: unknown): string | null => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, secret()) as { id?: string; guest?: boolean };
    return payload?.guest && payload.id && UUID.test(payload.id) ? payload.id : null;
  } catch {
    return null;
  }
};

export interface ClaimResult {
  guestId: string;
  publishersMoved: number;
}

/** Search embeddings live in a separate database; moved by routes/search.ts. */
export type MoveEmbeddings = (fromId: string, toId: string) => Promise<void>;

/**
 * Moves a guest's collection (publishers, and with them their titles and
 * comics) to the signed-in account, then ends the guest session.
 */
export const claimGuestCollection = async (
  userId: string,
  guestToken: unknown,
  moveEmbeddings?: MoveEmbeddings
): Promise<ClaimResult | null> => {
  const guestId = readGuestToken(guestToken);
  if (!guestId || guestId === userId) return null;

  const publishersMoved = await db.sequelize.transaction(async (transaction: Transaction) => {
    const [, moved] = await db.sequelize.query(
      `UPDATE "CollectionPublishers" SET "collectpubUsersId" = :userId, "updatedAt" = NOW()
        WHERE "collectpubUsersId" = :guestId`,
      { replacements: { userId, guestId }, transaction }
    );

    // Both collections changed, so their saved Intel analyses are out of date
    await db.sequelize.query(
      `DELETE FROM "CollectionAnalyses" WHERE "analysisUsersId" IN (:userId, :guestId)`,
      { replacements: { userId, guestId }, transaction }
    );

    await db.sequelize.query(`DELETE FROM "GuestSessions" WHERE id = :guestId`, {
      replacements: { guestId },
      transaction,
    });

    return Number((moved as any)?.rowCount ?? moved ?? 0);
  });

  if (moveEmbeddings) {
    try {
      await moveEmbeddings(guestId, userId);
    } catch (error) {
      // Search re-prepares any comics it's missing, so this isn't fatal
      console.error('Could not move search embeddings for claimed guest collection:', error);
    }
  }

  return { guestId, publishersMoved };
};