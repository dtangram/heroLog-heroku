import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

jest.mock('../emptySalesHomepage', () => () => <p>No comics for sale</p>);

const sale = (id: string, comicIssue: number, sellerUsername: string | null) => ({
  id,
  comicBookCover: `${id}.jpg`,
  comicBookTitle: 'Superman',
  comicBookVolume: 0,
  comicBookYear: 1993,
  comicBookPublisher: 'DC Comics',
  comicIssue,
  type: 'regular',
  saleUsersId: `${id}-owner`,
  sellerUsername,
});

const renderHome = (salesALL: ReturnType<typeof sale>[], isLoading = false) =>
  render(
    <MemoryRouter>
      <Home
        fetchAllSales={jest.fn() as any}
        salesALL={salesALL}
        isLoading={isLoading}
        user={{ id: 'me', firstname: 'Douglas', username: 'dtangram', email: 'me@example.com' } as any}
      />
    </MemoryRouter>
  );

describe('Home page', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  it("shows each seller's username on their card", () => {
    renderHome([sale('a', 25, 'dtangram'), sale('b', 75, 'comicfan99')]);

    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Seller: comicfan99')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Seller: dtangram')).toBeInTheDocument();
  });

  it('leaves out "Seller:" when the seller account no longer exists', () => {
    renderHome([sale('a', 75, null)]);

    expect(screen.getByText('Superman #75')).toBeInTheDocument();
    expect(screen.queryByText(/seller:/i)).not.toBeInTheDocument();
  });

  it('keeps showing the comics while the list reloads, instead of a spinner', () => {
    renderHome([sale('a', 25, 'dtangram')], true);

    expect(screen.getByText('Superman #25')).toBeInTheDocument();
  });

  it('gives the welcome a next step: dashboard, collection intel, or comics for sale', () => {
    renderHome([sale('a', 25, 'dtangram')]);

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome, Douglas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your dashboard' })).toHaveAttribute('href', '/dashboard/me');
    expect(screen.getByRole('link', { name: 'See your collection intel' })).toHaveAttribute('href', '/intel/me');
    expect(screen.getByRole('link', { name: 'Browse comics for sale' })).toHaveAttribute('href', '#forSale');
  });

  it('shows the same next steps when nobody has listed comics yet', () => {
    renderHome([]);

    expect(screen.getByText('No comics for sale')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your dashboard' })).toBeInTheDocument();
  });
});