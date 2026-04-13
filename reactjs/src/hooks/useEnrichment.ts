import { useState, useCallback } from 'react';
import axios from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EnrichmentJob {
  id: number;
  total_comics: number;
  processed_comics: number;
  percentage: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
}

const API_BASE = process.env.REACT_APP_API_URL || '';

// ============================================================================
// HOOK
// ============================================================================

export const useEnrichment = (userId: string | undefined) => {
  const [enrichmentJob, setEnrichmentJob] = useState<EnrichmentJob | null>(null);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [enrichmentError, setEnrichmentError] = useState<string>('');

  const pollEnrichmentProgress = useCallback((jobId: number): void => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/api/search/enrich-progress/${jobId}`
        );

        if (response.data.status === 'Success') {
          const job = response.data.job;
          setEnrichmentJob(job);

          if (
            job.status === 'completed' ||
            job.status === 'failed' ||
            job.status === 'cancelled'
          ) {
            clearInterval(interval);
            setIsEnriching(false);
            console.log(`✅ Enrichment job ${jobId} ${job.status}`);
          }
        }
      } catch (err) {
        console.error('❌ Progress poll error:', err);
      }
    }, 3000);
  }, []);

  const autoEnrichIfNeeded = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
        const response = await axios.post(
        `${API_BASE}/api/search/enrich-all/${userId}`
        );

        if (response.data.status === 'Empty' || response.data.status === 'Complete') {
            setIsEnriching(false);
            return;
        }

        if (response.data.status === 'Success') {
            const newJob: EnrichmentJob = {
                id: response.data.job_id,
                total_comics: response.data.total_comics,
                processed_comics: 0,
                percentage: 0,
                status: 'running',
                started_at: new Date().toISOString(),
                completed_at: null
            };

            setEnrichmentJob(newJob);
            pollEnrichmentProgress(response.data.job_id);
        }
    } catch (err) {
        console.error('❌ Auto-enrich check error:', err);
    }
  }, [userId, pollEnrichmentProgress]);

  const handleStartEnrichment = useCallback(async (): Promise<void> => {
    setIsEnriching(true);
    setEnrichmentError('');

    try {
        console.log('🚀 Starting enrichment for user:', userId);

        const response = await axios.post(
        `${API_BASE}/api/search/enrich-all/${userId}`
        );

        if (response.data.status === 'Empty') {
        setEnrichmentError(response.data.message);
        setIsEnriching(false);
        return;
        }

        if (response.data.status === 'Success') {
        const newJob: EnrichmentJob = {
            id: response.data.job_id,
            total_comics: response.data.total_comics,
            processed_comics: 0,
            percentage: 0,
            status: 'running',
            started_at: new Date().toISOString(),
            completed_at: null
        };

        setEnrichmentJob(newJob);
        console.log('✅ Enrichment job started:', newJob);
        pollEnrichmentProgress(response.data.job_id);
        }

    } catch (err) {
        console.error('❌ Start enrichment error:', err);
        setEnrichmentError('Failed to start enrichment. Please try again.');
        setIsEnriching(false);
    }
    }, [userId, pollEnrichmentProgress]);

  const handleCancelEnrichment = useCallback(async (): Promise<void> => {
    if (!enrichmentJob) return;

    try {
      console.log('🛑 Cancelling enrichment job:', enrichmentJob.id);

      await axios.post(
        `${API_BASE}/api/search/enrich-cancel/${enrichmentJob.id}`
      );

      setIsEnriching(false);
      setEnrichmentJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      console.log('✅ Enrichment job cancelled');

    } catch (err) {
      console.error('❌ Cancel enrichment error:', err);
      setEnrichmentError('Failed to cancel enrichment.');
    }
  }, [enrichmentJob]);

  const resetEnrichment = useCallback((): void => {
    setEnrichmentJob(null);
    setIsEnriching(false);
    setEnrichmentError('');
  }, []);

  const clearEnrichmentError = useCallback((): void => {
    setEnrichmentError('');
  }, []);

  return {
    enrichmentJob,
    isEnriching,
    enrichmentError,
    handleStartEnrichment,
    handleCancelEnrichment,
    resetEnrichment,
    clearEnrichmentError,
    autoEnrichIfNeeded  
  };
};