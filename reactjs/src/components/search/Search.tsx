import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import { BeatLoader } from 'react-spinners';
import { useSearch, SearchMode } from '../../hooks/useSearch';
import SearchIcon from '@mui/icons-material/Search';
import clsx from 'clsx';
import { fetchWishlists } from '../../store/wishlist/actions';
import AddToWishList from './AddToWishList';
import { useEnrichment } from '../../hooks/useEnrichment';
import styles from './styles.module.css';

/** Results each search returns: 5 from your collection, 10 from Claude (show a screenful). */
const SKELETON_COUNT: Record<SearchMode, number> = { collection: 5, all: 6, missing: 6 };

const SLOW_MESSAGE: Record<SearchMode, string> = {
  collection: 'Still searching your collection…',
  all: 'Still searching every comic. This can take up to 20 seconds.',
  missing: "Still finding the comics you're missing. This can take up to 30 seconds.",
};

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
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.cbList}>
        <section className={styles.wrapper}>
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
              onClick={handleSearch}
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

          {/* No Results */}
          {hasSearched && !isLoading && !error && !hasResults && (
            <aside className={styles.empty} role="status">
              <p>No comics found matching your search. Try a different query.</p>
            </aside>
          )}

          {/* Collection Results */}
          {collectionResults.length > 0 && (
            <section className={styles.results}>
              <h2>Results for "{searchedQuery}"</h2>
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
              <h2>Results for "{searchedQuery}"</h2>
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
                      {searchedMode === 'missing' && (
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
                  {!result.already_owned && (
                    <AddToWishList result={result} userId={localStorage.getItem('id') || ''} />
                  )}
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