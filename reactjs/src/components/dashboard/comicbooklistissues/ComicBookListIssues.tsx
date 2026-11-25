import { useEffect, useCallback } from 'react';
import { Link as RRLink, useParams, useLocation } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import Empty from '../../empty';
import Breadcrumbs from '../../breadcrumbs';
import { comicsOf, countLabel, issueRange } from '../../../utils/collection';
import { showConfirm } from '../../dialog';
import ComicCard, { ComicCardGrid } from '../../comicCard';
import logo from '../../../img/logo.png';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import styles from './styles.module.css';

export interface ComicBook {
  id: string;
  title: string;
  comicIssue: number;
  author: string;
  penciler: string;
  coverartist: string;
  inker: string;
  volume: number;
  year: number;
  type: string;
  comicBookCover: string;
}

export interface ComicBookIssueData {
  allIds: string[];
  byId: Record<string, { data: ComicBook }>;
  isLoading: boolean;
}

export interface CBListIssues {
  [titleId: string]: ComicBookIssueData;
}

interface RouteParams extends Record<string, string | undefined> {
  coboTitleId: string;
  cbTitle: string;
}

const ComicBookListIssues = ({
  fetchComicBooks,
  comicbooklistissues = {},
  deleteComicBook,
}: ConnectorProps) => {
  const { coboTitleId = '', cbTitle = '', pubId = '', publisherName = '' } = useParams<RouteParams>();
  const location = useLocation();

  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // Fetch comic books on mount and when returning from edit
  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (coboTitleId) {
      fetchComicBooks(coboTitleId);
    }
  }, [coboTitleId, fetchComicBooks, location.state]);

  // Handle comic book deletion
  const handleDelete = useCallback(async (id: string, title: string, issue?: string | number): Promise<void> => {
    if (!id) return;

    // Name the issue, so it doesn't sound like the whole series is being deleted
    const label = issue ? `${title} #${issue}` : title;
    const confirmed = await showConfirm(`${label} will be removed from your collection. This can't be undone.`, {
      title: `Delete ${label}?`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });

    if (!confirmed) return;

    deleteComicBook(id);
    
    // Refetch after deletion
    setTimeout(() => {
      if (coboTitleId) {
        fetchComicBooks(coboTitleId);
      }
    }, 500);
  }, [deleteComicBook, fetchComicBooks, coboTitleId]);

  // Extract current comic book data
  const currentComicBookIssueData = comicbooklistissues[coboTitleId] || {};
  const { allIds = [], byId = {}, isLoading = false } = currentComicBookIssueData;

  // Transform ids into array of comic book objects
  // In issue order (#1, #2 ... #423, #491), not the order they were added
  const comicBooks = (allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as ComicBook[])
    .sort((a, b) => (Number(a.comicIssue) || 0) - (Number(b.comicIssue) || 0));

  // Lowest and highest issue numbers, for the count line
  const issueNumbers = comicBooks.map(book => Number(book.comicIssue)).filter(n => Number.isFinite(n) && n > 0);
  const firstIssue = issueNumbers.length > 0 ? Math.min(...issueNumbers) : null;
  const lastIssue = issueNumbers.length > 0 ? Math.max(...issueNumbers) : null;

  // Common header section to avoid repetition
  const renderHeader = () => (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `/dashboard/${userId}` },
          { label: publisherName, to: `/dashboard/${userId}/${pubId}/${publisherName}/comicbooklist` },
          { label: cbTitle },
        ]}
      />

      <h1>
        Your List of {comicsOf(cbTitle)}
        <figure 
          className={styles.graphic} 
          aria-hidden="true" 
        />
      </h1>

      {/* The same count line as the Dashboard and title pages, e.g. "12 issues · #423–#500" */}
      {comicBooks.length > 0 && (
        <p className={styles.summary}>
          {[countLabel(comicBooks.length, 'issue'), issueRange(firstIssue, lastIssue)].filter(Boolean).join(' · ')}
        </p>
      )}

      <h2>
        <section>
          <RRLink to={`/forms/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbook/new`}>
            <figure><LibraryAddIcon /></figure>
            <p className={styles.link}>Add an Issue</p>
          </RRLink>
        </section>
      </h2>
    </>
  );

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbComBookListIssues">
        {renderHeader()}
        <article className={styles.cbList}>
          <article className={styles.loadMessageWrap}>
            <section>
              <img src={logo} alt="HeroLog Logo" />
            </section>
            <section className={styles.loadWrap}>
              <p className={styles.loadMessage}>Loading</p>
              <BeatLoader size={10} color="#770422" />
            </section>
          </article>
        </article>
      </article>
    );
  }

  // Early return for empty state
  if (comicBooks.length === 0) {
    return (
      <article id="cbComBookListIssues">
        {renderHeader()}
        <article className={styles.cbList}>
          <Empty
            title="No issues yet"
            message="Add an issue by hand, or upload its cover and Hero-Log will fill in the details."
            action={{ label: 'Add an issue', to: `/forms/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbook/new` }}
          />
        </article>
      </article>
    );
  }

  // Main render with comic books list
  return (
    <article id="cbComBookListIssues">
      {renderHeader()}
      <article className={styles.cbList}>
        <ComicCardGrid label={`${cbTitle} issues`}>
          {comicBooks.map(({
            id,
            title,
            comicIssue,
            author,
            penciler,
            coverartist,
            inker,
            volume,
            year,
            type,
            comicBookCover
          }) => (
            <ComicCard
              key={id}
              title={title || cbTitle}
              issue={comicIssue}
              cover={comicBookCover}
              meta={[volume ? `Vol. ${volume}` : null, year]}
              type={type}
              credits={[
                { label: 'Writer', value: author },
                { label: 'Penciler', value: penciler },
                { label: 'Inker', value: inker },
                { label: 'Cover Artist', value: coverartist },
              ]}
              editUrl={`/forms/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbook/edit/${id}`}
              onDelete={() => handleDelete(id, title, comicIssue)}
            />
          ))}
        </ComicCardGrid>
      </article>
    </article>
  );
};

export default ComicBookListIssues;