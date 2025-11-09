import React from 'react';
import styles from './styles.module.css';

interface SuccessDisplayProps {
  variant?: 'default' | 'email';
  message?: string;
}

const SuccessDisplay = ({ variant = 'default', message }: SuccessDisplayProps) => {
  const defaultMessages = {
    default: 'Your form submitted successfully.',
    email: 'Check your email to reset your password.'
  };

  const displayMessage = message || defaultMessages[variant];

  return (
    <div className={styles.successSection} role="alert">
      <strong>Awesome! </strong>
      {displayMessage}
    </div>
  );
};

export default SuccessDisplay;