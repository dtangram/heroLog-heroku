/** Limits and patterns the forms check before sending, kept the same as the API's. */

export const EMAIL_REGEX = /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i;

/** What number-only fields accept while typing */
export const DIGITS_ONLY = /^[0-9]*$/;

export const MIN_NAME_LENGTH = 2;
export const MIN_USERNAME_LENGTH = 2;

/**
 * The password rule, the same one the API enforces (controllers/user.ts and
 * passwordreset.ts): 8 to 128 characters, with at least one letter and one
 * number.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const PASSWORD_RULE = 'At least 8 characters, with a letter and a number.';

export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 500;

/** Same range the API accepts (isValidYear in api/app/controllers/comicbook.ts) */
export const MIN_YEAR = 1900;
export const MAX_YEAR_LENGTH = 4;

/** The shortest title each form accepts */
export const MIN_SALE_TITLE_LENGTH = 2;
export const MIN_WISH_TITLE_LENGTH = 1;

/** How long the success message shows before leaving the form. */
export const REDIRECT_DELAY = 1500;