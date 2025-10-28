import { useEffect, useCallback } from 'react';
import { Link as RRLink, useParams, useNavigate } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Link from '../../../link';
import Empty from '../../empty';
import styles from './styles.module.css';
import logo from '../../../img/logo.png';
import type { ConnectorProps } from './container';

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
  const { coboTitleId = '', cbTitle = '' } = useParams<RouteParams>();
  const navigate = useNavigate();

  // Fetch comic books on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    
    if (coboTitleId) {
      fetchComicBooks?.(coboTitleId);
    }
  }, [coboTitleId, fetchComicBooks]);

  // Handle navigation back
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Handle comic book deletion
  const handleDelete = useCallback((id: string, title: string): void => {
    if (!id) return;

    const confirmed = window?.confirm?.(
      `Are you sure you want to delete "${title}"?`
    );

    if (!confirmed) return;

    try {
      deleteComicBook?.(id);
      // Refetch data after deletion
      if (coboTitleId) {
        fetchComicBooks?.(coboTitleId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete comic book:', errorMessage);
      window?.alert?.('Failed to delete comic book. Please try again.');
    }
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
      <button 
        className={styles.backLink} 
        type="button" 
        onClick={handleGoBack}
      >
        Back
      </button>

      <h1>
        Your List of {cbTitle} Comics
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />
      </h1>

      <h2>
        <section>
          <RRLink to={`/forms/${coboTitleId}/${cbTitle}/comicbook/new`}>
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
                    <img 
                      src={comicBookCover || logo} 
                      alt={`${title} Issue ${comicIssue} cover`} 
                    />
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
                      <figure><EditIcon /></figure>
                      <p className={styles.link}>
                        <Link 
                          url={`/forms/${coboTitleId}/${cbTitle}/comicbook/edit/${id}`} 
                          title="Edit" 
                        />
                      </p>
                    </section>
                    
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