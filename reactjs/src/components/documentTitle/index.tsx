import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { PAGE_TITLES, PageParams, SITE_NAME } from '../../constants/pageTitles';

/** "DC%20Comics" → "DC Comics"; a malformed value is left as it is. */
const decodeParams = (params: PageParams): PageParams =>
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