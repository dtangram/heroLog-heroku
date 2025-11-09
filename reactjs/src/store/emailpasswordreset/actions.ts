import API from '../../API';
import {
  REQ_EMAILPASSWORDRESET_PENDING,
  REQ_EMAILPASSWORDRESET_SUCCESS,
  REQ_EMAILPASSWORDRESET_ERROR,
} from '../actionTypes';

interface EmailPasswordReset {
  email: string;
}

interface PasswordResetResponse {
  id: string;
  email: string;
  message: string;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: PasswordResetResponse }>;
  payload: { email: string };
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const emailPasswordResetUser = ({ email }: EmailPasswordReset): APIAction => {
  const trimmedEmail = email.trim().toLowerCase();
  
  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    throw new Error('Invalid email address');
  }

  return {
    types: [
      REQ_EMAILPASSWORDRESET_PENDING,
      REQ_EMAILPASSWORDRESET_SUCCESS,
      REQ_EMAILPASSWORDRESET_ERROR,
    ],
    callAPI: () => API.post('/emailpasswordreset', { email: trimmedEmail }),
    payload: { email: trimmedEmail },
  };
};

export default emailPasswordResetUser;