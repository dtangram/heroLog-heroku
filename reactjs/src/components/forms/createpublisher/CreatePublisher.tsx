import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { ContainerProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import styles from './styles.module.css';

interface FormErrorsState {
  publisherName: string;
}

const CreatePublisher = ({
  publisher,
  createPublisher,
  fetchPublisher,
  updatePublisher,
}: ContainerProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const userId = localStorage.getItem('id') || getAnonymousUserId();
 
  const [publisherName, setPublisherName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
    if (publisher?.publisherName) {
      setPublisherName(publisher.publisherName);
    }
  }, [publisher]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
   
    const isValid = validateFields();
   
    if (!isValid) {
      return;
    }

    if (id) {
      // Update existing publisher
      updatePublisher({
        id,
        publisherName: publisherName.trim(),
      });
    } else {
      // Create new publisher
      createPublisher({
        publisherName: publisherName.trim(),
        collectpubUsersId: userId
      });
    }
   
    setSuccessMessage('success');

    // Navigate back after successful submission
    setTimeout(() => {
      navigate(`/dashboard/${userId}`);
    }, 1500);
  };

  const showSuccess = !formErrors.publisherName && successMessage === 'success';

  return (
    <article id="cbCreate" className={styles.cbWrapper}>
      <h1>
        {id ? `Edit ${publisherName}` : 'Create Collection'}
        <figure
          className={styles.graphic}
          aria-label="Small burgundy rectangle graphic"
        />
      </h1>

      <article className={styles.cbList}>
        {showSuccess && <SuccessDisplay />}

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

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
                value="SUBMIT"
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default CreatePublisher;