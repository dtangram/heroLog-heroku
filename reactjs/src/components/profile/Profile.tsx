import { useEffect, useCallback } from 'react';
import { Link as RRLink, useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Empty from '../empty';
// The profile uses the same card as comics, publishers and titles
import cardStyles from '../comicCard/styles.module.css';
import styles from './styles.module.css';
import type { ConnectorProps } from './container';
import { showAlert, showConfirm } from '../dialog';
import { AccountCircle } from '@mui/icons-material';

interface RouteParams extends Record<string, string | undefined> {
  id: string;
}

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
  const handleDelete = useCallback(async (userId: string, username: string): Promise<void> => {
    if (!userId) return;

    const confirmed = await showConfirm(
      `The profile for "${username}" will be permanently deleted. This can't be undone.`,
      { title: 'Delete your profile?', confirmLabel: 'Delete Profile', tone: 'danger' }
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
      showAlert('Something went wrong while deleting your profile. Please try again.', { title: "Your profile wasn't deleted" });
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
          <p className={styles.loadMessage} role="status">Loading…</p>
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
        {signups.map(({
          id: profileId,
          firstname,
          lastname,
          username,
          email,
          profilePic
        }) => {
          const fullName = [firstname, lastname].filter(Boolean).join(' ') || username;

          return (
            <article key={profileId} className={`${cardStyles.card} ${styles.profileCard}`}>
              <figure className={`${cardStyles.mat} ${styles.avatarMat}`}>
                {profilePic ? (
                  <img className={styles.avatar} src={profilePic} alt={fullName} />
                ) : (
                  // No photo yet: a person icon instead of a broken image
                  <span className={styles.avatarEmpty}>
                    <AccountCircle className={styles.avatarIcon} titleAccess={`${fullName} has no profile photo yet`} />
                  </span>
                )}
              </figure>

              <article className={cardStyles.panel}>
                <h2 className={cardStyles.name}>{fullName}</h2>

                <ul className={`${cardStyles.credits} ${styles.details}`} aria-label="Account details">
                  <li className={cardStyles.credit}>
                    <span className={cardStyles.role}>Username</span>
                    <span className={cardStyles.person}>{username}</span>
                  </li>
                  <li className={cardStyles.credit}>
                    <span className={cardStyles.role}>Email</span>
                    <span className={cardStyles.person}>{email}</span>
                  </li>
                </ul>

                <menu className={cardStyles.actions}>
                  <li>
                    <RRLink className={cardStyles.action} to={`/forms/profileform/edit/${profileId}`}>
                      <EditIcon fontSize="inherit" aria-hidden="true" />
                      <span className={cardStyles.label}>Update Profile</span>
                    </RRLink>
                  </li>
                  <li>
                    <button
                      className={`${cardStyles.action} ${styles.naturalWidth}`}
                      type="button"
                      onClick={() => handleDelete(profileId, username)}
                      aria-label={`Delete the account for ${username}`}
                    >
                      <DeleteIcon fontSize="inherit" aria-hidden="true" />
                      <span className={cardStyles.label}>Delete account</span>
                    </button>
                  </li>
                </menu>
              </article>
            </article>
          );
        })}
      </article>
    </article>
  );
};

export default Profile;