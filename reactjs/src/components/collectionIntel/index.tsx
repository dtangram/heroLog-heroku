import React, { useState, useEffect, useCallback } from 'react';
import { BeatLoader } from 'react-spinners';
import API from '../../API';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import styles from './styles.module.css';

interface SeriesAnalysis {
  seriesName: string;
  totalIssues: number;
  ownedIssues: number[];
  missingIssues: number[];
  missingRanges: string[];
  /** First and last issue owned; completionPercentage only covers this span */
  span: { first: number; last: number };
  completionPercentage: number;
  /** 'run' = collecting consecutive issues; 'scattered' = picking individual issues */
  pattern: 'run' | 'scattered';
  variants: number;
}

interface Recommendation {
  series: string;
  issues: number[];
  reason: string;
}

interface CollectionAnalysis {
  summary: string;
  highlights: string[];
  recommendations: Recommendation[];
  observation: string;
}

interface CollectionProps {
  totalComics: number;
  uniqueIssues: number;
  variantCopies: number;
  duplicateCopies: number;
  unnumberedComics: number;
  uniqueSeries: number;
  seriesBreakdown: SeriesAnalysis[];
  topSeries: SeriesAnalysis[];
  analysis: CollectionAnalysis;
  analysisSource: 'ai' | 'fallback';
}

/** A first analysis can take two AI calls; the site's default 15s timeout is too short. */
const INSIGHTS_TIMEOUT = 30000;

/** After this long, the loading line explains why it's taking a while. */
export const SLOW_AFTER = 8000;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "5 unique issues · 1 variant · 1 duplicate" — explains how Total Comics is made up. */
const totalBreakdown = (i: CollectionProps) =>
  [
    plural(i.uniqueIssues, 'unique issue'),
    i.variantCopies ? plural(i.variantCopies, 'variant') : '',
    i.duplicateCopies ? plural(i.duplicateCopies, 'duplicate') : '',
    i.unnumberedComics ? `${i.unnumberedComics} without an issue number` : '',
  ]
    .filter(Boolean)
    .join(' · ');

