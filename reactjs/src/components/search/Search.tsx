import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import { useSearch } from '../../hooks/useSearch';
import { useEnrichment } from '../../hooks/useEnrichment';
import clsx from 'clsx';
import styles from './styles.module.css';

const Search: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();

  const {
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
    handleSuggestionClick
  } = useSearch(userId);

  const {
    enrichmentJob,
    isEnriching,
    isAutoEnriching,
    enrichmentError,
    handleStartEnrichment,
    handleCancelEnrichment,
    resetEnrichment,
    autoEnrichIfNeeded
  } = useEnrichment(userId);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const suggestions: string[] = [
    'dark 90s Batman',
    'classic detective stories',
    'Knightfall saga',
    'milestone collector issues'
  ];

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
          <nav className={styles.modeSelector} aria-label="Search mode">
            <button
              className={clsx(styles.modeButton, styles.buttonStylesSearchPage, { [styles.modeActive]: mode === 'collection' })}
              onClick={() => setMode('collection')}
              type="button"
              aria-pressed={mode === 'collection'}
            >
              My Collection
            </button>
            <button
              className={clsx(styles.modeButton, styles.buttonStylesSearchPage, { [styles.modeActive]: mode === 'all' })}
              onClick={() => setMode('all')}
              type="button"
              aria-pressed={mode === 'all'}
            >
              All Comics
            </button>
            <button
              className={clsx(styles.modeButton, styles.buttonStylesSearchPage, { [styles.modeActive]: mode === 'missing' })}
              onClick={() => setMode('missing')}
              type="button"
              aria-pressed={mode === 'missing'}
            >
              Find Missing
            </button>
          </nav>

          {/* Mode Description */}
          <p className={styles.modeDescription}>
            {mode === 'collection' && 'Search comics you already own using AI semantic matching.'}
            {mode === 'all' && 'Search any comic book using Claude AI knowledge.'}
            {mode === 'missing' && "Find comics matching your search that you don't own yet."}
          </p>

          {/* Search Bar */}
          <search className={styles.searchBar}>
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
              className={clsx(styles.searchButton, styles.buttonStylesSearchPage)}
              type="button"
              aria-label="Search"
            >
              Search
            </button>
          </search>

          {/* Suggested Queries */}
          {!hasSearched && (
            <aside className={styles.suggestions}>
              <p>Try searching for:</p>
              <nav className={styles.suggestionTags} aria-label="Suggested searches">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={clsx(styles.suggestionTag, styles.buttonStylesSearchPage)}
                    onClick={() => handleSuggestionClick(suggestion)}
                    type="button"
                    aria-label={`Search for ${suggestion}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* Error State */}
          {error && (
            <aside className={styles.error} role="alert">
              <p>{error}</p>
            </aside>
          )}

          {/* No Results */}
          {hasSearched && !error && !hasResults && (
            <aside className={styles.empty} role="status">
              <p>No comics found matching your search. Try a different query.</p>
            </aside>
          )}

          {/* Collection Results */}
          {collectionResults.length > 0 && (
            <section className={styles.results}>
              <h2>Results for "{query}"</h2>
              {collectionResults.map((result) => (
                <article key={result.comic_id} className={styles.resultCard}>
                  <section className={styles.resultHeader}>
                    <h3>{result.title}</h3>
                    <span className={styles.scoreBadge}>
                      {Math.round(result.similarity_score * 100)}% match
                    </span>
                  </section>
                  <p className={styles.description}>{result.description}</p>
                </article>
              ))}
            </section>
          )}

          {/* Claude Results */}
          {claudeResults.length > 0 && (
            <section className={styles.results}>
              <h2>Results for "{query}"</h2>
              {claudeResults.map((result, index) => (
                <article
                  key={index}
                  className={`${styles.resultCard} ${result.already_owned ? styles.owned : ''}`}
                >
                  <section className={styles.resultHeader}>
                    <h3>{result.title}</h3>
                    <aside className={styles.badges}>
                      {result.year && (
                        <span className={styles.yearBadge}>{result.year}</span>
                      )}
                      {mode === 'missing' && (
                        <span className={clsx(result.already_owned ? styles.ownedBadge : styles.missingBadge, styles.buttonStylesSearchPage)}>
                          {result.already_owned ? 'Owned' : 'Not Owned'}
                        </span>
                      )}
                    </aside>
                  </section>
                  {result.publisher && (
                    <p className={styles.publisher}>{result.publisher}</p>
                  )}
                  <p className={styles.description}>{result.description}</p>
                </article>
              ))}
            </section>
          )}

        </section>
      </article>
    </article>
  );
};

export default Search;