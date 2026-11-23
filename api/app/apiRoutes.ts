/**
 * Where the API lives. Every API route is under /api, so no page in the React
 * app (/wishlist/:userId, /dashboard/…) can ever share an address with it.
 * The React app's API client adds the same prefix (reactjs/src/API.ts).
 */
export const API_PREFIX = '/api';

/**
 * LEGACY: routes still also answered at their old address (without /api) so a
 * browser tab running the previous version of the app keeps working through
 * the deploy. Empty this list in the next release; the test makes sure it
 * only ever shrinks.
 */
export const LEGACY_ROOT_ROUTES: string[] = [
  '/collectpub',
  '/comicbooktitles',
  '/comicbook',
  '/messaging',
  '/salelist',
  '/salelistALL',
  '/wishlist',
  '/users',
  '/auth',
  '/emailpasswordreset',
  '/s3',
];