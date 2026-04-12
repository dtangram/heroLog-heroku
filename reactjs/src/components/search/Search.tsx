import React, { useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import styles from './styles.module.css';

interface CollectionResult {
  comic_id: string;
  title: string;
  description: string;
  similarity_score: number;
}

interface ClaudeResult {
  title: string;
  description: string;
  publisher: string;
  year: string;
  already_owned?: boolean;
  source: string;
}

type SearchMode = 'collection' | 'all' | 'missing';

const Search: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [query, setQuery] = useState<string>('');
  const [mode, setMode] = useState<SearchMode>('collection');
  const [collectionResults, setCollectionResults] = useState<CollectionResult[]>([]);
  const [claudeResults, setClaudeResults] = useState<ClaudeResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = async (): Promise<void> => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    setCollectionResults([]);
    setClaudeResults([]);

    const API_BASE = process.env.REACT_APP_API_URL || '';

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
      setError('Failed to connect to search service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSuggestionClick = (suggestion: string): void => {
    setQuery(suggestion);
  };

  const suggestions: string[] = [
    'dark 90s Batman',
    'classic detective stories',
    'Knightfall saga',
    'milestone collector issues'
  ];

  const hasResults = collectionResults.length > 0 || claudeResults.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <article id="cbSearch" className={styles.cbWrap}>
        <h1>
          Search the Multiverse
          <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
        </h1>
        <article className={styles.cbList}>
          <section className={styles.loadWrap}>
            <p className={styles.loadMessage}>Searching the Multiverse</p>
            <BeatLoader size={10} color="#770422" />
          </section>
        </article>
      </article>
    );
  }

  return (
    <article id="cbSearch" className={styles.cbWrap}>
      <h1>
        Search the Multiverse
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.cbList}>
        <section className={styles.wrapper}>

          {/* Search Mode Selector */}
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${mode === 'collection' ? styles.modeActive : ''}`}
              onClick={() => setMode('collection')}
              type="button"
              aria-pressed={mode === 'collection'}
            >
              My Collection
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'all' ? styles.modeActive : ''}`}
              onClick={() => setMode('all')}
              type="button"
              aria-pressed={mode === 'all'}
            >
              All Comics
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'missing' ? styles.modeActive : ''}`}
              onClick={() => setMode('missing')}
              type="button"
              aria-pressed={mode === 'missing'}
            >
              Find Missing
            </button>
          </div>

          {/* Mode Description */}
          <p className={styles.modeDescription}>
            {mode === 'collection' && 'Search comics you already own using AI semantic matching.'}
            {mode === 'all' && 'Search any comic book using Claude AI knowledge.'}
            {mode === 'missing' && "Find comics matching your search that you don't own yet."}
          </p>

          {/* Search Bar */}
          <div className={styles.searchBar}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try: "dark 90s Batman" or "Knightfall saga"'
              className={styles.searchInput}
              aria-label="Search comics"
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim()}
              className={styles.searchButton}
              type="button"
              aria-label="Search"
            >
              Search
            </button>
          </div>

          {/* Suggested Queries */}
          {!hasSearched && (
            <div className={styles.suggestions}>
              <p>Try searching for:</p>
              <div className={styles.suggestionTags}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={styles.suggestionTag}
                    onClick={() => handleSuggestionClick(suggestion)}
                    type="button"
                    aria-label={`Search for ${suggestion}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          {/* No Results */}
          {hasSearched && !error && !hasResults && (
            <div className={styles.empty}>
              <p>No comics found matching your search. Try a different query.</p>
            </div>
          )}

          {/* Collection Results */}
          {collectionResults.length > 0 && (
            <div className={styles.results}>
              <h2>Results for "{query}"</h2>
              {collectionResults.map((result) => (
                <div key={result.comic_id} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <h3>{result.title}</h3>
                    <span className={styles.scoreBadge}>
                      {Math.round(result.similarity_score * 100)}% match
                    </span>
                  </div>
                  <p className={styles.description}>{result.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Claude Results */}
          {claudeResults.length > 0 && (
            <div className={styles.results}>
              <h2>Results for "{query}"</h2>
              {claudeResults.map((result, index) => (
                <div
                  key={index}
                  className={`${styles.resultCard} ${result.already_owned ? styles.owned : ''}`}
                >
                  <div className={styles.resultHeader}>
                    <h3>{result.title}</h3>
                    <div className={styles.badges}>
                      {result.year && (
                        <span className={styles.yearBadge}>{result.year}</span>
                      )}
                      {mode === 'missing' && (
                        <span className={result.already_owned ? styles.ownedBadge : styles.missingBadge}>
                          {result.already_owned ? 'Owned' : 'Not Owned'}
                        </span>
                      )}
                    </div>
                  </div>
                  {result.publisher && (
                    <p className={styles.publisher}>{result.publisher}</p>
                  )}
                  <p className={styles.description}>{result.description}</p>
                </div>
              ))}
            </div>
          )}

        </section>
      </article>
    </article>
  );
};

export default Search;