import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import FormErrors from '../../../formErrors';
import Link from '../../../link';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import API from '../../../API';
import { showAlert } from '../../dialog';
import { AccountCircle } from '@mui/icons-material';
import CoverPicker from '../../coverPicker/CoverPicker';
import Breadcrumbs from '../../breadcrumbs';
import { usePageTitle } from '../../documentTitle';
import { passwordProblem } from '../../../utils/password';
import { EMAIL_REGEX, MIN_NAME_LENGTH } from '../../../constants/forms';
import { MAX_IMAGE_SIZE, VALID_IMAGE_EXTENSIONS } from '../../../constants/uploads';

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
  const [isUploading, setIsUploading] = useState(false);
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
        // The API never sends the password back; blank means "keep it"
        password: '',
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
      // Optional: blank keeps the current password
      // Optional: blank keeps the current one; otherwise the same rule the API enforces
      password: value.length === 0 ? '' : passwordProblem(value)
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
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!VALID_IMAGE_EXTENSIONS.includes(fileExtension)) {
      showAlert('Please choose a JPG or PNG image.', { title: "That file type won't work" });
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showAlert('Please choose an image smaller than 1MB.', { title: 'That image is too large' });
      input.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const response = await API.post<S3SignResponse>('/s3/sign', { fileName: file.name, fileType: file.type });
      // The API sends { success, data, timestamp }; the signed URL is in data
      const { signedRequest, url } = response.data;
      if (!signedRequest || !url) throw new Error('Invalid S3 response - missing signed URL');

      await axios.put(signedRequest, file, { headers: { 'Content-Type': file.type } });
      setFormData(prev => ({ ...prev, profilePic: url }));
    } catch (error) {
      console.error('❌ Upload error:', error);
      showAlert("Your photo couldn't be uploaded. Please try again.", { title: 'Upload failed' });
    } finally {
      setIsUploading(false);
      // Lets the same file be chosen again after a failed upload
      input.value = '';
    }
  }, []);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      // Only sent when a new one was typed, so a blank field keeps the current password
      ...(formData.password ? { password: formData.password } : {}),
      profilePic: formData.profilePic
    } as User;

    updateUser(updatedUser);
    setSuccessMessage('success');
    setTimeout(() => {
      window.location.href = {  pathname: `/profile/${userId}` }.pathname;
      navigate(`/profile/${userId}`);
    }, 1500);
  }, [id, formData, validateAllFields, updateUser]);

  const { firstname, lastname, username, email, password, profilePic } = formData;
  // The same words for the heading and the browser tab
  const pageTitle = 'Edit Profile';
  usePageTitle(pageTitle);
  const hasNoErrors = Object.values(formErrors).every(error => error.length === 0);

  return (
    <>
      <article id="cbComicForm" className={styles.cbWrapper}>
        <Breadcrumbs items={[{ label: 'Profile', to: `/profile/${userId}` }, { label: pageTitle }]} />
        <h1>
          {pageTitle}
          <figure className={styles.graphic} aria-hidden="true" />
        </h1>

        <article className={styles.cbList}>
          {hasNoErrors && successMessage === 'success' && <SuccessDisplay />}

          <section className={styles.wrapper}>
            <form method="POST" onSubmit={handleSubmit}>
              <FormErrors formErrors={formErrors} />

              <article>
                <fieldset>
                  {/* Your photo, or a person icon until you add one (never a broken image) */}
                  <figure className={styles.profilePhoto}>
                    {profilePic ? (
                      <img src={profilePic} alt="Your profile photo" />
                    ) : (
                      <AccountCircle className={styles.profileIcon} titleAccess="No profile photo yet" />
                    )}
                  </figure>

                  <CoverPicker
                    id="profilePic"
                    label="Profile photo"
                    chooseText="Choose photo"
                    changeText="Change photo"
                    hasCover={Boolean(profilePic)}
                    isUploading={isUploading}
                    onFileChange={handleFileInputChange}
                  />

                  <label htmlFor="firstname">
                    First name
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
                    Last name
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
                    Username
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
                    Email
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
                    New password (leave blank to keep your current one)
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