/** [497, 498, 499, 541] → "#497–#499, #541" */
const formatIssueRanges = (sorted: number[]) => {
  const ranges: Array<[number, number]> = [];
  sorted.forEach(n => {
    const last = ranges[ranges.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  });
  return ranges.map(([a, b]) => (a === b ? `#${a}` : `#${a}–#${b}`)).join(', ');
};

/** The page title and what the page is for, the same in every state. */
const PageTitle = () => (
  <>
    <h1>
      Collection Insights
      <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
    </h1>
    <p className={styles.intro}>
      What your collection says about you: your totals, standout issues, gaps in your runs,
      and what to look for next.
    </p>
  </>
);

/** Placeholder stat cards and analysis lines, shaped like the page that's coming. */
const IntelSkeleton = () => (
  <>
    <ul className={styles.statsGrid} aria-hidden="true" data-testid="intel-skeleton">
      {[0, 1, 2].map(index => (
        <li key={index} className={styles.statCard}>
          <span className={`${styles.skeletonLine} ${styles.skeletonNumber}`} />
          <span className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
        </li>
      ))}
    </ul>
    <article className={styles.aiInsights} aria-hidden="true">
      <span className={`${styles.skeletonLine} ${styles.skeletonHeading}`} />
      <span className={styles.skeletonLine} />
      <span className={styles.skeletonLine} />
      <span className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
    </article>
  </>
);

const CollectionIntel: React.FC = () => {
  const [insights, setInsights] = useState<CollectionProps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string>('');

  const userId = localStorage.getItem('id') || getAnonymousUserId();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /** Loads the insights. quiet: keep the current page up while it loads (Try again). */
  const loadInsights = useCallback(async (quiet = false) => {
    if (quiet) setIsRetrying(true);
    else setIsLoading(true);
    setError('');

    try {
      const response = await API.get(`/insights/${userId}`, { timeout: INSIGHTS_TIMEOUT }) as any;

      // The backend returns { success: true, data: {...} }
      if (response && response.data) {
        setInsights(response.data);
      } else if (response && typeof response === 'object' && 'topSeries' in response) {
        // Fallback: if response IS the data (no wrapper)
        setInsights(response);
      } else {
        setError('Failed to load insights');
      }
    } catch (err) {
      console.error('Error loading insights:', err);
      setError('Failed to load collection insights. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // A first analysis can take a while; say so instead of looking stuck
  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <article id="cbComicForm" className={styles.cbWrap}>
        <PageTitle />

        <article className={styles.cbList}>
          <section className={styles.wrapper} aria-busy="true">
            <article className={styles.container}>
              <p className={styles.loadStatus} role="status">
                <BeatLoader size={8} color="#770422" aria-hidden="true" />
                <span>
                  {isSlow
                    ? 'Still analyzing. A first analysis can take up to 20 seconds; after that, it loads right away.'
                    : 'Analyzing your collection…'}
                </span>
              </p>
              <IntelSkeleton />
            </article>
          </section>
        </article>
      </article>
    );
  }

  // Error state
  if (error) {
    return (
      <article id="cbComicForm" className={styles.cbWrap}>
        <PageTitle />

        <article className={styles.cbList}>
          <section className={styles.wrapper}>
            <article className={styles.container}>
              <aside className={styles.error} role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={() => loadInsights(true)}
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Trying again…' : 'Try again'}
                </button>
              </aside>
            </article>
          </section>
        </article>
      </article>
    );
  }

  // No data state
  if (!insights || insights.totalComics === 0) {
    return (
      <article id="cbComicForm" className={styles.cbWrap}>
        <PageTitle />

        <article className={styles.container}>
          <aside className={styles.empty}>
            <p>Start building your collection to see insights!</p>
          </aside>
        </article>
      </article>
    );
  }

  const { analysis } = insights;

  return (
    <article id="cbComicForm" className={styles.cbWrap}>
      <PageTitle />

      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          <article className={styles.container}>
            {/* Overview Stats */}
            <ul className={styles.statsGrid}>
              <li className={styles.statCard}>
                <p className={styles.statNumber}>{insights.totalComics}</p>
                <p className={styles.statLabel}>Total Comics</p>
                {/* Explains why Total Comics can differ from the issue count */}
                <p className={styles.statLabel}>{totalBreakdown(insights)}</p>
              </li>

              <li className={styles.statCard}>
                <p className={styles.statNumber}>{insights.uniqueSeries}</p>
                <p className={styles.statLabel}>Unique Series</p>
              </li>

              <li className={styles.statCard}>
                <p className={styles.statNumber}>
                  {insights.topSeries[0] ? insights.topSeries[0].seriesName : '-'}
                </p>
                <p className={styles.statLabel}>
                  {insights.topSeries[0]
                    ? `Most Collected · ${plural(insights.topSeries[0].ownedIssues.length, 'issue')}`
                    : 'Most Collected'}
                </p>
              </li>
            </ul>

            {/* AI Insights: structured text checked against your data, no markdown */}
            <article className={styles.aiInsights}>
              <h2>Analysis</h2>
              <article className={styles.insightsText}>
                <p>{analysis.summary}</p>
                {analysis.highlights.length > 0 && (
                  <>
                    <h3 id="analysisHighlights" className={styles.insightsHeading}>Highlights</h3>
                    <ul className={styles.highlights} aria-labelledby="analysisHighlights">
                      {analysis.highlights.map((highlight, index) => (
                        <li key={index}>{highlight}</li>
                      ))}
                    </ul>
                  </>
                )}
                {analysis.observation && (
                  <>
                    <h3 className={styles.insightsHeading}>Worth noting</h3>
                    <p>{analysis.observation}</p>
                  </>
                )}
                {insights.analysisSource === 'fallback' && (
                  <aside className={styles.fallbackNote}>
                    <p>
                      AI analysis isn&apos;t available right now, so this summary comes straight from
                      your collection data.
                    </p>
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={() => loadInsights(true)}
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Analyzing…' : 'Try AI analysis again'}
                    </button>
                  </aside>
                )}
              </article>
            </article>

            {/* Recommendations: from the same analysis, so they can't contradict it */}
            {analysis.recommendations.length > 0 && (
              <article className={styles.recommendations}>
                <h2>Smart Recommendations</h2>
                <ul>
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index}>
                      <strong>
                        {rec.issues.length ? `${rec.series} #${rec.issues.join(', #')}` : rec.series}
                      </strong>
                      : {rec.reason}
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {/* Top Series Breakdown */}
            <article className={styles.seriesBreakdown}>
              <h2>Your Top Series</h2>

              {insights.topSeries.map((series, index) => {
                // A "scattered" series is picked issues across a wide span, so
                // completion % and gap counts would be misleading; list what's owned instead.
                const isRun = series.pattern === 'run';
                const percent = Math.round(series.completionPercentage);
                // The percentage only covers the issues between the first and last
                // ones you own, so say that instead of "100% of run"
                const { first, last } = series.span;
                const spanLabel = first === last ? `#${first}` : `#${first}–#${last}`;
                const gaps = series.missingIssues.length;

                return (
                  <article key={index} className={styles.seriesCard}>
                    <hgroup className={styles.seriesHeader}>
                      <h3>{series.seriesName}</h3>
                      <p className={styles.completionBadge}>
                        {!isRun ? 'Selected issues' : gaps === 0 ? 'No gaps' : `${plural(gaps, 'gap')}`}
                      </p>
                    </hgroup>

                    {isRun && (
                      <span
                        className={styles.progressBar}
                        role="progressbar"
                        aria-label={`${series.seriesName}: issues owned from ${spanLabel}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                      >
                        <span
                          className={styles.progressFill}
                          style={{ width: `${series.completionPercentage}%` }}
                        />
                      </span>
                    )}

                    <p className={styles.seriesStats}>
                      <span>Owned: {plural(series.ownedIssues.length, 'issue')}</span>
                      {isRun && gaps > 0 && <span>Missing between {spanLabel}: {plural(gaps, 'issue')}</span>}
                      {series.variants > 0 && (
                        <span>Variants: {series.variants}</span>
                      )}
                    </p>

                    <p className={styles.seriesStats}>
                      <span>You own: {formatIssueRanges(series.ownedIssues)}</span>
                    </p>

                    {isRun && series.missingRanges.length > 0 && (
                      <p className={styles.missingIssues}>
                        <strong>Missing issues:</strong> {series.missingRanges.slice(0, 6).join(', ')}
                        {series.missingRanges.length > 6 && ' and more'}
                      </p>
                    )}
                  </article>
                );
              })}
            </article>
          </article>
        </section>
      </article>
    </article>
  );
};

export default CollectionIntel;