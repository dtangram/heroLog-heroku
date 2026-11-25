import { Link as RRLink } from 'react-router-dom';
import styles from './styles.module.css';
import logo from '../../img/logo.png';

interface EmptyProps {
  /** What's missing, e.g. "No messages yet" */
  title?: string;
  /** Why it's empty or what will appear here */
  message?: string;
  /** The next step, e.g. { label: 'Add a publisher', to: '/forms/…' } */
  action?: { label: string; to: string };
}

/**
 * What a page shows when there's nothing in it yet: what's missing, what
 * will appear here, and a button for the next step.
 */
const Empty = ({ title = 'Nothing here yet', message, action }: EmptyProps) => (
  <article className={styles.loadMessageWrap} role="status" aria-live="polite">
    <section>
      <img src={logo} alt="" />
    </section>
    <h2 className={styles.loadMessage}>{title}</h2>
    {message && <p className={styles.message}>{message}</p>}
    {action && (
      <RRLink className={styles.action} to={action.to}>
        {action.label}
      </RRLink>
    )}
  </article>
);

export default Empty;