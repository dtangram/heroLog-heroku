import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import FormErrors from '../../../formErrors';
import SuccessDisplay from '../success';
import styles from './styles.module.css';
import { ContainerProps } from './container';

interface FormErrorsState {
  email: string;
  validToken?: string;
}

const EMAIL_REGEX = /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i;

const EmailPasswordReset = ({
  emailpasswordreset,
  emailPasswordResetUser,  // Fixed: correct casing
}: ContainerProps) => {
  const { id } = useParams<{ id?: string }>();
 
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrorsState>({
    email: '',
  });
 
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      emailPasswordResetUser({ email: '' });  // Fixed: pass required param
    }
   
    inputRef.current?.focus();
  }, [id, emailPasswordResetUser]);

  useEffect(() => {
    if (emailpasswordreset?.email) {
      setEmail(emailpasswordreset.email);
    }
  }, [emailpasswordreset]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setEmail(value);
  };

  const validateFields = (): boolean => {
    const isEmailValid = EMAIL_REGEX.test(email);
   
    setFormErrors({
      email: isEmailValid ? '' : 'Email is invalid',
      validToken: !email || !isEmailValid ? 'Email is not found' : '',
    });
   
    return isEmailValid && email.length > 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
   
    const isValid = validateFields();
   
    if (!isValid || !EMAIL_REGEX.test(email)) {
      return;
    }

    try {
      await emailPasswordResetUser({ email });  // Fixed: correct casing
      setSuccessMessage('success');
    } catch (error) {
      console.error('Email reset error:', error);
    }
  };

  const showSuccess = !formErrors.email && successMessage === 'success';

  return (
    <main id="emailpassReset" className={styles.signupMain}>
      <section className={styles.wrapper}>
        <h1>
          Change Password
          <div
            className={styles.graphic}
            aria-label="Small burgundy rectangle graphic"
          />
        </h1>

        <div>
          {showSuccess && <SuccessDisplay variant="email" />}
        </div>

        <form method="POST" onSubmit={handleSubmit}>
          {successMessage !== 'success' && <FormErrors formErrors={formErrors} />}

          <fieldset>
            <label htmlFor="email">
              Enter Your Email
              <input
                ref={inputRef}
                id="email"
                className={styles.inputBorder}
                type="email"
                name="email"
                value={email}
                onChange={handleInputChange}
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

export default EmailPasswordReset;