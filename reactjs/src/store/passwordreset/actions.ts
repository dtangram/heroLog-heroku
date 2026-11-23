import API from '../../API';
import {
  REQ_PASSWORDRESET_PENDING,
  REQ_PASSWORDRESET_SUCCESS,
  REQ_PASSWORDRESET_ERROR,
  UPDATE_PASSWORDRESET_PENDING,
  UPDATE_PASSWORDRESET_SUCCESS,
  UPDATE_PASSWORDRESET_ERROR,
} from '../actionTypes';

interface PasswordResetData {
  id: string;
  token: string;
  email: string;
  expiresAt: string;
  isValid: boolean;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: PasswordResetData }>;
  payload: { token: string; newPassword?: string };
}

const isValidToken = (token: string): boolean => {
  // Token should be a non-empty string with reasonable length
  const trimmedToken = token?.trim();
  return Boolean(trimmedToken && trimmedToken.length >= 10);
};

const isValidPassword = (password: string): boolean => {
  // Password should be at least 8 characters
  return password?.length >= 8;
};

export const passwordResetUser = (token: string): APIAction => {
  const trimmedToken = token?.trim();
 
  if (!trimmedToken || !isValidToken(trimmedToken)) {
    throw new Error('Invalid password reset token');
  }

  return {
    types: [
      REQ_PASSWORDRESET_PENDING,
      REQ_PASSWORDRESET_SUCCESS,
      REQ_PASSWORDRESET_ERROR,
    ],
    callAPI: () => API.get(`/passwordreset/${trimmedToken}`),
    payload: { token: trimmedToken },
  };
};

export const updatePasswordResetUser = (
  token: string,
  newPassword?: string
): APIAction => {
  const trimmedToken = token?.trim();
 
  if (!trimmedToken || !isValidToken(trimmedToken)) {
    throw new Error('Invalid password reset token');
  }

  if (newPassword && !isValidPassword(newPassword)) {
    throw new Error('Password must be at least 8 characters long');
  }

  return {
    types: [
      UPDATE_PASSWORDRESET_PENDING,
      UPDATE_PASSWORDRESET_SUCCESS,
      UPDATE_PASSWORDRESET_ERROR,
    ],
    callAPI: () => API.put(`/passwordreset/${trimmedToken}`, {
      ...(newPassword && { newPassword }),
    }),
    payload: {
      token: trimmedToken,
      ...(newPassword && { newPassword }),
    },
  };
};

export default passwordResetUser;