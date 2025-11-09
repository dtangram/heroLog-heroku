import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { ContainerProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import styles from './styles.module.css';

interface FormErrorsState {
  cbTitle: string;
}

const ComicBookListTitle = ({
  comicbooklist,
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
}: ContainerProps) => {
  const navigate = useNavigate();
  const { id, pubId, publisherName } = useParams<{ id?: string; pubId?: string; publisherName?: string }>();

  const userId = localStorage.getItem('id') || getAnonymousUserId();
  
  const [cbTitle, setCbTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({ cbTitle: '' });
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (id) {
      fetchComicBookTitle(id);
    }
    
    inputRef.current?.focus();
  }, [id, fetchComicBookTitle]);

  useEffect(() => {
    if (comicbooklist?.cbTitle) {
      setCbTitle(comicbooklist.cbTitle);
    }
  }, [comicbooklist]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setCbTitle(value);
  };

  const validateFields = (): boolean => {
    const isCbTitleValid = cbTitle.trim().length >= 1;
    
    setFormErrors({
      cbTitle: isCbTitleValid ? '' : 'Comic Book title is required',
    });
    
    return isCbTitleValid;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const isValid = validateFields();
    
    if (!isValid) {
      return;
    }

    if (id) {
      // Update existing comic book title
      updateComicBookTitle({
        id,
        cbTitle: cbTitle.trim(),
      });
    } else {
      // Create new comic book title
      if (!pubId) {
        console.error('Publisher ID is required for creating new title');
        setFormErrors({ cbTitle: 'Publisher ID is missing' });
        return;
      }
      
      createComicBookTitle({
        cbTitle: cbTitle.trim(),
        collectpubId: pubId,
        collectPubName: publisherName || '',
      });
    }
    
    setSuccessMessage('success');
    
    // Navigate back after successful submission
    setTimeout(() => {
      navigate(`/dashboard/${userId}/${pubId}/${publisherName}/comicbooklist`);
    }, 1500);
  };

  const showSuccess = !formErrors.cbTitle && successMessage === 'success';
  const pageTitle = id ? `Edit ${cbTitle}` : `Add Comic Book Title to ${publisherName} Collection`;

  return (
    <article id="cbComicBookListTitle" className={styles.cbWrapper}>
      <h1>
        {pageTitle}
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
              <label htmlFor="cbTitle">
                Comic Book Title
                <input
                  ref={inputRef}
                  id="cbTitle"
                  className={styles.inputBorder}
                  type="text"
                  name="cbTitle"
                  value={cbTitle}
                  onChange={handleInputChange}
                  required
                />
              </label>
            </fieldset>

            <article>
              <p>
                <Link
                  url={`/dashboard/${userId}/${pubId}/${publisherName}/comicbooklist`}
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

export default ComicBookListTitle;