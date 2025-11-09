import { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Link from '../../link';
import Empty from '../empty';
import styles from './styles.module.css';
import type { ConnectorProps } from './container';
import { AccountCircle } from '@mui/icons-material';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RouteParams extends Record<string, string | undefined> {
  id: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const Profile = ({
  fetchUser,
  signups = [],
  deleteUser,
  isLoading = false,
}: ConnectorProps) => {
  const { id } = useParams<RouteParams>();

  // Fetch user on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    
    if (id) {
      fetchUser?.(id);
    }
  }, [id, fetchUser]);

  // Handle user deletion
  const handleDelete = useCallback((userId: string, username: string): void => {
    if (!userId) return;

    const confirmed = window?.confirm?.(
      `Are you sure you want to delete the profile for "${username}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      deleteUser?.(userId);
      // Refetch after deletion
      if (id) {
        fetchUser?.(id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete profile:', errorMessage);
      window?.alert?.('Failed to delete profile. Please try again.');
    }
  }, [deleteUser, fetchUser, id]);

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbDash" className={styles.cbWrap}>
        <h1>
          Profile
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>
        <article className={styles.cbList}>
          <section className={styles.wrapper}>
            <article>
              <p className={styles.loadMessage}>Loading...</p>
            </article>
          </section>
        </article>
      </article>
    );
  }

  // Early return for empty state
  if (!signups || signups.length === 0) {
    return (
      <article id="cbDash" className={styles.cbWrap}>
        <h1>
          Profile
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>
        <article className={styles.cbList}>
          <Empty />
        </article>
      </article>
    );
  }

  // Main render with profile data
  return (
    <article id="cbDash" className={styles.cbWrap}>
      <h1>
        Profile
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />
      </h1>
      
      <article className={styles.cbList}>
        <section className={styles.wrapper}>
          <article>
            {signups.map(({
              id: profileId,
              firstname,
              lastname,
              username,
              email,
              type,
              profilePic
            }) => (
              <section key={profileId}>
                <figure>
                  <img 
                    src={!profilePic ? `${<AccountCircle />}` : profilePic} 
                    alt={`${firstname} ${lastname}'s profile`} 
                  />
                </figure>
                <br />
                
                <p>
                  {firstname}
                  <br />
                  {lastname}
                  <br />
                  {username}
                  <br />
                  {email}
                  <br />
                  {type}
                  <br />
                  <Link 
                    url={`/forms/profileform/edit/${profileId}`} 
                    title="Update Profile" 
                  />
                  <button 
                    type="button" 
                    onClick={() => handleDelete(profileId, username)}
                    aria-label={`Delete profile for ${username}`}
                  >
                    Delete
                  </button>
                </p>
              </section>
            ))}
          </article>
        </section>
      </article>
    </article>
  );
};

export default Profile;