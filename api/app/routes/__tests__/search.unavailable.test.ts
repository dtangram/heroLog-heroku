/// <reference types="jest" />
import {
  COLLECTION_MIN_SIMILARITY,
  COLLECTION_RESULT_LIMIT,
  SEARCH_MODEL,
  SEARCH_RESULT_COUNT,
  closeMatches,
  isOpenAIUnavailable,
  normalizeTitle,
  summarizeOwned,
  parseComicList,
  replyText,
} from '../search';

/** An error with the fields OpenAI's errors carry */
const openAIError = (fields: { status?: number; code?: string; error?: { type: string } }): Error =>
  Object.assign(new Error('OpenAI request failed'), fields);

describe('isOpenAIUnavailable', () => {
  it('recognizes an account out of credits and a rate limit', () => {
    // The error from the Heroku log: 429, insufficient_quota, credit_balance_exhausted
    expect(isOpenAIUnavailable(openAIError({ status: 429, code: 'credit_balance_exhausted', error: { type: 'insufficient_quota' } }))).toBe(true);
    expect(isOpenAIUnavailable(openAIError({ status: 429, code: 'rate_limit_exceeded' }))).toBe(true);
    expect(isOpenAIUnavailable(openAIError({ code: 'insufficient_quota' }))).toBe(true);
  });

  it('leaves other failures alone', () => {
    expect(isOpenAIUnavailable(new Error('connection refused'))).toBe(false);
    expect(isOpenAIUnavailable(openAIError({ status: 500 }))).toBe(false);
  });
});
describe('search settings', () => {
  it('asks Haiku for 40 comics and shows up to 20 close matches from the collection', () => {
    expect(SEARCH_MODEL).toBe('claude-haiku-5-5');
    expect(SEARCH_RESULT_COUNT).toBe(40);
    expect(COLLECTION_RESULT_LIMIT).toBe(20);
    expect(COLLECTION_MIN_SIMILARITY).toBeGreaterThan(0);
    expect(COLLECTION_MIN_SIMILARITY).toBeLessThan(1);
  });
});

describe('reading the comics out of Claude\'s reply', () => {
  const list = '[{"title": "Batman #492", "description": "Knightfall begins.", "publisher": "DC Comics", "year": "1993"}]';

  it('finds the text even when the reply starts with a thinking block', () => {
    expect(replyText([{ type: 'thinking' }, { type: 'text', text: list }])).toBe(list);
  });

  it('reads the list with or without a code fence or a sentence around it', () => {
    expect(parseComicList(list)).toHaveLength(1);
    expect(parseComicList('```json\n' + list + '\n```')).toHaveLength(1);
    expect(parseComicList('Here are the comics:\n' + list)[0].title).toBe('Batman #492');
  });

  it('fails loudly instead of showing "no comics" when there is no list', () => {
    expect(() => parseComicList('')).toThrow();
    expect(() => parseComicList('Sorry, I cannot help with that.')).toThrow();
  });
});

describe('matching owned comics', () => {
  it('treats small differences in how a title is written as the same comic', () => {
    expect(normalizeTitle('Batman #0491')).toBe(normalizeTitle('batman  #491'));
    expect(normalizeTitle('The Amazing Spider-Man #300')).toBe(normalizeTitle('Amazing Spider-Man #300'));
  });

  it('never treats one issue as another', () => {
    expect(normalizeTitle('Batman #49')).not.toBe(normalizeTitle('Batman #491'));
    expect(normalizeTitle('Batman #5')).not.toBe(normalizeTitle('Batman #500'));
  });

  it('lists the owned comics by series', () => {
    expect(summarizeOwned(['Batman #491', 'Batman #492', 'Detective Comics #659'])).toBe(
      'Batman: #491, #492\nDetective Comics: #659'
    );
  });
});

describe('My Collection: only matches close to the best one', () => {
  // The scores from the "Knightfall saga" search on the live site
  const scores = [0.47, 0.46, 0.45, 0.44, 0.44, 0.42, 0.42, 0.42, 0.36, 0.32, 0.31, 0.30, 0.29, 0.25];
  const rows = scores.map((similarity_score, i) => ({ comic_id: `c${i}`, title: `Comic ${i}`, description: '', similarity_score }));

  it('keeps the Knightfall issues and drops the unrelated Batman and Spider-Man issues', () => {
    const kept = closeMatches(rows).map(r => r.similarity_score);
    expect(kept).toEqual([0.47, 0.46, 0.45, 0.44, 0.44, 0.42, 0.42, 0.42, 0.36]);
  });

  it('handles no matches', () => {
    expect(closeMatches([])).toEqual([]);
  });
});