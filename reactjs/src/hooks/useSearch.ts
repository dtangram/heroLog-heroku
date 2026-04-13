import { useState, useCallback } from 'react';
import axios from 'axios';

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

// ============================================================================
// HOOK
// ============================================================================

export const useSearch = (userId: string | undefined) => {
  const [query, setQuery] = useState<string>('');
  const [mode, setMode] = useState<SearchMode>('collection');
  const [collectionResults, setCollectionResults] = useState<CollectionResult[]>([]);
  const [claudeResults, setClaudeResults] = useState<ClaudeResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = useCallback(async (): Promise<void> => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    setCollectionResults([]);
    setClaudeResults([]);

    try {
      if (mode === 'collection') {
        const response = await axios.get(
          `${API_BASE}/api/search/search/${userId}`,
          { params: { q: query } }
        );
        if (response.data.status === 'Success') {
          setCollectionResults(response.data.results);
        }

      } else if (mode === 'all') {
        const response = await axios.get(
          `${API_BASE}/api/search/search-all`,
          { params: { q: query } }
        );
        if (response.data.status === 'Success') {
          setClaudeResults(response.data.results);
        }

      } else if (mode === 'missing') {
        const response = await axios.get(
          `${API_BASE}/api/search/search-missing/${userId}`,
          { params: { q: query } }
        );
        if (response.data.status === 'Success') {
          setClaudeResults(response.data.results);
        }
      }

    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Failed to connect to search service. Please try again.');
    } finally {
      setIsLoading(false);
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
    error,
    hasSearched,
    hasResults,
    handleSearch,
    handleKeyDown,
    handleSuggestionClick,
    clearError
  };
};