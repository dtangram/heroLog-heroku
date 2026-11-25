import { useEffect, useCallback } from 'react';
import { Link as RRLink, useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import '../../../link/styles.module.css';
import Empty from '../../empty';
import Breadcrumbs from '../../breadcrumbs';
import ComicCard, { ComicCardGrid } from '../../comicCard';
import { countLabel, issueRange, splitEmpty } from '../../../utils/collection';
import CompactList from '../../compactList';
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
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // Fetch comic book titles on mount
  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (pubId) {
      // Always fresh here, so issue counts include anything just added
      fetchComicBookTitles(pubId, true);
    }
  }, [pubId, fetchComicBookTitles]);

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
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `/dashboard/${userId}` },
          { label: publisherName },
        ]}
      />

      <h1>
        Your List of {publisherName} Titles
        <figure 
          className={styles.graphic} 
          aria-hidden="true" 
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
            <p className={styles.link}>Add a Title</p>
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
          <Empty
            title="No titles yet"
            message={`Add the first ${publisherName} series you collect, like Batman or Detective Comics.`}
            action={{ label: 'Add a title', to: `/forms/${userId}/${pubId}/${publisherName}/comicbooklisttitle/new` }}
          />
        </article>
      </article>
    );
  }

  // Titles without issues get a short row below the cards (same as empty publishers on the Dashboard)
  const { cards: cardTitles, empty: emptyTitles } = splitEmpty(comicBookTitles, title => (title.issueCount || 0) > 0);

  // Main render: one card per title (the API sends them A to Z)
  return (
    <article id="cbComBookList" className={styles.cbWrap}>
      {renderHeader()}
      <article className={styles.cbList}>
        <ComicCardGrid label={`${publisherName} titles`}>
          {cardTitles.map(({ id, cbTitle, issueCount = 0, coverUrl, firstIssue, lastIssue }) => (
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

        <CompactList
          heading="No issues yet"
          description="Add an issue to give a title its own card."
          addLabel="Add issue"
          items={emptyTitles.map(({ id, cbTitle }) => ({
            id,
            name: cbTitle,
            href: `/dashboard/${userId}/${pubId}/${publisherName}/${id}/${cbTitle}/comicbooklistissues`,
            addUrl: `/forms/${userId}/${pubId}/${publisherName}/${id}/${cbTitle}/comicbook/new`,
            editUrl: `/forms/${userId}/${pubId}/${publisherName}/comicbooklisttitle/edit/${id}`,
            onDelete: () => handleDelete(id, cbTitle),
          }))}
        />
      </article>
    </article>
  );
};

export default ComicBookList;