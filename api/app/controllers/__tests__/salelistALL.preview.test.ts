/// <reference types="jest" />
const findAll = jest.fn();
jest.mock('../../models', () => ({ __esModule: true, default: { SaleLists: { findAll: (...args: any[]) => findAll(...args) } } }));

import { getSalePreview, previewLimit, PREVIEW_FIELDS } from '../salelistALL';

const res = () => {
  const r: any = {};
  r.status = jest.fn(() => r);
  r.json = jest.fn(() => r);
  return r;
};

const listing = { id: 's1', comicBookTitle: 'Batman', comicIssue: 497, price: '24.99' };

beforeEach(() => findAll.mockReset());

describe('previewLimit', () => {
  it.each([
    [undefined, 8],
    ['4', 4],
    ['500', 12],
    ['0', 8],
    ['-3', 8],
    ['lots', 8],
  ])('%s → %s', (input, expected) => {
    expect(previewLimit(input)).toBe(expected);
  });
});

describe('getSalePreview', () => {
  it('returns the newest listings without any seller details', async () => {
    findAll.mockResolvedValue([{ toJSON: () => listing }]);
    const r = res();

    await getSalePreview({ query: { limit: '4' } } as any, r);

    expect(findAll).toHaveBeenCalledWith({
      attributes: PREVIEW_FIELDS,
      order: [['createdAt', 'DESC']],
      limit: 4,
    });
    expect(PREVIEW_FIELDS).not.toContain('saleUsersId');
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.json).toHaveBeenCalledWith({ success: true, data: [listing], count: 1 });
  });

  it('answers 500 if the database fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    findAll.mockRejectedValue(new Error('down'));
    const r = res();

    await getSalePreview({ query: {} } as any, r);

    expect(r.status).toHaveBeenCalledWith(500);
  });
});