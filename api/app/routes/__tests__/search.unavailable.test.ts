/// <reference types="jest" />
import { isOpenAIUnavailable } from '../search';

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