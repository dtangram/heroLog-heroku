import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WishListForm from './WishListForm';
import { mapStateToProps } from './container';

jest.mock('../../../API');
jest.mock('../../../utils/anonymousUser', () => ({ getAnonymousUserId: () => 'anonymous-id' }));
jest.mock('../../scanCoverButton/ScanCoverButton', () => () => null);
jest.mock('../../../hooks/useComicScanner', () => ({
  useComicScanner: () => ({ scanCover: jest.fn(), isScanning: false, scanError: '' }),
}));

const USER_ID = 'user-1';

// A saved comic as the API returns it: issue, volume and year are numbers,
// and the owner is wishUsersId (not userId).
const supermanFromApi = {
  id: 'comic-superman-25',
  comicBookTitle: 'Superman',
  comicIssue: 25,
  comicBookVolume: null,
  comicBookYear: 2025,
  comicBookPublisher: 'DC Comics',
  comicBookCover: 'superman-25.jpg',
  type: 'regular',
  wishUsersId: USER_ID,
  userId: USER_ID,
};

// The store after the list page loaded Superman #25
const state = {
  wishlists: {
    [USER_ID]: { byId: { 'comic-superman-25': { data: supermanFromApi, loadedAt: Date.now() } }, allIds: ['comic-superman-25'] },
  },
};

const renderForm = (path: string, route: string) => {
  const actions = {
    fetchWishList: jest.fn(),
    createWishList: jest.fn().mockResolvedValue(undefined),
    updateWishList: jest.fn().mockResolvedValue(undefined),
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={<WishListForm {...(mapStateToProps(state as any) as any)} {...(actions as any)} />} />
      </Routes>
    </MemoryRouter>
  );
  return actions;
};

const field = (id: string) => document.getElementById(id) as HTMLInputElement;

describe('WishListForm', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
    // Signed in, as in the app
    localStorage.setItem('id', USER_ID);
  });

  afterAll(() => localStorage.removeItem('id'));

  it('starts empty on "Add New", even after another comic was loaded', () => {
    renderForm(`/forms/wishlistform/new/${USER_ID}`, '/forms/wishlistform/new/:userId');

    expect(field('comicBookTitle')).toHaveValue('');
    expect(field('comicIssue')).toHaveValue('');
    expect(screen.queryByAltText(/superman/i)).not.toBeInTheDocument();
    expect(document.querySelector('img[src="superman-25.jpg"]')).toBeNull();
  });

  it('fills in the comic whose Edit was clicked', async () => {
    renderForm('/forms/wishlistform/edit/comic-superman-25', '/forms/wishlistform/edit/:id');

    await waitFor(() => expect(field('comicBookTitle')).toHaveValue('Superman'));
    expect(field('comicIssue')).toHaveValue('25');
    expect(field('comicBookYear')).toHaveValue('2025');
    expect(field('comicBookVolume')).toHaveValue('');
  });

  it('submits Update without needing a scan first', async () => {
    const actions = renderForm('/forms/wishlistform/edit/comic-superman-25', '/forms/wishlistform/edit/:id');
    await waitFor(() => expect(field('comicBookTitle')).toHaveValue('Superman'));

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() =>
      expect(actions.updateWishList).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'comic-superman-25', comicIssue: '25', comicBookYear: '2025' })
      )
    );
  });
});