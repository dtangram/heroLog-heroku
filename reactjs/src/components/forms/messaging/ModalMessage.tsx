import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import { ContainerProps } from './container';

interface FormErrorsState {
  message: string;
}

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 500;

const ModalMessage = ({
  messaging,
  fetchMessagings,
  createMessaging,
  fetchMessaging,
}: ContainerProps) => {
  const {
    id,
    userId,
    comicBookTitle,
    comicIssue,
    userSent,
    username,
    userEmail,
  } = useParams<{
    id?: string;
    userId?: string;
    comicBookTitle?: string;
    comicIssue?: string;
    userSent?: string;
    username?: string;
    userEmail?: string;
  }>();

  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    message: '',
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    fetchMessagings();

    inputRef.current?.focus();
  }, [fetchMessagings]);

  useEffect(() => {
    if (id) {
      fetchMessaging(id);
    }
  }, [id, fetchMessaging]);

  useEffect(() => {
    if (messaging?.message) {
      setMessage(messaging.message);
    }
  }, [messaging]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setMessage(value);
  };

  const validateFields = (): boolean => {
    const isMessageValid = 
      message.length >= MIN_MESSAGE_LENGTH && 
      message.length <= MAX_MESSAGE_LENGTH;

    setFormErrors({
      message: isMessageValid 
        ? '' 
        : `Message has to be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`,
    });

    return isMessageValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateFields();
    if (!isValid || id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const newSubject = comicIssue && comicIssue !== 'null'
      ? `${comicBookTitle || ''} #${comicIssue}`
      : comicBookTitle || '';

    const currentUserId = localStorage.getItem('id') || '';

    const messageData: Omit<{
      id: string;
      name: string;
      email: string;
      message: string;
      messageUsersId: string;
      subject: string;
      userSent: string;
      userId: string;
    }, 'id'> = {
      name: username || '',
      email: userEmail || '',
      subject: newSubject,
      message,
      messageUsersId: userId || '',
      userSent: userSent || '',
      userId: currentUserId,
    };

    try {
      await createMessaging(messageData);
      
      setSuccessMessage('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Message send error:', error);
    }
  };

  const name = messaging?.name || username || '';
  const email = messaging?.email || userEmail || '';
  const showSuccess = !formErrors.message && successMessage === 'success';
  const hasIssueNumber = comicIssue && comicIssue !== 'null';

  return (
    <article id="cbMessage" className={styles.cbWrapper}>
      {hasIssueNumber ? (
        <h1>
          Send Message About
          <br />
          {comicBookTitle} #{comicIssue}
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>
      ) : (
        <h1>
          Send Message About
          <br />
          {comicBookTitle}
          <figure 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>
      )}

      <article className={styles.cbList}>
        {showSuccess && <SuccessDisplay />}

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            <article>
              <fieldset>
                <label htmlFor="name">
                  From
                  <input
                    id="name"
                    className={styles.inputBorder}
                    type="text"
                    name="name"
                    value={name}
                    readOnly
                  />
                </label>

                <label htmlFor="email">
                  Email
                  <input
                    id="email"
                    className={styles.inputBorder}
                    type="email"
                    name="email"
                    value={email}
                    readOnly
                  />
                </label>

                <textarea
                  ref={inputRef}
                  id="message"
                  name="message"
                  value={message}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Message"
                  minLength={MIN_MESSAGE_LENGTH}
                  maxLength={MAX_MESSAGE_LENGTH}
                  required
                />
              </fieldset>
            </article>

            <article>
              <p>
                <Link url="/" title="CANCEL" />
              </p>

              <input
                id="submitQ1"
                className={styles.submit}
                type="submit"
                value="SUBMIT"
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default ModalMessage;