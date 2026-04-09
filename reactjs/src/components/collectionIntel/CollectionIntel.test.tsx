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

  it('displays insights when data is loaded', async () => {
    const mockInsights = {
      totalComics: 50,
      uniqueSeries: 10,
      topSeries: [
        {
          seriesName: 'Batman',
          totalIssues: 20,
          completionPercentage: 75,
          ownedIssues: [1, 2, 3],
          missingIssues: [4, 5],
          variants: 2,
        },
      ],
      recommendations: ['Complete Batman series!'],
      aiInsights: 'Your collection is impressive!',
    };

    (API.get as jest.Mock).mockResolvedValue(mockInsights);

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Batman')).toBeInTheDocument();
    expect(screen.getByText(/your collection is impressive/i)).toBeInTheDocument();
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
      topSeries: [],
      seriesBreakdown: [],
      recommendations: ['Start building your collection!'],
      aiInsights: 'Start building your collection!',
    };

    (API.get as jest.Mock).mockResolvedValue(mockEmptyInsights);

    render(<CollectionInsights />);

    await waitFor(() => {
      expect(screen.getByText(/start building your collection/i)).toBeInTheDocument();
    });
  });
});