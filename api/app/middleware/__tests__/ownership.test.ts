/// <reference types="jest" />
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { createRequest, createResponse, RequestOptions } from 'node-mocks-http';
import type { ApiResult } from '../../types/api';
import type { SessionToken } from '../../utils/tokens';

const mockQuery = jest.fn();
jest.mock('../../models', () => ({ __esModule: true, default: { sequelize: { query: mockQuery } } }));

import { ownsBodyField, ownsParam, ownsRecord, publisherOwner } from '../ownership';
import { AuthRequest, requireAccount, requireIdentity } from '../auth';

const query = mockQuery;

const SECRET = 'test-secret-that-is-long-enough-for-hero-log';
const OWNER = '11111111-2222-4333-8444-555555555555';
const OTHER = '99999999-2222-4333-8444-555555555555';
const PUB = 'aaaaaaaa-2222-4333-8444-555555555555';

/** A real Express reply that records what was sent */
const res = () => {
  const r = createResponse<Response<ApiResult>>();
  jest.spyOn(r, 'status');
  jest.spyOn(r, 'json');
  return r;
};

/** A request with these parts; user is who the token says is asking */
const reqWith = ({ user, ...fields }: RequestOptions & { user?: SessionToken }) => {
  const req = createRequest<AuthRequest>({ params: {}, body: {}, headers: {}, ...fields });
  req.user = user;
  return req;
};

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => query.mockReset());

describe('requireIdentity and requireAccount', () => {
  const bearer = (payload: object) => ({ authorization: `Bearer ${jwt.sign(payload, SECRET)}` });

  it('accept a signed-in user or a guest; refuse no token or a forged one', () => {
    for (const [headers, account, identity] of [
      [bearer({ id: OWNER }), true, true],
      [bearer({ id: OWNER, guest: true }), false, true],
      [{}, false, false],
      [{ authorization: `Bearer ${jwt.sign({ id: OWNER }, 'some-other-secret')}` }, false, false],
    ] as Array<[Record<string, string>, boolean, boolean]>) {
      const nextA = jest.fn();
      requireAccount(reqWith({ headers }), res(), nextA);
      expect(nextA.mock.calls.length > 0).toBe(account);

      const nextI = jest.fn();
      const r = res();
      requireIdentity(reqWith({ headers }), r, nextI);
      expect(nextI.mock.calls.length > 0).toBe(identity);
      if (!identity) expect(r.status).toHaveBeenCalledWith(401);
    }
  });
});

describe('ownsParam', () => {
  it("lets you open your own /…/:userId and answers 404 for anyone else's", () => {
    const next = jest.fn();
    ownsParam('userId')(reqWith({ params: { userId: OWNER }, user: { id: OWNER } }), res(), next);
    expect(next).toHaveBeenCalled();

    const r = res();
    const blocked = jest.fn();
    ownsParam('userId')(reqWith({ params: { userId: OWNER }, user: { id: OTHER } }), r, blocked);
    expect(blocked).not.toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(404);
  });
});

describe('ownsRecord', () => {
  it('looks up the owner and allows only them', async () => {
    query.mockResolvedValue([{ owner: OWNER }]);

    const next = jest.fn();
    await ownsRecord(publisherOwner)(reqWith({ params: { id: PUB }, user: { id: OWNER } }), res(), next);
    expect(next).toHaveBeenCalled();
    expect(query.mock.calls[0][1].replacements).toEqual({ id: PUB });

    const r = res();
    await ownsRecord(publisherOwner)(reqWith({ params: { id: PUB }, user: { id: OTHER } }), r, jest.fn());
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it("answers 404 for something that doesn't exist or an invalid id, without querying", async () => {
    query.mockResolvedValue([]);
    const r = res();
    await ownsRecord(publisherOwner)(reqWith({ params: { id: PUB }, user: { id: OWNER } }), r, jest.fn());
    expect(r.status).toHaveBeenCalledWith(404);

    query.mockClear();
    const r2 = res();
    await ownsRecord(publisherOwner)(reqWith({ params: { id: 'regular' }, user: { id: OWNER } }), r2, jest.fn());
    expect(query).not.toHaveBeenCalled();
    expect(r2.status).toHaveBeenCalledWith(404);
  });
});

describe('ownsBodyField', () => {
  it("won't create something in someone else's collection", async () => {
    const r = res();
    await ownsBodyField('collectpubUsersId')(reqWith({ body: { collectpubUsersId: OTHER }, user: { id: OWNER } }), r, jest.fn());
    expect(r.status).toHaveBeenCalledWith(404);

    const next = jest.fn();
    await ownsBodyField('collectpubUsersId')(reqWith({ body: { collectpubUsersId: OWNER }, user: { id: OWNER } }), res(), next);
    expect(next).toHaveBeenCalled();
  });

  it("checks the parent record's owner (a title under someone else's publisher)", async () => {
    query.mockResolvedValue([{ owner: OTHER }]);
    const r = res();
    await ownsBodyField('collectpubId', publisherOwner)(reqWith({ body: { collectpubId: PUB }, user: { id: OWNER } }), r, jest.fn());
    expect(r.status).toHaveBeenCalledWith(404);
  });

  it('requires the field when creating, but not when updating', async () => {
    const r = res();
    await ownsBodyField('collectpubUsersId')(reqWith({ body: {}, user: { id: OWNER } }), r, jest.fn());
    expect(r.status).toHaveBeenCalledWith(400);

    const next = jest.fn();
    await ownsBodyField('collectpubUsersId', undefined, false)(reqWith({ body: {}, user: { id: OWNER } }), res(), next);
    expect(next).toHaveBeenCalled();
  });
});