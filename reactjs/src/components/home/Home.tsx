import { useEffect } from 'react';
import { Container, Row, Col } from 'reactstrap';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import MessageIcon from '@mui/icons-material/Message';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import EmptySalesHomepage from '../emptySalesHomepage';
import styles from './styles.module.css';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';

// ============================================================================
// COMPONENT
// ============================================================================

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

  // Early return for loading state
  if (isLoading) {
    return (
      <article className={styles.homeSection}>
        <section>
          {user && (
            <h1>
              Welcome, {user.firstname}
              <Col 
                className={styles.graphic} 
                aria-label="Small burgundy rectangle graphic" 
              />
            </h1>
          )}

          <figure id="bck" aria-label="Collage of X-Men Comic Books" />
        </section>

        <section className={styles.comicSaleWrapper}>
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
          {user && (
            <h1>
              Welcome, {user.firstname}
              <Col 
                className={styles.graphic} 
                aria-label="Small burgundy rectangle graphic" 
              />
            </h1>
          )}

          <figure id="bck" aria-label="Collage of X-Men Comic Books" />
        </section>

        <section className={styles.comicSaleWrapper}>
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
        {user && (
          <h1>
            Welcome, {user.firstname}
            <Col 
              className={styles.graphic} 
              aria-label="Small burgundy rectangle graphic" 
            />
          </h1>
        )}

        <figure id="bck" aria-label="Collage of X-Men Comic Books" />
      </section>

      <section className={styles.comicSaleWrapper}>
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
              saleUsersId
            }) => (
              <Col 
                sm="12" 
                md="3" 
                className={styles.issueWrap} 
                key={id}
              >
                <figure>
                  <img 
                    src={comicBookCover} 
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

                {user && (
                  <article>
                    <RRLink 
                      to={`/forms/messaging/${saleUsersId}/${comicBookTitle}/${comicIssue ?? ''}/${user.id}/${user.username}/${user.email}`}
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