import React, { useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import styles from './styles.module.css';
import { useSearch } from '../../hooks/useSearch';
import { useEnrichment } from '../../hooks/useEnrichment';

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
    enrichmentError,
    handleStartEnrichment,
    handleCancelEnrichment,
    resetEnrichment
  } = useEnrichment(userId);

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

          {/* Collection Enrichment */}
          <section className={styles.enrichmentSection}>
            <h2>Collection Enrichment</h2>
            <p className={styles.enrichmentDescription}>
              Enrich your entire collection with AI-generated descriptions to improve search accuracy.
            </p>

            {enrichmentError && (
              <p className={styles.enrichmentError}>{enrichmentError}</p>
            )}

            {!enrichmentJob && (
              <button
                className={styles.enrichButton}
                onClick={handleStartEnrichment}
                disabled={isEnriching}
                type="button"
                aria-label="Enrich my comic collection"
              >
                {isEnriching ? 'Starting...' : 'Enrich My Collection'}
              </button>
            )}

            {enrichmentJob && (
              <article className={styles.progressContainer}>
                <header className={styles.progressHeader}>
                  <p className={styles.progressText}>
                    {enrichmentJob.status === 'completed' && '✅ Enrichment complete!'}
                    {enrichmentJob.status === 'running' && `Processing ${enrichmentJob.processed_comics} of ${enrichmentJob.total_comics} comics...`}
                    {enrichmentJob.status === 'failed' && '❌ Enrichment failed. Please try again.'}
                    {enrichmentJob.status === 'cancelled' && '🛑 Enrichment cancelled.'}
                  </p>
                  <span className={styles.progressPercentage}>
                    {enrichmentJob.percentage}%
                  </span>
                </header>

                <figure className={styles.progressBar}>
                  <span
                    className={styles.progressFill}
                    style={{ width: `${enrichmentJob.percentage}%` }}
                    role="progressbar"
                    aria-valuenow={enrichmentJob.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Enrichment progress: ${enrichmentJob.percentage}%`}
                  />
                </figure>

                {enrichmentJob.status === 'running' && (
                  <button
                    className={styles.cancelButton}
                    onClick={handleCancelEnrichment}
                    type="button"
                    aria-label="Cancel enrichment job"
                  >
                    Cancel
                  </button>
                )}

                {(enrichmentJob.status === 'completed' ||
                  enrichmentJob.status === 'failed' ||
                  enrichmentJob.status === 'cancelled') && (
                  <button
                    className={styles.enrichButton}
                    onClick={resetEnrichment}
                    type="button"
                    aria-label="Start a new enrichment job"
                  >
                    Start New Enrichment
                  </button>
                )}
              </article>
            )}
          </section>

          {/* Search Mode Selector */}
          <nav className={styles.modeSelector} aria-label="Search mode">
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
              className={styles.searchButton}
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
                    className={styles.suggestionTag}
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
                        <span className={result.already_owned ? styles.ownedBadge : styles.missingBadge}>
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