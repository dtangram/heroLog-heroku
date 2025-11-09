import { useEffect, useCallback } from 'react';
import { Link as RRLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Link from '../../../link';
import Empty from '../../empty';
import logo from '../../../img/logo.png';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import styles from './styles.module.css';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

const ComicBookListIssues = ({
  fetchComicBooks,
  comicbooklistissues = {},
  deleteComicBook,
}: ConnectorProps) => {
  const { coboTitleId = '', cbTitle = '', pubId = '', publisherName = '' } = useParams<RouteParams>();
  const navigate = useNavigate();
  const location = useLocation();

  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // Fetch comic books on mount and when returning from edit
  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (coboTitleId) {
      fetchComicBooks(coboTitleId);
    }
  }, [coboTitleId, fetchComicBooks, location.state]);

  // Handle navigation back
  const handleGoToDashboard = useCallback(() => {
    navigate(`/dashboard/${userId}`);
  }, [navigate]);

  const handleGoToPublisher = useCallback(() => {
    navigate(`${`/dashboard/${userId}/${pubId}/${publisherName}/comicbooklist`}`);
  }, [navigate]);

  // Handle comic book deletion
  const handleDelete = useCallback((id: string, title: string): void => {
    if (!id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"?`
    );

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
  const comicBooks = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as ComicBook[];

  // Common header section to avoid repetition
  const renderHeader = () => (
    <>
      <section className={styles.backLinkWrapper}>
        <button 
        className={styles.backLink}
        type="button" 
        onClick={handleGoToDashboard}
        >
          &lt; Dashboard
        </button>
        <button 
          className={styles.backLink}
          type="button" 
          onClick={handleGoToPublisher}
        >
          &lt; {publisherName}
        </button>
      </section>

      <h1>
        Your List of {cbTitle} Comics
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />
      </h1>

      <h2>
        <section>
          <RRLink to={`/forms/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbook/new`}>
            <figure><LibraryAddIcon /></figure>
            <p className={styles.link}>Add Comic Book</p>
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
          <Empty />
        </article>
      </article>
    );
  }

  // Main render with comic books list
  return (
    <article id="cbComBookListIssues">
      {renderHeader()}
      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          <article className={styles.articleWrap}>
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
              <section className={styles.comicSec} key={id}>
                <article className={styles.comicWrap}>
                  <section className={styles.comicImgWrap}>
                    <a href={comicBookCover} target="_blank" rel="noopener noreferrer">
                      <img
                        className={comicBookCover && styles.cbCoverImg}
                        src={comicBookCover || logo} 
                        alt={`${title} Issue ${comicIssue} cover`} 
                      />
                    </a>
                  </section>

                  <section className={styles.paraWrap}>
                    <p><span>Title:</span> {title || 'N/A'}</p>
                    <p><span>Issue:</span> {comicIssue || 'N/A'}</p>
                    <p><span>Author:</span> {author || 'N/A'}</p>
                    <p><span>Penciler:</span> {penciler || 'N/A'}</p>
                    <p><span>Cover Artist:</span> {coverartist || 'N/A'}</p>
                    <p><span>Inker:</span> {inker || 'N/A'}</p>
                    <p><span>Volume:</span> {volume || 'N/A'}</p>
                    <p><span>Year:</span> {year || 'N/A'}</p>
                    <p><span>Cover:</span> {type || 'N/A'}</p>
                  </section>
                  <section className={styles.paragraphFooter}>
                    <section className={styles.editStyle}>
                      <p className={styles.linkWrapper}>
                        <Link className={styles.editLink}
                          url={`/forms/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbook/edit/${id}`}
                          icon={<EditIcon />}
                          title="Edit" 
                        />
                      </p>
                    </section>
                    
                    <section className={styles.deleteWrapper}>
                      <button 
                        className={styles.deleteStyle}
                        type="button" 
                        onClick={() => handleDelete(id, title)}
                        aria-label={`Delete ${title} Issue ${comicIssue}`}
                      >
                        <figure><DeleteIcon /></figure>
                        <p>Delete</p>
                      </button>
                    </section>
                  </section>
                </article>
              </section>
            ))}
          </article>
        </section>
      </article>
    </article>
  );
};

export default ComicBookListIssues;