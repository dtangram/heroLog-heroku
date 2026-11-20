import { useEffect, useCallback } from 'react';
import { Link as RRLink, useNavigate, useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import '../../../link/styles.module.css';
import Empty from '../../empty';
import ComicCard, { ComicCardGrid } from '../../comicCard';
import { countLabel, issueRange } from '../../../utils/collection';
import { showAlert, showConfirm } from '../../dialog';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import styles from './styles.module.css';

export interface ComicBookTitle {
  id: string;
  cbTitle: string;
  /** From the API: how many issues, the newest cover and the issue range */
  issueCount?: number;
  coverUrl?: string | null;
  firstIssue?: number | null;
  lastIssue?: number | null;
}

export interface ComicBookData {
  allIds: string[];
  byId: Record<string, { data: ComicBookTitle }>;
  isLoading: boolean;
}

export interface ComicBookLists {
  [publisherId: string]: ComicBookData;
}

interface RouteParams extends Record<string, string | undefined> {
  pubId: string;
  publisherName: string;
}

const ComicBookList = ({
  fetchComicBookTitles,
  comicbooklists = {},
  deleteComicBookTitle,
}: ConnectorProps) => {
  const { pubId = '', publisherName = '' } = useParams<RouteParams>();
  const navigate = useNavigate();
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // Fetch comic book titles on mount
  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (pubId) {
      // Always fresh here, so issue counts include anything just added
      fetchComicBookTitles(pubId, true);
    }
  }, [pubId, fetchComicBookTitles]);

  // Handle navigation back
  const handleGoToDashboard = useCallback(() => {
    navigate(`/dashboard/${userId}`);
  }, [navigate]);

  // Handle comic book title deletion
  const handleDelete = useCallback(async (id: string, title: string): Promise<void> => {
    if (!id) return;

    const confirmed = await showConfirm(
      `"${title}" will be removed from your collection. This can't be undone.`,
      { title: 'Delete this title?', confirmLabel: 'Delete', tone: 'danger' }
    );

    if (!confirmed) return;

    try {
      const result = deleteComicBookTitle(id);
      if (result && typeof result === 'object' && 'then' in result) {
        await result;
      }
      // Refetch data after deletion
      if (pubId) {
        fetchComicBookTitles(pubId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete comic book title:', errorMessage);
      showAlert('Something went wrong while deleting this title. Please try again.', { title: "The title wasn't deleted" });
    }
  }, [deleteComicBookTitle, fetchComicBookTitles, pubId]);

  // Extract current comic book data
  const currentComicBookData = comicbooklists[pubId] || {};
  const { allIds = [], byId = {}, isLoading = false } = currentComicBookData;

  // Transform ids into array of comic book objects
  const comicBookTitles = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as ComicBookTitle[];

  // Totals for the summary under the heading
  const totalIssues = comicBookTitles.reduce((sum, title) => sum + (title.issueCount || 0), 0);

  // Common header to avoid repetition
  const renderHeader = () => (
    <>
      <button 
        className={styles.backLink} 
        type="button" 
        onClick={handleGoToDashboard}
      >
        &lt; Dashboard
      </button>

      <h1>
        Your List of {publisherName} Titles
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />
      </h1>

      {comicBookTitles.length > 0 && (
        <p className={styles.summary}>
          {countLabel(comicBookTitles.length, 'title')} · {countLabel(totalIssues, 'issue')}
        </p>
      )}

      <h2>
        <section>
          <RRLink to={`/forms/${userId}/${pubId}/${publisherName}/comicbooklisttitle/new`}>
            <figure><LibraryAddIcon /></figure>
            <p className={styles.link}>Add Comic Book Title</p>
          </RRLink>
        </section>
      </h2>
    </>
  );

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbComBookList" className={styles.cbWrap}>
        {renderHeader()}
        <article className={styles.cbList}>
          <section className={styles.loadWrap}>
            <p className={styles.loadMessage}>Loading</p>
            <BeatLoader size={10} color="#FFF" />
          </section>
        </article>
      </article>
    );
  }

  // Early return for empty state
  if (comicBookTitles.length === 0) {
    return (
      <article id="cbComBookList" className={styles.cbWrap}>
        {renderHeader()}
        <article className={styles.cbList}>
          <Empty />
        </article>
      </article>
    );
  }

  // Main render: one card per title (the API sends them A to Z)
  return (
    <article id="cbComBookList" className={styles.cbWrap}>
      {renderHeader()}
      <article className={styles.cbList}>
        <ComicCardGrid label={`${publisherName} titles`}>
          {comicBookTitles.map(({ id, cbTitle, issueCount = 0, coverUrl, firstIssue, lastIssue }) => (
            <ComicCard
              key={id}
              title={cbTitle}
              cover={coverUrl}
              href={`/dashboard/${userId}/${pubId}/${publisherName}/${id}/${cbTitle}/comicbooklistissues`}
              meta={issueCount > 0 ? [countLabel(issueCount, 'issue'), issueRange(firstIssue, lastIssue)] : ['No issues yet']}
              editUrl={`/forms/${userId}/${pubId}/${publisherName}/comicbooklisttitle/edit/${id}`}
              onDelete={() => handleDelete(id, cbTitle)}
            />
          ))}
        </ComicCardGrid>
      </article>
    </article>
  );
};

export default ComicBookList;