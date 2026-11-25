import { Link as RRLink } from 'react-router-dom';
import { usePageTitle } from '../documentTitle';
import styles from './styles.module.css';
import logo from '../../img/logo.png';

/**
 * Shown for any address the app doesn't know, e.g. a mistyped link, instead
 * of a blank page. Offers the places people most likely meant to go.
 */
const NotFound = () => {
  usePageTitle('Page Not Found');
  const userId = localStorage.getItem('id');
  const signedIn = Boolean(userId && localStorage.getItem('token'));

  return (
    <article className={styles.notFound}>
      <img className={styles.logo} src={logo} alt="" />
      <h1>Page Not Found</h1>
      <span className={styles.graphic} aria-hidden="true" />
      <p className={styles.message}>
        We couldn't find that page. The link may be mistyped, or the page may have moved.
      </p>

      <nav aria-label="Where to go next">
        <ul className={styles.links}>
          <li>
            <RRLink className={styles.primary} to="/">
              Go to Home
            </RRLink>
          </li>
          {signedIn && (
            <li>
              <RRLink className={styles.secondary} to={`/dashboard/${userId}`}>
                Your Dashboard
              </RRLink>
            </li>
          )}
          {userId && (
            <li>
              <RRLink className={styles.secondary} to={`/search/${userId}`}>
                Search comics
              </RRLink>
            </li>
          )}
        </ul>
      </nav>
    </article>
  );
};

export default NotFound;