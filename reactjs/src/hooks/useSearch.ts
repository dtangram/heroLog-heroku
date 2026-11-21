import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { sessionHeaders } from '../API';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CollectionResult {
  comic_id: string;
  title: string;
  description: string;
  similarity_score: number;
}

export interface ClaudeResult {
  title: string;
  description: string;
  publisher: string;
  year: string;
  already_owned?: boolean;
  source: string;
}

export type SearchMode = 'collection' | 'all' | 'missing';

const API_BASE = process.env.REACT_APP_API_URL || '';

/** After this long, tell the user the search is still running and why. */
export const SLOW_SEARCH_MS = 8000;

// ============================================================================
// HOOK
// ============================================================================

export const useSearch = (userId: string | undefined) => {
  const [query, setQuery] = useState<string>('');
  const [mode, setMode] = useState<SearchMode>('collection');
  const [collectionResults, setCollectionResults] = useState<CollectionResult[]>([]);
  const [claudeResults, setClaudeResults] = useState<ClaudeResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSlow, setIsSlow] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  // What was actually searched, so the results heading doesn't change as the user types
  const [searchedQuery, setSearchedQuery] = useState<string>('');
  const [searchedMode, setSearchedMode] = useState<SearchMode>('collection');

  // Lets a new search cancel one that's still running
  const abortRef = useRef<AbortController | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSlowTimer = () => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  };

  // Cancel any running search if the user leaves the page
  useEffect(() => () => {
    abortRef.current?.abort();
    clearSlowTimer();
  }, []);

  const handleSearch = useCallback(async (): Promise<void> => {
    const trimmed = query.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    clearSlowTimer();
    setIsSlow(false);
    slowTimerRef.current = setTimeout(() => setIsSlow(true), SLOW_SEARCH_MS);

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    setSearchedQuery(trimmed);
    setSearchedMode(mode);
    setCollectionResults([]);
    setClaudeResults([]);

    try {
      const params = { q: trimmed };
      // Searches need a session (signed in or guest); a collection is searchable only by its owner
      const config = { params, signal: controller.signal, headers: await sessionHeaders() };

      const url =
        mode === 'collection' ? `${API_BASE}/api/search/search/${userId}`
        : mode === 'all' ? `${API_BASE}/api/search/search-all`
        : `${API_BASE}/api/search/search-missing/${userId}`;

      const response = await axios.get(url, config);

      // A newer search started while this one was running: ignore its answer
      if (controller.signal.aborted) return;

      if (response.data.status === 'Success') {
        if (mode === 'collection') {
          setCollectionResults(response.data.results);
        } else {
          setClaudeResults(response.data.results);
        }
      }
    } catch (err) {
      // A newer search replaced this one; leave the state to it
      if (axios.isCancel(err) || controller.signal.aborted) return;
      console.error('❌ Search error:', err);
      setError('Failed to connect to search service. Please try again.');
    } finally {
      if (abortRef.current === controller) {
        clearSlowTimer();
        setIsSlow(false);
        setIsLoading(false);
      }
    }
  }, [query, mode, userId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleSuggestionClick = useCallback((suggestion: string): void => {
    setQuery(suggestion);
  }, []);

  const clearError = useCallback((): void => {
    setError('');
  }, []);

  const hasResults = collectionResults.length > 0 || claudeResults.length > 0;

  return {
    query,
    setQuery,
    mode,
    setMode,
    collectionResults,
    claudeResults,
    isLoading,
    isSlow,
    error,
    hasSearched,
    hasResults,
    searchedQuery,
    searchedMode,
    handleSearch,
    handleKeyDown,
    handleSuggestionClick,
    clearError
  };
};