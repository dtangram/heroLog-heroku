import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import type { ConnectorProps } from './container';
import { showAlert, showConfirm } from '../dialog';

jest.mock('../dialog', () => ({ showAlert: jest.fn(), showConfirm: jest.fn() }));

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
describe('Deleting a publisher', () => {
  const dynamite = { id: 'pub-dynamite', publisherName: 'Dynamite', titleCount: 0, issueCount: 0 };

  const showWithPublisher = (deletePublisher: jest.Mock, fetchPublishers = jest.fn()) =>
    render(
      <MemoryRouter>
        <Dashboard
          {...({ fetchPublishers, deletePublisher, publishers: [dynamite], isLoading: false } as unknown as ConnectorProps)}
        />
      </MemoryRouter>
    );

  beforeEach(() => {
    (showConfirm as jest.Mock).mockResolvedValue(true);
    (showAlert as jest.Mock).mockReset();
  });

  it("deletes it without fetching the list again, which could bring it back", async () => {
    const deletePublisher = jest.fn().mockResolvedValue({ ok: true, data: null });
    const fetchPublishers = jest.fn();
    showWithPublisher(deletePublisher, fetchPublishers);
    fetchPublishers.mockClear(); // the fetch on opening the Dashboard

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(deletePublisher).toHaveBeenCalledWith('pub-dynamite'));
    expect(fetchPublishers).not.toHaveBeenCalled();
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('says so when the delete fails', async () => {
    const deletePublisher = jest.fn().mockResolvedValue({ ok: false, error: 'Network Error' });
    showWithPublisher(deletePublisher);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
  });
});
describe('Publishers without titles', () => {
  const dc = { id: 'p1', publisherName: 'DC', titleCount: 4, issueCount: 15 };
  const darkHorse = { id: 'p3', publisherName: 'Dark Horse', titleCount: 0, issueCount: 0 };

  const showWith = (publishers: object[]) =>
    render(
      <MemoryRouter>
        <Dashboard
          {...({ fetchPublishers: jest.fn(), deletePublisher: jest.fn(), publishers, isLoading: false } as unknown as ConnectorProps)}
        />
      </MemoryRouter>
    );

  it('get a short row below the cards when other publishers have titles', () => {
    showWith([dc, darkHorse]);

    const cards = screen.getByRole('list', { name: 'Your publishers' });
    expect(within(cards).getByRole('link', { name: 'DC' })).toBeInTheDocument();
    expect(within(cards).queryByRole('link', { name: 'Dark Horse' })).not.toBeInTheDocument();

    const empty = screen.getByRole('region', { name: 'No titles yet' });
    expect(within(empty).getByRole('link', { name: 'Dark Horse' })).toBeInTheDocument();
    expect(within(empty).getByRole('link', { name: 'Add title to Dark Horse' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/p3\/Dark Horse\/comicbooklisttitle\/new$/)
    );
  });

  it('stay as cards when no publisher has titles yet', () => {
    showWith([darkHorse]);

    const cards = screen.getByRole('list', { name: 'Your publishers' });
    expect(within(cards).getByRole('link', { name: 'Dark Horse' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'No titles yet' })).not.toBeInTheDocument();
  });
});