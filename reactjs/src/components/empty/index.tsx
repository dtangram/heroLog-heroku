import styles from './styles.module.css';
import logo from '../../img/logo.png';

// ============================================================================
// COMPONENT
// ============================================================================

const Empty = () => {
  return (
    <article className={styles.loadMessageWrap} role="status" aria-live="polite">
      <section>
        <img src={logo} alt="HeroLog Logo" />
      </section>
      <p className={styles.loadMessage}>Your List is Empty</p>
    </article>
  );
};

export default Empty;