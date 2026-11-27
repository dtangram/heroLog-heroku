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
import type { JsonValue } from '../types/json';
import { verifySessionToken } from '../utils/tokens';

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
export const startGuestSession = async (requestedId?: JsonValue): Promise<GuestSession> => {
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
export const readGuestToken = (token: JsonValue | undefined): string | null => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = verifySessionToken(token, secret());
    return payload.guest && UUID.test(payload.id) ? payload.id : null;
  } catch {
    return null;
  }
};

export interface ClaimResult {
  guestId: string;
  /** Guest publishers the account didn't have, moved over whole */
  publishersMoved: number;
  /** Guest publishers merged into the account's publisher of the same name */
  publishersMerged: number;
}

/** Names match ignoring case and surrounding spaces: "Marvel" = " marvel " */
const SAME_NAME = (a: string, b: string) => `lower(btrim(${a})) = lower(btrim(${b}))`;

/** Each guest publisher paired with the account's publisher of the same name (the oldest, if several) */
const PUBLISHER_PAIRS = `
  SELECT DISTINCT ON (g.id) g.id AS guest_pub, a.id AS account_pub
    FROM "CollectionPublishers" g
    JOIN "CollectionPublishers" a
      ON a."collectpubUsersId" = :userId AND ${SAME_NAME('a."publisherName"', 'g."publisherName"')}
   WHERE g."collectpubUsersId" = :guestId
   ORDER BY g.id, a."createdAt"`;

/** Inside those publishers, each guest title paired with the account's title of the same name */
const TITLE_PAIRS = `
  SELECT DISTINCT ON (gt.id) gt.id AS guest_title, at.id AS account_title
    FROM (${PUBLISHER_PAIRS}) pp
    JOIN "ComicBookTitles" gt ON gt."collectpubId" = pp.guest_pub
    JOIN "ComicBookTitles" at
      ON at."collectpubId" = pp.account_pub AND ${SAME_NAME('at."cbTitle"', 'gt."cbTitle"')}
   ORDER BY gt.id, at."createdAt"`;

/**
 * Moves the guest's collection into the account, merging rather than
 * duplicating: a guest "Marvel" joins the account's "Marvel", and a guest
 * "Batman" under it joins the account's "Batman", comics and all.
 */
const MERGE_STEPS = [
  // 1. Comics in a matching title move to the account's title
  `UPDATE "ComicBooks" cb SET "comicbooktitlerelId" = tp.account_title, "updatedAt" = NOW()
     FROM (${TITLE_PAIRS}) tp
    WHERE cb."comicbooktitlerelId" = tp.guest_title`,
  // 2. ...leaving those guest titles empty
  `DELETE FROM "ComicBookTitles" WHERE id IN (SELECT guest_title FROM (${TITLE_PAIRS}) tp)`,
  // 3. Other titles in a matching publisher move to the account's publisher
  `UPDATE "ComicBookTitles" t SET "collectpubId" = pp.account_pub, "updatedAt" = NOW()
     FROM (${PUBLISHER_PAIRS}) pp
    WHERE t."collectpubId" = pp.guest_pub`,
];

/** Search embeddings live in a separate database; moved by routes/search.ts. */
export type MoveEmbeddings = (fromId: string, toId: string) => Promise<void>;

/**
 * Moves a guest's collection (publishers, and with them their titles and
 * comics) to the signed-in account, then ends the guest session.
 */
export const claimGuestCollection = async (
  userId: string,
  guestToken: JsonValue | undefined,
  moveEmbeddings?: MoveEmbeddings
): Promise<ClaimResult | null> => {
  const guestId = readGuestToken(guestToken);
  if (!guestId || guestId === userId) return null;

  const counts = await db.sequelize.transaction(async (transaction: Transaction) => {
    const options = { replacements: { userId, guestId }, transaction };

    for (const sql of MERGE_STEPS) {
      await db.sequelize.query(sql, options);
    }

    // 4. The matching guest publishers are now empty
    // BULKDELETE and BULKUPDATE queries return how many rows they changed
    const merged = await db.sequelize.query(
      `DELETE FROM "CollectionPublishers" WHERE id IN (SELECT guest_pub FROM (${PUBLISHER_PAIRS}) pp)`,
      { ...options, type: QueryTypes.BULKDELETE }
    );

    // 5. Publishers the account didn't have move over whole
    const moved = await db.sequelize.query(
      `UPDATE "CollectionPublishers" SET "collectpubUsersId" = :userId, "updatedAt" = NOW()
        WHERE "collectpubUsersId" = :guestId`,
      { ...options, type: QueryTypes.BULKUPDATE }
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

    return { publishersMoved: moved, publishersMerged: merged };
  });

  if (moveEmbeddings) {
    try {
      await moveEmbeddings(guestId, userId);
    } catch (error) {
      // Search re-prepares any comics it's missing, so this isn't fatal
      console.error('Could not move search embeddings for claimed guest collection:', error);
    }
  }

  return { guestId, ...counts };
};