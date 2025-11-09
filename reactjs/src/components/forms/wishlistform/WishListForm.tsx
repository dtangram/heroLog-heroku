import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import aws from 'aws-sdk';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import API from '../../../API';
import { WishlistComic } from '../../../store/wishlist/actions';
import { useComicScanner } from '../../../hooks/useComicScanner';
import ScanCoverButton from '../../scanCoverButton/ScanCoverButton';

interface FormErrorsType {
  comicBookTitle: string;
  type: string;
}

interface WishListFormProps {
  wishlist: WishlistComic;
  fetchWishList: (id: string) => void;
  createWishList: (payload: Omit<WishlistComic, 'id' | 'userId'>) => void;
  updateWishList: (payload: Partial<WishlistComic> & { id: string }) => void;
}

interface RekognitionLabel {
  Name?: string;
  Confidence?: number;
}

const MIN_TITLE_LENGTH = 1;
const MAX_FILE_SIZE = 1e6;
const ALLOWED_FILE_TYPES = ['jpg', 'jpeg', 'png'];
const S3_BUCKET = 'dothanthorntonbucket';
const AWS_REGION = 'us-east-2';
const NUMBER_REGEX = /^[0-9\b]+$/;

const INAPPROPRIATE_MODERATION_LABELS = [
  'Explicit Nudity',
  'Nudity',
  'Sexual Activity'
];

const INAPPROPRIATE_DETECTION_LABELS = [
  'Lingerie',
  'Panties',
  'Underwear',
  'Bra',
  'Thong',
  'Thigh',
  'Swimwear'
];

