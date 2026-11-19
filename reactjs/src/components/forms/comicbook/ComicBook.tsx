import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { ContainerProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import { ScanResult } from '../../../hooks/useComicScanner';
import { useFormFields } from '../../../hooks/useFormFields';
import { useEditRecord } from '../../../hooks/useEditRecord';
import { useCoverUpload } from '../../../hooks/useCoverUpload';
import { useCoverScan } from '../../../hooks/useCoverScan';
import { useFormSubmit } from '../../../hooks/useFormSubmit';
import { getSubmitLabel, toFormText } from '../../../utils/forms';
import ScanCoverButton from '../../scanCoverButton/ScanCoverButton';
import styles from './styles.module.css';

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
  coboTitleId?: string;
  cbTitle?: string;
  pubId?: string;
  publisherName?: string;
}

interface FormState extends Record<string, string> {
  title: string;
  comicIssue: string;
  author: string;
  penciler: string;
  coverartist: string;
  inker: string;
  volume: string;
  year: string;
  comicBookCover: string;
  type: 'Regular' | 'Variant' | '';
}

interface FormErrorsState extends Partial<Record<string, string>> {
  title?: string;
  type?: string;
  titleID?: string;
  year?: string;
}

type ComicBookRecord = ContainerProps['comicBooksById'][string];

const INITIAL_FORM_STATE: FormState = {
  title: '',
  comicIssue: '',
  author: '',
  penciler: '',
  coverartist: '',
  inker: '',
  volume: '',
  year: '',
  comicBookCover: '',
  type: '',
};

const MAX_YEAR_LENGTH = 4;
// Same range the API accepts (isValidYear in api/app/controllers/comicbook.ts)
const MIN_YEAR = 1900;
const getMaxYear = () => new Date().getFullYear() + 1;

