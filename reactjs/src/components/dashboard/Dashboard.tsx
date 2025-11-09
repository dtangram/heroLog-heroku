import { useEffect, useCallback } from 'react';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Link from '../../link';
import Empty from '../empty';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import styles from './styles.module.css';

// ============================================================================
// COMPONENT
// ============================================================================

const Dashboard = ({ 
  fetchPublishers, 
  publishers = [], 
  deletePublisher, 
  isLoading = false,
  user = {
    id: '',
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    type: '',
    profilePic: ''
  }
}: ConnectorProps) => {

  const userId = localStorage.getItem('id') || getAnonymousUserId();
  
  // Fetch publishers on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    
    // Get current user ID (authenticated or anonymous)
    const userId = localStorage.getItem('id') || localStorage.getItem('anonymousUserId');
    console.log('📊 Dashboard fetching for user:', userId);
    
    // ✅ Pass userId to fetchPublishers so it knows which user's data to get
    if (userId) {
      fetchPublishers?.(userId);  // Pass the userId!
    }
  }, [fetchPublishers, user?.id]);

  // useEffect(() => {
  //   const handleStorageChange = () => {
  //     // Check if token was removed (logout)
  //     const token = localStorage.getItem('token');
  //     const anonymousId = localStorage.getItem('anonymousUserId');
      
  //     if (!token && anonymousId) {
  //       console.log('🔄 Token removed, refetching for anonymous user');
  //       fetchPublishers?.(anonymousId);
  //     }
  //   };
    
  //   // Listen for storage changes
  //   window.addEventListener('storage', handleStorageChange);
    
  //   return () => {
  //     window.removeEventListener('storage', handleStorageChange);
  //   };
  // }, [fetchPublishers]);

  // Handle publisher deletion with confirmation and error handling
  const handleDelete = useCallback((id: string, name: string): void => {
    if (!id) return;
    
    const confirmed = window?.confirm?.(
      `Are you sure you want to delete "${name}"?`
    );
    
    if (!confirmed) return;

    try {
      deletePublisher?.(id);
      // Refetch after delete for updated list
      fetchPublishers?.();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete publisher:', errorMessage);
      window?.alert?.('Failed to delete publisher. Please try again.');
    }
  }, [deletePublisher, fetchPublishers]);

  // Common header to avoid repetition
  const renderHeader = () => (
    <>
      <h1>
          Your List of Publishers
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>
    </>
  );

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbDash" className={styles.cbWrap}>
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
  if (!publishers || publishers.length === 0) {
    return (
      <article id="cbDash" className={styles.cbWrap}>
        {renderHeader()}
        <article className={styles.cbList}>
          <Empty />
        </article>
      </article>
    );
  }

  // Main render with publishers list
  return (
    <article id="cbDash" className={styles.cbWrap}>
      {renderHeader()}
      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          <article>
            {publishers.map(({ id, publisherName }) => (
              <section key={id}>
                <p>
                  <RRLink 
                    to={`/dashboard/${userId}/${id}/${publisherName}/comicbooklist`} 
                    className={styles.link}
                  >
                    {publisherName}
                  </RRLink>
                </p>
                
                <section className={styles.editStyle}>
                  <figure>
                    <EditIcon />
                  </figure>
                  <p className={styles.link}>
                    <Link 
                      url={`/forms/${userId}/createpublisher/edit/${id}`} 
                      title="Edit" 
                    />
                  </p>
                </section>
                
                <button 
                  className={styles.deleteStyle} 
                  type="button" 
                  onClick={() => handleDelete(id, publisherName)}
                  aria-label={`Delete ${publisherName}`}
                >
                  <figure>
                    <DeleteIcon />
                  </figure>
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

export default Dashboard;