const WishListForm = ({ wishlist, fetchWishList, createWishList, updateWishList }: WishListFormProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const userId = localStorage.getItem('id') || '';
  
  const [formData, setFormData] = useState({
    comicBookTitle: '',
    comicIssue: '',
    comicBookVolume: '',
    comicBookYear: '',
    comicBookPublisher: '',
    comicBookCover: '',
    type: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    comicBookTitle: '',
    type: ''
  });
  
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (id) {
      fetchWishList(id);
    }
    
    inputRef.current?.focus();
  }, [id, fetchWishList]);

  useEffect(() => {
    if (wishlist && wishlist.id) {
      setFormData({
        comicBookTitle: wishlist.comicBookTitle || '',
        comicIssue: wishlist.comicIssue || '',
        comicBookVolume: wishlist.comicBookVolume || '',
        comicBookYear: wishlist.comicBookYear || '',
        comicBookPublisher: wishlist.comicBookPublisher || '',
        comicBookCover: wishlist.comicBookCover || '',
        type: wishlist.type || ''
      });
    }
  }, [wishlist]);

  const validateFields = useCallback((): boolean => {
    const isTitleValid = formData.comicBookTitle.length >= MIN_TITLE_LENGTH;
    const isTypeValid = Boolean(formData.type);
    
    setFormErrors({
      comicBookTitle: isTitleValid ? '' : 'Comic Book title is required',
      type: isTypeValid ? '' : 'Comic Book type is required'
    });
    
    return isTitleValid && isTypeValid;
  }, [formData.comicBookTitle, formData.type]);

  const handleInappropriateContent = useCallback(() => {
    const forbidElement = document.getElementById('forbidContent');
    const figureElement = document.querySelector<HTMLElement>('form > article > fieldset figure');
    
    if (forbidElement) {
      forbidElement.innerHTML = 'YOUR IMAGE IS INAPPROPRIATE.';
    }
    
    if (figureElement) {
      figureElement.style.filter = 'blur(20px)';
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }, []);

  const isInappropriateModeration = useCallback((label: RekognitionLabel): boolean => {
    if (!label.Name || !label.Confidence) {
      return false;
    }
    
    if (INAPPROPRIATE_MODERATION_LABELS.includes(label.Name)) {
      return true;
    }
    if (label.Name === 'Suggestive' && label.Confidence > 90) {
      return true;
    }
    if (label.Name === 'Revealing Clothes' && label.Confidence > 60) {
      return true;
    }
    return false;
  }, []);

  const isInappropriateDetection = useCallback((label: RekognitionLabel): boolean => {
    if (!label.Name || !label.Confidence) {
      return false;
    }
    return label.Confidence > 48 && INAPPROPRIATE_DETECTION_LABELS.includes(label.Name);
  }, []);

  const performRekognitionCheck = useCallback((fileName: string) => {
    const awsAccessKeyId = process.env.REACT_APP_AWSAccessKeyId;
    const awsSecretKey = process.env.REACT_APP_AWSSecretKey;
    
    if (!awsAccessKeyId || !awsSecretKey) {
      console.error('AWS credentials not configured');
      return;
    }

    aws.config.update({
      region: AWS_REGION,
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretKey
    });

    const rekognition = new aws.Rekognition();
    const params = {
      Image: {
        S3Object: {
          Bucket: S3_BUCKET,
          Name: fileName
        }
      },
      MinConfidence: 0
    };

    rekognition.detectModerationLabels(params, (err: aws.AWSError, data: aws.Rekognition.DetectModerationLabelsResponse) => {
      if (err) {
        console.error('Moderation check error:', err);
        return;
      }
      
      const hasInappropriate = data?.ModerationLabels?.some(isInappropriateModeration);
      if (hasInappropriate) {
        handleInappropriateContent();
      }
    });

    rekognition.detectLabels(params, (err: aws.AWSError, data: aws.Rekognition.DetectLabelsResponse) => {
      if (err) {
        console.error('Label detection error:', err);
        return;
      }
      
      const hasInappropriate = data?.Labels?.some(isInappropriateDetection);
      if (hasInappropriate) {
        handleInappropriateContent();
      }
    });
  }, [isInappropriateModeration, isInappropriateDetection, handleInappropriateContent]);

  const handleFileInputChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file || !fileInputRef.current) {
      return;
    }

    fileInputRef.current.disabled = false;

    const fileParts = file.name.split('.');
    const fileName = file.name;
    const fileType = fileParts[fileParts.length - 1]?.toLowerCase() || '';

    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      fileInputRef.current.disabled = false;
      window.location.reload();
      alert('Image needs to have a .jpeg, .jpg or .png file extension.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      fileInputRef.current.disabled = false;
      window.location.reload();
      alert('Image size needs to be smaller than 1MB');
      return;
    }

    try {
      console.log('Preparing the upload');
      
      const response = await API.post<{ returnData: { signedRequest: string; url: string } }>(
        '/sign_s3',
        { fileName, fileType }
      );

      const { returnData: { signedRequest, url } } = response.data;

      fileInputRef.current.disabled = true;

      const options = {
        headers: {
          'Content-Type': fileType,
          'x-amz-acl': 'public-read'
        }
      };

      await axios.put(signedRequest, file, options);

      setFormData(prev => ({ ...prev, comicBookCover: url }));

      const figureElement = document.querySelector<HTMLElement>('form > article > fieldset figure');
      if (figureElement) {
        figureElement.style.display = 'inline-block';
      }

      console.log('Response from s3');
      performRekognitionCheck(fileName);
    } catch (error) {
      console.error('Upload error:', error);
      if (fileInputRef.current) {
        fileInputRef.current.disabled = false;
      }
    }
  }, [performRekognitionCheck]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleNumberInputChange = useCallback((event: ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const { value } = event.target;
    
    if (value === '' || NUMBER_REGEX.test(value)) {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    }
  }, []);

  const { scanCover, isScanning, scanError, clearError } = useComicScanner();

