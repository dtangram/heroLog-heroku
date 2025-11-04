import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import styles from './styles.module.css';

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
  password: string;
  type: string;
}

interface SignupProps {
  signup: User;
  fetchUser: (id: string) => void;
  signupId: string | undefined;  // ✅ Add this
  signupError: string | null; // ✅ Add this
  isLoading: boolean;
  createUser: (payload: {
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    password: string;
    type: string;
    profilePic: string;
  }) => void;
}

const EMAIL_REGEX = /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i;
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_PROFILE_PIC = 'https://dothanthorntonbucket.s3.amazonaws.com/material-design-account-icon.png';

const Signup = ({ signup, signupId,  // ✅ Add this
  signupError,  // ✅ Add this
  isLoading, fetchUser, createUser }: SignupProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    type: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: '',
    type: ''
  });

  useEffect(() => {
    if (signupId) {
      console.log('✅ Signup successful, redirecting to home');
      window.location.href = '/';  // Force reload with auth
    }
  }, [signupId]);

  // ✅ Watch for signup errors - display them
  useEffect(() => {
    if (signupError) {
      console.log('❌ Signup failed:', signupError);
      setFormErrors(prev => ({
        ...prev,
        email: signupError  // Show error (usually email already exists)
      }));
    }
  }, [signupError]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    
    if (id) {
      fetchUser(id);
    }
  }, [id, fetchUser]);

  useEffect(() => {
    if (signup) {
      setFormData({
        firstname: signup.firstname || '',
        lastname: signup.lastname || '',
        username: signup.username || '',
        email: signup.email || '',
        password: signup.password || '',
        type: signup.type || ''
      });
    }
  }, [signup]);

  const validateField = useCallback((fieldName: keyof FormErrorsType, value: string): string => {
    const validations = {
      firstname: value.length >= MIN_NAME_LENGTH ? '' : 'First name is required',
      lastname: value.length >= MIN_NAME_LENGTH ? '' : 'Last name is required',
      username: value.length >= MIN_NAME_LENGTH ? '' : 'Username is required',
      email: EMAIL_REGEX.test(value) ? '' : 'Email is invalid',
      password: value.length >= MIN_PASSWORD_LENGTH ? '' : 'Password is too short',
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

    if (!id && isValid) {
      setFormErrors({
        firstname: '',
        lastname: '',
        username: '',
        email: '',
        password: '',
        type: ''
      });

      createUser({
        ...formData,
        profilePic: DEFAULT_PROFILE_PIC
      });
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [id, formData, validateAllFields, createUser, navigate]);

  const { firstname, lastname, username, email, password, type } = formData;

  return (
    <>
      <main id="signup" className={styles.signupMain}>
        <h1>
          Sign Up
          <div className={styles.graphic} aria-label="Small burgundy, rectangle graphic." />
        </h1>

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            <fieldset>
              <label htmlFor="firstname">
                First Name
                <input
                  id="firstname"
                  className={styles.inputBorder}
                  type="text"
                  name="firstname"
                  value={firstname}
                  onChange={handleInputChange}
                />
              </label>

              <label htmlFor="lastname">
                Last Name
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
                Password
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

            <input
              id="submitQ1"
              className={styles.submit}
              type="submit"
              value={isLoading ? 'Creating Account...' : 'Submit'}
              disabled={isLoading}
            />

            <div>
              <p>
                <Link to="/signin">Already have an Account?</Link>
              </p>
            </div>
          </form>
        </section>

        <figure className={styles.signBCK} />
      </main>
    </>
  );
};

export default Signup;