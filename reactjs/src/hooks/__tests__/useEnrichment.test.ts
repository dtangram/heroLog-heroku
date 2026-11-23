import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useEnrichment, POLL_INTERVAL } from '../useEnrichment';
import { API_URL, sessionHeaders } from '../../API';

jest.mock('axios');
jest.mock('../API', () => ({
  API_URL: 'https://herolog.example/api',
  sessionHeaders: jest.fn(async () => ({ Authorization: 'Bearer t' })),
}));

const mocked = axios as jest.Mocked<typeof axios>;
const USER = '11111111-2222-4333-8444-555555555555';

const job = (processed: number, status = 'running') => ({
  data: { status: 'Success', job: { id: 7, total_comics: 3, processed_comics: processed, percentage: 0, status } },
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  (sessionHeaders as jest.Mock).mockResolvedValue({ Authorization: 'Bearer t' });
});

afterEach(() => jest.useRealTimers());

describe('useEnrichment', () => {
  it('asks the API to prepare anything missing, then follows it until done', async () => {
    mocked.post.mockResolvedValue({ data: { status: 'Success', job_id: 7, total_comics: 3 } });
    mocked.get.mockResolvedValueOnce(job(1)).mockResolvedValueOnce(job(3, 'completed'));

    const { result } = renderHook(() => useEnrichment(USER));

    await waitFor(() => expect(result.current.enrichmentJob?.processed_comics).toBe(1));
    expect(mocked.post).toHaveBeenCalledWith(`${API_URL}/search/enrich-all/${USER}`, undefined, {
      headers: { Authorization: 'Bearer t' },
    });
    expect(result.current.isCatchingUp).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL);
    });
    await waitFor(() => expect(result.current.isCatchingUp).toBe(false));
    expect(mocked.get).toHaveBeenCalledTimes(2);
  });

  it('joins a catch-up that is already running', async () => {
    mocked.post.mockResolvedValue({ data: { status: 'Running', job_id: 7, total_comics: 3 } });
    mocked.get.mockResolvedValue(job(2));

    const { result } = renderHook(() => useEnrichment(USER));

    await waitFor(() => expect(result.current.enrichmentJob?.processed_comics).toBe(2));
    expect(mocked.get).toHaveBeenCalledWith(`${API_URL}/search/enrich-progress/7`, expect.anything());
  });

  it('shows nothing when every comic is already ready', async () => {
    mocked.post.mockResolvedValue({ data: { status: 'Complete' } });

    const { result } = renderHook(() => useEnrichment(USER));

    await waitFor(() => expect(mocked.post).toHaveBeenCalled());
    expect(result.current.enrichmentJob).toBeNull();
    expect(mocked.get).not.toHaveBeenCalled();
  });

  it('stops checking when you leave the page', async () => {
    mocked.post.mockResolvedValue({ data: { status: 'Success', job_id: 7, total_comics: 3 } });
    mocked.get.mockResolvedValue(job(1));

    const { result, unmount } = renderHook(() => useEnrichment(USER));
    await waitFor(() => expect(result.current.enrichmentJob?.processed_comics).toBe(1));

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL * 5);
    });
    expect(mocked.get).toHaveBeenCalledTimes(1);
  });

  it("never breaks Search if the catch-up can't start", async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mocked.post.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useEnrichment(USER));

    await waitFor(() => expect(mocked.post).toHaveBeenCalled());
    expect(result.current.isCatchingUp).toBe(false);
  });
});