import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import aws from 'aws-sdk';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import API from '../../../API';
import { SaleComic } from '../../../store/sale/actions';
import { getAnonymousUserId } from '../../../utils/anonymousUser';
import { useComicScanner } from '../../../hooks/useComicScanner';
import ScanCoverButton from '../../scanCoverButton/ScanCoverButton';

interface FormErrorsType {
  comicBookTitle: string;
  comicIssue: string;
  comicBookPublisher: string;
  type: string;  // ✅ Add type validation
}

interface SaleFormProps {
  sale: SaleComic;
  createSale: (sale: Omit<SaleComic, 'id'>) => void;
  fetchSale: (id: string) => void;
  updateSale: (sale: SaleComic) => void;
}

interface RekognitionLabel {
  Name?: string;
  Confidence?: number;
}

const MIN_TITLE_LENGTH = 2;
const MAX_FILE_SIZE = 1e6;
const ALLOWED_FILE_TYPES = ['jpg', 'jpeg', 'png'];
const S3_BUCKET = 'dothanthorntonbucket';
const AWS_REGION = 'us-east-2';

const INAPPROPRIATE_MODERATION_LABELS = [
  'Explicit Nudity',
  'Nudity',
  'Graphic Female Nudity',
  'Graphic Male Nudity',
  'Illustrated Explicit Nudity',
  'Sexual Activity',
  'Female Swimwear Or Underwear',
  'Male Swimwear Or Underwear',
  'Partial Nudity'
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

const SaleForm = ({ sale, fetchSale, createSale, updateSale }: SaleFormProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = localStorage.getItem('id') || getAnonymousUserId();  // ✅ Get anonymous ID if not logged in
  
  const [formData, setFormData] = useState({
    comicBookTitle: '',
    comicIssue: '',
    comicBookVolume: '',
    comicBookYear: '',
    comicBookPublisher: '',
    comicBookCover: '',
    type: '' as string | 'regular' | 'variant'  // ✅ Strongly type
  });
  
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    comicBookTitle: '',
    comicIssue: '',
    comicBookPublisher: '',
    type: ''  // ✅ Add type error
  });
  
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (id) {
      fetchSale(id);
    }
    
    inputRef.current?.focus();
  }, [id, fetchSale]);

  useEffect(() => {
    if (sale) {
      setFormData({
        comicBookTitle: sale.comicBookTitle || '',
        comicIssue: sale.comicIssue || '',
        comicBookVolume: sale.comicBookVolume || '',
        comicBookYear: sale.comicBookYear || '',
        comicBookPublisher: sale.comicBookPublisher || '',
        comicBookCover: sale.comicBookCover || '',
        type: sale.type || ''
      });
    }
  }, [sale]);

  const validateField = useCallback((fieldName: keyof FormErrorsType, value: string): string => {
    const validations = {
      comicBookTitle: value.length >= MIN_TITLE_LENGTH ? '' : 'Comic book title is required',
      comicIssue: value ? '' : 'Comic issue is required',
      comicBookPublisher: value ? '' : 'Publisher is required',
      type: value === 'regular' || value === 'variant' ? '' : 'Please select regular or variant'  // ✅ Validate type
    };
    
    return validations[fieldName];
  }, []);

  const validateAllFields = useCallback((): boolean => {
    const errors: FormErrorsType = {
      comicBookTitle: validateField('comicBookTitle', formData.comicBookTitle),
      comicIssue: validateField('comicIssue', formData.comicIssue),
      comicBookPublisher: validateField('comicBookPublisher', formData.comicBookPublisher),
      type: validateField('type', formData.type)  // ✅ Validate type
    };

    setFormErrors(errors);
    return Object.values(errors).every(error => error === '');
  }, [formData, validateField]);

  const handleInappropriateContent = useCallback(() => {
    const forbidElement = document.getElementById('forbidContent');
    const figureElement = document.querySelector<HTMLElement>('form > article > fieldset figure');
    
    if (forbidElement) {
      forbidElement.innerHTML = 'YOUR IMAGE IS INAPPROPRIATE.';
    }
    
    if (figureElement) {
      figureElement.style.filter = 'blur(20px)';
    }
    
    window.scrollTo({ top: 0 });
    
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

  // ✅ Add handler for type radio buttons
  const handleTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, type: event.target.value as 'regular' | 'variant' }));
  }, []);

  const { scanCover, isScanning, scanError, clearError } = useComicScanner();
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

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateAllFields();

    if (!isValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // ✅ Map userId to saleUsersId for the backend
    const saleData = {
      comicBookTitle: formData.comicBookTitle,
      comicIssue: formData.comicIssue,
      comicBookVolume: formData.comicBookVolume,
      comicBookYear: formData.comicBookYear,
      comicBookPublisher: formData.comicBookPublisher,
      comicBookCover: formData.comicBookCover,
      type: formData.type,
      userId,
      saleUsersId: userId  // ✅ Changed from userId to saleUsersId
    };

    console.log('📤 Submitting sale:', saleData);

    if (id) {
      updateSale({
        id,
        ...saleData
      } as SaleComic);
    } else {
      createSale(saleData as Omit<SaleComic, 'id'>);
    }
    
    setSuccessMessage('success');
    
    setTimeout(() => {
      navigate(`/sale/${userId}`);
    }, 1500);
  }, [id, formData, userId, validateAllFields, createSale, updateSale, navigate]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const { comicBookTitle, comicIssue, comicBookVolume, comicBookYear, comicBookPublisher, comicBookCover, type } = formData;
  const hasNoErrors = Object.values(formErrors).every(error => error.length === 0);

  return (
    <>
      <article id="saleForm" className={styles.cbWrapper}>
        <button className={styles.backLink} type="button" onClick={handleGoBack}>
          Back
        </button>
        
        <h1>
          {id ? `Update ${comicBookTitle}` : 'Add New Sale Comic'}
          <figure className={styles.graphic} aria-label="Small burgundy, rectangle graphic." />
        </h1>

        <article className={styles.cbList}>
          {hasNoErrors && successMessage === 'success' && <SuccessDisplay />}

          <section className={styles.wrapper}>
            <form method="POST" onSubmit={handleSubmit}>
              <FormErrors formErrors={formErrors} />

              <p id="forbidContent" />

              <article>
                <fieldset>
                  {comicBookCover && (
                    <figure>
                      <img src={comicBookCover} alt={comicBookTitle || 'Comic book cover'} />
                    </figure>
                  )}

                  <label htmlFor="comicBookCover">
                    {id ? 'Change Comic Book Cover' : 'Upload Comic Book Cover'}
                    <input
                      ref={fileInputRef}
                      id="comicBookCover"
                      className={styles.inputBorder}
                      type="file"
                      name="comicBookCover"
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
                    Comic Book Title *
                    <input
                      ref={inputRef}
                      id="comicBookTitle"
                      className={styles.inputBorder}
                      type="text"
                      name="comicBookTitle"
                      value={comicBookTitle}
                      onChange={handleInputChange}
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
                      required
                    />
                  </label>
                </fieldset>
              </article>

              {/* ✅ Replace text input with radio buttons */}
              <article>
                <label className={styles.labelRadio} htmlFor="regular">
                  <input
                    id="regular"
                    type="radio"
                    value="regular"
                    checked={type === 'regular'}
                    onChange={handleTypeChange}
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
                  />
                  Variant
                </label>
              </article>

              <article>
                <p>
                  <Link url={`/sale/${userId}`} title="CANCEL" />
                </p>
                <input
                  id="submitSale"
                  className={styles.submit}
                  type="submit"
                  value={id ? 'UPDATE' : 'CREATE'}
                />
              </article>
            </form>
          </section>
        </article>
      </article>
    </>
  );
};

export default SaleForm;