// Add handler after handleTypeChange
const handleScanCover = useCallback(async () => {
  if (!formData.comicBookCover) {
    alert('Please upload a cover image first');
    return;
  }

  const result = await scanCover(formData.comicBookCover);
  
  if (result) {
    // Auto-fill form with scanned data
    setFormData(prev => ({
      ...prev,
      comicBookTitle: result.comicBookTitle || prev.comicBookTitle,
      comicIssue: result.comicIssue || prev.comicIssue,
      comicBookVolume: result.comicBookVolume || prev.comicBookVolume,
      comicBookYear: result.comicBookYear || prev.comicBookYear,
      comicBookPublisher: result.comicBookPublisher || prev.comicBookPublisher,
      type: result.type || prev.type
    }));

    alert(`✅ Cover scanned! Confidence: ${Math.round(result.confidence * 100)}%\n\nPlease review and edit the auto-filled information.`);
  }
}, [formData.comicBookCover, scanCover]);

  const handleTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, type: event.target.value }));
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateFields();

    if (!isValid) {
      return;
    }

    if (id) {
      updateWishList({
        id,
        ...formData
      });
    } else {
      createWishList(formData);
    }

    setSuccessMessage('success');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    setTimeout(() => {
      navigate(`/wishList/${userId}`);
    }, 1500);
  }, [id, userId, formData, validateFields, createWishList, updateWishList]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const { comicBookTitle, comicIssue, comicBookVolume, comicBookYear, comicBookPublisher, comicBookCover, type } = formData;
  const hasNoErrors = formErrors.comicBookTitle.length === 0 && formErrors.type.length === 0;

  return (
    <>
      <article id="cbComicForm" className={styles.cbWrapper}>
        <button className={styles.backLink} type="button" onClick={handleGoBack}>
          Back
        </button>

        <h1>
          {id ? `Edit ${comicBookTitle}` : 'Add Comic WishList'}
          <figure className={styles.graphic} aria-label="Small burgundy, rectangle graphic." />
        </h1>

        <article className={styles.cbList}>
          {hasNoErrors && type && successMessage === 'success' && <SuccessDisplay />}

          <section className={styles.wrapper}>
            <form method="POST" onSubmit={handleSubmit}>
              <FormErrors formErrors={formErrors} />

              <p id="forbidContent" />

              <article>
                <fieldset>
                  <figure>
                    <img src={comicBookCover} alt={comicBookTitle || 'Comic book cover'} />
                  </figure>

                  <label htmlFor="comicBookCover">
                    Comic Book Cover
                    <input
                      ref={fileInputRef}
                      id="comicBookCover"
                      className={styles.inputBorder}
                      type="file"
                      name="comicBookCover"
                      onInput={handleInputChange}
                      onChange={handleFileInputChange}
                    />
                  </label>

                  {comicBookCover && (
                    <ScanCoverButton
                      onScan={handleScanCover}
                      isScanning={isScanning}
                      error={scanError}
                    />
                  )}

                  <label htmlFor="comicBookTitle">
                    Title
                    <input
                      ref={inputRef}
                      id="comicBookTitle"
                      className={styles.inputBorder}
                      type="text"
                      name="comicBookTitle"
                      value={comicBookTitle}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label htmlFor="comicIssue">
                    Issue
                    <input
                      id="comicIssue"
                      className={styles.inputBorder}
                      type="number"
                      name="comicIssue"
                      value={comicIssue}
                      onChange={(e) => handleNumberInputChange(e, 'comicIssue')}
                    />
                  </label>

                  <label htmlFor="comicBookVolume">
                    Volume
                    <input
                      id="comicBookVolume"
                      className={styles.inputBorder}
                      type="number"
                      name="comicBookVolume"
                      value={comicBookVolume}
                      onChange={(e) => handleNumberInputChange(e, 'comicBookVolume')}
                    />
                  </label>

                  <label htmlFor="comicBookYear">
                    Year
                    <input
                      id="comicBookYear"
                      className={styles.inputBorder}
                      type="text"
                      maxLength={4}
                      name="comicBookYear"
                      value={comicBookYear}
                      onChange={(e) => handleNumberInputChange(e, 'comicBookYear')}
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
                  />
                  Variant Cover
                </label>
              </article>

              <article>
                <p>
                  <Link url={`/wishlist/${userId}`} title="CANCEL" />
                </p>
                <input
                  id="submitQ1"
                  className={styles.submit}
                  type="submit"
                  value="SUBMIT"
                />
              </article>
            </form>
          </section>
        </article>
      </article>
    </>
  );
};

export default WishListForm;