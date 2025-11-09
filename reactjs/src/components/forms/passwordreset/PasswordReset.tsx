// PasswordReset.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../../API';
import FormErrors from '../../../formErrors';
import styles from './styles.module.css';
import { ContainerProps } from './container';

interface FormErrorsState {
  password: string;
  confirmed?: string;
}

interface TokenValidationResponse {
  message: string;
  username: string;
}

const MIN_PASSWORD_LENGTH = 8;

const PasswordReset: React.FC<ContainerProps> = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    password: '',
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;

      try {
        const response = await API.get<TokenValidationResponse>(`/passwordreset/${token}`);
        if (response.data.message === 'Password reset OK') {
          setUsername(response.data.username);
        }
      } catch (error) {
        console.error('Token validation error:', error);
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

    try {
      await API.put('/passwordreset/passwordResetUpdate', {
        username,
        password,
      });

      navigate('/signin');
    } catch (error) {
      console.error('Password reset error:', error);
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

        <form method="POST" onSubmit={handleSubmit}>
          <FormErrors formErrors={formErrors} />

          <fieldset>
            <label htmlFor="password">
              Password
              <input
                id="password"
                className={styles.inputBorder}
                type="password"
                name="password"
                value={password}
                onChange={handleInputChange}
                minLength={MIN_PASSWORD_LENGTH}
                required
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
              />
            </label>
          </fieldset>

          <input
            id="submitQ1"
            className={styles.submit}
            type="submit"
            value="Submit"
          />
        </form>
      </section>

      <figure className={styles.signBCK} />
    </main>
  );
};

export default PasswordReset;