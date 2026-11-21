import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import type { ConnectorProps } from './container';

const showDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard
        {...({
          fetchPublishers: jest.fn(),
          deletePublisher: jest.fn(),
          publishers: [],
          isLoading: false,
        } as unknown as ConnectorProps)}
      />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = jest.fn();
});

describe('Dashboard guest notice', () => {
  it('asks guests to sign up or sign in to keep their collection', () => {
    showDashboard();

    const notice = screen.getByRole('complementary', { name: 'Keep your collection safe' });
    expect(notice).toHaveTextContent(/saved only in this browser/i);
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/signin');
  });

  it('is hidden once you are signed in', () => {
    localStorage.setItem('token', 'account-token');
    localStorage.setItem('id', '11111111-2222-4333-8444-555555555555');
    showDashboard();

    expect(screen.queryByRole('complementary', { name: 'Keep your collection safe' })).not.toBeInTheDocument();
  });
});