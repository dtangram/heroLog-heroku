import { useState, useEffect } from 'react';
import styles from './styles.module.css';

// ============================================================================
// COMPONENT
// ============================================================================

const Fixer = () => {
  const [fixerData, setFixerData] = useState<string>('');

  // Load currency data from localStorage on mount
  useEffect(() => {
    const data = localStorage?.getItem('data');
    if (data) {
      setFixerData(data);
    }
  }, []);

  return (
    <article id="cbFixer" className={styles.cbWrap}>
      <h1>
        Currency Conversion
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />
      </h1>
      
      <article className={styles.cbList}>
        <section>
          <p>
            Below are a number of common world currencies, all relative to the
            currency EUR and time stamped at the exact time they were collected.
          </p>
          
          <article>
            <label htmlFor="currency-data" className="sr-only">
              Currency conversion data
            </label>
            <textarea
              id="currency-data"
              name="currency-data"
              value={fixerData}
              readOnly
              aria-label="Currency conversion data in JSON format"
              rows={15}
            />
          </article>
        </section>
      </article>
    </article>
  );
};

export default Fixer;