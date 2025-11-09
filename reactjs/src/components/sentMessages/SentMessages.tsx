import { useEffect, useCallback } from 'react';
import { Link as RRLink, useParams } from 'react-router-dom';
import { BeatLoader } from 'react-spinners';
import MessageIcon from '@mui/icons-material/Message';
import DeleteIcon from '@mui/icons-material/Delete';
import Empty from '../empty';
import styles from './styles.module.css';
import logo from '../../img/logo.png';
import type { ConnectorProps } from './container';

interface RouteParams extends Record<string, string | undefined> {
  userId: string;
}

const SentMessages = ({
  fetchMessagingsSent,
  fetchUser,
  messagings = {},
  deleteMessaging,
}: ConnectorProps) => {
  const { userId = '' } = useParams<RouteParams>();

  // Fetch sent messages and user data on mount
  useEffect(() => {
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    
    if (userId) {
      fetchUser?.(userId);  // Fixed: pass userId
    }
    
    fetchMessagingsSent?.();
  }, [userId, fetchUser, fetchMessagingsSent]);

  // Handle message deletion
  const handleDelete = useCallback((id: string, subject: string): void => {
    if (!id) return;

    const confirmed = window?.confirm?.(
      `Are you sure you want to delete the message "${subject}"?`
    );

    if (!confirmed) return;

    try {
      deleteMessaging?.(id);
      // Refetch data after deletion
      fetchMessagingsSent?.();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      console.error('Failed to delete message:', errorMessage);
      window?.alert?.('Failed to delete message. Please try again.');
    }
  }, [deleteMessaging, fetchMessagingsSent]);

  // Extract current messaging data
  const currentMessagingsData = messagings[userId] || {};
  const { allIds = [], byId = {}, isLoading = false } = currentMessagingsData;

  // Transform ids into array of message objects
  const currentMessagings = allIds
    .map(id => byId[id]?.data)
    .filter(Boolean);

  // Early return for loading state
  if (isLoading) {
    return (
      <article id="cbVeiwMessage">
        <h1>
          Your Sent Messages
          <div className="graphic" aria-label="Small burgundy rectangle graphic" />
        </h1>

        <article className={styles.viewMess}>
          <RRLink to={`/viewMessages/${userId}`}>
            <figure><MessageIcon /></figure>
            <p className="link">View Messages</p>
          </RRLink>
        </article>

        <article className="cbList">
          <section>
            <article>
              <article className="loadMessageWrap">
                <section>
                  <img src={logo} alt="HeroLog Logo" />
                </section>

                <section className="loadWrap">
                  <p className="loadMessage">Loading</p>
                  <BeatLoader size={10} color="#770422" />
                </section>
              </article>
            </article>
          </section>
        </article>
      </article>
    );
  }

  // Early return for empty state
  if (currentMessagings.length === 0) {
    return (
      <article id="cbVeiwMessage">
        <h1>
          Your Sent Messages
          <div className="graphic" aria-label="Small burgundy rectangle graphic" />
        </h1>

        <article className={styles.viewMess}>
          <RRLink to={`/viewMessages/${userId}`}>
            <figure><MessageIcon /></figure>
            <p className="link">View Messages</p>
          </RRLink>
        </article>

        <article className="cbList">
          <section>
            <article>
              <Empty />
            </article>
          </section>
        </article>
      </article>
    );
  }

  // Main render with messages list
  return (
    <article id="cbVeiwMessage">
      <h1>
        Your Sent Messages
        <div className="graphic" aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.viewMess}>
        <RRLink to={`/viewMessages/${userId}`}>
          <figure><MessageIcon /></figure>
          <p className="link">View Messages</p>
        </RRLink>
      </article>

      <article className="cbList">
        <section>
          <article>
            <section className="viewMessage">
              {currentMessagings.map(({
                id,
                name,
                email,
                subject,
                message
              }) => (
                <article key={id}>
                  <p>
                    <span>From:</span>
                    <br />
                    {name}
                  </p>

                  <p>
                    <span>Email:</span>
                    <br />
                    {email}
                  </p>

                  <p>
                    <span>Subject:</span>
                    <br />
                    {subject}
                  </p>

                  <p>
                    <span>Message:</span>
                  </p>

                  <p>
                    {message}
                  </p>

                  <section>
                    <button 
                      className={styles.deleteStyle} 
                      type="button" 
                      onClick={() => handleDelete(id, subject)}
                      aria-label={`Delete message: ${subject}`}
                    >
                      <figure><DeleteIcon /></figure>
                      <p>Delete</p>
                    </button>
                  </section>
                </article>
              ))}
            </section>
          </article>
        </section>
      </article>
    </article>
  );
};

export default SentMessages;