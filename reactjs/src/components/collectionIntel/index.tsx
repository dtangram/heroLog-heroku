import React, { useState, useEffect } from 'react';
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

const CollectionIntel: React.FC = () => {
  const [insights, setInsights] = useState<CollectionProps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const userId = localStorage.getItem('id') || getAnonymousUserId();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      setError('');

      try {
        console.log('📊 Fetching collection insights...');

        const response = await API.get(`/api/insights/${userId}`) as any;

        console.log('📦 Full response:', response);

        // ✅ The backend returns { success: true, data: {...} }
        // So we need to access response.data
        if (response && response.data) {
          console.log('✅ Insights loaded:', response.data);
          setInsights(response.data);
        } else if (response && typeof response === 'object' && 'topSeries' in response) {
          // Fallback: if response IS the data (no wrapper)
          console.log('✅ Insights loaded (unwrapped):', response);
          setInsights(response);
        } else {
          console.log('❌ No insights data:', response);
          setError('Failed to load insights');
        }
      } catch (err) {
        console.error('❌ Error loading insights:', err);
        setError('Failed to load collection insights. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

      fetchInsights();
  }, [userId]);

  // Loading state
  if (isLoading) {
    return (
      <article id="cbComicForm" className={styles.cbWrap}>
        <h1>
          Collection Intelligence
          <div className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
        </h1>

        <article className={styles.cbList}>
          <section className={styles.loadWrap}>
            <p className={styles.loadMessage}>Analyzing your collection</p>
            <BeatLoader size={10} color="#770422" />
          </section>
        </article>
      </article>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <h1>
          Collection Intelligence
          <div className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
        </h1>

        <div className={styles.error}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!insights || insights.totalComics === 0) {
    return (
      <article id="cbComicForm" className={styles.cbWrap}>
      <h1>
        Collection Intelligence
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <div className={styles.container}>
        <div className={styles.empty}>
          <p>Start building your collection to see insights!</p>
        </div>
      </div>
    </article>
    );
  }

  const { analysis } = insights;

  return (
    <article id="cbComicForm" className={styles.cbWrap}>
      <h1>
        Collection Intelligence
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          <article>
            <div className={styles.container}>
              {/* Overview Stats */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{insights.totalComics}</div>
                  <div className={styles.statLabel}>Total Comics</div>
                  {/* Explains why Total Comics can differ from the issue count */}
                  <div className={styles.statLabel}>{totalBreakdown(insights)}</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{insights.uniqueSeries}</div>
                  <div className={styles.statLabel}>Unique Series</div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statNumber}>
                    {insights.topSeries[0] ? insights.topSeries[0].seriesName : '-'}
                  </div>
                  <div className={styles.statLabel}>
                    {insights.topSeries[0]
                      ? `Most Collected · ${plural(insights.topSeries[0].ownedIssues.length, 'issue')}`
                      : 'Most Collected'}
                  </div>
                </div>
              </div>

              {/* AI Insights: structured text checked against your data, no markdown */}
              <div className={styles.aiInsights}>
                <h2>Analysis</h2>
                <div className={styles.insightsText}>
                  <p>{analysis.summary}</p>
                  {analysis.highlights.map((highlight, index) => (
                    <p key={index}>{highlight}</p>
                  ))}
                  {analysis.observation && <p>{analysis.observation}</p>}
                  {insights.analysisSource === 'fallback' && (
                    <p><em>AI analysis isn&apos;t available right now, so this summary comes straight from your collection data.</em></p>
                  )}
                </div>
              </div>

              {/* Recommendations: from the same analysis, so they can't contradict it */}
              {analysis.recommendations.length > 0 && (
                <div className={styles.recommendations}>
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
                </div>
              )}

              {/* Top Series Breakdown */}
              <div className={styles.seriesBreakdown}>
                <h2>Your Top Series</h2>

                {insights.topSeries.map((series, index) => {
                  // A "scattered" series is picked issues across a wide span, so
                  // completion % and gap counts would be misleading; list what's owned instead.
                  const isRun = series.pattern === 'run';

                  return (
                    <div key={index} className={styles.seriesCard}>
                      <div className={styles.seriesHeader}>
                        <h3>{series.seriesName}</h3>
                        <span className={styles.completionBadge}>
                          {isRun ? `${Math.round(series.completionPercentage)}% of run` : 'Selected issues'}
                        </span>
                      </div>

                      {isRun && (
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${series.completionPercentage}%` }}
                          />
                        </div>
                      )}

                      <div className={styles.seriesStats}>
                        <span>Owned: {plural(series.ownedIssues.length, 'issue')}</span>
                        {isRun && <span>Missing: {plural(series.missingIssues.length, 'issue')}</span>}
                        {series.variants > 0 && (
                          <span>Variants: {series.variants}</span>
                        )}
                      </div>

                      <div className={styles.seriesStats}>
                        <span>You own: {formatIssueRanges(series.ownedIssues)}</span>
                      </div>

                      {isRun && series.missingRanges.length > 0 && (
                        <div className={styles.missingIssues}>
                          <strong>Missing issues:</strong> {series.missingRanges.slice(0, 6).join(', ')}
                          {series.missingRanges.length > 6 && ' and more'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        </section>
      </article>
    </article>
  );
};

export default CollectionIntel;