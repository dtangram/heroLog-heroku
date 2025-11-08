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
  completionPercentage: number;
  variants: number;
}

interface CollectionInsights {
  totalComics: number;
  uniqueSeries: number;
  seriesBreakdown: SeriesAnalysis[];
  topSeries: SeriesAnalysis[];
  recommendations: string[];
  aiInsights: string;
}

interface InsightsResponse {
  success: boolean;
  data?: CollectionInsights;
  error?: string;
}

const CollectionInsights: React.FC = () => {
  const [insights, setInsights] = useState<CollectionInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  useEffect(() => {
  const fetchInsights = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Fetching collection insights...');
      
      const response = await API.get<CollectionInsights>(`/api/insights/${userId}`);
      
      console.log('Full response:', response);
      console.log('Response data:', response.data);

      // The data is already unwrapped - response.data IS the insights
      if (response.data && typeof response.data === 'object') {
        console.log('Insights loaded:', response.data);
        setInsights(response.data);
      } else {
        const errorMsg = 'Failed to load insights';
        console.log('No insights data:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error loading insights:', err);
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
          AI Collection Insights
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
          AI Collection Insights
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
        AI Collection Insights
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

  return (
    <article id="cbComicForm" className={styles.cbWrap}>
      <h1>
        AI Collection Insights
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
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>{insights.uniqueSeries}</div>
                  <div className={styles.statLabel}>Unique Series</div>
                </div>
                
                <div className={styles.statCard}>
                  <div className={styles.statNumber}>
                    {insights.topSeries[0] 
                      ? `${Math.round(insights.topSeries[0].completionPercentage)}%`
                      : '-'
                    }
                  </div>
                  <div className={styles.statLabel}>Top Series</div>
                </div>
              </div>

              {/* AI Insights */}
              <div className={styles.aiInsights}>
                <h2>Analysis</h2>
                <div className={styles.insightsText}>
                  {insights.aiInsights.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div className={styles.recommendations}>
                  <h2>Smart Recommendations</h2>
                  <ul>
                    {insights.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top Series Breakdown */}
              <div className={styles.seriesBreakdown}>
                <h2>Your Top Series</h2>
                
                {insights.topSeries.map((series, index) => (
                  <div key={index} className={styles.seriesCard}>
                    <div className={styles.seriesHeader}>
                      <h3>{series.seriesName}</h3>
                      <span className={styles.completionBadge}>
                        {Math.round(series.completionPercentage)}%
                      </span>
                    </div>
                    
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ width: `${series.completionPercentage}%` }}
                      />
                    </div>
                    
                    <div className={styles.seriesStats}>
                      <span>Owned: {series.ownedIssues.length} issues</span>
                      <span>Missing: {series.missingIssues.length} issues</span>
                      {series.variants > 0 && (
                        <span>Variants: {series.variants}</span>
                      )}
                    </div>
                    
                    {series.missingIssues.length > 0 && series.missingIssues.length <= 10 && (
                      <div className={styles.missingIssues}>
                        <strong>Missing issues:</strong> #{series.missingIssues.join(', #')}
                      </div>
                    )}
                    
                    {series.missingIssues.length > 10 && (
                      <div className={styles.missingIssues}>
                        <strong>Missing {series.missingIssues.length} issues</strong> (#{series.missingIssues[0]} - #{series.missingIssues[series.missingIssues.length - 1]})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      </article>
    </article>
  );
};

export default CollectionInsights;