import { render, screen, waitFor } from '../../test-utils';
import CollectionInsights from '.';

// Mock modules before imports
jest.mock('../../API');
jest.mock('../../utils/anonymousUser');

// Import after mocking
import API from '../../API';
import * as anonymousUserModule from '../../utils/anonymousUser';

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

    expect(screen.getByText(/analyzing your collection/i)).toBeInTheDocument();
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

  it('displays error message on failure', async () => {
    (API.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load collection insights/i)).toBeInTheDocument();
    });
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