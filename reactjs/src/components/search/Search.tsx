import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import { BeatLoader } from 'react-spinners';
import { useSearch } from '../../hooks/useSearch';
import SearchIcon from '@mui/icons-material/Search';
import clsx from 'clsx';
import { fetchWishlists } from '../../store/wishlist/actions';
import { ClaudeResultList, CollectionResultCard } from './ResultCards';
import { useEnrichment } from '../../hooks/useEnrichment';
import styles from './styles.module.css';
import { SKELETON_COUNT, SLOW_MESSAGE } from '../../constants/search';

/** Placeholder cards shaped like real results while a search runs. */
const ResultSkeletons: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <article
        key={index}
        className={clsx(styles.resultCard, styles.skeletonCard)}
        aria-hidden="true"
        data-testid="result-skeleton"
      >
        <span className={clsx(styles.skeletonLine, styles.skeletonTitle)} />
        <span className={clsx(styles.skeletonLine, styles.skeletonBadge)} />
        <span className={styles.skeletonLine} />
        <span className={clsx(styles.skeletonLine, styles.skeletonShort)} />
      </article>
    ))}
  </>
);

const Search: React.FC = () => {
  // Your own collection, whatever ID is in the address (a pasted link can't search someone else's)
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  const {
    query,
    setQuery,
    mode,
    changeMode,
    collectionResults,
    claudeResults,
    ownedCounts,
    isLoading,
    isSlow,
    error,
    hasSearched,
    hasResults,
    searchedQuery,
    searchedMode,
    handleSearch,
    handleKeyDown,
    handleSuggestionClick
  } = useSearch(userId);

  const dispatch = useDispatch();

  // Prepares any comics still missing from My Collection search, in the background
  const { enrichmentJob, isCatchingUp } = useEnrichment(userId);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load the wish list, so results already on it say so instead of offering to add them again
  useEffect(() => {
    if (localStorage.getItem('token') && localStorage.getItem('id')) {
      dispatch(fetchWishlists() as any);
    }
  }, [dispatch]);

  const suggestions: string[] = [
    'dark 90s Batman',
    'classic detective stories',
    'Knightfall saga',
    'milestone collector issues'
  ];

  return (
    <article id="cbSearch" className={styles.cbWrap}>
      <h1>
        Search the Multiverse
        <figure className={styles.graphic} aria-hidden="true" />
      </h1>

      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          {/* Search Mode Selector */}
          <nav className={styles.modeSelector} aria-label="Search mode">
            <button
              className={`${styles.modeButton} ${mode === 'collection' ? styles.modeActive : ''}`}
              onClick={() => changeMode('collection')}
              type="button"
              aria-pressed={mode === 'collection'}
            >
              My Collection
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'all' ? styles.modeActive : ''}`}
              onClick={() => changeMode('all')}
              type="button"
              aria-pressed={mode === 'all'}
            >
              All Comics
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'missing' ? styles.modeActive : ''}`}
              onClick={() => changeMode('missing')}
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

          {/* Only while comics are being prepared; My Collection can't find them until then */}
          {mode === 'collection' && isCatchingUp && enrichmentJob && (
            <p className={styles.catchUp} role="status">
              Getting {enrichmentJob.total_comics === 1 ? '1 comic' : `${enrichmentJob.total_comics} comics`} ready
              for search ({enrichmentJob.processed_comics} of {enrichmentJob.total_comics} done). Comics that
              aren&apos;t ready yet won&apos;t appear in My Collection results.
            </p>
          )}

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
              onClick={() => handleSearch()}
              disabled={!query.trim() || isLoading}
              className={clsx(styles.searchButton, styles.buttonStylesSearchPage)}
              type="button"
              aria-label={isLoading ? 'Searching' : 'Search'}
              aria-busy={isLoading}
            >
              <figure><SearchIcon /></figure>
              <p>{isLoading ? 'Searching…' : 'Search'}</p>
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

          {/* Searching: keep the form, show placeholder cards where results will appear */}
          {isLoading && (
            <section className={styles.results} aria-busy="true">
              <p className={styles.searchStatus} role="status">
                <BeatLoader size={8} color="#770422" aria-hidden="true" />
                <span>
                  {isSlow ? SLOW_MESSAGE[searchedMode] : `Searching the Multiverse for "${searchedQuery}"…`}
                </span>
              </p>
              <ResultSkeletons count={SKELETON_COUNT[searchedMode]} />
            </section>
          )}

          {/* Find Missing with nothing missing: say they own it all, not "no comics found" */}
          {hasSearched && !isLoading && !error && !hasResults && searchedMode === 'missing' && Object.keys(ownedCounts).length > 0 && (
            <aside className={styles.empty} role="status">
              <p>You already own every comic we found for "{searchedQuery}". Nothing's missing.</p>
            </aside>
          )}

          {/* No Results */}
          {hasSearched && !isLoading && !error && !hasResults && !(searchedMode === 'missing' && Object.keys(ownedCounts).length > 0) && (
            <aside className={styles.empty} role="status">
              <p>No comics found matching your search. Try a different query.</p>
            </aside>
          )}

          {/* Collection Results */}
          {collectionResults.length > 0 && (
            <section className={styles.results}>
              <h2>Results for "{searchedQuery}"</h2>
              {collectionResults.map((result, rank) => (
                <CollectionResultCard
                  key={result.comic_id}
                  result={result}
                  userId={userId || ''}
                  rank={rank}
                  bestScore={collectionResults[0].similarity_score}
                />
              ))}
            </section>
          )}

          {/* Claude Results */}
          {claudeResults.length > 0 && (
            <section className={styles.results}>
              <h2>Results for "{searchedQuery}"</h2>
              <ClaudeResultList
                results={claudeResults}
                userId={localStorage.getItem('id') || ''}
                ownedCounts={searchedMode === 'missing' ? ownedCounts : {}}
              />
            </section>
          )}

        </section>
      </article>
    </article>
  );
};

export default Search;