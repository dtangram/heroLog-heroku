import { useEffect } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import MessageIcon from '@mui/icons-material/Message';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import EmptySalesHomepage from '../emptySalesHomepage';
import { formatPrice } from '../../utils/sale';
import styles from './styles.module.css';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';

/**
 * The greeting over the comics collage, with somewhere to go next:
 * the dashboard, collection intel, or the comics for sale below.
 */
const WelcomeHero = ({ firstname, userId }: { firstname: string; userId: string }) => (
  <article className={styles.welcome}>
    <h1>
      Welcome, {firstname}
      <span className={styles.graphic} aria-hidden="true" />
    </h1>
    <p className={styles.welcomeIntro}>
      Scan a cover, track what you own, and find what you're missing.
    </p>
    <nav className={styles.welcomeActions} aria-label="Get started">
      <RRLink className={styles.ctaPrimary} to={`/dashboard/${userId}`}>
        Open your dashboard
      </RRLink>
      <RRLink className={styles.ctaSecondary} to={`/intel/${userId}`}>
        See your collection intel
      </RRLink>
    </nav>
    <a className={styles.ctaLink} href="#forSale">
      Browse comics for sale
    </a>
  </article>
);

const Home = ({
  fetchAllSales,
  salesALL = [],
  isLoading = false,
  user,
}: ConnectorProps) => {
  console.log('🏠 Home - user prop:', user);  // ✅ Add this
  console.log('🏠 Home - user type:', typeof user);  // ✅ Add this
  
  const userId = localStorage?.getItem('id') ?? '';

  // Fetch all sales on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    fetchAllSales?.();  // Fixed: was fetchALLSales
  }, [fetchAllSales]);  // Fixed: was fetchALLSales

  // Show the spinner only on the first load. When the list is reloading,
  // keep showing the current comics until the fresh list arrives.
  if (isLoading && salesALL.length === 0) {
    return (
      <article className={styles.homeSection}>
        <section>
          {user && <WelcomeHero firstname={user.firstname} userId={user.id} />}

          <figure id="bck" aria-label="Collage of X-Men Comic Books" />
        </section>

        <section id="forSale" className={styles.comicSaleWrapper}>
          <figure className={styles.logo_graphic}>
            <img src={logo} alt="Logo graphic" />
          </figure>

          <h2>Comics for Sale</h2>
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />

          <article className={styles.viewMess}>
            <RRLink to={`/viewMessages/${userId}`}>
              <figure><MessageIcon /></figure>
              <p className="link">View Messages</p>
            </RRLink>
          </article>

          <Container fluid className={styles.container}>
            <Row className={styles.row}>
              <article className={styles.loadMessageWrap}>
                <section>
                  <img src={logo} alt="HeroLog Logo" />
                </section>

                <section className={styles.loadWrap}>
                  <p className={styles.loadMessage}>Loading</p>
                  <BeatLoader size={10} color="#770422" />
                </section>
              </article>
            </Row>
          </Container>
        </section>
      </article>
    );
  }

  // Early return for empty state
  if (!salesALL || salesALL.length === 0) {
    return (
      <article className={styles.homeSection}>
        <section>
          {user && <WelcomeHero firstname={user.firstname} userId={user.id} />}

          <figure id="bck" aria-label="Collage of X-Men Comic Books" />
        </section>

        <section id="forSale" className={styles.comicSaleWrapper}>
          <figure className={styles.logo_graphic}>
            <img src={logo} alt="Logo graphic" />
          </figure>

          <h2>Comics for Sale</h2>
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />

          <article className={styles.viewMess}>
            <RRLink to={`/viewMessages/${userId}`}>
              <figure><MessageIcon /></figure>
              <p className="link">View Messages</p>
            </RRLink>
          </article>

          <Container fluid className={styles.container}>
            <Row className={styles.row}>
              <EmptySalesHomepage />
            </Row>
          </Container>
        </section>
      </article>
    );
  }

  // Main render with sales list
  return (
    <article className={styles.homeSection}>
      <section>
        {user && <WelcomeHero firstname={user.firstname} userId={user.id} />}

        <figure id="bck" aria-label="Collage of X-Men Comic Books" />
      </section>

      <section id="forSale" className={styles.comicSaleWrapper}>
        <figure className={styles.logo_graphic}>
          <img src={logo} alt="Logo graphic" />
        </figure>

        <h2>Comics for Sale</h2>
        <figure 
          className={styles.graphic} 
          aria-label="Small burgundy rectangle graphic" 
        />

        <article className={styles.viewMess}>
          <RRLink to={`/viewMessages/${userId}`}>
            <figure><MessageIcon /></figure>
            <p className="link">View Messages</p>
          </RRLink>
        </article>

        <Container fluid className={styles.container}>
          <Row className={styles.row}>
            {salesALL.map(({
              id,
              comicBookCover,
              comicBookTitle,
              comicIssue,
              saleUsersId,
              sellerUsername,
              price,
              comicCondition
            }) => (
              <Col 
                sm="12" 
                md="3" 
                className={styles.issueWrap} 
                key={id}
              >
                <figure>
                  <img 
                    src={comicBookCover || logo} 
                    alt={`${comicBookTitle}${comicIssue ? ` Issue ${comicIssue}` : ''} cover`} 
                  />
                </figure>

                {comicIssue ? (
                  <h3>
                    {comicBookTitle} #{comicIssue}
                  </h3>
                ) : (
                  <h3>{comicBookTitle}</h3>
                )}

                <p className={styles.priceLine}>
                  {formatPrice(price) ? (
                    <strong className={styles.price}>
                      <span className="visually-hidden">Price: </span>
                      {formatPrice(price)}
                    </strong>
                  ) : (
                    <span className={styles.noPrice}>Ask the seller for a price</span>
                  )}
                  {comicCondition && (
                    <span className={styles.condition}>
                      <span className="visually-hidden">Condition: </span>
                      {comicCondition}
                    </span>
                  )}
                </p>

                {sellerUsername && (
                  <p className={styles.seller}>
                    Seller: <strong>{sellerUsername}</strong>
                  </p>
                )}

                {user && (
                  <article>
                    <RRLink 
                      to={`/forms/messaging/${saleUsersId}/${comicBookTitle}/${comicIssue ?? ''}/${user.id}/${user.username}/${user.email}`}
                      aria-label={`Message the seller of ${comicBookTitle}${comicIssue ? ` #${comicIssue}` : ''}`}
                    >
                      <figure className="link">
                        <QuestionAnswerIcon />
                      </figure>
                    </RRLink>
                    <p>Send a message to the owner of this comic book.</p>
                  </article>
                )}
              </Col>
            ))}
          </Row>
        </Container>
      </section>
    </article>
  );
};

export default Home;