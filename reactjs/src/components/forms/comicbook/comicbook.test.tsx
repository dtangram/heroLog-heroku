import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComicBook from './ComicBook';
import { mapStateToProps } from './container';

jest.mock('../../../API');
jest.mock('../../../utils/anonymousUser', () => ({ getAnonymousUserId: () => 'anonymous-id' }));
jest.mock('../../scanCoverButton/ScanCoverButton', () => () => null);

// Two Batman issues loaded by the dashboard, #619 stored last — the setup from
// the bug recording where Edit on #401 opened #619.
const comic = (id: string, comicIssue: number, comicBookCover: string) => ({
  id,
  title: 'Batman',
  comicIssue,
  author: '',
  penciler: '',
  coverartist: '',
  inker: '',
  volume: 0,
  year: 0,
  comicBookCover,
  type: 'regular' as const,
});

const state = {
  comicbooklistissues: {
    'title-batman': {
      byId: {
        'comic-401': { data: comic('comic-401', 401, 'batman-401.jpg') },
        'comic-619': { data: comic('comic-619', 619, 'knightquest-619.jpg') },
      },
    },
  },
};

const renderEditPage = (comicId: string) => {
  const actions = {
    createComicBook: jest.fn(),
    fetchComicBook: jest.fn(),
    fetchComicBooks: jest.fn(),
    updateComicBook: jest.fn(),
    deleteComicBook: jest.fn(),
  };
  render(
    <MemoryRouter initialEntries={[`/forms/user-1/pub-1/DC/title-batman/Batman/comicbook/edit/${comicId}`]}>
      <Routes>
        <Route
          path="/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/edit/:id"
          element={<ComicBook {...(mapStateToProps(state as any) as any)} {...(actions as any)} />}
        />
      </Routes>
    </MemoryRouter>
  );
  return actions;
};

describe('ComicBook edit form', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  it('opens the comic whose Edit was clicked, not the last one loaded', async () => {
    const actions = renderEditPage('comic-401');

    await waitFor(() => expect(screen.getByLabelText(/issue/i)).toHaveValue('401'));
    expect(actions.fetchComicBook).toHaveBeenCalledWith('comic-401');
  });

  it('opens a different comic correctly too', async () => {
    renderEditPage('comic-619');

    await waitFor(() => expect(screen.getByLabelText(/issue/i)).toHaveValue('619'));
  });

  it('leaves the form empty until the requested comic has loaded', () => {
    renderEditPage('comic-not-loaded-yet');

    expect(screen.getByLabelText(/issue/i)).toHaveValue('');
  });
});