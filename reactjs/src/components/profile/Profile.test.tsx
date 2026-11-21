import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Profile from './Profile';
import { selectProfileStats } from './container';
import type { ConnectorProps, ProfileStats } from './container';
import { showAlert, showConfirm } from '../dialog';

jest.mock('../dialog', () => ({ showAlert: jest.fn(async () => undefined), showConfirm: jest.fn() }));

const USER_ID = '11111111-2222-4333-8444-555555555555';

const douglas = {
  id: USER_ID,
  firstname: 'Douglas',
  lastname: 'Angram',
  username: 'dtangram',
  email: 'dtangram@example.com',
  profilePic: '/douglas.jpg',
};

const STATS: ProfileStats = { publishers: 2, titles: 6, issues: 48, forSale: 3, wishList: 1 };

const fetchers = { fetchPublishers: jest.fn(), fetchSales: jest.fn(), fetchWishlists: jest.fn() };
const deleteUser = jest.fn();

const showProfile = (overrides: Partial<typeof douglas> = {}, stats: ProfileStats = STATS) =>
  render(
    <MemoryRouter initialEntries={[`/profile/${USER_ID}`]}>
      <Routes>
        <Route
          path="/profile/:id"
          element={
            <Profile
              {...({
                signups: [{ ...douglas, ...overrides }],
                fetchUser: jest.fn(),
                deleteUser,
                isLoading: false,
                stats,
                ...fetchers,
              } as unknown as ConnectorProps)}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  window.scrollTo = jest.fn();
  jest.clearAllMocks();
  localStorage.setItem('id', USER_ID);
});

afterEach(() => localStorage.clear());

describe('Profile', () => {
  it('shows the name, username and email', () => {
    showProfile();

    expect(screen.getByRole('heading', { name: 'Douglas Angram' })).toBeInTheDocument();
    expect(screen.getByText('dtangram')).toBeInTheDocument();
    expect(screen.getByText('dtangram@example.com')).toBeInTheDocument();
  });

  it('shows the profile photo', () => {
    showProfile();
    expect(screen.getByRole('img', { name: 'Douglas Angram' })).toHaveAttribute('src', '/douglas.jpg');
  });

  it('shows a person icon, not a broken image, when there is no photo', () => {
    showProfile({ profilePic: '' });

    expect(screen.getByRole('img', { name: 'Douglas Angram has no profile photo yet' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Douglas Angram' })).not.toBeInTheDocument();
  });

  it('links to the profile form and offers to delete the account', () => {
    showProfile();

    expect(screen.getByRole('link', { name: 'Update Profile' })).toHaveAttribute('href', `/forms/profileform/edit/${USER_ID}`);
    expect(screen.getByRole('button', { name: 'Delete the account for dtangram' })).toBeInTheDocument();
  });

  it('sums up your collection, sale list and wish list, each linking to its page', () => {
    showProfile();

    const nav = screen.getByRole('navigation', { name: 'Your Hero-Log' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /48 comics in your collection 6 titles · 2 publishers/i })).toHaveAttribute(
      'href',
      `/dashboard/${USER_ID}`
    );
    expect(screen.getByRole('link', { name: /3 for sale/i })).toHaveAttribute('href', `/sale/${USER_ID}`);
    expect(screen.getByRole('link', { name: /1 on your wish list/i })).toHaveAttribute('href', `/wishlist/${USER_ID}`);
    expect(fetchers.fetchPublishers).toHaveBeenCalledWith(USER_ID);
    expect(fetchers.fetchSales).toHaveBeenCalled();
    expect(fetchers.fetchWishlists).toHaveBeenCalled();
  });

  it('shows a dash, not 0, while a total is still loading', () => {
    showProfile({}, { publishers: null, titles: null, issues: null, forSale: 3, wishList: null });

    expect(screen.getByRole('link', { name: /— comics in your collection/i })).toBeInTheDocument();
    expect(screen.queryByText(/titles ·/)).not.toBeInTheDocument();
  });

  it("doesn't show your totals on someone else's profile", () => {
    localStorage.setItem('id', 'someone-else');
    showProfile();

    expect(screen.queryByRole('navigation', { name: 'Your Hero-Log' })).not.toBeInTheDocument();
    expect(fetchers.fetchSales).not.toHaveBeenCalled();
  });
});

describe('selectProfileStats', () => {
  const state = {
    userProfile: { isLoading: false, error: null },
    publishers: {
      byId: { a: { data: { titleCount: 4, issueCount: 37 } }, b: { data: { titleCount: 2, issueCount: 11 } } },
      allIds: ['a', 'b'],
      isLoading: false,
    },
    sales: { [USER_ID]: { allIds: ['s1', 's2'], isLoading: false } },
    wishlists: { [USER_ID]: { allIds: [], isLoading: false } },
  };

  it('adds up titles and issues across publishers and counts listings', () => {
    expect(selectProfileStats(state, USER_ID)).toEqual({ publishers: 2, titles: 6, issues: 48, forSale: 2, wishList: 0 });
  });

  it('reports null for anything not loaded yet', () => {
    expect(selectProfileStats({ userProfile: state.userProfile }, USER_ID)).toEqual({
      publishers: null,
      titles: null,
      issues: null,
      forSale: null,
      wishList: null,
    });
  });
});

describe('Deleting your account', () => {
  const assign = jest.fn();
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, assign } });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  beforeEach(() => {
    window.scrollTo = jest.fn();
    jest.clearAllMocks();
    localStorage.setItem('id', USER_ID);
    localStorage.setItem('token', 'account-token');
  });

  afterEach(() => localStorage.clear());

  it('says everything will be deleted, then signs you out and leaves', async () => {
    (showConfirm as jest.Mock).mockResolvedValue(true);
    deleteUser.mockResolvedValue({ ok: true, data: {} });
    showProfile();

    fireEvent.click(screen.getByRole('button', { name: 'Delete the account for dtangram' }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/landing'));
    expect((showConfirm as jest.Mock).mock.calls[0][0]).toMatch(/collection, sale listings, wish list and messages/);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
    expect(showAlert).toHaveBeenCalledWith(expect.stringMatching(/have been deleted/), { title: 'Account deleted' });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('id')).toBeNull();
  });

  it('keeps you signed in and explains when the delete fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (showConfirm as jest.Mock).mockResolvedValue(true);
    deleteUser.mockResolvedValue({ ok: false, error: 'Server error' });
    showProfile();

    fireEvent.click(screen.getByRole('button', { name: 'Delete the account for dtangram' }));

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.stringMatching(/Nothing was deleted/), {
        title: "Your account wasn't deleted",
      })
    );
    expect(assign).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBe('account-token');
  });

  it('does nothing if you cancel', async () => {
    (showConfirm as jest.Mock).mockResolvedValue(false);
    showProfile();

    fireEvent.click(screen.getByRole('button', { name: 'Delete the account for dtangram' }));

    await waitFor(() => expect(showConfirm).toHaveBeenCalled());
    expect(deleteUser).not.toHaveBeenCalled();
  });
});