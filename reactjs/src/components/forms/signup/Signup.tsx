import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import styles from './styles.module.css';
import { passwordProblem } from '../../../utils/password';
import { EMAIL_REGEX, MIN_NAME_LENGTH, PASSWORD_RULE } from '../../../constants/forms';
import { DEFAULT_PROFILE_PIC } from '../../../constants/user';
import { TERMS_URL } from '../../../constants/links';

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
  password: string;
}

interface SignupProps {
  signup: User;
  fetchUser: (id: string) => void;
  signupId: string | undefined;
  apiErrors: Record<string, string>;
  isLoading: boolean;
  createUser: (payload: {
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    password: string;
    profilePic: string;
  }) => void;
}


const Signup = ({
  signup,
  signupId,  // ✅ Add this
  apiErrors,  // ✅ Add this
  isLoading, fetchUser, createUser }: SignupProps) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    if (signupId) {
      console.log('✅ Signup successful, redirecting to home');
      window.location.href = '/';  // Force reload with auth
    }
  }, [signupId]);

  useEffect(() => {
    if (Object.keys(apiErrors).length > 0) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      console.log('❌ Signup failed:', apiErrors);
      setFormErrors(prev => ({
        ...prev,
        ...apiErrors  // Merge API errors into form errors by field
      }));
    }
  }, [apiErrors]);

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
        password: signup.password || ''
      });
    }
  }, [signup]);

  const validateField = useCallback((fieldName: keyof FormErrorsType, value: string): string => {
    const validations = {
      firstname: value.length >= MIN_NAME_LENGTH ? '' : 'First name is required',
      lastname: value.length >= MIN_NAME_LENGTH ? '' : 'Last name is required',
      username: value.length >= MIN_NAME_LENGTH ? '' : 'Username is required',
      email: EMAIL_REGEX.test(value) ? '' : 'Email is invalid',
      // The same rule the API enforces, so it never rejects a password this form accepted
      password: passwordProblem(value)
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
    return Object.values(errors).every(error => error === '');
  }, [formData, validateField]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // ✅ Clear error for this field when user starts typing
    setFormErrors(prev => ({ ...prev, [name]: '' }));
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
        password: ''
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

  const { firstname, lastname, username, email, password } = formData;

  return (
    <>
      <article id="signup" className={styles.signupMain}>
        <h1>
          Sign Up
          <span className={styles.graphic} aria-hidden="true" />
        </h1>

        <section className={styles.wrapper}>
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />

            <fieldset>
              <label htmlFor="firstname">
                First name
                <input
                  id="firstname"
                  className={styles.inputBorder}
                  type="text"
                  autoComplete="given-name"
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
                  autoComplete="family-name"
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
                  autoComplete="username"
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
                  type="email"
                  autoComplete="email"
                  name="email"
                  value={email}
                  onChange={handleInputChange}
                />
              </label>

              <label htmlFor="password">
                Password
                {/* The input and its Show/Hide button side by side */}
                <span className={styles.passwordRow}>
                  <input
                    id="password"
                    className={styles.inputBorder}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    name="password"
                    value={password}
                    onChange={handleInputChange}
                    aria-describedby="passwordRule"
                  />
                  <button
                    className={styles.showPassword}
                    type="button"
                    onClick={() => setShowPassword(shown => !shown)}
                    aria-pressed={showPassword}
                    aria-controls="password"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
                <span id="passwordRule" className={styles.hint}>
                  {PASSWORD_RULE}
                </span>
              </label>
            </fieldset>

            <p className={styles.terms}>
              By creating an account, you agree to the{' '}
              <a href={TERMS_URL}>Terms of Use</a>.
            </p>

            <input
              id="submitQ1"
              className={styles.submit}
              type="submit"
              value={isLoading ? 'Creating Account...' : 'Submit'}
              disabled={isLoading}
            />

            <p>
              Already have an account? <Link to="/signin">Sign in</Link>
            </p>
          </form>
        </section>

        <figure className={styles.signBCK} />
      </article>
    </>
  );
};

export default Signup;