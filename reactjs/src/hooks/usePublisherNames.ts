import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPublishers } from '../store/dashboard/actions';

interface PublishersSlice {
  publishers?: { byId?: Record<string, { data?: { publisherName?: string } }>; allIds?: string[]; isLoading?: boolean };
}

/**
 * The names of the collector's publishers, A to Z, for suggesting and matching
 * publisher names on the Sale and Wish List forms. Loads them if the Dashboard
 * hasn't yet.
 */
export const usePublisherNames = (): string[] => {
  const dispatch = useDispatch();
  const slice = useSelector((state: PublishersSlice) => state.publishers);
  const hasList = Boolean(slice?.allIds?.length);

  useEffect(() => {
    if (!hasList && !slice?.isLoading && localStorage.getItem('id')) {
      dispatch(fetchPublishers() as any);
    }
    // Only when the form opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    const names = Object.values(slice?.byId ?? {})
      .map(entry => entry?.data?.publisherName?.trim())
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [slice?.byId]);
};