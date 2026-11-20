import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentTitle, { titleFor } from '.';

const USER = '11111111-2222-4333-8444-555555555555';

describe('titleFor', () => {
  it.each([
    ['/', 'Home · Hero-Log'],
    [`/dashboard/${USER}`, 'Your Collection · Hero-Log'],
    [`/intel/${USER}`, 'Collection Intelligence · Hero-Log'],
    [`/search/${USER}`, 'Search the Multiverse · Hero-Log'],
    [`/sale/${USER}`, 'Your Comics for Sale · Hero-Log'],
    [`/wishlist/${USER}`, 'Your Wish List · Hero-Log'],
    [`/profile/${USER}`, 'Profile · Hero-Log'],
    ['/forms/saleform/edit/abc', 'Edit Sale Listing · Hero-Log'],
  ])('%s → %s', (path, title) => {
    expect(titleFor(path)).toBe(title);
  });

  it('names publisher and title pages after what they show, decoding the URL', () => {
    expect(titleFor(`/dashboard/${USER}/pub-1/DC%20Comics/comicbooklist`)).toBe('DC Comics Titles · Hero-Log');
    expect(titleFor(`/dashboard/${USER}/pub-1/DC%20Comics/title-1/Batman/comicbooklistissues`)).toBe(
      'Batman · DC Comics · Hero-Log'
    );
    expect(titleFor(`/forms/${USER}/pub-1/DC%20Comics/title-1/Batman/comicbook/new`)).toBe('Add a Batman Comic · Hero-Log');
  });

  it('keeps a badly encoded name as it is instead of crashing', () => {
    expect(titleFor(`/dashboard/${USER}/pub-1/100%25%20Marvel%/comicbooklist`)).toBe('100%25%20Marvel% Titles · Hero-Log');
  });

  it('falls back to the site name for a page it does not know', () => {
    expect(titleFor('/nowhere/at/all')).toBe('Hero-Log');
  });
});

describe('DocumentTitle', () => {
  it('sets the browser tab title for the current page', () => {
    render(
      <MemoryRouter initialEntries={[`/wishlist/${USER}`]}>
        <DocumentTitle />
      </MemoryRouter>
    );

    expect(document.title).toBe('Your Wish List · Hero-Log');
  });
});