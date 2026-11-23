import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { combineReducers, legacy_createStore as createStore } from 'redux';
import wishlists from '../../store/wishlist/reducer';
import { ClaudeResultList, CollectionResultCard } from './ResultCards';
import type { ClaudeResult, CollectionResult } from '../../hooks/useSearch';

jest.mock('../../API');

const USER = '11111111-2222-4333-8444-555555555555';

/** The page has no layout in tests, so say how tall descriptions are: long ones overflow three lines */
const LONG = 'A long description. '.repeat(20);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get() { return (this.textContent ?? '').length > 100 ? 120 : 60; },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 60 });
});

const show = (element: React.ReactElement) =>
  render(
    <Provider store={createStore(combineReducers({ wishlists }))}>
      <MemoryRouter>{element}</MemoryRouter>
    </Provider>
  );

const comic = (title: string, overrides: Partial<ClaudeResult> = {}): ClaudeResult => ({
  title, description: 'A short description.', publisher: 'DC Comics', year: '1993', source: 'claude', ...overrides,
});

describe('All Comics and Find Missing results', () => {
  it('groups a storyline under Main story, Tie-ins and Related, with counts', () => {
    show(
      <ClaudeResultList
        userId={USER}
        results={[
          comic('Batman #491', { group: 'Main story' }),
          comic('Detective Comics #659', { group: 'Tie-in' }),
          comic('Batman #492', { group: 'Main story' }),
          comic('Vengeance of Bane #1', { group: 'Related' }),
        ]}
      />
    );

    const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(headings).toEqual(['Main story (2)', 'Tie-ins (1)', 'Related (1)']);

    const mainStory = screen.getByRole('region', { name: 'Main story (2)' });
    expect(within(mainStory).getAllByRole('heading', { level: 4 }).map(h => h.textContent))
      .toEqual(['Batman #491', 'Batman #492']);
  });

  it('shows a plain list when everything is in one group', () => {
    show(<ClaudeResultList userId={USER} results={[comic('Batman #497'), comic('Batman #500')]} />);

    expect(screen.queryByRole('heading', { name: /related/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Batman #497', 'Batman #500']);
  });

  it('marks a comic already owned and does not offer it for the wish list', () => {
    show(<ClaudeResultList userId={USER} results={[comic('Batman #497', { already_owned: true })]} />);

    expect(screen.getByText('Owned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /wish list/i })).not.toBeInTheDocument();
  });
});

describe('My Collection results', () => {
  const match: CollectionResult = {
    comic_id: 'c-497',
    title: 'Batman #497',
    description: LONG,
    similarity_score: 0.46,
    cover: 'https://covers.example/497.jpg',
    publisher_id: 'pub-dc',
    publisher_name: 'DC',
    title_id: 'title-batman',
    series: 'Batman',
  };

  it('shows the cover and links to the comic in the collection', () => {
    show(<CollectionResultCard result={match} userId={USER} />);

    expect(screen.getByRole('img', { name: 'Cover of Batman #497' })).toHaveAttribute('src', match.cover);
    expect(screen.getByRole('link', { name: 'Batman #497' }))
      .toHaveAttribute('href', `/dashboard/${USER}/pub-dc/DC/title-batman/Batman/comicbooklistissues`);
    expect(screen.getByText('46% match')).toBeInTheDocument();
  });

  it('offers "Read more" only when the description is cut off', () => {
    show(<CollectionResultCard result={match} userId={USER} />);

    const button = screen.getByRole('button', { name: 'Read more' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the placeholder when a comic has no cover, and no link when its place is unknown', () => {
    show(<CollectionResultCard result={{ ...match, cover: null, title_id: null, description: 'Short.' }} userId={USER} />);

    expect(screen.getByRole('img', { name: 'Batman #497: no cover yet' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument();
  });
});