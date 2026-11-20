import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from 'redux';
import { thunk } from 'redux-thunk';
import callAPI from '../../store/helpers/callAPIMiddleware';
import wishlists from '../../store/wishlist/reducer';
import API from '../../API';
import { notify } from '../dialog';
import AddToWishList, { parseIssueTitle } from './AddToWishList';
import type { ClaudeResult } from '../../hooks/useSearch';

jest.mock('../../API');
jest.mock('../dialog', () => ({ notify: jest.fn(), showAlert: jest.fn() }));

const USER = '11111111-2222-4333-8444-555555555555';

const result = (overrides: Partial<ClaudeResult> = {}): ClaudeResult => ({
  title: 'Detective Comics #27',
  description: 'The first appearance of Batman.',
  publisher: 'DC Comics',
  year: '1939',
  source: 'claude',
  ...overrides,
});

const setup = (props: { result?: ClaudeResult; preloaded?: object } = {}) => {
  const store = createStore(
    combineReducers({ wishlists }),
    (props.preloaded ?? {}) as any,
    applyMiddleware(thunk, callAPI as any)
  );
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AddToWishList result={props.result ?? result()} userId={USER} />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

describe('parseIssueTitle', () => {
  it.each([
    ['Detective Comics #27', { title: 'Detective Comics', issue: '27' }],
    ['The Spirit #1', { title: 'The Spirit', issue: '1' }],
    ['Batman # 497 (Knightfall)', { title: 'Batman', issue: '497' }],
  ])('%s', (text, expected) => {
    expect(parseIssueTitle(text)).toEqual(expected);
  });

  it('returns null for a story arc or collected edition', () => {
    expect(parseIssueTitle('Batman: Year One')).toBeNull();
    expect(parseIssueTitle('Knightfall saga')).toBeNull();
  });
});

describe('AddToWishList', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.setItem('id', USER);
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => localStorage.clear());

  it('adds the comic in one click, with the title, issue, publisher and year split out', async () => {
    (API.post as jest.Mock).mockResolvedValue({ success: true, data: { id: 'server-1' } });
    setup();

    fireEvent.click(screen.getByRole('button', { name: 'Add Detective Comics #27 to your Wish List' }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Added Detective Comics #27 to your Wish List.'));
    expect(API.post).toHaveBeenCalledWith(
      '/wishlist/',
      expect.objectContaining({
        comicBookTitle: 'Detective Comics',
        comicIssue: '27',
        comicBookPublisher: 'DC Comics',
        comicBookYear: '1939',
        type: 'regular',
        wishUsersId: USER,
      })
    );
    // The button becomes "On your Wish List", so it can't be added twice
    expect(screen.getByText('On your Wish List')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Wish List' })).toHaveAttribute('href', `/wishlist/${USER}`);
  });

  it('says so when the comic is already on the wish list', () => {
    setup({
      result: result({ title: 'The Spirit #1', publisher: 'Quality Comics' }),
      preloaded: {
        wishlists: {
          [USER]: {
            byId: { w1: { data: { id: 'w1', comicBookTitle: 'Spirit', comicIssue: 1 } } },
            allIds: ['w1'],
            loadedAt: Date.now(),
            isLoading: false,
            error: null,
          },
        },
      },
    });

    expect(screen.getByText('On your Wish List')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in instead', () => {
    localStorage.removeItem('token');
    setup();

    expect(screen.getByRole('link', { name: 'Sign in to add Detective Comics #27 to your Wish List' })).toHaveAttribute(
      'href',
      '/signin'
    );
  });

  it('offers nothing for a result that is not one numbered issue', () => {
    setup({ result: result({ title: 'Batman: Year One' }) });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leaves out a year the wish list would reject', async () => {
    (API.post as jest.Mock).mockResolvedValue({ success: true, data: { id: 'server-1' } });
    setup({ result: result({ year: 'Golden Age' }) });

    fireEvent.click(screen.getByRole('button', { name: /add detective comics #27/i }));

    await waitFor(() => expect(API.post).toHaveBeenCalled());
    expect((API.post as jest.Mock).mock.calls[0][1].comicBookYear).toBe('');
  });
});