import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
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
}

interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password?: string;
  profilePic: string;
}

interface ProfileFormProps {
  signup: User;
  fetchUser: (id: string) => void;
  updateUser: (user: User) => void;
}

interface S3SignResponse {
  signedRequest: string;
  url: string;
}

const EMAIL_REGEX = /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i;
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
const MAX_FILE_SIZE = 1e6;
const ALLOWED_FILE_TYPES = ['jpg', 'jpeg', 'png'];
const S3_BUCKET = 'dothanthorntonbucket';
const AWS_REGION = 'us-east-2';

const ProfileForm = ({ signup, fetchUser, updateUser }: ProfileFormProps) => {
  const { id } = useParams<{ id: string }>();
  const userId = localStorage.getItem('id') || '';
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    profilePic: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: ''
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
      password: validateField('password', formData.password)
    };

    setFormErrors(errors);
    errors && window?.scrollTo?.({ top: 0, behavior: 'smooth' });
    return Object.values(errors).every(error => error === '');
  }, [formData, validateField]);

  const handleFileInputChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  
  if (!file || !fileInputRef.current) {
    return;
  }

  fileInputRef.current.disabled = false;

  const fileName = file.name;
  const fileType = file.type;
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

  if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
    fileInputRef.current.disabled = false;
    alert('Image needs to have a .jpeg, .jpg or .png file extension.');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    fileInputRef.current.disabled = false;
    alert('Image size needs to be smaller than 1MB');
    return;
  }

  try {
    console.log('📤 Uploading:', { fileName, fileType });
    
    const response = await API.post<S3SignResponse>('/s3/sign', {
      fileName,
      fileType
    })  // ✅ Use any temporarily

    console.log('📦 Full S3 response:', response);

    // ✅ The data is inside response.data (backend returns { success, data, timestamp })
    const { signedRequest, url } = response.data;

    if (!signedRequest || !url) {
      console.error('❌ Missing signedRequest or url:', { signedRequest, url });
      throw new Error('Invalid S3 response - missing signed URL');
    }

    console.log('📤 Uploading to S3:', signedRequest);

    fileInputRef.current.disabled = true;

    await axios.put(signedRequest, file, {
      headers: {
        'Content-Type': fileType
      }
    });

    console.log('✅ Upload successful:', url);

    setFormData(prev => ({ ...prev, profilePic: url }));

    const figureElement = document.querySelector<HTMLElement>('form > article > fieldset figure');
    if (figureElement) {
      figureElement.style.display = 'inline-block';
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    if (fileInputRef.current) {
      fileInputRef.current.disabled = false;
    }
  }
}, []);

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
      profilePic: formData.profilePic
    };

    updateUser(updatedUser);
    setSuccessMessage('success');
    setTimeout(() => {
      window.location.href = {  pathname: `/profile/${userId}` }.pathname;
      navigate(`/profile/${userId}`);
    }, 1500);
  }, [id, formData, validateAllFields, updateUser]);

  const { firstname, lastname, username, email, password, profilePic } = formData;
  const hasNoErrors = Object.values(formErrors).every(error => error.length === 0);

  return (
    <>
      <article id="cbComicForm" className={styles.cbWrapper}>
        <h1>
          {id && `Update ${firstname}'s Profile`}
          <figure className={styles.graphic} aria-label="Small burgundy, rectangle graphic." />
        </h1>

        <article className={styles.cbList}>
          {hasNoErrors && successMessage === 'success' && <SuccessDisplay />}

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