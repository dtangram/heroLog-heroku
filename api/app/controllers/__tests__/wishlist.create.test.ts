/// <reference types="jest" />
import { Request, Response } from 'express';

const mockUpdate = jest.fn();

jest.mock('../../models', () => ({
  __esModule: true,
  default: { WishLists: { update: (...args: unknown[]) => mockUpdate(...args) } },
}));

import { updateWishList } from '../wishlist';

const WISH_ID = '185e2f4a-3816-4184-8340-e35ecdde5a22';
const USER_ID = '11111111-2222-4333-8444-555555555555';

const mockRes = () => {
  const res = {} as Response & { status: jest.Mock; json: jest.Mock };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// What the wishlist form sends: every field as a string, blanks as ""
const formBody = (overrides: Record<string, unknown> = {}) => ({
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

const update = async (body: Record<string, unknown>) => {
  const res = mockRes();
  await updateWishList({ params: { id: WISH_ID }, body } as unknown as Request<any, any, any>, res);
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