import React, { ChangeEvent, useCallback, useRef } from 'react';
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
import { getSubmitLabel, toCoverType, toFormText } from '../../../utils/forms';
import { validatePrice } from '../../../utils/sale';
import { PRICE_INPUT, SALE_CONDITIONS } from '../../../constants/sale';
import CoverPicker from '../../coverPicker/CoverPicker';
import styles from './styles.module.css';
import Breadcrumbs from '../../breadcrumbs';
import CoverTypeField from '../coverType';
import { usePageTitle } from '../../documentTitle';
import { SALE_SCAN_FIELDS } from '../../../constants/covers';
import { MIN_SALE_TITLE_LENGTH } from '../../../constants/forms';
import { SALE_LIST_TITLE } from '../../../constants/pageTitles';
import { usePublisherNames } from '../../../hooks/usePublisherNames';
import { matchPublisherName } from '../../../utils/collection';


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
  /** Dollars as typed, e.g. "12.50" */
  price: string;
  comicCondition: string;
}

interface FormErrorsState extends Partial<Record<string, string>> {
  comicBookTitle?: string;
  comicIssue?: string;
  comicBookPublisher?: string;
  type?: string;
  price?: string;
  comicCondition?: string;
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
  price: '',
  comicCondition: '',
};


const SaleForm = ({ salesById, fetchSale, createSale, updateSale }: SaleFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<RouteParams>();
  const isEditMode = !!id;

  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || getAnonymousUserId();
  const publisherNames = usePublisherNames();

  const {
    formState,
    setFormState,
    formErrors,
    setFormErrors,
    setField,
    handleInputChange,
    handleTypeChange,
  } = useFormFields<FormState, FormErrorsState>(INITIAL_FORM_STATE);

  const {
    comicBookTitle,
    comicIssue,
    comicBookVolume,
    comicBookYear,
    comicBookPublisher,
    comicBookCover,
    type,
    price,
    comicCondition,
  } = formState;

  // Price: only dollars and up to two cents digits can be typed, e.g. 12.50
  const handlePriceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.replace(/^\$/, '');
      if (PRICE_INPUT.test(value)) {
        setField('price', value);
      }
    },
    [setField]
  );

  const handleConditionChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => setField('comicCondition', event.target.value),
    [setField]
  );

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
        type: toCoverType(sale.type),
        price: toFormText(sale.price),
        comicCondition: sale.comicCondition || '',
      }),
  });

  const { handleScanCover, scanNewCover, isScanning, scanError } = useCoverScan(
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
          type: toCoverType(result.type) || prev.type,
        })),
      [setFormState]
    ),
    SALE_SCAN_FIELDS
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

    if (!comicBookTitle.trim() || comicBookTitle.trim().length < MIN_SALE_TITLE_LENGTH) {
      errors.comicBookTitle = 'Comic book title is required';
    }
    if (!comicIssue.trim()) {
      errors.comicIssue = 'Issue number is required';
    }
    if (!comicBookPublisher.trim()) {
      errors.comicBookPublisher = 'Publisher is required';
    }
    if (!type) {
      errors.type = 'Please select regular or variant';
    }
    const priceError = validatePrice(price);
    if (priceError) {
      errors.price = priceError;
    }
    if (!comicCondition) {
      errors.comicCondition = 'Please choose a condition';
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
      // Your collection's spelling: "DC" is saved as "DC Comics" if that's what you use
      comicBookPublisher: matchPublisherName(comicBookPublisher, publisherNames),
      comicBookCover,
      type,
      price: price.trim(),
      comicCondition,
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

  const showSuccess = Object.keys(formErrors).length === 0 && isSaved;
  // The same words for the heading and the browser tab
  const pageTitle = isEditMode
    ? `Edit ${[comicBookTitle || 'Listing', comicIssue && `#${comicIssue}`].filter(Boolean).join(' ')}`
    : 'Sell a Comic';
  usePageTitle(pageTitle);
  const cancelUrl = `/sale/${userId}`;

  return (
    <article id="saleForm" className={styles.cbWrapper}>
      <Breadcrumbs items={[{ label: SALE_LIST_TITLE, to: cancelUrl }, { label: pageTitle }]} />

      <h1>
        {pageTitle}
        <figure className={styles.graphic} aria-hidden="true" />
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

            <article className={styles.fields}>
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

                <label htmlFor="price">
                  Price in US dollars *
                  <input
                    id="price"
                    className={styles.inputBorder}
                    type="text"
                    inputMode="decimal"
                    name="price"
                    placeholder="12.50"
                    autoComplete="off"
                    value={price}
                    onChange={handlePriceChange}
                    disabled={isSubmitting}
                    required
                  />
                </label>

                <label htmlFor="comicCondition">
                  Condition *
                  <select
                    id="comicCondition"
                    className={styles.inputBorder}
                    name="comicCondition"
                    value={comicCondition}
                    onChange={handleConditionChange}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">Choose a condition</option>
                    {SALE_CONDITIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
            </article>

            <CoverTypeField value={type} onChange={handleTypeChange} disabled={isSubmitting} />

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