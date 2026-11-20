import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Profile from './Profile';
import type { ConnectorProps } from './container';

const USER_ID = '11111111-2222-4333-8444-555555555555';

const douglas = {
  id: USER_ID,
  firstname: 'Douglas',
  lastname: 'Angram',
  username: 'dtangram',
  email: 'dtangram@example.com',
  type: 'regular',
  profilePic: '/douglas.jpg',
};

const showProfile = (overrides: Partial<typeof douglas> = {}) =>
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
                deleteUser: jest.fn(),
                isLoading: false,
              } as unknown as ConnectorProps)}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  window.scrollTo = jest.fn();
});

describe('Profile', () => {
  it('shows the name, account type, username and email', () => {
    showProfile();

    expect(screen.getByRole('heading', { name: 'Douglas Angram' })).toBeInTheDocument();
    expect(screen.getByText('Regular member')).toBeInTheDocument();
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
});