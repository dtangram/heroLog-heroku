import React, { useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { WishlistComic } from '../../../store/wishlist/actions';
import { ScanResult } from '../../../hooks/useComicScanner';
import { useFormFields } from '../../../hooks/useFormFields';
import { useEditRecord } from '../../../hooks/useEditRecord';
import { useCoverUpload } from '../../../hooks/useCoverUpload';
import { useCoverScan } from '../../../hooks/useCoverScan';
import { useFormSubmit } from '../../../hooks/useFormSubmit';
import { getSubmitLabel, toCoverType, toFormText } from '../../../utils/forms';
import CoverPicker from '../../coverPicker/CoverPicker';
import styles from './styles.module.css';

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
}

interface FormState extends Record<string, string> {
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  comicBookCover: string;
  type: 'Regular' | 'Variant' | '';
}

interface FormErrorsState extends Partial<Record<string, string>> {
  comicBookTitle?: string;
  type?: string;
}

interface WishListFormProps {
  wishlistsById: Record<string, WishlistComic>;
  fetchWishList: (id: string) => void;
  createWishList: (payload: Omit<WishlistComic, 'id' | 'userId'>) => void;
  updateWishList: (payload: Partial<WishlistComic> & { id: string }) => void;
}

const INITIAL_FORM_STATE: FormState = {
  comicBookTitle: '',
  comicIssue: '',
  comicBookVolume: '',
  comicBookYear: '',
  comicBookPublisher: '',
  comicBookCover: '',
  type: '',
};

const MIN_TITLE_LENGTH = 1;
const MAX_YEAR_LENGTH = 4;

const WishListForm = ({ wishlistsById, fetchWishList, createWishList, updateWishList }: WishListFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<RouteParams>();
  const isEditMode = !!id;

  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || '';

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

  const { comicBookTitle, comicIssue, comicBookVolume, comicBookYear, comicBookPublisher, comicBookCover, type } = formState;

  // Load the comic being edited (the one whose id is in the URL) and fill the form
  useEditRecord<WishlistComic>({
    id,
    record: id ? wishlistsById[id] : undefined,
    fetchRecord: fetchWishList,
    inputRef,
    toFormState: wishlist =>
      setFormState({
        comicBookTitle: wishlist.comicBookTitle || '',
        comicIssue: toFormText(wishlist.comicIssue),
        comicBookVolume: toFormText(wishlist.comicBookVolume),
        comicBookYear: toFormText(wishlist.comicBookYear),
        comicBookPublisher: wishlist.comicBookPublisher || '',
        comicBookCover: wishlist.comicBookCover || '',
        type: toCoverType(wishlist.type),
      }),
  });

  const { handleScanCover, scanNewCover, isScanning, scanError } = useCoverScan(
    comicBookCover,
    useCallback(
      (result: ScanResult) =>
        setFormState(prev => ({
          ...prev,
          comicBookTitle: result.comicBookTitle || result.title || prev.comicBookTitle,
          comicIssue: result.comicIssue || prev.comicIssue,
          comicBookVolume: result.comicBookVolume || result.volume || prev.comicBookVolume,
          comicBookYear: result.comicBookYear || result.year || prev.comicBookYear,
          comicBookPublisher: result.comicBookPublisher || prev.comicBookPublisher,
          type: toCoverType(result.type) || prev.type,
        })),
      [setFormState]
    )
  );

  // The title as it is now, for deciding whether to scan a new cover straight away
  const titleRef = useRef(comicBookTitle);
  titleRef.current = comicBookTitle;

  const { isUploading, handleFileInputChange } = useCoverUpload(
    useCallback(url => {
      setField('comicBookCover', url);
      // Nothing typed yet: fill the form from the cover straight away.
      // Once there's a title, scanning waits for the button, so it never
      // overwrites what's been entered.
      if (!titleRef.current.trim()) scanNewCover(url);
    }, [setField, scanNewCover])
  );

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    if (!comicBookTitle.trim() || comicBookTitle.trim().length < MIN_TITLE_LENGTH) {
      errors.comicBookTitle = 'Comic book title is required';
    }
    if (!type) {
      errors.type = 'Please select regular or variant';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveWishList = () => {
    const wishlistData = {
      comicBookTitle: comicBookTitle.trim(),
      comicIssue: comicIssue.trim(),
      comicBookVolume: comicBookVolume.trim(),
      comicBookYear: comicBookYear.trim(),
      comicBookPublisher: comicBookPublisher.trim(),
      comicBookCover,
      type,
    };

    return id ? updateWishList({ id, ...wishlistData }) : createWishList(wishlistData);
  };

  const { isSubmitting, isSaved, handleSubmit } = useFormSubmit({
    validate: validateFields,
    save: saveWishList,
    onSaved: () => navigate(`/wishlist/${userId}`),
    onError: message => setFormErrors({ comicBookTitle: message }),
    failureMessage: 'Failed to save wishlist',
  });

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const showSuccess = Object.keys(formErrors).length === 0 && isSaved;
  const pageTitle = isEditMode ? `Edit ${comicBookTitle || 'WishList Comic'}` : 'Add Comic WishList';
  const cancelUrl = `/wishlist/${userId}`;

  return (
    <article id="cbComicForm" className={styles.cbWrapper}>
      <button className={styles.backLink} type="button" onClick={handleGoBack} disabled={isSubmitting}>
        Back
      </button>

      <h1>
        {pageTitle}
        <figure className={styles.graphic} aria-label="Small burgundy rectangle graphic" />
      </h1>

      <article className={styles.cbList}>
        {showSuccess && <SuccessDisplay />}

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            <p id="forbidContent" />

            <figure style={{ display: comicBookCover ? 'inline-block' : 'none' }}>
              <img 
                src={comicBookCover} 
                alt={comicBookTitle || 'Comic book cover'} 
              />
            </figure>

            <article>
              <fieldset>
                <CoverPicker
                  label="Comic Book Cover"
                  hasCover={Boolean(comicBookCover)}
                  isUploading={isUploading}
                  disabled={isSubmitting}
                  onFileChange={handleFileInputChange}
                  onScan={handleScanCover}
                  isScanning={isScanning}
                  scanError={scanError}
                />

                <label htmlFor="comicBookTitle">
                  Title *
                  <input
                    ref={inputRef}
                    id="comicBookTitle"
                    className={styles.inputBorder}
                    type="text"
                    name="comicBookTitle"
                    value={comicBookTitle}
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
                    value={comicIssue}
                    onChange={(e) => handleNumberChange(e, 'comicIssue')}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="comicBookVolume">
                  Volume
                  <input
                    id="comicBookVolume"
                    className={styles.inputBorder}
                    type="text"
                    name="comicBookVolume"
                    value={comicBookVolume}
                    onChange={(e) => handleNumberChange(e, 'comicBookVolume')}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="comicBookYear">
                  Year
                  <input
                    id="comicBookYear"
                    className={styles.inputBorder}
                    type="text"
                    maxLength={MAX_YEAR_LENGTH}
                    name="comicBookYear"
                    value={comicBookYear}
                    onChange={(e) => handleNumberChange(e, 'comicBookYear')}
                    disabled={isSubmitting}
                  />
                </label>

                <label htmlFor="comicBookPublisher">
                  Publisher
                  <input
                    id="comicBookPublisher"
                    className={styles.inputBorder}
                    type="text"
                    name="comicBookPublisher"
                    value={comicBookPublisher}
                    onChange={handleInputChange}
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
                  checked={type === 'Regular'}
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
                  checked={type === 'Variant'}
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

export default WishListForm;