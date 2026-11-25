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
import { countLabel } from '../../utils/collection';
import { clearSession } from '../../utils/session';
import type { APICallResult } from '../../store/helpers/callAPIMiddleware';

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
  /** App.tsx's route is /profile/:userId */
  userId?: string;
}

/** "—" while a total is still loading, so a 0 never flashes before the real number */
const shown = (count: number | null) => (count === null ? '—' : count.toLocaleString('en-US'));

const Profile = ({
  fetchUser,
  signups = [],
  deleteUser,
  isLoading = false,
  stats,
  fetchPublishers,
  fetchSales,
  fetchWishlists,
}: ConnectorProps) => {
  const { id, userId: routeUserId } = useParams<RouteParams>();
  const signedInId = localStorage.getItem('id') || '';
  const profileId = routeUserId ?? id;
  const isOwnProfile = Boolean(profileId) && profileId === signedInId;

  // Totals for "Your Hero-Log": only on your own profile
  useEffect(() => {
    if (!isOwnProfile) return;
    fetchPublishers?.(signedInId);
    fetchSales?.();
    fetchWishlists?.();
  }, [isOwnProfile, signedInId, fetchPublishers, fetchSales, fetchWishlists]);

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
      `The account "${username}" and everything in it will be permanently deleted: your collection, sale listings, wish list and messages. This can't be undone.`,
      { title: 'Delete your account?', confirmLabel: 'Delete Account', tone: 'danger' }
    );

    if (!confirmed) return;

    const outcome = (await (deleteUser?.(userId) as unknown as Promise<APICallResult | undefined>)) ?? { ok: false, error: '' };

    if (!outcome.ok) {
      console.error('Failed to delete account:', outcome.error);
      showAlert('Something went wrong while deleting your account. Nothing was deleted. Please try again.', {
        title: "Your account wasn't deleted",
      });
      return;
    }

    // The account no longer exists: sign this browser out and leave the private pages
    clearSession();
    await showAlert('Your account and everything in it have been deleted.', { title: 'Account deleted' });
    // A full page load resets everything the app had loaded for the account
    window.location.assign('/landing');
  }, [deleteUser]);

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
          <Empty
            title="We couldn't find your profile"
            message="Try signing in again."
            action={{ label: 'Sign in', to: '/signin' }}
          />
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
                      <span className={cardStyles.label}>Edit Profile</span>
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

      {isOwnProfile && stats && (
        <nav className={styles.stats} aria-labelledby="yourHeroLog">
          <h2 id="yourHeroLog" className={styles.statsHeading}>Your Hero-Log</h2>
          <ul className={styles.statsList}>
            <li>
              <RRLink className={styles.statTile} to={`/dashboard/${signedInId}`}>
                <strong className={styles.statNumber}>{shown(stats.issues)}</strong>
                <span className={styles.statLabel}>
                  {stats.issues === 1 ? 'Comic' : 'Comics'} in your collection
                </span>
                {stats.titles !== null && stats.publishers !== null && (
                  <span className={styles.statDetail}>
                    {countLabel(stats.titles, 'title')} · {countLabel(stats.publishers, 'publisher')}
                  </span>
                )}
              </RRLink>
            </li>
            <li>
              <RRLink className={styles.statTile} to={`/sale/${signedInId}`}>
                <strong className={styles.statNumber}>{shown(stats.forSale)}</strong>
                <span className={styles.statLabel}>For sale</span>
                <span className={styles.statDetail}>Your listings</span>
              </RRLink>
            </li>
            <li>
              <RRLink className={styles.statTile} to={`/wishlist/${signedInId}`}>
                <strong className={styles.statNumber}>{shown(stats.wishList)}</strong>
                <span className={styles.statLabel}>On your Wish List</span>
                <span className={styles.statDetail}>Comics you're looking for</span>
              </RRLink>
            </li>
          </ul>
        </nav>
      )}
    </article>
  );
};

export default Profile;