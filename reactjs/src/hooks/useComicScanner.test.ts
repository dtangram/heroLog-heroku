import { renderHook, act, waitFor } from '@testing-library/react';
import { useComicScanner } from './useComicScanner';

// Mock the API module
jest.mock('../API');

// Import after mocking
import API from '../API';

describe('useComicScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useComicScanner());

    expect(result.current.isScanning).toBe(false);
    expect(result.current.scanError).toBe('');
  });

  it('successfully scans a cover with wrapped response', async () => {
    // ✅ Backend returns { success: true, data: { ... } }
    // ✅ API interceptor unwraps to this structure
    const mockResponse = {
      success: true,
      data: {
        comicBookTitle: 'Batman',
        comicIssue: '1',
        comicBookVolume: '',
        comicBookYear: '1940',
        comicBookPublisher: 'DC Comics',
        type: 'regular' as const,
        confidence: 0.95,
      }
    };

    (API.post as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useComicScanner());

    let scanResult;
    
    await act(async () => {
      scanResult = await result.current.scanCover('https://example.com/batman.jpg');
    });

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(scanResult).toEqual(mockResponse.data);
    expect(result.current.scanError).toBe('');
  });

  it('handles scan errors', async () => {
    const error = new Error('Network error');
    (API.post as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useComicScanner());

    let scanResult;
    
    await act(async () => {
      scanResult = await result.current.scanCover('https://example.com/batman.jpg');
    });

    await waitFor(() => {
      expect(result.current.isScanning).toBe(false);
    });

    expect(scanResult).toBeNull();
    expect(result.current.scanError).toContain('Network error');
  });

  it('handles failed scan from backend', async () => {
    const mockFailedResponse = {
        success: false,
        data: null,  // ✅ Add data field
        error: 'Could not extract comic metadata from cover'
    };

    (API.post as jest.Mock).mockResolvedValue(mockFailedResponse);

    const { result } = renderHook(() => useComicScanner());

    let scanResult;
    
    await act(async () => {
        scanResult = await result.current.scanCover('https://example.com/batman.jpg');
    });

    await waitFor(() => {
        expect(result.current.isScanning).toBe(false);
    });

    expect(scanResult).toBeNull();
    expect(result.current.scanError).toContain('Could not extract comic metadata');
    });

  it('sets error if imageUrl is empty', async () => {
    const { result } = renderHook(() => useComicScanner());

    let scanResult;
    
    await act(async () => {
      scanResult = await result.current.scanCover('');
    });

    expect(scanResult).toBeNull();
    expect(result.current.scanError).toContain('upload a cover image');
    expect(API.post).not.toHaveBeenCalled();
  });

  it('clears error when clearError is called', async () => {
    const { result } = renderHook(() => useComicScanner());

    await act(async () => {
      await result.current.scanCover('');
    });

    expect(result.current.scanError).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.scanError).toBe('');
  });
});