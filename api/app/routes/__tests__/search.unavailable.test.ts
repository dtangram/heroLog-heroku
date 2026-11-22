/// <reference types="jest" />
import {
  COLLECTION_MIN_SIMILARITY,
  COLLECTION_RESULT_LIMIT,
  SEARCH_MODEL,
  SEARCH_RESULT_COUNT,
  isOpenAIUnavailable,
  parseComicList,
  replyText,
} from '../search';

describe('isOpenAIUnavailable', () => {
  it('recognizes an account out of credits and a rate limit', () => {
    // The error from the Heroku log: 429, insufficient_quota, credit_balance_exhausted
    expect(isOpenAIUnavailable({ status: 429, code: 'credit_balance_exhausted', error: { type: 'insufficient_quota' } })).toBe(true);
    expect(isOpenAIUnavailable({ status: 429, code: 'rate_limit_exceeded' })).toBe(true);
    expect(isOpenAIUnavailable({ code: 'insufficient_quota' })).toBe(true);
  });

  it('leaves other failures alone', () => {
    expect(isOpenAIUnavailable(new Error('connection refused'))).toBe(false);
    expect(isOpenAIUnavailable({ status: 500 })).toBe(false);
    expect(isOpenAIUnavailable(undefined)).toBe(false);
  });
});
describe('search settings', () => {
  it('asks Haiku for 20 comics and shows up to 20 close matches from the collection', () => {
    expect(SEARCH_MODEL).toBe('claude-haiku-5-5');
    expect(SEARCH_RESULT_COUNT).toBe(20);
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