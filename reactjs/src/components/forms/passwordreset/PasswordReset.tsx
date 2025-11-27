import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../../API';
import FormErrors from '../../../formErrors';
import styles from './styles.module.css';
import { ContainerProps } from './container';

interface FormErrorsState {
  password: string;
  confirmed?: string;
  general?: string;
}

// ✅ Fix interface to match actual API response
interface TokenValidationResponse {
  success: boolean;
  message: string;
  data: {
    username: string;
    email: string;
  };
}

const MIN_PASSWORD_LENGTH = 8;

const PasswordReset: React.FC<ContainerProps> = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    password: '',
  });

  useEffect(() => {
  const validateToken = async () => {
    console.log('🔍 Token from URL:', token);  // ✅ Check if token exists
    
    if (!token) {
      console.log('❌ No token found');
      setFormErrors({ password: '', general: 'Invalid reset link' });
      return;
    }
    
    try {
      console.log('🔍 Calling API:', `/api/passwordreset/${token}`);
      
      const response = await API.get<TokenValidationResponse>(`/api/passwordreset/${token}`);
      
      console.log('🔍 Full response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Success:', response.data.success);
      console.log('🔍 Username:', response.data.data?.username);
      
      if (response.data.success && response.data.data?.username) {
        console.log('✅ Setting username and tokenValid');
        setUsername(response.data.data.username);
        setTokenValid(true);
      } else {
        console.log('❌ Invalid response structure');
        setFormErrors({ password: '', general: 'Invalid or expired reset link' });
      }
    } catch (error: any) {
      console.error('❌ Token validation error:', error);
      console.error('❌ Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Invalid or expired reset link';
      setFormErrors({ password: '', general: errorMessage });
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
    const isPasswordValid = password.length >= MIN_PASSWORD_LENGTH;
    const doPasswordsMatch = password === passwordConfirm;
    
    setFormErrors({
      password: isPasswordValid ? '' : `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
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
      
      await API.put('/api/passwordreset/passwordResetUpdate', {
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
    <main id="signin" className={styles.signupMain}>
      <section className={styles.wrapper}>
        <h1>
          Reset Password
          <div 
            className={styles.graphic} 
            aria-label="Small burgundy rectangle graphic" 
          />
        </h1>
        
        {!tokenValid ? (
          <section className={styles.resetExpired}>
            <FormErrors formErrors={formErrors} />
            <p>Validating reset link...</p>
          </section>
        ) : (
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
                />
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
    </main>
  );
};

export default PasswordReset;