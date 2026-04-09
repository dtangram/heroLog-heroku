import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import API from '../../../API';
import { WishlistComic } from '../../../store/wishlist/actions';
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
  type?: string;
}

interface WishListFormProps {
  wishlist: WishlistComic;
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

const VALID_IMAGE_EXTENSIONS = ['jpg', 'png', 'jpeg'];
const MAX_FILE_SIZE = 1e6; // 1MB
const MIN_TITLE_LENGTH = 1;
const MAX_YEAR_LENGTH = 4;
const REDIRECT_DELAY = 1500;

const WishListForm = ({ wishlist, fetchWishList, createWishList, updateWishList }: WishListFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<RouteParams>();
  
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<FormErrorsState>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || '';

  // ✅ Destructure formState properties
  const { comicBookTitle, comicIssue, comicBookVolume, comicBookYear, comicBookPublisher, comicBookCover, type } = formState;

  // Log route params for debugging
  useEffect(() => {
    console.log('📋 WishList Form Loaded');
    console.log('  - Edit Mode:', !!id);
    console.log('  - WishList ID:', id);
    console.log('  - User ID:', userId);
  }, [id, userId]);

  // Initial setup
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (id) {
      console.log('📖 Fetching wishlist:', id);
      fetchWishList(id);
    }

    inputRef.current?.focus();
  }, [id, fetchWishList]);

  // Populate form when editing
  useEffect(() => {
    if (wishlist && wishlist.id) {
      console.log('✏️ Populating form with wishlist data:', wishlist);
      setFormState({
        comicBookTitle: wishlist.comicBookTitle || '',
        comicIssue: wishlist.comicIssue || '',
        comicBookVolume: wishlist.comicBookVolume || '',
        comicBookYear: wishlist.comicBookYear || '',
        comicBookPublisher: wishlist.comicBookPublisher || '',
        comicBookCover: wishlist.comicBookCover || '',
        type: wishlist.type as 'regular' | 'variant' || '',
      });
    }
  }, [wishlist]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name as keyof FormErrorsState]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNumberChange = (
    event: ChangeEvent<HTMLInputElement>,
    fieldName: keyof FormState
  ) => {
    const { value } = event.target;
    const numericRegex = /^[0-9]*$/;
    
    if (value === '' || numericRegex.test(value)) {
      setFormState(prev => ({ ...prev, [fieldName]: value }));
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
    if (!comicBookCover) {
      alert('Please upload a cover image first');
      return;
    }

    const result = await scanCover(comicBookCover);
    
    if (result) {
      setFormState(prev => ({
        ...prev,
        comicBookTitle: result.comicBookTitle || result.title || prev.comicBookTitle,
        comicIssue: result.comicIssue || prev.comicIssue,
        comicBookVolume: result.comicBookVolume || result.volume || prev.comicBookVolume,
        comicBookYear: result.comicBookYear || result.year || prev.comicBookYear,
        comicBookPublisher: result.comicBookPublisher || prev.comicBookPublisher,
        type: result.type || prev.type
      }));

      alert(`✅ Cover scanned! Confidence: ${Math.round(result.confidence * 100)}%\n\nPlease review the auto-filled information.`);
    }
  }, [comicBookCover, scanCover]);

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    // Validate title
    if (!comicBookTitle.trim() || comicBookTitle.trim().length < MIN_TITLE_LENGTH) {
      errors.comicBookTitle = 'Comic book title is required';
    }

    // Validate type
    if (!type) {
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
      const wishlistData = {
        comicBookTitle: comicBookTitle.trim(),
        comicIssue: comicIssue.trim(),
        comicBookVolume: comicBookVolume.trim(),
        comicBookYear: comicBookYear.trim(),
        comicBookPublisher: comicBookPublisher.trim(),
        comicBookCover: comicBookCover,
        type: type,
      };

      console.log('📤 Submitting wishlist:', wishlistData);

      if (id) {
        console.log('✏️ Updating existing wishlist:', id);
        await updateWishList({
          id,
          ...wishlistData,
        });
      } else {
        console.log('➕ Creating new wishlist');
        await createWishList(wishlistData);
      }
      
      setSuccessMessage('success');
      console.log('✅ WishList saved successfully');
      
      // Navigate back after success
      setTimeout(() => {
        const targetUrl = `/wishlist/${userId}`;
        console.log('🔄 Navigating to:', targetUrl);
        navigate(targetUrl);
      }, REDIRECT_DELAY);
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      setFormErrors({ 
        comicBookTitle: error instanceof Error ? error.message : 'Failed to save wishlist' 
      });
      setIsSubmitting(false);
    }
  };

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const showSuccess = Object.keys(formErrors).length === 0 && successMessage === 'success';
  const isEditMode = !!id;
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

                {comicBookCover && (
                  <ScanCoverButton
                    onScan={handleScanCover}
                    isScanning={isScanning}
                    disabled={isSubmitting || isUploading}
                    error={scanError}
                  />
                )}

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
                  value="regular"
                  checked={type === 'regular'}
                  onChange={handleTypeChange}
                  disabled={isSubmitting}
                />
                Regular Cover
              </label>

              <label className={styles.labelRadio} htmlFor="variantcover">
                <input
                  id="variantcover"
                  type="radio"
                  value="variant"
                  checked={type === 'variant'}
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
                value={isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
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