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

/** "regular" -> "Regular member", "admin" -> "Admin member" */
const accountLabel = (type: string | null | undefined): string | null => {
  const text = (type || '').trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1).toLowerCase()} member` : null;
};

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
          type,
          profilePic
        }) => {
          const fullName = [firstname, lastname].filter(Boolean).join(' ') || username;
          const account = accountLabel(type);

          return (
            <div key={profileId} className={`${cardStyles.card} ${styles.profileCard}`}>
              <div className={`${cardStyles.mat} ${styles.avatarMat}`}>
                {profilePic ? (
                  <img className={styles.avatar} src={profilePic} alt={fullName} />
                ) : (
                  // No photo yet: a person icon instead of a broken image
                  <span className={styles.avatarEmpty}>
                    <AccountCircle className={styles.avatarIcon} titleAccess={`${fullName} has no profile photo yet`} />
                  </span>
                )}
              </div>

              <div className={cardStyles.panel}>
                <h2 className={cardStyles.name}>{fullName}</h2>

                {account && (
                  <p className={cardStyles.facts}>
                    <span className={cardStyles.tag}>{account}</span>
                  </p>
                )}

                <dl className={`${cardStyles.credits} ${styles.details}`}>
                  <div className={cardStyles.credit}>
                    <dt>Username</dt>
                    <dd>{username}</dd>
                  </div>
                  <div className={cardStyles.credit}>
                    <dt>Email</dt>
                    <dd>{email}</dd>
                  </div>
                </dl>

                <div className={cardStyles.actions}>
                  <RRLink className={cardStyles.action} to={`/forms/profileform/edit/${profileId}`}>
                    <EditIcon fontSize="inherit" aria-hidden="true" />
                    <span className={cardStyles.label}>Update Profile</span>
                  </RRLink>
                  <button
                    className={`${cardStyles.action} ${styles.naturalWidth}`}
                    type="button"
                    onClick={() => handleDelete(profileId, username)}
                    aria-label={`Delete the account for ${username}`}
                  >
                    <DeleteIcon fontSize="inherit" aria-hidden="true" />
                    <span className={cardStyles.label}>Delete account</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </article>
    </article>
  );
};

export default Profile;