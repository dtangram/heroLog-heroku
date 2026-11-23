import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComicBook from './ComicBook';
import { mapStateToProps } from './container';

jest.mock('../../../API');
jest.mock('../../../utils/anonymousUser', () => ({ getAnonymousUserId: () => 'anonymous-id' }));

const mockScanCover = jest.fn();
jest.mock('../../../hooks/useComicScanner', () => ({
  useComicScanner: () => ({
    scanCover: (...args: unknown[]) => mockScanCover(...args),
    isScanning: false,
    scanError: '',
  }),
}));

// Stand-in for the S3 upload: the test finishes an upload by calling this
let finishUpload: (url: string) => void = () => {};
jest.mock('../../../hooks/useCoverUpload', () => ({
  useCoverUpload: (onUploaded: (url: string) => void) => {
    finishUpload = onUploaded;
    return { isUploading: false, handleFileInputChange: jest.fn() };
  },
}));

const actions = {
  createComicBook: jest.fn(),
  fetchComicBook: jest.fn(),
  fetchComicBooks: jest.fn(),
  updateComicBook: jest.fn(),
  deleteComicBook: jest.fn(),
};

const state = {
  comicbooklistissues: {
    'title-batman': {
      byId: {
        'comic-497': {
          data: {
            id: 'comic-497', title: 'Batman', comicIssue: 497, author: '', penciler: '',
            coverartist: '', inker: '', volume: 0, year: 1993, comicBookCover: 'batman-497.jpg', type: 'regular',
          },
        },
      },
    },
  },
};

const showForm = (path: string, route: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={<ComicBook {...(mapStateToProps(state as any) as any)} {...(actions as any)} />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  mockScanCover.mockReset().mockResolvedValue(null);
});

it('scans a new cover as soon as it uploads, so the form fills itself in', async () => {
  showForm(
    '/forms/user-1/pub-1/DC/title-batman/Batman/comicbook/new',
    '/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/new'
  );

  finishUpload('https://covers.example/batman-500.jpg');

  await waitFor(() => expect(mockScanCover).toHaveBeenCalledWith('https://covers.example/batman-500.jpg'));
});

it("waits for the scan button when there's already a title, so nothing typed is overwritten", async () => {
  showForm(
    '/forms/user-1/pub-1/DC/title-batman/Batman/comicbook/edit/comic-497',
    '/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/edit/:id'
  );
  await screen.findByDisplayValue('Batman');

  finishUpload('https://covers.example/batman-497-new.jpg');

  expect(mockScanCover).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /scan cover with ai/i })).toBeInTheDocument();
});