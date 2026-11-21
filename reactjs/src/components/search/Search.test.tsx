import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import axios from 'axios';
import callAPI from '../../store/helpers/callAPIMiddleware';
import wishlists from '../../store/wishlist/reducer';
import API from '../../API';
import Search from './Search';
import { SLOW_SEARCH_MS } from '../../hooks/useSearch';

jest.mock('axios');
// The wish list store talks to the site API, not the search service
jest.mock('../../API', () => ({
  __esModule: true,
  default: { get: jest.fn(() => new Promise(() => {})), post: jest.fn() },
  // Search sends the session token with each request
  sessionHeaders: jest.fn(async () => ({ Authorization: 'Bearer test-token' })),
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

/** A request we resolve by hand, to look at the page while a search is running. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

const collectionResponse = (titles: string[]) => ({
  data: {
    status: 'Success',
    results: titles.map((title, i) => ({
      comic_id: `id-${i}`,
      title,
      description: 'A dark story.',
      similarity_score: 0.9,
    })),
  },
});

const renderSearch = () =>
  render(
    <Provider store={createStore(combineReducers({ wishlists }), applyMiddleware(thunk, callAPI as any))}>
      <MemoryRouter initialEntries={['/search/user-1']}>
        <Routes>
          <Route path="/search/:userId" element={<Search />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const search = (text: string) => {
  fireEvent.change(screen.getByLabelText('Search comics'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
};

describe('Search page while a search runs', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (mockedAxios.isCancel as unknown as jest.Mock).mockReturnValue(false);
  });

  it('keeps the form visible and shows skeleton cards where results will appear', async () => {
    const request = deferred<any>();
    mockedAxios.get.mockReturnValue(request.promise);
    renderSearch();

    search('dark 90s Batman');

    // Form is still there and usable
    expect(screen.getByLabelText('Search comics')).toHaveValue('dark 90s Batman');
    expect(screen.getByRole('button', { name: 'My Collection' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();

    // Status line and 5 placeholder cards (collection search returns 5)
    expect(screen.getByRole('status')).toHaveTextContent('Searching the Multiverse for "dark 90s Batman"');
    expect(screen.queryAllByTestId('result-skeleton')).toHaveLength(5);

    await act(async () => request.resolve(collectionResponse(['Batman #497', 'Batman #500'])));

    expect(screen.queryAllByTestId('result-skeleton')).toHaveLength(0);
    expect(screen.getByText('Batman #497')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
  });

  it('keeps the results heading on the searched words while the user types', async () => {
    mockedAxios.get.mockResolvedValue(collectionResponse(['Batman #497']));
    renderSearch();

    search('Knightfall saga');
    expect(await screen.findByText('Batman #497')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search comics'), { target: { value: '' } });

    expect(screen.getByRole('heading', { name: 'Results for "Knightfall saga"' })).toBeInTheDocument();
    expect(screen.queryByText('Results for ""')).not.toBeInTheDocument();
  });

  it('explains a slow Claude search after 8 seconds', () => {
    jest.useFakeTimers();
    try {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      renderSearch();

      fireEvent.click(screen.getByRole('button', { name: 'All Comics' }));
      search('Knightfall saga');
      expect(screen.queryAllByTestId('result-skeleton')).toHaveLength(6);

      act(() => {
        jest.advanceTimersByTime(SLOW_SEARCH_MS);
      });

      expect(screen.getByRole('status')).toHaveTextContent('can take up to 20 seconds');
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows only the newest search when an older one finishes late', async () => {
    const first = deferred<any>();
    const second = deferred<any>();
    mockedAxios.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    renderSearch();

    search('Superman');
    fireEvent.change(screen.getByLabelText('Search comics'), { target: { value: 'Batman' } });
    fireEvent.keyDown(screen.getByLabelText('Search comics'), { key: 'Enter' });

    await act(async () => second.resolve(collectionResponse(['Batman #500'])));
    await act(async () => first.resolve(collectionResponse(['Superman #75'])));

    expect(screen.getByText('Batman #500')).toBeInTheDocument();
    expect(screen.queryByText('Superman #75')).not.toBeInTheDocument();
    const firstSignal = mockedAxios.get.mock.calls[0][1]?.signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
  });
});

describe('Search results and the Wish List', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (mockedAxios.isCancel as unknown as jest.Mock).mockReturnValue(false);
    localStorage.setItem('id', '11111111-2222-4333-8444-555555555555');
    localStorage.setItem('token', 'test-token');
    // Signed in, so the page loads the wish list: an empty one
    (API.get as jest.Mock).mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => localStorage.clear());

  it('offers "Add to Wish List" on comics you don\'t own, not on ones you do', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        status: 'Success',
        results: [
          { title: 'Detective Comics #27', description: 'Batman debuts.', publisher: 'DC Comics', year: '1939', already_owned: false, source: 'claude' },
          { title: 'Batman #497', description: 'Bane breaks the Bat.', publisher: 'DC Comics', year: '1993', already_owned: true, source: 'claude' },
        ],
      },
    });
    renderSearch();

    fireEvent.click(screen.getByRole('button', { name: 'Find Missing' }));
    await act(async () => search('Batman'));

    expect(screen.getByRole('button', { name: 'Add Detective Comics #27 to your Wish List' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add batman #497/i })).not.toBeInTheDocument();
  });
});

describe('Collection search when the AI service is unavailable', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (mockedAxios.isCancel as unknown as jest.Mock).mockReturnValue(false);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    // resetAllMocks also clears the global uuid mock, so give Search an ID directly
    localStorage.setItem('id', '11111111-2222-4333-8444-555555555555');
  });

  afterEach(() => localStorage.clear());

  it('explains that only collection search is down, instead of a connection error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedAxios.get.mockRejectedValue({ response: { status: 503 } });
    renderSearch();

    await act(async () => search('Batman'));

    expect(screen.getByText(/searching your collection is unavailable right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/failed to connect/i)).not.toBeInTheDocument();
  });

  it('shows how many comics are still being prepared for My Collection search', async () => {
    mockedAxios.post.mockResolvedValue({ data: { status: 'Success', job_id: 4, total_comics: 12 } });
    mockedAxios.get.mockResolvedValue({
      data: { status: 'Success', job: { id: 4, total_comics: 12, processed_comics: 5, percentage: 42, status: 'running' } },
    });
    renderSearch();

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Getting 12 comics ready for search (5 of 12 done)')
    );
  });
});