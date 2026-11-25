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
import { useCoverScan, ScanField } from '../../../hooks/useCoverScan';
import { useFormSubmit } from '../../../hooks/useFormSubmit';
import { getSubmitLabel, toCoverType, toFormText } from '../../../utils/forms';
import CoverPicker from '../../coverPicker/CoverPicker';
import CoverCredit from '../../coverCredit/CoverCredit';
import styles from './styles.module.css';
import Breadcrumbs from '../../breadcrumbs';
import CoverTypeField from '../coverType';
import { usePageTitle } from '../../documentTitle';
import { usePublisherNames } from '../../../hooks/usePublisherNames';
import { matchPublisherName } from '../../../utils/collection';

const LIST_LABEL = 'Your Wish List';

/** The fields a cover scan can fill on this form, so the scan message can name any it couldn't read */
const WISH_SCAN_FIELDS: ScanField[] = ['title', 'issue', 'volume', 'year', 'publisher'];

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
  const publisherNames = usePublisherNames();

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
    ),
    WISH_SCAN_FIELDS
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
    // The same required fields as the Sale form
    if (!comicIssue.trim()) {
      errors.comicIssue = 'Issue number is required';
    }
    if (!comicBookPublisher.trim()) {
      errors.comicBookPublisher = 'Publisher is required';
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
      // Your collection's spelling: "DC" is saved as "DC Comics" if that's what you use
      comicBookPublisher: matchPublisherName(comicBookPublisher, publisherNames),
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

  const showSuccess = Object.keys(formErrors).length === 0 && isSaved;
  // The same words for the heading and the browser tab
  const pageTitle = isEditMode
    ? `Edit ${[comicBookTitle || 'Wish List Comic', comicIssue && `#${comicIssue}`].filter(Boolean).join(' ')}`
    : 'Add to Wish List';
  usePageTitle(pageTitle);
  const cancelUrl = `/wishlist/${userId}`;

  return (
    <article id="cbComicForm" className={styles.cbWrapper}>
      <Breadcrumbs items={[{ label: LIST_LABEL, to: cancelUrl }, { label: pageTitle }]} />

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
            <CoverCredit covers={[comicBookCover]} />

            <article>
              <fieldset>
                <CoverPicker
                  label="Cover"
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
                  Issue *
                  <input
                    id="comicIssue"
                    className={styles.inputBorder}
                    type="text"
                    inputMode="numeric"
                    name="comicIssue"
                    value={comicIssue}
                    onChange={(e) => handleNumberChange(e, 'comicIssue')}
                    disabled={isSubmitting}
                    required
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
                  Publisher *
                  <input
                    id="comicBookPublisher"
                    className={styles.inputBorder}
                    type="text"
                    name="comicBookPublisher"
                    list="publisherSuggestions"
                    autoComplete="off"
                    value={comicBookPublisher}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                  {/* Your own publishers, so "DC Comics" is spelled the same everywhere */}
                  <datalist id="publisherSuggestions">
                    {publisherNames.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>
              </fieldset>
            </article>

            <CoverTypeField value={type} onChange={handleTypeChange} disabled={isSubmitting} />

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