/// <reference types="jest" />
import jwt from 'jsonwebtoken';

const query = jest.fn();
const transaction = jest.fn(async (fn: any) => fn('tx'));
jest.mock('../../models', () => ({
  __esModule: true,
  default: { sequelize: { query: (...args: any[]) => query(...args), transaction: (fn: any) => transaction(fn) } },
}));

import { claimGuestCollection, readGuestToken, startGuestSession } from '../guestSession';

const SECRET = 'test-secret-that-is-long-enough-for-hero-log';
const OLD_GUEST = '11111111-2222-4333-8444-555555555555';
const USER = '99999999-2222-4333-8444-555555555555';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => query.mockReset());

/** Simulates the database: which ids are accounts, which are already handed out */
const database = ({ accounts = [] as string[], reserved = [] as string[] } = {}) =>
  query.mockImplementation(async (sql: string, options: any) => {
    const id = options?.replacements?.id;
    if (sql.includes('FROM "Users"')) return accounts.includes(id) ? [{ 1: 1 }] : [];
    if (sql.includes('INSERT INTO "GuestSessions"')) {
      if (reserved.includes(id)) return [];
      reserved.push(id);
      return [{ id }];
    }
    return [[], { rowCount: 2 }];
  });

describe('startGuestSession', () => {
  it("keeps an existing guest's anonymous ID the first time it's asked for", async () => {
    database();
    const session = await startGuestSession(OLD_GUEST);
    expect(session.id).toBe(OLD_GUEST);
    expect(readGuestToken(session.token)).toBe(OLD_GUEST);
  });

  it('gives anyone asking for an ID that was already handed out a new one', async () => {
    database({ reserved: [OLD_GUEST] });
    const session = await startGuestSession(OLD_GUEST);
    expect(session.id).not.toBe(OLD_GUEST);
  });

  it("never hands out a guest token for an account's ID", async () => {
    database({ accounts: [USER] });
    const session = await startGuestSession(USER);
    expect(session.id).not.toBe(USER);
  });

  it('makes a new ID when none (or garbage) is sent', async () => {
    database();
    const session = await startGuestSession('not-a-uuid');
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(jwt.verify(session.token, SECRET)).toMatchObject({ id: session.id, guest: true });
  });
});

describe('readGuestToken', () => {
  it("rejects account tokens and forged tokens", () => {
    expect(readGuestToken(jwt.sign({ id: USER }, SECRET))).toBeNull();
    expect(readGuestToken(jwt.sign({ id: OLD_GUEST, guest: true }, 'wrong-secret'))).toBeNull();
    expect(readGuestToken(undefined)).toBeNull();
  });
});

describe('claimGuestCollection', () => {
  it("moves the guest's publishers to the account and ends the guest session", async () => {
    database();
    const moveEmbeddings = jest.fn(async () => undefined);
    const token = jwt.sign({ id: OLD_GUEST, guest: true }, SECRET);

    const result = await claimGuestCollection(USER, token, moveEmbeddings);

    expect(result).toEqual({ guestId: OLD_GUEST, publishersMoved: 2, publishersMerged: 2 });
    const sqls: string[] = query.mock.calls.map(([sql]) => sql);
    // Same-named titles and publishers are merged before the rest moves over
    const mergeComics = sqls.findIndex(sql => sql.startsWith('UPDATE "ComicBooks"'));
    const moveRest = sqls.findIndex(sql => sql.includes('UPDATE "CollectionPublishers" SET "collectpubUsersId"'));
    expect(mergeComics).toBeGreaterThanOrEqual(0);
    expect(moveRest).toBeGreaterThan(mergeComics);
    expect(sqls.some(sql => sql.includes('lower(btrim('))).toBe(true);
    expect(sqls.some(sql => sql.includes('DELETE FROM "GuestSessions"'))).toBe(true);
    expect(moveEmbeddings).toHaveBeenCalledWith(OLD_GUEST, USER);
  });

  it('moves nothing for a missing or invalid guest token', async () => {
    expect(await claimGuestCollection(USER, 'garbage')).toBeNull();
    expect(await claimGuestCollection(USER, jwt.sign({ id: OLD_GUEST }, SECRET))).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});