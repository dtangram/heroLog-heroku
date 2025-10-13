import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import aws from 'aws-sdk';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import API from '../../../API';

interface FormErrorsType {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password: string;
  type: string;
}

interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password?: string;
  profilePic: string;
  type: string;
}

interface ProfileFormProps {
  signup: User;
  fetchUser: (id: string) => void;
  updateUser: (user: User) => void;
}

interface RekognitionLabel {
  Name?: string;
  Confidence?: number;
}

const EMAIL_REGEX = /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i;
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
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

const ProfileForm = ({ signup, fetchUser, updateUser }: ProfileFormProps) => {
  const { id } = useParams<{ id: string }>();
  const userId = localStorage.getItem('id') || '';
  
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    type: '',
    profilePic: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    type: ''
  });
  
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (id) {
      fetchUser(id);
    }
    
    inputRef.current?.focus();
    localStorage.removeItem('reloadProfileApp');
  }, [id, fetchUser]);

  useEffect(() => {
    if (signup) {
      setFormData({
        firstname: signup.firstname || '',
        lastname: signup.lastname || '',
        username: signup.username || '',
        email: signup.email || '',
        password: signup.password || '',
        type: signup.type || '',
        profilePic: signup.profilePic || ''
      });
    }
  }, [signup]);

  const validateField = useCallback((fieldName: keyof FormErrorsType, value: string): string => {
    const validations = {
      firstname: value.length >= MIN_NAME_LENGTH ? '' : 'First name is required',
      lastname: value.length >= MIN_NAME_LENGTH ? '' : 'Last name is required',
      username: value.length >= 3 ? '' : 'Username must be at least 3 characters',
      email: EMAIL_REGEX.test(value) ? '' : 'Email is invalid',
      password: value.length >= MIN_PASSWORD_LENGTH ? '' : 'Password must be at least 8 characters',
      type: value ? '' : 'Please select regular or fixer'
    };
    
    return validations[fieldName];
  }, []);

  const validateAllFields = useCallback((): boolean => {
    const errors: FormErrorsType = {
      firstname: validateField('firstname', formData.firstname),
      lastname: validateField('lastname', formData.lastname),
      username: validateField('username', formData.username),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      type: validateField('type', formData.type)
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

      setFormData(prev => ({ ...prev, profilePic: url }));

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

  const handleTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, type: event.target.value }));
  }, []);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValid = validateAllFields();

    if (!id || !isValid) {
      return;
    }

    const updatedUser: User = {
      id,
      firstname: formData.firstname,
      lastname: formData.lastname,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      type: formData.type,
      profilePic: formData.profilePic
    };

    updateUser(updatedUser);
    setSuccessMessage('success');
  }, [id, formData, validateAllFields, updateUser]);

  const { firstname, lastname, username, email, password, profilePic, type } = formData;
  const hasNoErrors = Object.values(formErrors).every(error => error.length === 0);

  return (
    <>
      <article id="cbComicForm" className={styles.cbWrapper}>
        <h1>
          {id && `Update ${firstname}'s Profile`}
          <figure className={styles.graphic} aria-label="Small burgundy, rectangle graphic." />
        </h1>

        <article className={styles.cbList}>
          {hasNoErrors && type && successMessage === 'success' && <SuccessDisplay />}

          <section className={styles.wrapper}>
            <form method="POST" onSubmit={handleSubmit}>
              <FormErrors formErrors={formErrors} />

              <article>
                <fieldset>
                  <figure>
                    <img src={profilePic} alt={profilePic || 'Profile picture'} />
                  </figure>

                  <label htmlFor="profilePic">
                    Change Profile Picture
                    <input
                      ref={fileInputRef}
                      id="profilePic"
                      className={styles.inputBorder}
                      type="file"
                      name="profilePic"
                      onInput={handleInputChange}
                      onChange={handleFileInputChange}
                    />
                  </label>

                  <label htmlFor="firstname">
                    Change First Name
                    <input
                      ref={inputRef}
                      id="firstname"
                      className={styles.inputBorder}
                      type="text"
                      name="firstname"
                      value={firstname}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label htmlFor="lastname">
                    Change Last Name
                    <input
                      id="lastname"
                      className={styles.inputBorder}
                      type="text"
                      name="lastname"
                      value={lastname}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label htmlFor="username">
                    Change Username
                    <input
                      id="username"
                      className={styles.inputBorder}
                      type="text"
                      name="username"
                      value={username}
                      onChange={handleInputChange}
                    />
                  </label>
                </fieldset>

                <fieldset>
                  <label htmlFor="email">
                    Change Email
                    <input
                      id="email"
                      className={styles.inputBorder}
                      type="text"
                      name="email"
                      value={email}
                      onChange={handleInputChange}
                    />
                  </label>

                  <label htmlFor="password">
                    Change Password
                    <input
                      id="password"
                      className={styles.inputBorder}
                      type="password"
                      name="password"
                      value={password}
                      onChange={handleInputChange}
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
                  />
                  Regular
                </label>

                <label className={styles.labelRadio} htmlFor="fixer">
                  <input
                    id="fixer"
                    type="radio"
                    value="fixer"
                    checked={type === 'fixer'}
                    onChange={handleTypeChange}
                  />
                  Fixer
                </label>
              </article>

              <article>
                <p>
                  <Link url={`/profile/${userId}`} title="CANCEL" />
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

export default ProfileForm;