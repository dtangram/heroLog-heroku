import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

export const SITE_NAME = 'Hero-Log';

type Params = Record<string, string | undefined>;

/** Route patterns (the same as App.tsx) and the tab title for each. */
const PAGE_TITLES: Array<[string, string | ((params: Params) => string)]> = [
  ['/', 'Home'],
  ['/landing', 'Digitize Your Comic Collection'],
  ['/signup', 'Sign Up'],
  ['/signin', 'Sign In'],
  ['/forms/emailpasswordreset', 'Forgot Your Password?'],
  ['/forms/passwordreset/:token', 'Reset Your Password'],

  ['/dashboard/:userId', 'Your Collection'],
  ['/dashboard/:userId/:pubId/:publisherName/comicbooklist', ({ publisherName }) => `${publisherName} Titles`],
  [
    '/dashboard/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbooklistissues',
    ({ cbTitle, publisherName }) => `${cbTitle} · ${publisherName}`,
  ],
  ['/forms/createpublisher/new/:userId', 'Add a Publisher'],
  ['/forms/createpublisherProfile/new/:userId', 'Add a Publisher'],
  ['/forms/:userId/createpublisher/edit/:id', 'Edit Publisher'],
  ['/forms/:userId/:pubId/:publisherName/comicbooklisttitle/new', ({ publisherName }) => `Add a Title to ${publisherName}`],
  ['/forms/:userId/:pubId/:publisherName/comicbooklisttitle/edit/:id', 'Edit Title'],
  ['/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/new', ({ cbTitle }) => `Add an Issue to ${cbTitle}`],
  ['/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/edit/:id', ({ cbTitle }) => `Edit ${cbTitle} Issue`],

  ['/intel/:userId', 'Collection Insights'],
  ['/search/:userId', 'Search the Multiverse'],

  ['/sale/:userId', 'Your Comics for Sale'],
  ['/forms/saleform/new/:userId', 'Sell a Comic'],
  ['/forms/saleform/edit/:id', 'Edit Sale Listing'],
  ['/wishlist/:userId', 'Your Wish List'],
  ['/forms/wishlistform/new/:userId', 'Add to Wish List'],
  ['/forms/wishlistform/edit/:id', 'Edit Wish List Comic'],

  ['/viewMessages/:userId', 'Your Messages'],
  ['/sentMessages/:userId', 'Your Sent Messages'],
  ['/forms/messaging/:userId/:comicBookTitle/:comicIssue/:userSent/:username/:userEmail', 'Send a Message'],
  ['/forms/reply/:messageID/:userId/:comicBookTitle/:prevMessage/:userSent/:username/:userEmail', 'Reply to a Message'],

  ['/profile/:userId', 'Profile'],
  ['/forms/profileform/edit/:id', 'Edit Profile'],
];

/** "DC%20Comics" → "DC Comics"; a malformed value is left as it is. */
const decodeParams = (params: Params): Params =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      try {
        return [key, value && decodeURIComponent(value)];
      } catch {
        return [key, value];
      }
    })
  );

/** "Batman · DC Comics · Hero-Log", or just "Hero-Log" for an unknown page. */
export const titleFor = (pathname: string): string => {
  for (const [pattern, title] of PAGE_TITLES) {
    const match = matchPath({ path: pattern, end: true }, pathname);
    if (match) {
      const page = typeof title === 'function' ? title(decodeParams(match.params)) : title;
      return `${page} · ${SITE_NAME}`;
    }
  }
  return SITE_NAME;
};

/**
 * Names the browser tab after the current page, so tabs, history and
 * bookmarks say "Your Wish List · Hero-Log" instead of "Hero Log" everywhere.
 * Screen readers also announce the new title when the page changes.
 * Mount once, inside the Router.
 */
const DocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);

  return null;
};

/**
 * For pages that know more than their address, like an edit form that has
 * loaded the comic's name: names the tab with the same words as the page's
 * heading, so the two always match. Use the same string for the h1.
 */
export const usePageTitle = (title: string) => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (title) document.title = `${title} · ${SITE_NAME}`;
  }, [title, pathname]);
};

export default DocumentTitle;