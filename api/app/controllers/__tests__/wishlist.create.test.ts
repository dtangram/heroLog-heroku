/// <reference types="jest" />
import { Request, Response } from 'express';
import { createRequest, createResponse } from 'node-mocks-http';
import type { IdResult, WishListResult } from '../../types/api';

const mockUpdate = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../models', () => ({
  __esModule: true,
  default: { WishLists: { update: mockUpdate, create: mockCreate } },
}));

const mockFindCover = jest.fn();
jest.mock('../../services/covers', () => ({ findCover: mockFindCover }));

import { addCoverInBackground, createWishList, updateWishList, WishListBody } from '../wishlist';

const WISH_ID = '185e2f4a-3816-4184-8340-e35ecdde5a22';
const USER_ID = '11111111-2222-4333-8444-555555555555';

/** A real Express reply that records what was sent */
const updateRes = () => {
  const res = createResponse<Response<WishListResult>>();
  jest.spyOn(res, 'status');
  jest.spyOn(res, 'json');
  return res;
};
const createRes = () => {
  const res = createResponse<Response<IdResult>>();
  jest.spyOn(res, 'status');
  jest.spyOn(res, 'json');
  return res;
};

// What the wishlist form sends: every field as a string, blanks as ""
const formBody = (overrides: WishListBody = {}): WishListBody & { userId: string } => ({
  id: WISH_ID,
  comicBookTitle: 'Superman',
  comicIssue: '25',
  comicBookVolume: '',
  comicBookYear: '2025',
  comicBookPublisher: 'DC Comics',
  comicBookCover: 'https://example.com/superman-25.jpg',
  type: 'regular',
  userId: USER_ID,
  ...overrides,
});

const update = async (body: WishListBody) => {
  const res = updateRes();
  await updateWishList(createRequest<Request<{ id: string }, WishListResult, WishListBody>>({ params: { id: WISH_ID }, body }), res);
  return res;
};

describe('updateWishList number fields', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdate.mockReset();
    mockUpdate.mockImplementation(async (data: object) => [1, [{ toJSON: () => ({ id: WISH_ID, ...data }) }]]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepts the issue, volume and year as the form sends them (blank volume)', async () => {
    const res = await update(formBody());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ comicIssue: 25, comicBookVolume: null, comicBookYear: 2025 }),
      expect.anything()
    );
  });

  it('accepts a blank year', async () => {
    const res = await update(formBody({ comicBookYear: '' }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ comicBookYear: null }), expect.anything());
  });

  it('still accepts numbers sent as numbers', async () => {
    const res = await update(formBody({ comicIssue: 25, comicBookYear: 2025 }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each([
    [{ comicIssue: '25A' }, 'Comic issue must be a valid number'],
    [{ comicIssue: '0' }, 'Comic issue must be 1 or greater'],
    [{ comicBookYear: '1850' }, 'Comic book year must be between 1900 and current year + 1'],
  ])('rejects invalid values %o', async (overrides, message) => {
    const res = await update(formBody(overrides));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: message });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
describe('covers for wish list items added without one', () => {
  const create = async (body: WishListBody) => {
    const res = createRes();
    await createWishList(createRequest<Request<Record<string, string>, IdResult, WishListBody>>({ body }), res);
    return res;
  };

  // What Add to Wish List on the Search page sends: no cover
  const fromSearch: WishListBody = {
    comicBookTitle: 'Batman', comicIssue: '497', comicBookYear: '1993',
    comicBookPublisher: 'DC Comics', type: 'regular', wishUsersId: USER_ID,
  };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockCreate.mockReset().mockImplementation(async (data: object) => ({ id: WISH_ID, ...data }));
    mockUpdate.mockReset().mockResolvedValue([1]);
    mockFindCover.mockReset().mockResolvedValue('https://comicvine.gamespot.com/a/uploads/batman-497.jpg');
  });
  afterEach(() => jest.restoreAllMocks());

  it('looks up the cover on Comic Vine', async () => {
    const res = await create(fromSearch);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockFindCover).toHaveBeenCalledWith({ series: 'Batman', issue: 497, year: 1993 });
  });

  it("leaves a cover the collector chose alone", async () => {
    await create({ ...fromSearch, comicBookCover: 'https://my-bucket.example/batman-497.jpg' });

    expect(mockFindCover).not.toHaveBeenCalled();
  });

  it('saves the cover only if the item still has none', async () => {
    await addCoverInBackground(WISH_ID, 'Batman', 497, 1993);

    expect(mockUpdate).toHaveBeenCalledWith(
      { comicBookCover: 'https://comicvine.gamespot.com/a/uploads/batman-497.jpg' },
      expect.objectContaining({ where: { id: WISH_ID, comicBookCover: null } })
    );
  });

  it('keeps the placeholder when no cover is found', async () => {
    mockFindCover.mockResolvedValue(null);

    await addCoverInBackground(WISH_ID, 'Batman', 497, 1993);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("files the new item under the ID the app gave it, so the app can load, edit or delete it straight away", async () => {
    const appId = '0c045a2f-5683-41c4-86bf-e062366dcf4c';

    await create({ ...fromSearch, id: appId });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ id: appId }));
  });
});