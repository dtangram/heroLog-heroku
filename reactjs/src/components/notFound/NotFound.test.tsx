import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '.';

describe('Page Not Found', () => {
  afterEach(() => localStorage.clear());

  it('says the page was not found and offers somewhere to go', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Page Not Found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Page Not Found · Hero-Log');
  });

  it('adds the Dashboard and Search for someone signed in', () => {
    localStorage.setItem('id', 'u1');
    localStorage.setItem('token', 't');
    render(<MemoryRouter><NotFound /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Your Dashboard' })).toHaveAttribute('href', '/dashboard/u1');
    expect(screen.getByRole('link', { name: 'Search comics' })).toHaveAttribute('href', '/search/u1');
  });
});