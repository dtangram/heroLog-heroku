import API from '../API';
import { GUEST_TOKEN_KEY } from '../constants/storage';
import { clearAnonymousId } from './anonymousUser';

export const claimGuestCollection = async (): Promise<number> => {
  const guestToken = localStorage.getItem(GUEST_TOKEN_KEY);
  let moved = 0;

  if (guestToken) {
    try {
      const response = (await API.post('/auth/claim-guest', { guestToken })) as {
        data?: { publishersMoved?: number };
      };
      moved = response?.data?.publishersMoved ?? 0;
    } catch (error) {
      console.error("Couldn't move the guest collection to the account:", error);
    }
  }

  localStorage.removeItem(GUEST_TOKEN_KEY);
  clearAnonymousId();
  // The Dashboard caches publishers; make it load the account's
  localStorage.removeItem('publishersCache');
  return moved;
};

/** Signs this browser out of the account (and any guest session). */
export const clearSession = (): void => {
  ['token', 'id', 'userData', 'data', 'email', 'reloadApp', GUEST_TOKEN_KEY, 'publishersCache'].forEach(key =>
    localStorage.removeItem(key)
  );
  clearAnonymousId();
};