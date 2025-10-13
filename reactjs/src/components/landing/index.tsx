import { useEffect } from 'react';
import logo from '../../img/logo.png';
import numberOne from '../../img/numberOne.png';
import numberTwo from '../../img/numberTwo.png';
import numberThree from '../../img/numberThree.png';
import styles from './styles.module.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SubscriptionPlan {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  price?: string;
}

interface Feature {
  id: string;
  description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    badge: numberOne,
    title: 'Free',
    subtitle: 'With Limited Storage Capacity',
    description: 'Storage is 30 GB. Collectors are not able to buy, sell or trade comics.',
    buttonText: 'Sign Up'
  },
  {
    id: 'standard',
    badge: numberTwo,
    title: '5.99/Month - 60 Day Trial',
    subtitle: 'Storage of 60 GB',
    description: 'Collectors are only able to buy and trade comics with this option, and are able to send and receive messages to other collectors on the Website.',
    buttonText: 'Start Free Trial',
    price: '$5.99'
  },
  {
    id: 'premium',
    badge: numberThree,
    title: '8.99/Month - 70 Day Trial',
    subtitle: 'Unlimited Storage',
    description: 'With this option, collectors can buy, sell or trade comics, and are able to send and receive messages to other collectors on the Website.',
    buttonText: 'Start Free Trial',
    price: '$8.99'
  }
];

const FEATURES: Feature[] = [
  { id: 'catalogue', description: 'Easily Catalogue Your Comic Books' },
  { id: 'duplicates', description: 'No purchasing duplicate comics' },
  { id: 'trade', description: 'Buy, sale and trade comic books' }
];

// ============================================================================
// COMPONENT
// ============================================================================

const Landing = () => {
  // Scroll to top on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <section className={styles.digitizeCollection}>
        <h1>
          Digitize Your
          <br />
          Comic Book Collection
          <figure 
            className="graphic" 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>

        <figure id="bck" aria-label="Collage of X-Men Comic Books" />
      </section>

      <section>
        <figure className="logo_graphic">
          <img src={logo} alt="Hero-Log logo" />
        </figure>

        <h2>Subscription Options</h2>
        <figure 
          className="graphic" 
          aria-label="Small burgundy rectangle graphic" 
        />

        <article className="container">
          <section className="row">
            {SUBSCRIPTION_PLANS.map(({
              id,
              badge,
              title,
              subtitle,
              description,
              buttonText
            }) => (
              <article 
                key={id}
                className="cardWrap col-sm-12 col-md-12 col-lg-4"
              >
                <section className="card">
                  <figure className="logo_graphic">
                    <img src={badge} alt={`Plan ${id}`} />
                  </figure>

                  <article className="card-body">
                    <h3>{title}</h3>
                    <h4>{subtitle}</h4>
                    <p>{description}</p>
                    <button 
                      type="button"
                      aria-label={`${buttonText} for ${title} plan`}
                    >
                      {buttonText}
                    </button>
                  </article>
                </section>
              </article>
            ))}
          </section>
        </article>
      </section>

      <section>
        <div className="logo_graphic">
          <img src={logo} alt="Hero-Log logo" />
        </div>

        <h2>What We Offer</h2>
        <figure 
          className="graphic" 
          aria-label="Small burgundy rectangle graphic" 
        />

        <article className="container">
          <section className="row">
            {FEATURES.map(({ id, description }) => (
              <article 
                key={id}
                className="cardWrap col-sm-12 col-md-12 col-lg-4"
              >
                <section className="card">
                  <figure aria-hidden="true" />
                  <p>{description}</p>
                </section>
              </article>
            ))}
          </section>
        </article>
      </section>

      <section className="comicSaleWrapper">
        <div className="logo_graphic">
          <img src={logo} alt="Hero-Log logo" />
        </div>

        <h2>Comics for Sale</h2>
        <figure 
          className="graphic" 
          aria-label="Small burgundy rectangle graphic" 
        />

        <article className="container">
          <section className="row">
            {[1, 2, 3, 4].map(index => (
              <article 
                key={`comic-${index}`}
                className="cardWrap col-sm-12 col-md-12 col-lg-3"
              >
                <section 
                  className="card"
                  aria-label={`Featured comic ${index}`}
                />
              </article>
            ))}
          </section>
        </article>
      </section>
    </>
  );
};

export default Landing;