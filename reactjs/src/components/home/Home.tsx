import { useEffect } from 'react';
import { Container, Row } from 'reactstrap';
import { Link as RRLink, useLocation } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import MessageIcon from '@mui/icons-material/Message';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import EditIcon from '@mui/icons-material/Edit';
import ComicCard, { ComicCardGrid, CardActionLink } from '../comicCard';
import EmptySalesHomepage from '../emptySalesHomepage';
import { formatPrice } from '../../utils/sale';
import styles from './styles.module.css';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';

/**
 * The greeting over the comics collage, with somewhere to go next:
 * the dashboard, collection insights, or the comics for sale below.
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
        See your collection insights
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

  const { hash } = useLocation();

  // Fetch all sales on mount
  useEffect(() => {
    // A link to "/#forSale" (e.g. from an empty Messages page) scrolls to the comics below instead
    if (!window.location.hash) window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    fetchAllSales?.();  // Fixed: was fetchALLSales
  }, [fetchAllSales]);  // Fixed: was fetchALLSales

  // Go to the For Sale section once it's on the page
  const hasSales = salesALL.length > 0;
  useEffect(() => {
    if (hash !== '#forSale') return;
    document.getElementById('forSale')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [hash, isLoading, hasSales]);

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
            aria-hidden="true" 
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
            aria-hidden="true" 
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
          aria-hidden="true" 
        />

        <article className={styles.viewMess}>
          <RRLink to={`/viewMessages/${userId}`}>
            <figure><MessageIcon /></figure>
            <p className="link">View Messages</p>
          </RRLink>
        </article>

        {/* The same cards as the Sale page, so a listing looks the same everywhere */}
        <ComicCardGrid label="Comics for sale">
          {salesALL.map(({
            id,
            comicBookCover,
            comicBookTitle,
            comicIssue,
            comicBookPublisher,
            comicBookYear,
            type,
            saleUsersId,
            sellerUsername,
            price,
            comicCondition
          }) => {
            const name = comicIssue ? `${comicBookTitle} #${comicIssue}` : comicBookTitle;
            const isYours = Boolean(user && saleUsersId === user.id);

            return (
              <ComicCard
                key={id}
                title={comicBookTitle}
                issue={comicIssue}
                cover={comicBookCover}
                meta={[
                  comicCondition,
                  comicBookPublisher,
                  comicBookYear,
                  isYours ? 'Your listing' : sellerUsername && `Seller:\u00A0${sellerUsername}`,
                ]}
                type={type}
                price={formatPrice(price)}
                noPriceText={isYours ? 'No price yet. Edit to add one.' : 'Ask the seller for a price'}
                actions={
                  isYours ? (
                    <CardActionLink
                      to={`/forms/saleform/edit/${id}`}
                      icon={<EditIcon fontSize="inherit" aria-hidden="true" />}
                      label="Edit listing"
                      ariaLabel={`Edit listing for ${name}`}
                    />
                  ) : user ? (
                    <CardActionLink
                      to={`/forms/messaging/${saleUsersId}/${comicBookTitle}/${comicIssue ?? ''}/${user.id}/${user.username}/${user.email}`}
                      icon={<QuestionAnswerIcon fontSize="inherit" aria-hidden="true" />}
                      label="Message seller"
                      ariaLabel={`Message seller of ${name}`}
                    />
                  ) : null
                }
              />
            );
          })}
        </ComicCardGrid>
      </section>
    </article>
  );
};

export default Home;