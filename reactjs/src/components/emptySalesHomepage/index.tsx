import styles from './styles.module.css';
import logo from '../../img/logo.png';

// ============================================================================
// COMPONENT
// ============================================================================

const EmptySalesHomepage = () => {
  return (
    <article className={styles.loadMessageWrap} role="status" aria-live="polite">
      <section>
        <img src={logo} alt="HeroLog Logo" />
      </section>
      <p className={styles.loadMessage}>Sales List is Empty</p>
    </article>
  );
};

export default EmptySalesHomepage;