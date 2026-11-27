import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import SalePreview from './SalePreview';
import { SALE_PREVIEW_SIZE } from '../../../constants/sale';

const listing = (id: string, overrides = {}) => ({
  id,
  comicBookTitle: 'Batman',
  comicIssue: 497,
  comicBookPublisher: 'DC Comics',
  comicBookYear: 1993,
  comicBookCover: '',
  type: 'regular',
  price: '24.99',
  comicCondition: 'Very Fine',
  ...overrides,
});

const showPreview = () =>
  render(
    <MemoryRouter>
      <SalePreview />
    </MemoryRouter>
  );

let get: jest.SpyInstance;

beforeEach(() => {
  get = jest.spyOn(axios, 'get');
});

afterEach(() => get.mockRestore());

describe('Landing: Comics for Sale', () => {
  it('shows placeholder cards while the listings load', () => {
    get.mockReturnValue(new Promise(() => {}));
    showPreview();

    expect(screen.getByRole('status')).toHaveTextContent('Loading comics for sale');
    expect(screen.getByTestId('sale-preview-skeleton')).toBeInTheDocument();
  });

  it('asks only for the newest few, from the public preview', async () => {
    get.mockResolvedValue({ data: { success: true, data: [] } });
    showPreview();

    await screen.findByText(/no comics are listed for sale yet/i);
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/salelistALL\/preview$/), expect.objectContaining({
      params: { limit: SALE_PREVIEW_SIZE },
    }));
  });

  it('shows real listings, with messaging behind sign-in', async () => {
    get.mockResolvedValue({
      data: { success: true, data: [listing('a'), listing('b', { comicBookTitle: 'Spawn', comicIssue: 1, price: null })] },
    });
    showPreview();

    const cards = await screen.findByRole('list', { name: 'Comics for sale' });
    expect(within(cards).getByRole('heading', { name: 'Batman #497' })).toBeInTheDocument();
    expect(within(cards).getByText('$24.99')).toBeInTheDocument();
    expect(within(cards).getByText('Ask the seller for a price')).toBeInTheDocument();
    expect(within(cards).getByRole('link', { name: 'Sign in to message the seller of Spawn #1' })).toHaveAttribute(
      'href',
      '/signin'
    );
    // Nothing about who is selling
    expect(screen.queryByText(/seller:/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup');
  });

  it('invites visitors to list theirs when nothing is for sale yet', async () => {
    get.mockResolvedValue({ data: { success: true, data: [] } });
    showPreview();

    expect(await screen.findByText(/no comics are listed for sale yet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Want to buy, sell or trade?' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Comics for sale' })).not.toBeInTheDocument();
  });

  it('hides the whole section if the listings fail to load', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    get.mockRejectedValue(new Error('offline'));
    showPreview();

    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Comics for Sale' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});