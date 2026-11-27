/// <reference types="jest" />
import { Request, Response } from 'express';
import { createRequest, createResponse } from 'node-mocks-http';
import type { ComicBookResult } from '../../types/api';

const mockCreate = jest.fn();
const mockFindAll = jest.fn().mockResolvedValue([]);

jest.mock('../../models', () => ({
  __esModule: true,
  default: { ComicBooks: { create: mockCreate, findAll: mockFindAll } },
}));
jest.mock('../../utils/autoEnrich', () => ({ autoEnrichComic: jest.fn().mockResolvedValue(undefined) }));
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn(),
  })),
}));

import { ComicBookCreateRequest, createComicBook } from '../comicbook';

const TITLE_ID = '11111111-2222-4333-8444-555555555555';

/** A real Express reply that records what was sent */
const mockRes = () => {
  const res = createResponse<Response<ComicBookResult>>();
  jest.spyOn(res, 'status');
  jest.spyOn(res, 'json');
  return res;
};

const send = async (body: ComicBookCreateRequest) => {
  const res = mockRes();
  await createComicBook(createRequest<Request<Record<string, string>, ComicBookResult, ComicBookCreateRequest>>({ body }), res);
  return res;
};

const create = (year: ComicBookCreateRequest['year']) =>
  send({ title: 'The Amazing Spider-Man', comicIssue: '395', type: 'regular', titleID: TITLE_ID, year });

describe('createComicBook year validation', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockReset();
    mockCreate.mockImplementation(async (data: object) => ({ toJSON: () => ({ id: 'new-id', ...data }) }));
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
describe('createComicBook duplicate check', () => {
  const save = (extra: Partial<ComicBookCreateRequest> = {}) =>
    send({ title: 'Detective Comics', comicIssue: '659', type: 'regular', titleID: TITLE_ID, ...extra });

  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue({ toJSON: () => ({ id: 'new-id' }) });
    mockFindAll.mockReset().mockResolvedValue([
      { id: 'old-id', title: 'Detective Comics', comicIssue: '659', volume: null, type: 'regular' },
    ]);
  });

  it('refuses a second copy with 409 and says which issue', async () => {
    const res = await save();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'You already have Detective Comics #659 in this list.',
        duplicate: expect.objectContaining({ kind: 'issue', id: 'old-id', canSaveAnyway: true }),
      })
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('saves the second copy once the user confirms', async () => {
    const res = await save({ allowDuplicate: true });
    expect(mockCreate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('saves a different issue number without asking', async () => {
    const res = await save({ comicIssue: '661' });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});