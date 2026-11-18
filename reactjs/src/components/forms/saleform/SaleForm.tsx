import React, { useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import { SaleComic } from '../../../store/sale/actions';
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
}

interface FormState extends Record<string, string> {
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  comicBookCover: string;
  type: 'regular' | 'variant' | '';
}

interface FormErrorsState extends Partial<Record<string, string>> {
  comicBookTitle?: string;
  comicIssue?: string;
  comicBookPublisher?: string;
  type?: string;
}

interface SaleFormProps {
  salesById: Record<string, SaleComic>;
  createSale: (sale: Omit<SaleComic, 'id'>) => void;
  fetchSale: (id: string) => void;
  updateSale: (sale: SaleComic) => void;
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

const MIN_TITLE_LENGTH = 2;

const SaleForm = ({ salesById, fetchSale, createSale, updateSale }: SaleFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<RouteParams>();
  const isEditMode = !!id;

  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  const {
    formState,
    setFormState,
    formErrors,
    setFormErrors,
    setField,
    handleInputChange,
    handleTypeChange,
  } = useFormFields<FormState, FormErrorsState>(INITIAL_FORM_STATE);

  const { comicBookTitle, comicIssue, comicBookVolume, comicBookYear, comicBookPublisher, comicBookCover, type } = formState;

  // Load the sale being edited (the one whose id is in the URL) and fill the form
  useEditRecord<SaleComic>({
    id,
    record: id ? salesById[id] : undefined,
    fetchRecord: fetchSale,
    inputRef,
    toFormState: sale =>
      setFormState({
        comicBookTitle: sale.comicBookTitle || '',
        comicIssue: toFormText(sale.comicIssue),
        comicBookVolume: toFormText(sale.comicBookVolume),
        comicBookYear: toFormText(sale.comicBookYear),
        comicBookPublisher: sale.comicBookPublisher || '',
        comicBookCover: sale.comicBookCover || '',
        type: (sale.type as FormState['type']) || '',
      }),
  });

  const { isUploading, handleFileInputChange } = useCoverUpload(
    useCallback(url => setField('comicBookCover', url), [setField])
  );

  const { handleScanCover, isScanning, scanError } = useCoverScan(
    comicBookCover,
    useCallback(
      (result: ScanResult) =>
        setFormState(prev => ({
          ...prev,
          comicBookTitle: result.comicBookTitle || prev.comicBookTitle,
          comicIssue: result.comicIssue || prev.comicIssue,
          comicBookVolume: result.comicBookVolume || prev.comicBookVolume,
          comicBookYear: result.comicBookYear || prev.comicBookYear,
          comicBookPublisher: result.comicBookPublisher || prev.comicBookPublisher,
          type: result.type || prev.type,
        })),
      [setFormState]
    )
  );

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    if (!comicBookTitle.trim() || comicBookTitle.trim().length < MIN_TITLE_LENGTH) {
      errors.comicBookTitle = 'Comic book title is required';
    }
    if (!comicIssue.trim()) {
      errors.comicIssue = 'Comic issue is required';
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

  const saveSale = () => {
    const saleData = {
      comicBookTitle: comicBookTitle.trim(),
      comicIssue: comicIssue.trim(),
      comicBookVolume: comicBookVolume.trim(),
      comicBookYear: comicBookYear.trim(),
      comicBookPublisher: comicBookPublisher.trim(),
      comicBookCover,
      type,
      userId,
      saleUsersId: userId,
    };

    return id
      ? updateSale({ id, ...saleData } as SaleComic)
      : createSale(saleData as Omit<SaleComic, 'id'>);
  };

  const { isSubmitting, isSaved, handleSubmit } = useFormSubmit({
    validate: validateFields,
    save: saveSale,
    onSaved: () => navigate(`/sale/${userId}`),
    onError: message => setFormErrors({ comicBookTitle: message }),
    failureMessage: 'Failed to save sale',
  });

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const showSuccess = Object.keys(formErrors).length === 0 && isSaved;
  const pageTitle = isEditMode ? `Edit ${comicBookTitle || 'Sale Comic'}` : 'Add New Sale Comic';
  const cancelUrl = `/sale/${userId}`;

  return (
    <article id="saleForm" className={styles.cbWrapper}>
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
                <label htmlFor="comicBookCover">
                  {isEditMode ? 'Change Comic Book Cover' : 'Upload Comic Book Cover'}
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

                {comicBookCover && (
                  <ScanCoverButton
                    onScan={handleScanCover}
                    isScanning={isScanning}
                    disabled={isSubmitting || isUploading}
                    error={scanError}
                  />
                )}

                <label htmlFor="comicBookTitle">
                  Comic Book Title *
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
                  Comic Issue *
                  <input
                    id="comicIssue"
                    className={styles.inputBorder}
                    type="text"
                    name="comicIssue"
                    value={comicIssue}
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </label>
              </fieldset>

              <fieldset>
                <label htmlFor="comicBookYear">
                  Year
                  <input
                    id="comicBookYear"
                    className={styles.inputBorder}
                    type="text"
                    name="comicBookYear"
                    value={comicBookYear}
                    onChange={handleInputChange}
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
                    value={comicBookPublisher}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </label>
              </fieldset>
            </article>

            <article>
              <label className={styles.labelRadio} htmlFor="regular">
                <input
                  id="regular"
                  type="radio"
                  value="regular"
                  checked={type === 'regular'}
                  onChange={handleTypeChange}
                  disabled={isSubmitting}
                />
                Regular
              </label>

              <label className={styles.labelRadio} htmlFor="variant">
                <input
                  id="variant"
                  type="radio"
                  value="variant"
                  checked={type === 'variant'}
                  onChange={handleTypeChange}
                  disabled={isSubmitting}
                />
                Variant
              </label>
            </article>

            <article>
              <p>
                <Link url={cancelUrl} title="CANCEL" />
              </p>

              <input
                id="submitSale"
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

export default SaleForm;