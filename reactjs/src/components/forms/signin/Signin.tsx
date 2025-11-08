import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import API from '../../../API';
import FormErrors from '../../../formErrors';
import type { ConnectorProps } from './container';
import styles from './styles.module.css';

// Constants
const MIN_USERNAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 8;
const TOKEN_CHECK_DELAY = 100;

// Types
interface FormErrorsType {
  username?: string;
  password?: string;
  validToken?: string;
  form?: string;
}

interface User {
  id: string;
  username: string;
  password: string;
}

interface UserData {
  id: string;
}

interface UserState {
  data?: UserData;
}

interface LoginFormData {
  username: string;
  password: string;
}

// Google Identity Services types (alternative to declare global)
interface GoogleAccounts {
  id: {
    initialize: (config: GoogleInitConfig) => void;
    renderButton: (element: HTMLElement | null, config: GoogleButtonConfig) => void;
    prompt: () => void;
  };
}

interface GoogleInitConfig {
  client_id: string;
  callback: (response: any) => void;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

// Helper to safely access Google API
const getGoogleAccounts = (): GoogleAccounts | null => {
  return (window as any).google?.accounts || null;
};

const Signin: React.FC<ConnectorProps> = ({ 
  users, 
  user, 
  fetchUserProfile, 
  loginUser 
}) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  // Format response data for display
  const formatResponseData = useCallback((data: any): string => {
    try {
      return JSON.stringify(data)
        .substring(16)
        .replace(/["/{/}/]/gi, '')
        .replace(/,/gi, '\n')
        .replace(/:/gi, ': ')
        .replace(/timestamp/gi, 'Timestamp')
        .replace(/base/gi, 'Base')
        .replace(/date/gi, 'Date')
        .replace(/rates:/gi, 'Rates:\n');
    } catch (error) {
      console.error('Error formatting response data:', error);
      return '';
    }
  }, []);

  // Handle Google credential response
  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response.credential) {
        setFormErrors({ validToken: 'Google login failed. Please try again.' });
        return;
      }

      try {
        const res = await API.post('/auth/googleLogin', {
          credential: response.credential
        });

        const { token, id: userId, ...restData } = res.data;

        if (!token || !userId) {
          throw new Error('Invalid response from server');
        }

        const resData = formatResponseData(restData);

        // Store authentication data
        localStorage.setItem('token', token);
        localStorage.setItem('id', userId);
        localStorage.setItem('data', resData);

        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } catch (error) {
        console.error('Google login error:', error);
        setFormErrors({ 
          validToken: 'Google login failed. Please try again.' 
        });
      }
    },
    [formatResponseData]
  );

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize and render Google button
  useEffect(() => {
    const googleAccounts = getGoogleAccounts();
    
    if (!isGoogleLoaded || !googleAccounts) {
      return;
    }

    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    
    if (!googleClientId) {
      console.error('REACT_APP_GOOGLE_CLIENT_ID is not set');
      return;
    }

    // Initialize Google Identity Services
    googleAccounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredentialResponse,
    });

    // Render the button with custom styling
    const buttonDiv = document.getElementById('googleSignInButton');
    if (buttonDiv) {
      googleAccounts.id.renderButton(buttonDiv, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonDiv.offsetWidth || 300,
      });
    }
  }, [isGoogleLoaded, handleCredentialResponse]);

  // Initial setup
  useEffect(() => {
    window.scrollTo({ top: 0 });
    fetchUserProfile(id as string);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API URL:', process.env.REACT_APP_API_URL);
  }, [fetchUserProfile]);

  // Handle URL parameter
  useEffect(() => {
    if (id) {
      fetchUserProfile(id);
    }
  }, [id, fetchUserProfile]);

  // Sync form data with users prop
  useEffect(() => {
    if (users?.username || users?.password) {
      setFormData({
        username: users.username || '',
        password: users.password || ''
      });
    }
  }, [users]);

  // Validate form fields
  const validateFields = useCallback((): boolean => {
    const { username, password } = formData;
    const errors: FormErrorsType = {};

    if (!username || username.length < MIN_USERNAME_LENGTH) {
      errors.username = `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }

    setFormErrors({});
    return true;
  }, [formData]);

  // Handle input changes
  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Clear error for this field when user starts typing
      if (formErrors[name as keyof FormErrorsType]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
      }
    },
    [formErrors]
  );

  // Handle form submission
const handleSubmit = useCallback(
  async (event: FormEvent<HTMLFormElement>) => {  // ✅ Make it async
    event.preventDefault();

    if (!validateFields()) {
      return;
    }

    try {
      // ✅ Await the login action
      await loginUser({
        username: formData.username,
        password: formData.password
      });

      // ✅ Token is now in localStorage after successful login
      const token = localStorage.getItem('token');
      
      if (token && token !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } else {
        setTimeout(() => {
          setFormErrors({
            form: 'Login failed. Please try again.'  // ✅ Changed from validToken to form
          });
        }, 3000);
      }
    } catch (error) {
      // ❌ Login failed - show error
      setFormErrors({
        form: error instanceof Error ? error.message : 'Incorrect username and/or password'
      });
    }
  },
  [formData, validateFields, loginUser, navigate]
);

  // Redirect if user is already logged in
  if (user?.data?.id) {
    setTimeout(() => {
      window.location.href = '/';
      return <Navigate to="/" replace />;
    }, 800);
  }

  return (
    <main id="signin" className={styles.signupMain}>
      <section className={styles.wrapper}>
        <h1>
          Sign In
          <div 
            className={styles.graphic} 
            aria-label="Small burgundy, rectangle graphic." 
          />
        </h1>

        <form method="POST" onSubmit={handleSubmit}>
          <FormErrors formErrors={formErrors} />

          <fieldset>
            {/* <div className={styles.googleBTN}>
              <div id="googleSignInButton" style={{ width: '100%' }} />
            </div>

            <section className={styles.orSec}>
              <hr />
              <span>or</span>
              <hr />
            </section> */}

            <label htmlFor="username">
              Username
              <input
                id="username"
                className={styles.inputBorder}
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                aria-invalid={!!formErrors.username}
                aria-describedby={formErrors.username ? 'username-error' : undefined}
              />
            </label>

            <label htmlFor="password">
              Password
              <input
                id="password"
                className={styles.inputBorder}
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                aria-invalid={!!formErrors.password}
                aria-describedby={formErrors.password ? 'password-error' : undefined}
              />
            </label>
          </fieldset>

          <input
            id="submitQ1"
            className={styles.submit}
            type="submit"
            value="Submit"
          />

          <section>
            <p>
              <Link to="/signup">Need an Account?</Link>
            </p>
            <p>&nbsp;|&nbsp;</p>
            <p>
              <Link to="/forms/emailpasswordreset">Forgot Password</Link>
            </p>
          </section>
        </form>
      </section>

      <figure className={styles.signBCK} />
    </main>
  );
};

export default Signin;