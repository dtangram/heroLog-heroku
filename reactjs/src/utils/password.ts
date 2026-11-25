/**
 * The password rule, the same one the API enforces (controllers/user.ts and
 * passwordreset.ts): 8 to 128 characters, with at least one letter and one
 * number. Forms check it before sending, so people see the rule up front
 * instead of a rejection from the server.
 */
export const PASSWORD_RULE = 'At least 8 characters, with a letter and a number.';

/** What's wrong with a password, or '' if it's fine */
export const passwordProblem = (password: string): string => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must be 128 characters or fewer';
  if (!/[a-zA-Z]/.test(password)) return 'Password must include a letter';
  if (!/\d/.test(password)) return 'Password must include a number';
  return '';
};