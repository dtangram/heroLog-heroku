/// <reference types="jest" />
import { Request, Response } from 'express';

const mockCreate = jest.fn();

jest.mock('../../models', () => ({
  __esModule: true,
  default: { ComicBooks: { create: (...args: unknown[]) => mockCreate(...args) } },
}));
jest.mock('../../utils/autoEnrich', () => ({ autoEnrichComic: jest.fn().mockResolvedValue(undefined) }));
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn(),
  })),
}));

import { createComicBook } from '../comicbook';

const TITLE_ID = '11111111-2222-4333-8444-555555555555';

const mockRes = () => {
  const res = {} as Response & { status: jest.Mock; json: jest.Mock };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const create = async (year: unknown) => {
  const res = mockRes();
  const req = {
    body: {
      title: 'The Amazing Spider-Man',
      comicIssue: '395',
      type: 'regular',
      titleID: TITLE_ID,
      year,
    },
  } as unknown as Request<any, any, any>;
  await createComicBook(req, res);
  return res;
};

describe('createComicBook year validation', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockReset();
    mockCreate.mockImplementation(async data => ({ toJSON: () => ({ id: 'new-id', ...data }) }));
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepts a year sent as a string from the form ("1994")', async () => {
    const res = await create('1994');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ year: 1994 }));
  });

  it('accepts a numeric year', async () => {
    expect((await create(1994)).status).toHaveBeenCalledWith(201);
  });

  it('accepts an empty year', async () => {
    const res = await create('');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ year: null }));
  });

  it.each(['1850', 'abc', String(new Date().getFullYear() + 5)])('rejects an invalid year (%s)', async year => {
    const res = await create(year);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});