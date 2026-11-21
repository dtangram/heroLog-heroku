import axios from 'axios';
import API, { ensureGuestSession, GUEST_TOKEN_KEY, sessionHeaders } from '../../API';
import { claimGuestCollection, clearSession } from '../session';

const OLD_GUEST = '11111111-2222-4333-8444-555555555555';

describe('guest sessions', () => {
  let post: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    post = jest.spyOn(axios, 'post');
  });

  afterEach(() => post.mockRestore());

  it("starts one for a guest, keeping the anonymous ID their browser already has", async () => {
    localStorage.setItem('anonymousUserId', OLD_GUEST);
    post.mockResolvedValue({ data: { success: true, data: { id: OLD_GUEST, token: 'guest-token' } } });

    await expect(ensureGuestSession()).resolves.toBe('guest-token');

    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/guest$/), { anonymousId: OLD_GUEST });
    expect(localStorage.getItem(GUEST_TOKEN_KEY)).toBe('guest-token');
    expect(localStorage.getItem('anonymousUserId')).toBe(OLD_GUEST);
  });

  it('uses the ID the server gives back (a taken ID gets a new, empty collection)', async () => {
    localStorage.setItem('anonymousUserId', OLD_GUEST);
    post.mockResolvedValue({ data: { success: true, data: { id: 'new-guest-id', token: 'guest-token' } } });

    await ensureGuestSession();

    expect(localStorage.getItem('anonymousUserId')).toBe('new-guest-id');
  });

  it('asks the server only once when several requests need a session at the same time', async () => {
    post.mockResolvedValue({ data: { data: { id: OLD_GUEST, token: 'guest-token' } } });

    const tokens = await Promise.all([ensureGuestSession(), ensureGuestSession(), ensureGuestSession()]);

    expect(tokens).toEqual(['guest-token', 'guest-token', 'guest-token']);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing guest token', async () => {
    localStorage.setItem(GUEST_TOKEN_KEY, 'saved-token');
    await expect(ensureGuestSession()).resolves.toBe('saved-token');
    expect(post).not.toHaveBeenCalled();
  });

  it('sends the account token instead when signed in', async () => {
    localStorage.setItem('token', 'account-token');
    await expect(sessionHeaders()).resolves.toEqual({ Authorization: 'Bearer account-token' });
    expect(post).not.toHaveBeenCalled();
  });

  it('returns no token, rather than throwing, if the server is unreachable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    post.mockRejectedValue(new Error('offline'));
    await expect(ensureGuestSession()).resolves.toBeNull();
    await expect(sessionHeaders()).resolves.toEqual({});
  });
});

describe('claimGuestCollection', () => {
  let apiPost: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    apiPost = jest.spyOn(API, 'post');
  });

  afterEach(() => apiPost.mockRestore());

  it('moves the guest collection to the account, then ends the guest session', async () => {
    localStorage.setItem('token', 'account-token');
    localStorage.setItem(GUEST_TOKEN_KEY, 'guest-token');
    localStorage.setItem('anonymousUserId', OLD_GUEST);
    apiPost.mockResolvedValue({ success: true, data: { publishersMoved: 2 } });

    await expect(claimGuestCollection()).resolves.toBe(2);

    expect(apiPost).toHaveBeenCalledWith('/auth/claim-guest', { guestToken: 'guest-token' });
    expect(localStorage.getItem(GUEST_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('anonymousUserId')).toBeNull();
    expect(localStorage.getItem('token')).toBe('account-token');
  });

  it('does nothing when there was no guest session', async () => {
    await expect(claimGuestCollection()).resolves.toBe(0);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('never blocks signing in if moving fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(GUEST_TOKEN_KEY, 'guest-token');
    apiPost.mockRejectedValue(new Error('server error'));
    await expect(claimGuestCollection()).resolves.toBe(0);
  });
});

describe('clearSession', () => {
  it('signs the browser out of the account and any guest session', () => {
    ['token', 'id', 'userData', GUEST_TOKEN_KEY, 'anonymousUserId'].forEach(key => localStorage.setItem(key, 'x'));
    clearSession();
    ['token', 'id', 'userData', GUEST_TOKEN_KEY, 'anonymousUserId'].forEach(key =>
      expect(localStorage.getItem(key)).toBeNull()
    );
  });
});