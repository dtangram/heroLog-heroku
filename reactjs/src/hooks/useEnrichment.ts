import { useEffect, useState } from 'react';
import axios from 'axios';
import { sessionHeaders } from '../API';

export interface EnrichmentJob {
  id: number;
  total_comics: number;
  processed_comics: number;
  percentage: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string | null;
}

const API_BASE = process.env.REACT_APP_API_URL || '';

/** How often to check a running catch-up */
export const POLL_INTERVAL = 3000;

/**
 * Makes sure every comic in your collection can be found by My Collection
 * search. New comics are prepared when they're added, but that can fail (for
 * example while the OpenAI account is out of credits). On each visit to
 * Search, this asks the API to prepare anything still missing, in the
 * background, and reports progress while it runs. Nothing shows when
 * everything is ready.
 */
export const useEnrichment = (userId: string | undefined) => {
  const [enrichmentJob, setEnrichmentJob] = useState<EnrichmentJob | null>(null);

  useEffect(() => {
    if (!userId) return undefined;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (jobId: number) => {
      try {
        const response = await axios.get(`${API_BASE}/api/search/enrich-progress/${jobId}`, {
          headers: await sessionHeaders(),
        });
        if (!active) return;

        const job: EnrichmentJob | undefined = response.data?.job;
        if (job) setEnrichmentJob(job);
        if (!job || job.status === 'running') {
          timer = setTimeout(() => poll(jobId), POLL_INTERVAL);
        }
      } catch (err) {
        // Progress is a nice-to-have; search still works without it
        console.error('❌ Progress poll error:', err);
      }
    };

    const start = async () => {
      try {
        const response = await axios.post(`${API_BASE}/api/search/enrich-all/${userId}`, undefined, {
          headers: await sessionHeaders(),
        });
        if (!active) return;

        const { status, job_id: jobId, total_comics: total } = response.data ?? {};
        // 'Success' starts a new catch-up; 'Running' joins one already going
        if ((status === 'Success' || status === 'Running') && jobId) {
          setEnrichmentJob({ id: jobId, total_comics: total, processed_comics: 0, percentage: 0, status: 'running' });
          poll(jobId);
        }
      } catch (err) {
        console.error('❌ Search catch-up error:', err);
      }
    };

    start();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [userId]);

  const isCatchingUp = enrichmentJob?.status === 'running';

  return { enrichmentJob, isCatchingUp };
};

export default useEnrichment;