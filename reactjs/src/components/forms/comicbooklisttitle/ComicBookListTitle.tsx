import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import { ContainerProps } from './container';

interface FormErrorsState {
  cbTitle: string;
}

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
  pubId?: string;
}

const ComicBookListTitle = ({
  comicbooklist,
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
}: ContainerProps) => {
  const navigate = useNavigate();
  const { id, pubId } = useParams<RouteParams>();
  
  const [cbTitle, setCbTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({ cbTitle: '' });
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
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

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setCbTitle(value);
    
    // Clear error when user starts typing
    if (formErrors.cbTitle) {
      setFormErrors({ cbTitle: '' });
    }
  }, [formErrors.cbTitle]);

  const validateFields = useCallback((): boolean => {
    const trimmedTitle = cbTitle.trim();
    const isValid = trimmedTitle.length >= 1;
    
    setFormErrors({
      cbTitle: isValid ? '' : 'Comic Book title is required',
    });
    
    return isValid;
  }, [cbTitle]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateFields()) return;
    
    const trimmedTitle = cbTitle.trim();
    
    try {
      if (id) {
        await updateComicBookTitle({ id, cbTitle: trimmedTitle });
      } else {
        if (!pubId) {
          console.error('Publisher ID is required for creating new title');
          return;
        }
        await createComicBookTitle({ cbTitle: trimmedTitle, collpubId: pubId });
      }
      
      setSuccessMessage('success');
    } catch (error) {
      console.error('Save error:', error);
      setFormErrors({ cbTitle: 'An error occurred while saving. Please try again.' });
    }
  }, [id, pubId, cbTitle, validateFields, createComicBookTitle, updateComicBookTitle]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const showSuccess = !formErrors.cbTitle && successMessage === 'success';
  const pageTitle = id ? `Edit ${cbTitle}` : 'Add Comic Book Title to Collection';

  return (
    <article id="cbComicBookListTitle" className={styles.cbWrapper}>
      <button
        className={styles.backLink}
        type="button"
        onClick={handleBack}
        aria-label="Go back to previous page"
      >
        Back
      </button>

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
                  aria-required="true"
                  aria-invalid={!!formErrors.cbTitle}
                />
              </label>
            </fieldset>

            <article>
              <p>
                <Link
                  url={`/dashboard/${pubId}/comicbooklist`}
                  title="CANCEL"
                />
              </p>
              <input
                id="submitQ1"
                className={styles.submit}
                type="submit"
                value="SUBMIT"
                disabled={!cbTitle.trim()}
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default ComicBookListTitle;