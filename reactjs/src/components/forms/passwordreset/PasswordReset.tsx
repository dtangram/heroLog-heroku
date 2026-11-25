import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../../../API';
import FormErrors from '../../../formErrors';
import styles from './styles.module.css';
import { ContainerProps } from './container';
import { PASSWORD_RULE, passwordProblem } from '../../../utils/password';

interface FormErrorsState {
  password: string;
  confirmed?: string;
  general?: string;
}

// ✅ Fix interface to match actual API response
interface TokenValidationResponse {
  success: boolean;
  message: string;
  username: string;
  email: string;
}

const MIN_PASSWORD_LENGTH = 8;

const PasswordReset: React.FC<ContainerProps> = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // One state at a time: checking the link, the link works, or it doesn't
  const [linkStatus, setLinkStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    password: '',
  });

  useEffect(() => {
  const validateToken = async () => {
    console.log('🔍 Token from URL:', token);
    
    if (!token) {
      console.log('❌ No token found');
      setFormErrors({ password: '', general: 'Invalid reset link' });
      setLinkStatus('invalid');
      return;
    }
    
    try {
      console.log('🔍 Calling API:', `/passwordreset/${token}`);
      
      const response = await API.get<TokenValidationResponse>(`/passwordreset/${token}`);
      
      console.log('🔍 Response data:', response.data);
      
      // ✅ The API wrapper already unwraps, so response.data is the actual data object
      if (response.data && response.data.username) {
        console.log('✅ Setting username:', response.data.username);
        setUsername(response.data.username);
        setLinkStatus('valid');
      } else {
        console.log('❌ No username in response');
        setFormErrors({ password: '', general: 'Invalid or expired reset link' });
        setLinkStatus('invalid');
      }
    } catch (error: any) {
      console.error('❌ Token validation error:', error);
      const errorMessage = error.response?.data?.error || 'Invalid or expired reset link';
      setFormErrors({ password: '', general: errorMessage });
      setLinkStatus('invalid');
    }
  };
  
  validateToken();
}, [token]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    if (name === 'password') {
      setPassword(value);
    } else if (name === 'passwordConfirm') {
      setPasswordConfirm(value);
    }
    
    // Clear errors when typing
    setFormErrors(prev => ({ ...prev, [name]: '', general: '' }));
  };

  const validateFields = (): boolean => {
    // The same rule the API enforces
    const problem = passwordProblem(password);
    const isPasswordValid = !problem;
    const doPasswordsMatch = password === passwordConfirm;
    
    setFormErrors({
      password: problem,
      confirmed: doPasswordsMatch ? '' : 'Passwords do not match',
    });
    
    return isPasswordValid && doPasswordsMatch;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const isValid = validateFields();
    
    if (!isValid || !password || !passwordConfirm) {
      return;
    }
    
    // ✅ Check username is set
    if (!username) {
      setFormErrors({ password: '', general: 'Session expired. Please request a new reset link.' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔍 Submitting password reset for username:', username);  // Debug
      
      await API.put('/passwordreset/passwordResetUpdate', {
        username,
        password,
      });
      
      // Success - redirect to signin
      navigate('/signin');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to reset password. Please try again.';
      setFormErrors({ password: '', general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <article id="signin" className={styles.signupMain}>
      <section className={styles.wrapper}>
        <h1>
          Reset Your Password
          <span 
            className={styles.graphic} 
            aria-hidden="true" 
          />
        </h1>
        
        {linkStatus === 'checking' && (
          <section className={styles.resetExpired} role="status">
            <p>Checking your reset link…</p>
          </section>
        )}

        {linkStatus === 'invalid' && (
          <section className={styles.resetExpired}>
            <h2 className={styles.expiredHeading}>This link doesn't work</h2>
            <p>
              {formErrors.general || 'Invalid or expired reset link'}. Reset links only work once and expire after a
              while, so ask for a new one.
            </p>
            <Link className={styles.newLink} to="/forms/emailpasswordreset">
              Send me a new link
            </Link>
          </section>
        )}

        {linkStatus === 'valid' && (
          <form method="POST" onSubmit={handleSubmit}>
            <FormErrors formErrors={formErrors} />
            
            <fieldset>
              <label htmlFor="password">
                New Password
                <input
                  id="password"
                  className={styles.inputBorder}
                  type="password"
                  name="password"
                  value={password}
                  onChange={handleInputChange}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-describedby="resetPasswordRule"
                />
                <span id="resetPasswordRule" className={styles.hint}>
                  {PASSWORD_RULE}
                </span>
              </label>
            </fieldset>
            
            <fieldset>
              <label htmlFor="passwordConfirm">
                Confirm Password
                <input
                  id="passwordConfirm"
                  className={styles.inputBorder}
                  type="password"
                  name="passwordConfirm"
                  value={passwordConfirm}
                  onChange={handleInputChange}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  disabled={isLoading}
                />
              </label>
            </fieldset>
            
            <input
              id="submitQ1"
              className={styles.submit}
              type="submit"
              value={isLoading ? 'Resetting...' : 'Reset Password'}
              disabled={isLoading}
            />
          </form>
        )}
      </section>
      <figure className={styles.signBCK} />
    </article>
  );
};

export default PasswordReset;