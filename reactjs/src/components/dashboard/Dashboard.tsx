import { useEffect, useCallback } from 'react';
import { Link as RRLink } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import '../../link/styles.module.css';
import Empty from '../empty';
import ComicCard, { ComicCardGrid } from '../comicCard';
import CompactList from '../compactList';
import { countLabel, splitEmpty } from '../../utils/collection';
import type { ConnectorProps } from './container';
import { getAnonymousUserId } from '../../utils/anonymousUser';
import { showAlert, showConfirm } from '../dialog';
import type { APICallResult } from '../../store/helpers/callAPIMiddleware';
import styles from './styles.module.css';

const Dashboard = ({ 
  fetchPublishers, 
  publishers = [], 
  deletePublisher, 
  isLoading = false,
  user = {
    id: '',
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    type: '',
    profilePic: ''
  }
}: ConnectorProps) => {

  const userId = localStorage.getItem('id') || getAnonymousUserId();
  const isSignedIn = Boolean(localStorage.getItem('token') && localStorage.getItem('id'));
  
  // Fetch publishers on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    
    // Get current user ID (authenticated or anonymous)
    const userId = localStorage.getItem('id') || localStorage.getItem('anonymousUserId');
    console.log('📊 Dashboard fetching for user:', userId);
    
    // ✅ Pass userId to fetchPublishers so it knows which user's data to get
    if (userId) {
      fetchPublishers?.(userId);  // Pass the userId!
    }
  }, [fetchPublishers, user?.id]);

  // Handle publisher deletion with confirmation and error handling
  const handleDelete = useCallback(async (id: string, name: string): Promise<void> => {
    if (!id) return;
    
    const confirmed = await showConfirm(`"${name}" will be removed from your collection. This can't be undone.`, {
      title: 'Delete this publisher?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    
    if (!confirmed) return;

    // Wait for the delete to finish. The list updates itself when it does;
    // fetching the list at the same time could bring the publisher back.
    const outcome = (await (deletePublisher?.(id) as unknown as Promise<APICallResult | undefined>)) ?? { ok: false, error: '' };

    if (!outcome.ok) {
      console.error('Failed to delete publisher:', outcome.error);
      showAlert('Something went wrong while deleting this publisher. Please try again.', { title: "The publisher wasn't deleted" });
    }
  }, [deletePublisher]);

  // Totals across every publisher, for the summary under the heading
  const totals = publishers.reduce(
    (sum, publisher) => ({
      titles: sum.titles + (publisher.titleCount || 0),
      issues: sum.issues + (publisher.issueCount || 0),
    }),
    { titles: 0, issues: 0 }
  );

  // Common header to avoid repetition. Add Publisher is always there,
  // including on an empty Dashboard, where it's needed most.
  const renderHeader = () => (
    <>
      <h1>
        Your Collection
        <figure
          className={styles.graphic}
          aria-hidden="true"
        />
      </h1>

      {publishers.length > 0 && (
        <p className={styles.summary}>
          {countLabel(publishers.length, 'publisher')} · {countLabel(totals.titles, 'title')} ·{' '}
          {countLabel(totals.issues, 'issue')}
        </p>
      )}

      {/* Guests only: their collection lives in this browser until they have an account */}
      {!isSignedIn && (
        <aside className={styles.guestNotice} aria-labelledby="guestNoticeTitle">
          <h2 id="guestNoticeTitle" className={styles.guestTitle}>
            Keep your collection safe
          </h2>
          <p className={styles.guestText}>
            You&apos;re using Hero-Log as a guest, so your collection is saved only in this browser.
            Therefore, you will lose your collection if you clear your browser data or switch devices. Sign up or sign in, and
            everything you&apos;ve added moves to your account.
          </p>
          <nav className={styles.guestActions} aria-label="Save your collection">
            <RRLink className={styles.guestPrimary} to="/signup">Sign Up</RRLink>
            <RRLink className={styles.guestSecondary} to="/signin">Sign In</RRLink>
          </nav>
        </aside>
      )}

      <h2>
        <section>
          <RRLink to={`/forms/createpublisher/new/${userId}`}>
            <figure><LibraryAddIcon /></figure>
            <p className={styles.link}>Add Publisher</p>
          </RRLink>
        </section>
      </h2>
    </>
  );

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbDash" className={styles.cbWrap}>
        {renderHeader()}
        <article className={styles.cbList}>
          <section className={styles.loadWrap}>
            <p className={styles.loadMessage}>Loading</p>
            <BeatLoader size={10} color="#FFF" />
          </section>
        </article>
      </article>
    );
  }

  // Early return for empty state
  if (!publishers || publishers.length === 0) {
    return (
      <article id="cbDash" className={styles.cbWrap}>
        {renderHeader()}
        <article className={styles.cbList}>
          <Empty
            title="No publishers yet"
            message="Start your collection by adding a publisher, like DC or Marvel. Then add titles and issues under it."
            action={{ label: 'Add a publisher', to: `/forms/createpublisher/new/${userId}` }}
          />
        </article>
      </article>
    );
  }

  // Main render: one card per publisher, A to Z
  const sortedPublishers = [...publishers].sort((a, b) => a.publisherName.localeCompare(b.publisherName));

  // Publishers without titles get a short row below the cards instead of a
  // full card, so DC and Marvel aren't crowded out by empty ones. If none
  // has titles yet, they all stay as cards, so the page doesn't look empty.
  const { cards: cardPublishers, empty: emptyPublishers } = splitEmpty(
    sortedPublishers,
    publisher => (publisher.titleCount || 0) > 0
  );

  return (
    <article id="cbDash" className={styles.cbWrap}>
      {renderHeader()}
      <article className={styles.cbList}>
        <ComicCardGrid label="Your publishers">
          {cardPublishers.map(({ id, publisherName, titleCount = 0, issueCount = 0, coverUrl }) => (
            <ComicCard
              key={id}
              title={publisherName}
              cover={coverUrl}
              href={`/dashboard/${userId}/${id}/${publisherName}/comicbooklist`}
              meta={titleCount > 0 ? [countLabel(titleCount, 'title'), countLabel(issueCount, 'issue')] : ['No titles yet']}
              editUrl={`/forms/${userId}/createpublisher/edit/${id}`}
              onDelete={() => handleDelete(id, publisherName)}
            />
          ))}
        </ComicCardGrid>

        <CompactList
          heading="No titles yet"
          description="Add a title to give a publisher its own card."
          addLabel="Add title"
          items={emptyPublishers.map(({ id, publisherName }) => ({
            id,
            name: publisherName,
            href: `/dashboard/${userId}/${id}/${publisherName}/comicbooklist`,
            addUrl: `/forms/${userId}/${id}/${publisherName}/comicbooklisttitle/new`,
            editUrl: `/forms/${userId}/createpublisher/edit/${id}`,
            onDelete: () => handleDelete(id, publisherName),
          }))}
        />
      </article>
    </article>
  );
};

export default Dashboard;