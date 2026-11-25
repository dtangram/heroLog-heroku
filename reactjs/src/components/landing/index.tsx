import { useEffect } from 'react';
import logo from '../../img/logo.png';
import numberOne from '../../img/numberOne.png';
import numberTwo from '../../img/numberTwo.png';
import numberThree from '../../img/numberThree.png';
import SalePreview from './salePreview/SalePreview';
import { Link as RRLink } from 'react-router-dom';
import styles from './styles.module.css'

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

/**
 * The plans, described by what each lets a collector do. No storage sizes:
 * a catalog is a list of comics, so GB means nothing to a collector.
 * Both paid plans have the same standard 30-day free trial.
 */
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    badge: numberOne,
    title: 'Free',
    subtitle: 'Catalog your collection',
    description: 'Scan covers, organize your comics by publisher and title, search them, and get Collection Insights.',
    buttonText: 'Sign Up'
  },
  {
    id: 'standard',
    badge: numberTwo,
    title: '$5.99 a month',
    subtitle: 'Buy and trade · 30-day free trial',
    description: 'Everything in Free, plus buying and trading comics with other collectors and messaging them on Hero-Log.',
    buttonText: 'Start Free Trial',
    price: '$5.99'
  },
  {
    id: 'premium',
    badge: numberThree,
    title: '$8.99 a month',
    subtitle: 'Buy, sell and trade · 30-day free trial',
    description: 'Everything in the $5.99 plan, plus listing your own comics for sale.',
    buttonText: 'Start Free Trial',
    price: '$8.99'
  }
];

const FEATURES: Feature[] = [
  { id: 'catalogue', description: 'Easily Catalogue Your Comic Books' },
  { id: 'duplicates', description: 'No purchasing duplicate comics' },
  { id: 'trade', description: 'Buy, sell and trade comic books' }
];

const Landing = () => {
  // Scroll to top on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <section className={styles.digitizeCollection} data-landing="intro">
        <h1>
          Digitize Your
          <br />
          Comic Book Collection
          <figure 
            className="graphic" 
            aria-hidden="true" 
          />
        </h1>

        <figure id="bck" aria-label="Collage of X-Men Comic Books" />
      </section>

      <section data-landing="plans">
        <figure className="logo_graphic">
          <img src={logo} alt="Hero-Log logo" />
        </figure>

        <h2>Subscription Options</h2>
        <figure 
          className="graphic" 
          aria-hidden="true" 
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
                    <img src={badge} alt="" />
                  </figure>

                  <article className="card-body">
                    <h3>{title}</h3>
                    <h4>{subtitle}</h4>
                    <p>{description}</p>
                    {/* Every plan starts with creating an account */}
                    <RRLink className="planLink" to="/signup" aria-label={`${buttonText}: ${title} plan`}>
                      {buttonText}
                    </RRLink>
                  </article>
                </section>
              </article>
            ))}
          </section>
        </article>
      </section>

      <section data-landing="features">
        <figure className="logo_graphic">
          <img src={logo} alt="Hero-Log logo" />
        </figure>

        <h2>What We Offer</h2>
        <figure 
          className="graphic" 
          aria-hidden="true" 
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

      {/* The newest real listings (a public preview), or nothing if none load */}
      <SalePreview />
    </>
  );
};

export default Landing;