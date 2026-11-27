import { useEffect } from 'react';
import logo from '../../img/logo.png';
import SalePreview from './salePreview/SalePreview';
import { Link as RRLink } from 'react-router-dom';
import styles from './styles.module.css'
import { FEATURES, SUBSCRIPTION_PLANS } from '../../constants/landing';

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