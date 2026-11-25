import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { ContainerProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import { useFormFields } from '../../../hooks/useFormFields';
import { useEditRecord } from '../../../hooks/useEditRecord';
import { useFormSubmit } from '../../../hooks/useFormSubmit';
import { getSubmitLabel } from '../../../utils/forms';
import styles from './styles.module.css';
import Breadcrumbs from '../../breadcrumbs';
import { usePageTitle } from '../../documentTitle';

interface FormState extends Record<string, string> {
  cbTitle: string;
}

interface FormErrorsState extends Partial<Record<string, string>> {
  cbTitle?: string;
}

type TitleRecord = ContainerProps['titlesById'][string];

const INITIAL_FORM_STATE: FormState = { cbTitle: '' };

const ComicBookListTitle = ({
  titlesById,
  createComicBookTitle,
  fetchComicBookTitle,
  updateComicBookTitle,
}: ContainerProps) => {
  const navigate = useNavigate();
  const { id, pubId, publisherName } = useParams<{ id?: string; pubId?: string; publisherName?: string }>();
  const isEditMode = !!id;
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || getAnonymousUserId();
  const listUrl = `/dashboard/${userId}/${pubId}/${publisherName}/comicbooklist`;

  const { formState, setFormState, formErrors, setFormErrors, handleInputChange } =
    useFormFields<FormState, FormErrorsState>(INITIAL_FORM_STATE);
  const { cbTitle } = formState;

  // Load the title being edited (the one whose id is in the URL) and fill the form
  useEditRecord<TitleRecord>({
    id,
    record: id ? titlesById[id] : undefined,
    fetchRecord: fetchComicBookTitle,
    inputRef,
    toFormState: title => setFormState({ cbTitle: title.cbTitle || '' }),
  });

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    if (!cbTitle.trim()) {
      errors.cbTitle = 'Comic Book title is required';
    } else if (!id && !pubId) {
      errors.cbTitle = 'Publisher ID is missing';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveTitle = () =>
    id
      ? updateComicBookTitle({ id, cbTitle: cbTitle.trim() })
      : createComicBookTitle({
          cbTitle: cbTitle.trim(),
          collectpubId: pubId!,
          collectPubName: publisherName || '',
        });

  const { isSubmitting, isSaved, handleSubmit } = useFormSubmit({
    validate: validateFields,
    save: saveTitle,
    onSaved: () => navigate(listUrl),
    onError: message => setFormErrors({ cbTitle: message }),
    failureMessage: 'Failed to save comic book title',
  });

  const showSuccess = !formErrors.cbTitle && isSaved;
  // The same words for the heading and the browser tab
  const pageTitle = isEditMode ? `Edit ${cbTitle || 'Title'}` : `Add a Title to ${publisherName}`;
  usePageTitle(pageTitle);

  return (
    <article id="cbComicBookListTitle" className={styles.cbWrapper}>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: `/dashboard/${userId}` },
          { label: publisherName || 'Publisher', to: listUrl },
          { label: pageTitle },
        ]}
      />
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
                  disabled={isSubmitting}
                  required
                />
              </label>
            </fieldset>

            <article>
              <p>
                <Link url={listUrl} title="CANCEL" />
              </p>
              <input
                id="submitQ1"
                className={styles.submit}
                type="submit"
                value={getSubmitLabel(isSubmitting, isEditMode)}
                disabled={isSubmitting}
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default ComicBookListTitle;