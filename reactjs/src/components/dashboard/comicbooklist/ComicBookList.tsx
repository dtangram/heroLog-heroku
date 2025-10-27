import { useEffect, useCallback } from 'react';
import { Link as RRLink, useNavigate, useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Link from '../../../link';
import Empty from '../../empty';
import styles from './styles.module.css';
import type { ConnectorProps } from './container';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ComicBookTitle {
  id: string;
  cbTitle: string;
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

// ============================================================================
// COMPONENT
// ============================================================================

const ComicBookList = ({
  fetchComicBookTitles,
  comicbooklists = {},
  deleteComicBookTitle,
}: ConnectorProps) => {
  const { pubId = '', publisherName = '' } = useParams<RouteParams>();

  const navigate = useNavigate();

  // Fetch comic book titles on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    
    if (pubId) {
      fetchComicBookTitles?.(pubId);
    }
  }, [pubId, fetchComicBookTitles]);

  // Handle comic book title deletion
  const handleDelete = useCallback(async (id: string, title: string): Promise<void> => {
    if (!id) return;

    const confirmed = window?.confirm?.(
      `Are you sure you want to delete "${title}"?`
    );

    if (!confirmed) return;

    try {
      const result = deleteComicBookTitle?.(id);
      // Handle both promise and non-promise returns
      if (result && typeof result === 'object' && 'then' in result) {
        await result;
      }
      // Refetch data after deletion instead of full page reload
      if (pubId) {
        fetchComicBookTitles?.(pubId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete comic book title:', errorMessage);
      window?.alert?.('Failed to delete comic book title. Please try again.');
    }
  }, [deleteComicBookTitle, fetchComicBookTitles, pubId]);

  // Extract current comic book data
  const currentComicBookData = comicbooklists[pubId] || {};
  const { allIds = [], byId = {}, isLoading = false } = currentComicBookData;

  // Transform ids into array of comic book objects
  const comicBookTitles = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean) as ComicBookTitle[];

  const handleGoBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbComBookList" className={styles.cbWrap}>
        <button 
          className={styles.backLink} 
          type="button" 
          onClick={handleGoBack}
        >
          {'<'}Dashboard
        </button>

        <h1>
          Your List of {publisherName} Titles
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>

        <h2>
          <section>
            <RRLink to={`/forms/${pubId}/comicbooklisttitle/new`}>
              <figure><LibraryAddIcon /></figure>
              <p className={styles.link}>Add Comic Book Title</p>
            </RRLink>
          </section>
        </h2>

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
        <h1>
          Your List of {publisherName} Titles
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>

        <h2>
          <section>
            <RRLink to={`/forms/${pubId}/${publisherName}/comicbooklisttitle/new`}>
              <figure><LibraryAddIcon /></figure>
              <p className={styles.link}>Add Comic Book Title</p>
            </RRLink>
          </section>
        </h2>

        <article className={styles.cbList}>
          <Empty />
        </article>
      </article>
    );
  }

  // Main render with comic book titles list
  return (
    <article id="cbComBookList" className={styles.cbWrap}>
      <h1>
        Your List of {publisherName} Titles
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />
      </h1>

      <h2>
        <section>
          <RRLink to={`/forms/${pubId}/${publisherName}/comicbooklisttitle/new`}>
            <figure><LibraryAddIcon /></figure>
            <p className={styles.link}>Add Comic Book Title</p>
          </RRLink>
        </section>
      </h2>

      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          <article>
            {comicBookTitles.map(({ id, cbTitle }) => (
              <section key={id}>
                <p>
                  <RRLink 
                    to={`/dashboard/${id}/${cbTitle}/comicbooklistissues`} 
                    className={styles.link}
                  >
                    {cbTitle}
                  </RRLink>
                </p>

                <section className={styles.editStyle}>
                  <figure><EditIcon /></figure>
                  <p className={styles.link}>
                    <Link 
                      url={`/forms/${pubId}/comicbooklisttitle/edit/${id}`} 
                      title="Edit" 
                    />
                  </p>
                </section>

                <button 
                  className={styles.deleteStyle} 
                  type="button"
                  onClick={() => handleDelete(id, cbTitle)}
                  aria-label={`Delete ${cbTitle}`}
                >
                  <figure><DeleteIcon /></figure>
                  <p>Delete</p>
                </button>
              </section>
            ))}
          </article>
        </section>
      </article>
    </article>
  );
};

export default ComicBookList;