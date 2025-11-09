import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import { ContainerProps } from './container';

interface FormErrorsType {
  message: string;
}

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 500;

const ReplyMessage = ({ messaging, fetchMessaging, updateMessaging }: ContainerProps) => {
  const { 
    id, 
    messageID, 
    userId, 
    comicBookTitle, 
    userSent, 
    prevMessage, 
    username, 
    userEmail 
  } = useParams<{
    id?: string;
    messageID?: string;
    userId?: string;
    comicBookTitle?: string;
    userSent?: string;
    prevMessage?: string;
    username?: string;
    userEmail?: string;
  }>();
  
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    message: ''
  });
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (userId) {
      fetchMessaging(userId);
    }
    
    inputRef.current?.focus();
  }, [userId, fetchMessaging]);

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

  const validateMessage = useCallback((messageValue: string): boolean => {
    const isValid = messageValue.length >= MIN_MESSAGE_LENGTH && messageValue.length <= MAX_MESSAGE_LENGTH;
    
    setFormErrors({
      message: isValid ? '' : `Message has to be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`
    });
    
    return isValid;
  }, []);

  const decodeComicBookTitle = useCallback((title: string): string => {
    return title.replace('%23', '#');
  }, []);

  const buildReplyMessage = useCallback((userMessage: string, prevMsg: string, user: string): string => {
    const decodedPrevMessage = decodeURIComponent(prevMsg);
    return `${user}: ${userMessage}\n\n${decodedPrevMessage}\n\n`;
  }, []);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setMessage(value);
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateMessage(message);

    if (!isValid || !messageID || !userId || !comicBookTitle || !userSent || !prevMessage || !username || !userEmail) {
      return;
    }

    const subjectComicBookTitle = decodeComicBookTitle(comicBookTitle);
    const replyMessage = buildReplyMessage(message, prevMessage, username);
    const currentUserId = localStorage.getItem('id') || '';

    updateMessaging({
      id: messageID,
      name: username,
      email: userEmail,
      subject: subjectComicBookTitle,
      message: replyMessage,
      messageUsersId: userId,
      userSent,
      userId: currentUserId,  // Fixed: added missing userId
    });

    setSuccessMessage('success');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [
    message,
    messageID,
    userId,
    comicBookTitle,
    userSent,
    prevMessage,
    username,
    userEmail,
    validateMessage,
    decodeComicBookTitle,
    buildReplyMessage,
    updateMessaging
  ]);

  const name = messaging?.name || username || '';
  const email = messaging?.email || userEmail || '';
  const subjectComicBookTitle = comicBookTitle ? decodeComicBookTitle(comicBookTitle) : '';
  const hasNoErrors = formErrors.message.length === 0;

  return (
    <>
      <article id="cbMessage" className={styles.cbWrapper}>
        <h1>
          Send Reply About
          <br />
          {subjectComicBookTitle}
          <figure className={styles.graphic} aria-label="Small burgundy, rectangle graphic." />
        </h1>

        <article className={styles.cbList}>
          {hasNoErrors && successMessage === 'success' && <SuccessDisplay />}

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
                      onChange={handleInputChange}
                      readOnly
                    />
                  </label>

                  <label htmlFor="email">
                    Email
                    <input
                      id="email"
                      className={styles.inputBorder}
                      type="text"
                      name="email"
                      value={email}
                      onChange={handleInputChange}
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
    </>
  );
};

export default ReplyMessage;