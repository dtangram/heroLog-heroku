import { act, fireEvent, render, screen, waitFor, within } from '../../test-utils';
import CollectionInsights, { SLOW_AFTER } from '.';
import API from '../../API';
import * as anonymousUserModule from '../../utils/anonymousUser';

// Jest moves these above the imports, so the component gets the mocks
jest.mock('../../API');
jest.mock('../../utils/anonymousUser');

describe('CollectionInsights', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('id', 'test-user-id');
    jest.clearAllMocks();
    
    // Setup mock implementation
    (anonymousUserModule.getAnonymousUserId as jest.Mock).mockReturnValue('anonymous-id');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows loading state initially', () => {
    // Mock API to never resolve
    (API.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<CollectionInsights />);

    expect(screen.getByRole('status')).toHaveTextContent(/analyzing your collection/i);
    expect(screen.getByTestId('intel-skeleton')).toBeInTheDocument();
  });

  it('explains a slow first analysis instead of looking stuck', () => {
    jest.useFakeTimers();
    (API.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<CollectionInsights />);
    act(() => {
      jest.advanceTimersByTime(SLOW_AFTER);
    });

    expect(screen.getByRole('status')).toHaveTextContent(/after that, it loads right away/i);
    jest.useRealTimers();
  });

  const batmanSeries = {
    seriesName: 'Batman',
    ownedIssues: [497, 500, 541, 600, 619],
    missingIssues: [],
    missingRanges: ['#498–#499', '#501–#540'],
    span: { first: 497, last: 619 },
    totalIssues: 123,
    completionPercentage: 4,
    pattern: 'scattered',
    variants: 1,
    duplicateCopies: 1,
  };

  const mockInsights = {
    totalComics: 7,
    uniqueIssues: 5,
    variantCopies: 1,
    duplicateCopies: 1,
    unnumberedComics: 0,
    uniqueSeries: 1,
    seriesBreakdown: [batmanSeries],
    topSeries: [batmanSeries],
    analysis: {
      summary: 'Your collection is impressive!',
      highlights: ['Batman #500 is a milestone issue.'],
      recommendations: [{ series: 'Batman', issues: [492], reason: 'It starts Knightfall.' }],
      observation: 'You collect key moments.',
    },
    analysisSource: 'ai',
  };

  it('displays insights when data is loaded', async () => {
    (API.get as jest.Mock).mockResolvedValue(mockInsights);

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    expect(screen.getByText('5 unique issues · 1 variant · 1 duplicate')).toBeInTheDocument();
    expect(screen.getByText(/your collection is impressive/i)).toBeInTheDocument();
    expect(screen.getByText('Batman #500 is a milestone issue.')).toBeInTheDocument();
    expect(screen.getByText('Batman #492')).toBeInTheDocument();
    expect(screen.queryByText(/ai analysis isn't available/i)).not.toBeInTheDocument();
  });

  it('shows owned issues for a scattered series instead of a misleading gap count', async () => {
    (API.get as jest.Mock).mockResolvedValue(mockInsights);

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText('Selected issues')).toBeInTheDocument();
    });

    expect(screen.getByText('You own: #497, #500, #541, #600, #619')).toBeInTheDocument();
    expect(screen.queryByText(/missing:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('labels a summary built from data when AI analysis is unavailable', async () => {
    (API.get as jest.Mock).mockResolvedValue({ ...mockInsights, analysisSource: 'fallback' });

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText(/ai analysis isn't available/i)).toBeInTheDocument();
    });
  });

  it('lets the collector try the AI analysis again, keeping the page up meanwhile', async () => {
    (API.get as jest.Mock)
      .mockResolvedValueOnce({ success: true, data: { ...mockInsights, analysisSource: 'fallback' } })
      .mockResolvedValueOnce({ success: true, data: mockInsights });

    render(<CollectionInsights />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try AI analysis again' }));

    // Still showing the collection while it asks again
    expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
    expect(screen.getByText('Total Comics')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/ai analysis isn't available/i)).not.toBeInTheDocument();
    });
    expect(API.get).toHaveBeenCalledTimes(2);
  });

  it('shows run progress as an accessible progress bar', async () => {
    const run = {
      ...batmanSeries,
      seriesName: 'Spawn',
      pattern: 'run',
      completionPercentage: 75,
      span: { first: 5, last: 8 },
      missingIssues: [7],
      missingRanges: ['#7'],
    };
    (API.get as jest.Mock).mockResolvedValue({ ...mockInsights, topSeries: [run] });

    render(<CollectionInsights />);

    const bar = await screen.findByRole('progressbar', { name: 'Spawn: issues owned from #5–#8' });
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('1 gap')).toBeInTheDocument();
    expect(screen.getByText('Missing between #5–#8: 1 issue')).toBeInTheDocument();
  });

  it("doesn't call two issues in a row a complete run", async () => {
    const shortRun = {
      ...batmanSeries,
      seriesName: 'Detective Comics',
      pattern: 'run',
      completionPercentage: 100,
      ownedIssues: [659, 660],
      span: { first: 659, last: 660 },
      missingIssues: [],
      missingRanges: [],
    };
    (API.get as jest.Mock).mockResolvedValue({ ...mockInsights, topSeries: [shortRun] });

    render(<CollectionInsights />);

    expect(await screen.findByText('No gaps')).toBeInTheDocument();
    expect(screen.queryByText(/of run/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing/)).not.toBeInTheDocument();
  });

  it('shows highlights as a list', async () => {
    (API.get as jest.Mock).mockResolvedValue({
      ...mockInsights,
      analysis: { ...mockInsights.analysis, highlights: ['First point.', 'Second point.'] },
    });

    render(<CollectionInsights />);

    const list = await screen.findByRole('list', { name: 'Highlights' });
    expect(within(list).getAllByRole('listitem').map(item => item.textContent)).toEqual(['First point.', 'Second point.']);
  });

  it('displays error message on failure', async () => {
    (API.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load collection insights/i);
    });
  });

  it('recovers from an error with Try again', async () => {
    (API.get as jest.Mock)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(mockInsights);

    render(<CollectionInsights />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Total Comics')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('gives the analysis longer than the site-wide 15 second timeout', async () => {
    (API.get as jest.Mock).mockResolvedValue(mockInsights);

    render(<CollectionInsights />);

    await screen.findByText('Total Comics');
    expect(API.get).toHaveBeenCalledWith('/insights/test-user-id', { timeout: 30000 });
  });

  it('shows empty state when no comics', async () => {
    const mockEmptyInsights = {
      totalComics: 0,
      uniqueSeries: 0,
      uniqueIssues: 0,
      variantCopies: 0,
      duplicateCopies: 0,
      unnumberedComics: 0,
      topSeries: [],
      seriesBreakdown: [],
      analysis: { summary: 'Start building your collection!', highlights: [], recommendations: [], observation: '' },
      analysisSource: 'fallback',
    };

    (API.get as jest.Mock).mockResolvedValue(mockEmptyInsights);

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText(/start building your collection/i)).toBeInTheDocument();
    });
  });
});