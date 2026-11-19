/// <reference types="jest" />
import { Request, Response } from 'express';

const mockUpdate = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../models', () => ({
  __esModule: true,
  default: {
    SaleLists: {
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { createSaleList, updateSaleList } from '../salelist';

const SALE_ID = '185e2f4a-3816-4184-8340-e35ecdde5a22';
const USER_ID = '11111111-2222-4333-8444-555555555555';

const mockRes = () => {
  const res = {} as Response & { status: jest.Mock; json: jest.Mock };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// What the sale form sends: every field as a string, blanks as ""
const formBody = (overrides: Record<string, unknown> = {}) => ({
  id: SALE_ID,
  comicBookTitle: 'Superman',
  comicIssue: '25',
  comicBookVolume: '',
  comicBookYear: '2025',
  comicBookPublisher: 'DC Comics',
  comicBookCover: 'https://example.com/superman-25.jpg',
  type: 'regular',
  userId: USER_ID,
  saleUsersId: USER_ID,
  ...overrides,
});

const update = async (body: Record<string, unknown>) => {
  const res = mockRes();
  await updateSaleList({ params: { id: SALE_ID }, body } as unknown as Request<any, any, any>, res);
  return res;
};

describe('updateSaleList number fields', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdate.mockReset();
    mockUpdate.mockImplementation(async (data: object) => [1, [{ toJSON: () => ({ id: SALE_ID, ...data }) }]]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepts the issue, volume and year as the form sends them (Superman #25)', async () => {
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

describe('sale price and condition', () => {
  const create = async (body: Record<string, unknown>) => {
    const res = mockRes();
    await createSaleList({ body } as unknown as Request<any, any, any>, res);
    return res;
  };

  // A new listing as the sale form sends it, now with a price and condition
  const newListing = (overrides: Record<string, unknown> = {}) => {
    const { id, userId, ...rest } = formBody({ price: '12.50', comicCondition: 'Near Mint', ...overrides });
    return rest;
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockReset();
    mockCreate.mockImplementation(async (data: object) => ({ id: SALE_ID, ...data }));
    mockUpdate.mockReset();
    mockUpdate.mockImplementation(async (data: object) => [1, [{ toJSON: () => ({ id: SALE_ID, ...data }) }]]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('saves the price as a number and the condition as its standard name', async () => {
    const res = await create(newListing({ comicCondition: 'near mint' }));

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ price: 12.5, comicCondition: 'Near Mint' }));
  });

  it.each([
    ['12', 12],
    ['12.5', 12.5],
    ['$1,250.00', 1250],
    [7, 7],
  ])('reads the price %p as %p', async (price, expected) => {
    const res = await create(newListing({ price }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ price: expected }));
  });

  it.each([
    [{ price: '' }, 'Price is required'],
    [{ comicCondition: '' }, 'Condition is required'],
    [{ price: 'twelve' }, 'Price must be a dollar amount, like 12.50'],
    [{ price: '12.505' }, 'Price must be a dollar amount, like 12.50'],
    [{ price: '-3' }, 'Price must be a dollar amount, like 12.50'],
    [{ price: '0' }, 'Price must be at least $0.01'],
    [{ price: '100000' }, 'Price must be $99,999.99 or less'],
    [{ comicCondition: 'Pristine' }, 'Condition must be one of: Mint, Near Mint, Very Fine, Fine, Very Good, Good, Fair, Poor'],
  ])('rejects a new listing with %o', async (overrides, message) => {
    const res = await create(newListing(overrides));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: message });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('updates the price and condition when the form sends them', async () => {
    const res = await update(formBody({ price: '20', comicCondition: 'Very Fine' }));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ price: 20, comicCondition: 'Very Fine' }),
      expect.anything()
    );
  });

  it('still updates an older listing when no price or condition is sent', async () => {
    const res = await update(formBody());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each([
    [{ price: '' }, 'Price is required'],
    [{ comicCondition: '' }, 'Condition is required'],
  ])('will not blank out %o on an update', async (overrides, message) => {
    const res = await update(formBody(overrides));

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: message });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});