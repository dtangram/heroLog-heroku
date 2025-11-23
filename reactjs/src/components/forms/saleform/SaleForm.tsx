import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import API from '../../../API';
import { SaleComic } from '../../../store/sale/actions';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import { useComicScanner } from '../../../hooks/useComicScanner';
import ScanCoverButton from '../../scanCoverButton/ScanCoverButton';
import styles from './styles.module.css';

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
}

interface FormState {
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  comicBookCover: string;
  type: 'regular' | 'variant' | '';
}

interface FormErrorsState {
  comicBookTitle?: string;
  comicIssue?: string;
  comicBookPublisher?: string;
  type?: string;
}

interface SaleFormProps {
  sale: SaleComic;
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

const VALID_IMAGE_EXTENSIONS = ['jpg', 'png', 'jpeg'];
const MAX_FILE_SIZE = 1e6; // 1MB
const MIN_TITLE_LENGTH = 2;
const REDIRECT_DELAY = 1500;

const SaleForm = ({ sale, fetchSale, createSale, updateSale }: SaleFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<RouteParams>();
  
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<FormErrorsState>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // Log route params for debugging
  useEffect(() => {
    console.log('📋 Sale Form Loaded');
    console.log('  - Edit Mode:', !!id);
    console.log('  - Sale ID:', id);
    console.log('  - User ID:', userId);
  }, [id, userId]);

  // Initial setup
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (id) {
      console.log('📖 Fetching sale:', id);
      fetchSale(id);
    }

    inputRef.current?.focus();
  }, [id, fetchSale]);

  // Populate form when editing
  useEffect(() => {
    if (sale && sale.id) {
      console.log('✏️ Populating form with sale data:', sale);
      setFormState({
        comicBookTitle: sale.comicBookTitle || '',
        comicIssue: sale.comicIssue || '',
        comicBookVolume: sale.comicBookVolume || '',
        comicBookYear: sale.comicBookYear || '',
        comicBookPublisher: sale.comicBookPublisher || '',
        comicBookCover: sale.comicBookCover || '',
        type: sale.type as 'regular' | 'variant'  || '',
      });
    }
  }, [sale]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name as keyof FormErrorsState]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'regular' | 'variant';
    setFormState(prev => ({ ...prev, type: value }));
    
    if (formErrors.type) {
      setFormErrors(prev => ({ ...prev, type: undefined }));
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const fileType = file.type;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileSize = file.size;

    // Validate file extension
    if (!VALID_IMAGE_EXTENSIONS.includes(fileExtension)) {
      alert(`Image must have one of these extensions: ${VALID_IMAGE_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      alert('Image size must be smaller than 1MB');
      return;
    }

    setIsUploading(true);
    const coverButton = document.getElementById('comicBookCover') as HTMLButtonElement;

    try {
      if (coverButton) coverButton.disabled = true;

      console.log('📤 Uploading image:', fileName);

      // Get signed URL from backend
      const response = await API.post('/s3/sign', { fileName, fileType });
      const { signedRequest, url } = response.data;

      // Upload to S3
      const uploadResponse = await fetch(signedRequest, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': fileType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('✅ Image uploaded successfully:', url);
      setFormState(prev => ({ ...prev, comicBookCover: url }));

      // Show the image preview
      const figure = document.querySelector('form > figure') as HTMLElement;
      if (figure) figure.style.display = 'inline-block';
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (coverButton) coverButton.disabled = false;
    }
  };

  const { scanCover, isScanning, scanError } = useComicScanner();

  const handleScanCover = useCallback(async () => {
    if (!formState.comicBookCover) {
      alert('Please upload a cover image first');
      return;
    }

    const result = await scanCover(formState.comicBookCover);
    
    if (result) {
      setFormState(prev => ({
        ...prev,
        comicBookTitle: result.comicBookTitle || prev.comicBookTitle,
        comicIssue: result.comicIssue || prev.comicIssue,
        comicBookVolume: result.comicBookVolume || prev.comicBookVolume,
        comicBookYear: result.comicBookYear || prev.comicBookYear,
        comicBookPublisher: result.comicBookPublisher || prev.comicBookPublisher,
        type: result.type || prev.type
      }));

      alert(`✅ Cover scanned! Confidence: ${Math.round(result.confidence * 100)}%\n\nPlease review the auto-filled information.`);
    }
  }, [formState.comicBookCover, scanCover]);

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    // Validate title
    if (!formState.comicBookTitle.trim() || formState.comicBookTitle.trim().length < MIN_TITLE_LENGTH) {
      errors.comicBookTitle = 'Comic book title is required';
    }

    // Validate issue
    if (!formState.comicIssue.trim()) {
      errors.comicIssue = 'Comic issue is required';
    }

    // Validate publisher
    if (!formState.comicBookPublisher.trim()) {
      errors.comicBookPublisher = 'Publisher is required';
    }

    // Validate type
    if (!formState.type) {
      errors.type = 'Please select regular or variant';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation errors:', errors);
      return false;
    }

    console.log('✅ Validation passed');
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      console.log('⏳ Already submitting...');
      return;
    }

    const isValid = validateFields();
    
    if (!isValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const saleData = {
        comicBookTitle: formState.comicBookTitle.trim(),
        comicIssue: formState.comicIssue.trim(),
        comicBookVolume: formState.comicBookVolume.trim(),
        comicBookYear: formState.comicBookYear.trim(),
        comicBookPublisher: formState.comicBookPublisher.trim(),
        comicBookCover: formState.comicBookCover,
        type: formState.type,
        userId,
        saleUsersId: userId,
      };

      console.log('📤 Submitting sale:', saleData);

      if (id) {
        console.log('✏️ Updating existing sale:', id);
        await updateSale({
          id,
          ...saleData,
        } as SaleComic);
      } else {
        console.log('➕ Creating new sale');
        await createSale(saleData as Omit<SaleComic, 'id'>);
      }
      
      setSuccessMessage('success');
      console.log('✅ Sale saved successfully');
      
      // Navigate back after success
      setTimeout(() => {
        const targetUrl = `/sale/${userId}`;
        console.log('🔄 Navigating to:', targetUrl);
        navigate(targetUrl);
      }, REDIRECT_DELAY);
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      setFormErrors({ 
        comicBookTitle: error instanceof Error ? error.message : 'Failed to save sale' 
      });
      setIsSubmitting(false);
    }
  };

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const showSuccess = Object.keys(formErrors).length === 0 && successMessage === 'success';
  const isEditMode = !!id;
  const pageTitle = isEditMode ? `Update ${formState.comicBookTitle || 'Sale Comic'}` : 'Add New Sale Comic';
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

            <figure style={{ display: formState.comicBookCover ? 'inline-block' : 'none' }}>
              <img 
                src={formState.comicBookCover} 
                alt={formState.comicBookTitle || 'Comic book cover'} 
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

                {formState.comicBookCover && (
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
                    value={formState.comicBookTitle}
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
                    value={formState.comicIssue}
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
                    value={formState.comicBookVolume}
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
                    value={formState.comicBookYear}
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
                    value={formState.comicBookPublisher}
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
                  checked={formState.type === 'regular'}
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
                  checked={formState.type === 'variant'}
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
                value={isSubmitting ? 'SUBMITTING...' : (isEditMode ? 'UPDATE' : 'CREATE')}
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