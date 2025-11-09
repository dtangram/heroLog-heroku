import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import API from '../../../API';
import { ContainerProps } from './container';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import styles from './styles.module.css';
import { useComicScanner } from '../../../hooks/useComicScanner';
import ScanCoverButton from '../../scanCoverButton/ScanCoverButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RouteParams extends Record<string, string | undefined> {
  id?: string;
  coboTitleId?: string;
  cbTitle?: string;
  pubId?: string;
  publisherName?: string;
}

interface FormState {
  title: string;
  comicIssue: string;
  author: string;
  penciler: string;
  coverartist: string;
  inker: string;
  volume: string;
  year: string;
  comicBookCover: string;
  type: 'regular' | 'variant' | '';
}

interface FormErrorsState {
  title?: string;
  type?: string;
  titleID?: string;
}

interface ComicBookFormData extends FormState {
  titleID: string;
  comicBookTitle: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

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

const VALID_IMAGE_EXTENSIONS = ['jpg', 'png', 'jpeg'];
const MAX_FILE_SIZE = 1e6; // 1MB
const MAX_YEAR_LENGTH = 4;
const REDIRECT_DELAY = 1500;

// ============================================================================
// COMPONENT
// ============================================================================

const ComicBookComponent = ({
  comicbook,
  createComicBook,
  fetchComicBook,
  fetchComicBooks,
  updateComicBook,
}: ContainerProps) => {
  const navigate = useNavigate();
  const { id, coboTitleId, cbTitle, pubId, publisherName } = useParams<RouteParams>();
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<FormErrorsState>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('id') || getAnonymousUserId();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Log route params for debugging
  useEffect(() => {
    console.log('📋 Comic Book Form Loaded');
    console.log('  - Edit Mode:', !!id);
    console.log('  - Comic ID:', id);
    console.log('  - Title ID:', coboTitleId);
    console.log('  - Title Name:', cbTitle);
    console.log('  - Publisher ID:', pubId);
    console.log('  - Publisher Name:', publisherName);
    
    if (!coboTitleId && !id) {
      console.warn('⚠️ Warning: coboTitleId is missing. Form may fail on submit.');
    }
  }, [id, coboTitleId, cbTitle, pubId, publisherName]);

  // Initial setup
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (id) {
      console.log('📖 Fetching comic book:', id);
      fetchComicBook(id);
    }

    inputRef.current?.focus();
  }, [id, fetchComicBook]);

  // Populate form when editing
  useEffect(() => {
    if (comicbook && comicbook.id) {
      console.log('✏️ Populating form with comic book data:', comicbook);
      setFormState({
        title: comicbook.title || '',
        comicIssue: String(comicbook.comicIssue || ''),
        author: comicbook.author || '',
        penciler: comicbook.penciler || '',
        coverartist: comicbook.coverartist || '',
        inker: comicbook.inker || '',
        volume: String(comicbook.volume || ''),
        year: String(comicbook.year || ''),
        comicBookCover: comicbook.comicBookCover || '',
        type: comicbook.type || '',
      });
    }
  }, [comicbook]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

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
  if (!formState.comicBookCover) {
    alert('Please upload a cover image first');
    return;
  }

  const result = await scanCover(formState.comicBookCover);
  
  if (result) {
    setFormState(prev => ({
      ...prev,
      title: result.title || result.comicBookTitle || prev.title,
      comicIssue: result.comicIssue || prev.comicIssue,
      volume: result.volume || result.comicBookVolume || prev.volume,
      year: result.year || result.comicBookYear || prev.year,
      type: result.type || prev.type
    }));

    alert(`✅ Cover scanned! Confidence: ${Math.round(result.confidence * 100)}%\n\nPlease review the auto-filled information.`);
  }
}, [formState.comicBookCover, scanCover]);

  const validateFields = (): boolean => {
    const errors: FormErrorsState = {};

    // Validate title
    if (!formState.title.trim()) {
      errors.title = 'Comic book title is required';
    }

    // Validate type
    if (!formState.type) {
      errors.type = 'Please select regular or variant';
    }

    // Validate titleID (only for new comics, not edits)
    if (!id && !coboTitleId) {
      errors.titleID = 'Comic book title ID is missing';
      console.error('❌ Validation failed: Missing coboTitleId');
      console.error('URL Params:', { id, coboTitleId, cbTitle, pubId, publisherName });
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
      const comicBookData: ComicBookFormData = {
        ...formState,
        title: formState.title.trim(),
        author: formState.author.trim(),
        penciler: formState.penciler.trim(),
        coverartist: formState.coverartist.trim(),
        inker: formState.inker.trim(),
        titleID: coboTitleId!,
        comicBookTitle: cbTitle || '',
      };

      console.log('📤 Submitting comic book:', comicBookData);

      if (id) {
        console.log('✏️ Updating existing comic book:', id);
        await updateComicBook({
          id,
          ...comicBookData,
        });
      } else {
        console.log('➕ Creating new comic book');
        await createComicBook(comicBookData);
      }
      
      setSuccessMessage('success');
      console.log('✅ Comic book saved successfully');
      
      // Refetch the list and navigate back
      setTimeout(() => {
        if (coboTitleId) {
          console.log('🔄 Refetching comic books for title:', coboTitleId);
          fetchComicBooks(coboTitleId);
        }
        
        const targetUrl = `/dashboard/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbooklistissues`;
        console.log('🔄 Navigating to:', targetUrl);
        
        navigate(targetUrl, {
          state: { refetch: true, timestamp: Date.now() }
        });
      }, REDIRECT_DELAY);
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      setFormErrors({ 
        titleID: error instanceof Error ? error.message : 'Failed to save comic book' 
      });
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const showSuccess = !formErrors.title && !formErrors.type && successMessage === 'success';
  const isEditMode = !!id;
  const pageTitle = isEditMode ? `Edit ${formState.title || 'Comic Book'}` : 'Add Comic Book';
  const cancelUrl = `/dashboard/${userId}/${pubId}/${publisherName}/${coboTitleId}/${cbTitle}/comicbooklistissues`;

  // ============================================================================
  // RENDER
  // ============================================================================

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
                  checked={formState.type === 'regular'}
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
                  checked={formState.type === 'variant'}
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

export default ComicBookComponent;