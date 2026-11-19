import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComicBook from './ComicBook';
import { mapStateToProps } from './container';
import DialogHost, { resetDialogs } from '../../dialog';

jest.mock('../../../API');
jest.mock('../../../utils/anonymousUser', () => ({ getAnonymousUserId: () => 'anonymous-id' }));
jest.mock('../../scanCoverButton/ScanCoverButton', () => ({ onScan }: { onScan: () => void }) => (
  <button type="button" onClick={onScan}>
    Scan Cover with AI
  </button>
));

const mockScanCover = jest.fn();
jest.mock('../../../hooks/useComicScanner', () => ({
  useComicScanner: () => ({
    scanCover: (...args: unknown[]) => mockScanCover(...args),
    isScanning: false,
    scanError: '',
  }),
}));

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
      <DialogHost />
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
    // Saved as "regular"; the radio button is "Regular"
    expect(screen.getByLabelText('Regular Cover')).toBeChecked();
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

describe('ComicBook new comic: year validation', () => {
  const currentYear = new Date().getFullYear();

  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  const fillAndSubmit = (year: string) => {
    const actions = {
      createComicBook: jest.fn().mockResolvedValue(undefined),
      fetchComicBook: jest.fn(),
      fetchComicBooks: jest.fn(),
      updateComicBook: jest.fn(),
      deleteComicBook: jest.fn(),
    };
    render(
      <MemoryRouter initialEntries={['/forms/user-1/pub-1/Marvel/title-asm/Amazing/comicbook/new']}>
        <Routes>
          <Route
            path="/forms/:userId/:pubId/:publisherName/:coboTitleId/:cbTitle/comicbook/new"
            element={<ComicBook {...(mapStateToProps({ comicbooklistissues: {} } as any) as any)} {...(actions as any)} />}
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'The Amazing Spider-Man' } });
    fireEvent.change(screen.getByLabelText(/issue/i), { target: { value: '395' } });
    fireEvent.click(screen.getByLabelText(/regular cover/i));
    fireEvent.change(screen.getByLabelText(/year/i), { target: { value: year } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    return actions;
  };

  it('submits a valid year like 1994', async () => {
    const actions = fillAndSubmit('1994');
    await waitFor(() =>
      expect(actions.createComicBook).toHaveBeenCalledWith(expect.objectContaining({ year: '1994' }))
    );
    expect(screen.getByLabelText(/year/i)).toHaveAttribute('aria-invalid', 'false');
  });

  it.each(['1850', '0001', String(currentYear + 5)])('blocks submitting year %s and explains why', year => {
    const actions = fillAndSubmit(year);

    expect(actions.createComicBook).not.toHaveBeenCalled();
    expect(screen.getByText(`Year must be between 1900 and ${currentYear + 1}`)).toBeInTheDocument();
    expect(screen.getByLabelText(/year/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the year error once the year is edited', () => {
    fillAndSubmit('1850');
    fireEvent.change(screen.getByLabelText(/year/i), { target: { value: '1994' } });

    expect(screen.queryByText(/year must be between/i)).not.toBeInTheDocument();
  });
});

describe('ComicBook scan: creator credits', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  afterEach(() => resetDialogs());

  const scanResult = (overrides = {}) => ({
    title: 'Batman',
    comicIssue: '491',
    comicBookVolume: '',
    comicBookYear: '',
    comicBookPublisher: 'DC Comics',
    author: 'Doug Moench',
    penciler: 'Jim Aparo',
    inker: '',
    coverartist: '',
    type: 'regular',
    confidence: 0.9,
    ...overrides,
  });

  it('fills Author and Penciler from the cover credit box', async () => {
    mockScanCover.mockResolvedValue(scanResult());
    renderEditPage('comic-401');
    await waitFor(() => expect(screen.getByLabelText(/issue/i)).toHaveValue('401'));

    fireEvent.click(screen.getByRole('button', { name: /scan cover with ai/i }));

    await waitFor(() => expect(screen.getByLabelText(/author/i)).toHaveValue('Doug Moench'));
    expect(screen.getByLabelText(/penciler/i)).toHaveValue('Jim Aparo');
    expect(screen.getByLabelText(/inker/i)).toHaveValue('');
    expect(screen.getByLabelText(/cover artist/i)).toHaveValue('');
    expect(mockScanCover).toHaveBeenCalledWith('batman-401.jpg');
  });

  it('selects Variant when the scan says the cover is a variant', async () => {
    mockScanCover.mockResolvedValue(scanResult({ type: 'variant' }));
    renderEditPage('comic-401');
    await waitFor(() => expect(screen.getByLabelText('Regular Cover')).toBeChecked());

    fireEvent.click(screen.getByRole('button', { name: /scan cover with ai/i }));

    await waitFor(() => expect(screen.getByLabelText('Variant Cover')).toBeChecked());
    expect(screen.getByLabelText('Regular Cover')).not.toBeChecked();
  });

  it('keeps names already entered when the cover shows no credits', async () => {
    mockScanCover.mockResolvedValue(scanResult({ author: '', penciler: '' }));
    renderEditPage('comic-401');
    await waitFor(() => expect(screen.getByLabelText(/issue/i)).toHaveValue('401'));

    fireEvent.change(screen.getByLabelText(/author/i), { target: { value: 'Alan Grant' } });
    fireEvent.click(screen.getByRole('button', { name: /scan cover with ai/i }));

    // The scan confirms itself with a toast instead of a browser alert
    expect(await screen.findByText(/cover scanned \(90% confidence\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/author/i)).toHaveValue('Alan Grant');
  });
});