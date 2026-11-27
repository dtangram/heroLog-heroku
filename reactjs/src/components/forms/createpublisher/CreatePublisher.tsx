import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import { REDIRECT_DELAY } from '../../../constants/forms';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { ContainerProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import { APICallResult } from '../../../store/helpers/callAPIMiddleware';
import styles from './styles.module.css';
import Breadcrumbs from '../../breadcrumbs';
import { usePageTitle } from '../../documentTitle';

interface FormErrorsState {
  publisherName: string;
}

/** How long the success message shows before going back to the dashboard. */

const CreatePublisher = ({
  publishersById,
  createPublisher,
  fetchPublisher,
  updatePublisher,
}: ContainerProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // The publisher being edited: the one whose id is in the URL. None when adding.
  const publisher = id ? publishersById[id] : undefined;
 
  const [publisherName, setPublisherName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    publisherName: '',
  });
 
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
   
    if (id) {
      fetchPublisher(id);
    }
   
    inputRef.current?.focus();
  }, [id, fetchPublisher]);

  useEffect(() => {
    // Only fill the form with the publisher that matches the URL
    if (publisher?.publisherName && String(publisher.id) === id) {
      setPublisherName(publisher.publisherName);
    }
  }, [publisher, id]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setPublisherName(value);
  };

  const validateFields = (): boolean => {
    const isPublisherNameValid = publisherName.trim().length >= 1;
   
    setFormErrors({
      publisherName: isPublisherNameValid ? '' : 'Publisher name is required',
    });
   
    return isPublisherNameValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving || !validateFields()) {
      return;
    }

    const name = publisherName.trim();
    setIsSaving(true);
    setSuccessMessage('');

    // Wait for the save to finish before saying it worked
    const result = (id
      ? updatePublisher({ id, publisherName: name })
      : createPublisher({ publisherName: name, collectpubUsersId: userId })) as unknown as
      Promise<APICallResult> | undefined;
    const outcome = await result;

    if (outcome && !outcome.ok) {
      setIsSaving(false);
      // "You already have a publisher called DC Comics." says it all on its own
      setFormErrors({ publisherName: outcome.duplicate ? outcome.error : `Couldn't save ${name}: ${outcome.error}` });
      return;
    }

    if (id) {
      setSuccessMessage(`Saved your changes to ${name}.`);
    } else {
      setSuccessMessage(`${name} was added. Next, add a title to it from your dashboard.`);
      // Clear the field so it doesn't look like the publisher is still unsaved
      setPublisherName('');
    }

    setTimeout(() => {
      navigate(`/dashboard/${userId}`);
    }, REDIRECT_DELAY);
  };

  const showSuccess = !formErrors.publisherName && Boolean(successMessage);
  // The same words for the heading and the browser tab
  const pageTitle = id ? `Edit ${publisher?.publisherName || 'Publisher'}` : 'Add a Publisher';
  usePageTitle(pageTitle);

  return (
    <article id="cbCreate" className={styles.cbWrapper}>
      <Breadcrumbs items={[{ label: 'Dashboard', to: `/dashboard/${userId}` }, { label: pageTitle }]} />
      <h1>
        {pageTitle}
        <span className={styles.graphic} aria-hidden="true" />
      </h1>

      <article className={styles.cbList}>
        {showSuccess && <SuccessDisplay message={successMessage} />}

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            {!id && (
              <p className={styles.intro}>
                Your collection is organized by publisher, then title, then issue.
                Start with a publisher, like DC Comics or Marvel.
              </p>
            )}

            <fieldset>
              <label htmlFor="publisherName">
                Publisher Name
                <input
                  ref={inputRef}
                  id="publisherName"
                  className={styles.inputBorder}
                  type="text"
                  name="publisherName"
                  value={publisherName}
                  onChange={handleInputChange}
                  required
                />
              </label>
            </fieldset>

            <article>
              <p>
                <Link
                  url={`/dashboard/${userId}`}
                  title="CANCEL"
                />
              </p>
              <input
                id="submitQ1"
                className={styles.submit}
                type="submit"
                value={isSaving ? 'SAVING…' : 'SUBMIT'}
                disabled={isSaving}
                aria-busy={isSaving}
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default CreatePublisher;