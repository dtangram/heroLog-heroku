/// <reference types="jest" />
import express from 'express';
import request from 'supertest';

const create = jest.fn();
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create } })));

const query = jest.fn();
jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({ query })) }));

const embed = jest.fn();
jest.mock('openai', () => jest.fn().mockImplementation(() => ({ embeddings: { create: embed } })));

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
  query.mockReset().mockResolvedValue({ rows: [] });
  embed.mockReset().mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });
});

/** A comic in the collection, as the collection query returns it */
const ownedComic = (id: string, cbTitle: string, comicIssue: string, comicBookCover: string | null = null) => ({
  id, cbTitle, comicIssue, comicBookCover, titleId: 'title-batman', publisherId: 'pub-dc', publisherName: 'DC',
});

it('All Comics shows the comics when the reply starts with a thinking block', async () => {
  create.mockResolvedValue(thinkingFirst);

  const res = await request(app).get('/api/search/search-all').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(200);
  expect(res.body.results.map((r: any) => r.title)).toEqual(['Batman #492', 'Batman #497']);
  expect(create.mock.calls[0][0].model).toBe('claude-haiku-5-5');
});

it('Find Missing tells Claude what is owned and shows only the comics that are missing', async () => {
  create.mockResolvedValue(thinkingFirst);
  query.mockResolvedValue({ rows: [{ cbTitle: 'Batman', comicIssue: '497' }, { cbTitle: 'Batman', comicIssue: '49' }] });

  const res = await request(app).get('/api/search/search-missing/user-1').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(200);
  // #497 is owned so it's left out; owning #49 doesn't hide #492
  expect(res.body.results.map((r: any) => [r.title, r.already_owned])).toEqual([['Batman #492', false]]);

  const prompt = create.mock.calls[0][0].messages[0].content;
  expect(prompt).toContain('Batman: #497, #49');
  expect(prompt).toContain('in publication order');
});

it('Find Missing drops a comic Claude lists twice', async () => {
  create.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify([{ title: 'Batman #493' }, { title: 'batman #0493' }]) }],
    stop_reason: 'end_turn',
  });
  query.mockResolvedValue({ rows: [] });

  const res = await request(app).get('/api/search/search-missing/user-1').query({ q: 'Knightfall saga' });

  expect(res.body.results).toHaveLength(1);
});

it('a reply with no list is an error, not "no comics found"', async () => {
  create.mockResolvedValue({ content: [{ type: 'thinking', thinking: '…', signature: 'x' }], stop_reason: 'max_tokens' });

  const res = await request(app).get('/api/search/search-all').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(500);
});
it('All Comics marks the comics already in the collection', async () => {
  create.mockResolvedValue(thinkingFirst);
  query.mockResolvedValue({ rows: [ownedComic('c-497', 'Batman', '497')] });

  const res = await request(app).get('/api/search/search-all').query({ q: 'Knightfall saga' });

  expect(res.body.results.map((r: any) => [r.title, r.already_owned])).toEqual([
    ['Batman #492', false],
    ['Batman #497', true],
  ]);
});

it('puts each comic in a group, counting anything unexpected as Related', async () => {
  create.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify([
      { title: 'Batman #492', group: 'Main story' },
      { title: 'Detective Comics #659', group: 'tie-in' },
      { title: 'Vengeance of Bane #1', group: 'Prelude' },
      { title: 'Robin #1' },
    ]) }],
    stop_reason: 'end_turn',
  });

  const res = await request(app).get('/api/search/search-all').query({ q: 'Knightfall saga' });

  expect(res.body.results.map((r: any) => r.group)).toEqual(['Main story', 'Tie-in', 'Related', 'Related']);
});

it('My Collection gives each match its cover and where it lives in the collection', async () => {
  query
    .mockResolvedValueOnce({ rows: [{ comic_id: 'c-497', title: 'Batman #497', description: 'Bane breaks Batman.', similarity: '0.46' }] })
    .mockResolvedValueOnce({ rows: [ownedComic('c-497', 'Batman', '497', 'https://covers.example/497.jpg')] });

  const res = await request(app).get('/api/search/search/user-1').query({ q: 'Knightfall saga' });

  expect(res.status).toBe(200);
  expect(res.body.results[0]).toMatchObject({
    comic_id: 'c-497',
    cover: 'https://covers.example/497.jpg',
    publisher_id: 'pub-dc',
    publisher_name: 'DC',
    title_id: 'title-batman',
    series: 'Batman',
  });
});
it('Find Missing counts the owned issues by group instead of hiding them silently', async () => {
  create.mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify([
          { title: 'Batman #497', description: 'x', publisher: 'DC Comics', year: '1993', group: 'Main story' },
          { title: 'Batman #498', description: 'x', publisher: 'DC Comics', year: '1993', group: 'Main story' },
          { title: 'Robin #1', description: 'x', publisher: 'DC Comics', year: '1993', group: 'Tie-in' },
        ]),
      },
    ],
  });
  query.mockResolvedValue({ rows: [{ cbTitle: 'Batman', comicIssue: '497' }, { cbTitle: 'Batman', comicIssue: '498' }] });

  const res = await request(app).get('/api/search/search-missing/user-1').query({ q: 'Knightfall saga' });

  expect(res.body.results.map((r: any) => r.title)).toEqual(['Robin #1']);
  expect(res.body.owned_counts).toEqual({ 'Main story': 2 });
});