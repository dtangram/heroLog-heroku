/// <reference types="jest" />
import express from 'express';
import request from 'supertest';

const create = jest.fn();
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create } })));

const query = jest.fn();
jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({ query })) }));

// Signed in as the owner of the collection being searched
jest.mock('../../middleware/auth', () => ({
  requireIdentity: (req: any, _res: any, next: any) => { req.user = { id: 'user-1' }; next(); },
}));
jest.mock('../../middleware/ownership', () => ({ ownsParam: () => (_req: any, _res: any, next: any) => next() }));

import searchRouter from '../search';

const app = express();
app.use('/api/search', searchRouter);

const comics = JSON.stringify([
  { title: 'Batman #492', description: 'Knightfall begins.', publisher: 'DC Comics', year: '1993' },
  { title: 'Batman #497', description: 'Bane breaks Batman.', publisher: 'DC Comics', year: '1993' },
]);

// The reply a newer model can give: thinking first, then the answer
const thinkingFirst = {
  content: [{ type: 'thinking', thinking: '…', signature: 'x' }, { type: 'text', text: comics }],
  stop_reason: 'end_turn',
};

beforeEach(() => {
  create.mockReset();
  query.mockReset();
});

it('All Comics shows the comics when the reply starts with a thinking block', async () => {
  create.mockResolvedValue(thinkingFirst);

  const res = await request(app).get('/api/search/search-all').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(200);
  expect(res.body.results.map((r: any) => r.title)).toEqual(['Batman #492', 'Batman #497']);
  expect(create.mock.calls[0][0].model).toBe('claude-haiku-5-5');
});

it('Find Missing shows the comics and marks the ones already owned', async () => {
  create.mockResolvedValue(thinkingFirst);
  query.mockResolvedValue({ rows: [{ lower: 'batman #497' }] });

  const res = await request(app).get('/api/search/search-missing/user-1').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(200);
  expect(res.body.results.map((r: any) => [r.title, r.already_owned])).toEqual([
    ['Batman #492', false],
    ['Batman #497', true],
  ]);
});

it('a reply with no list is an error, not "no comics found"', async () => {
  create.mockResolvedValue({ content: [{ type: 'thinking', thinking: '…', signature: 'x' }], stop_reason: 'max_tokens' });

  const res = await request(app).get('/api/search/search-all').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(500);
});