const ComicBookComponent = ({
  comicBooksById,
  createComicBook,
  fetchComicBook,
  fetchComicBooks,
  updateComicBook,
}: ContainerProps) => {
  const navigate = useNavigate();
  const { id, coboTitleId, cbTitle, pubId, publisherName } = useParams<RouteParams>();
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || getAnonymousUserId();
  const listUrl = `/dashboard/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbooklistissues`;

  const {
    formState,
    setFormState,
    formErrors,
    setFormErrors,
    setField,
    handleInputChange,
    handleNumberChange,
    handleTypeChange,
  } = useFormFields<FormState, FormErrorsState>(INITIAL_FORM_STATE);

  useEffect(() => {
    if (!coboTitleId && !id) {
      console.warn('⚠️ Warning: coboTitleId is missing. Form may fail on submit.');
    }
  }, [id, coboTitleId]);

  // Load the comic being edited (the one whose id is in the URL) and fill the form
  useEditRecord<ComicBookRecord>({
    id,
    record: id ? comicBooksById[id] : undefined,
    fetchRecord: fetchComicBook,
    inputRef,
    toFormState: comicbook =>
      setFormState({
        title: comicbook.title || '',
        comicIssue: toFormText(comicbook.comicIssue),
        author: comicbook.author || '',
        penciler: comicbook.penciler || '',
        coverartist: comicbook.coverartist || '',
        inker: comicbook.inker || '',
        volume: toFormText(comicbook.volume),
        year: toFormText(comicbook.year),
        comicBookCover: comicbook.comicBookCover || '',
        type: comicbook.type || '',
      }),
  });

  const { isUploading, handleFileInputChange } = useCoverUpload(
    useCallback(url => setField('comicBookCover', url), [setField])
  );

  const { handleScanCover, isScanning, scanError } = useCoverScan(
    formState.comicBookCover,
    useCallback(
      (result: ScanResult) =>
        setFormState(prev => ({
          ...prev,
          title: result.title || result.comicBookTitle || prev.title,
          comicIssue: result.comicIssue || prev.comicIssue,
          volume: result.volume || result.comicBookVolume || prev.volume,
          year: result.year || result.comicBookYear || prev.year,
          author: result.author || prev.author,
          penciler: result.penciler || prev.penciler,
          inker: result.inker || prev.inker,
          coverartist: result.coverartist || prev.coverartist,
          type: result.type || prev.type,
        })),
      [setFormState]
    )
  );

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    if (!formState.title.trim()) {
      errors.title = 'Comic book title is required';
    }

    if (!formState.type) {
      errors.type = 'Please select regular or variant';
    }

    // Year is optional, but must be in the range the API accepts
    if (formState.year.trim() !== '') {
      const year = Number(formState.year);
      const maxYear = getMaxYear();
      if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear) {
        errors.year = `Year must be between ${MIN_YEAR} and ${maxYear}`;
      }
    }

    // A new comic needs the title it belongs to
    if (!id && !coboTitleId) {
      errors.titleID = 'Comic book title ID is missing';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveComicBook = () => {
    const comicBookData = {
      ...formState,
      title: formState.title.trim(),
      author: formState.author.trim(),
      penciler: formState.penciler.trim(),
      coverartist: formState.coverartist.trim(),
      inker: formState.inker.trim(),
      titleID: coboTitleId!,
      comicBookTitle: cbTitle || '',
    };
    return id ? updateComicBook({ id, ...comicBookData }) : createComicBook(comicBookData);
  };

  const { isSubmitting, isSaved, handleSubmit } = useFormSubmit({
    validate: validateFields,
    save: saveComicBook,
    onSaved: () => {
      if (coboTitleId) fetchComicBooks(coboTitleId);
      navigate(listUrl, { state: { refetch: true, timestamp: Date.now() } });
    },
    onError: message => setFormErrors({ titleID: message }),
    failureMessage: 'Failed to save comic book',
  });

  const showSuccess = !formErrors.title && !formErrors.type && isSaved;
  const isEditMode = !!id;
  const pageTitle = isEditMode ? `Edit ${formState.title || 'Comic Book'}` : 'Add Comic Book';
  const cancelUrl = listUrl;

  return (
    <article id="cbComicForm" className={styles.cbWrapper}>
      <h1>
        {pageTitle}
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.cbList}>
        {showSuccess && <SuccessDisplay />}

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            <figure style={{ display: formState.comicBookCover ? 'inline-block' : 'none' }}>
              <img 
                src={formState.comicBookCover} 
                alt={formState.title || 'Comic book cover'} 
              />
            </figure>

            <article>
              <fieldset>
                <label htmlFor="comicBookCover">
                  Comic Book Cover
                  <input
                    id="comicBookCover"
                    className={styles.inputBorder}
                    type="file"
                    name="comicBookCover"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileInputChange}
                    disabled={isUploading || isSubmitting}
                  />
                  {isUploading && <span> Uploading...</span>}
                </label>

                {formState.comicBookCover && (
                  <ScanCoverButton
                    onScan={handleScanCover}
                    isScanning={isScanning}
                    disabled={isSubmitting || isUploading}
                    error={scanError}
                  />
                )}

                <label htmlFor="title">
                  Title *
                  <input
                    ref={inputRef}
                    id="title"
                    className={styles.inputBorder}
                    type="text"
                    name="title"
                    value={formState.title}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </label>

                <label htmlFor="comicIssue">
                  Issue
                  <input
                    id="comicIssue"
                    className={styles.inputBorder}
                    type="text"
                    name="comicIssue"
                    value={formState.comicIssue}
                    onChange={(e) => handleNumberChange(e, 'comicIssue')}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="author">
                  Author/Writer
                  <input
                    id="author"
                    className={styles.inputBorder}
                    type="text"
                    name="author"
                    value={formState.author}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="penciler">
                  Penciler
                  <input
                    id="penciler"
                    className={styles.inputBorder}
                    type="text"
                    name="penciler"
                    value={formState.penciler}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="coverartist">
                  Cover Artist
                  <input
                    id="coverartist"
                    className={styles.inputBorder}
                    type="text"
                    name="coverartist"
                    value={formState.coverartist}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </label>
              </fieldset>

              <fieldset>
                <label htmlFor="inker">
                  Inker
                  <input
                    id="inker"
                    className={styles.inputBorder}
                    type="text"
                    name="inker"
                    value={formState.inker}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="volume">
                  Volume
                  <input
                    id="volume"
                    className={styles.inputBorder}
                    type="text"
                    name="volume"
                    value={formState.volume}
                    onChange={(e) => handleNumberChange(e, 'volume')}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="year">
                  Year
                  <input
                    id="year"
                    className={styles.inputBorder}
                    type="text"
                    maxLength={MAX_YEAR_LENGTH}
                    name="year"
                    value={formState.year}
                    onChange={(e) => handleNumberChange(e, 'year')}
                    aria-invalid={!!formErrors.year}
                    disabled={isSubmitting}
                  />
                </label>
              </fieldset>
            </article>

            <article>
              <label className={styles.labelRadio} htmlFor="regularcover">
                <input
                  id="regularcover"
                  type="radio"
                  value="Regular"
                  checked={formState.type === 'Regular'}
                  onChange={handleTypeChange}
                  disabled={isSubmitting}
                />
                Regular Cover
              </label>

              <label className={styles.labelRadio} htmlFor="variantcover">
                <input
                  id="variantcover"
                  type="radio"
                  value="Variant"
                  checked={formState.type === 'Variant'}
                  onChange={handleTypeChange}
                  disabled={isSubmitting}
                />
                Variant Cover
              </label>
            </article>

            <article>
              <p>
                <Link url={cancelUrl} title="CANCEL" />
              </p>

              <input
                id="submitQ1"
                className={styles.submit}
                type="submit"
                value={getSubmitLabel(isSubmitting, isEditMode)}
                disabled={isSubmitting || isUploading}
              />
            </article>
          </form>
        </section>
      </article>
    </article>
  );
};

export default ComicBookComponent;