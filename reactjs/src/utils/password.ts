import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../constants/forms';

/** What's wrong with a password, or '' if it's fine */
export const passwordProblem = (password: string): string => {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`;
  if (!/[a-zA-Z]/.test(password)) return 'Password must include a letter';
  if (!/\d/.test(password)) return 'Password must include a number';
  return '';
};