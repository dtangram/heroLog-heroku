import jwt from 'jsonwebtoken';
import { z } from 'zod';

/**
 * Reading the tokens the API signs. jwt.verify checks the signature and
 * expiry but returns an untyped object, so each token's contents are checked
 * here too. A token with the wrong contents is treated as an invalid one
 * (jwt.JsonWebTokenError), the same as a bad signature.
 */

/** Who a session token belongs to (signed in at sign-in, or for a guest) */
export interface SessionToken {
  id: string;
  username?: string;
  email?: string;
  /** true for a guest session (no account), see services/guestSession.ts */
  guest?: boolean;
  iat?: number;
  exp?: number;
}

const sessionTokenSchema = z.object({
  id: z.string().min(1),
  username: z.string().optional(),
  email: z.string().optional(),
  guest: z.boolean().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

/** A password-reset link's token */
export interface PasswordResetToken {
  id: string;
  email: string;
  purpose: string;
  iat?: number;
  exp?: number;
}

const passwordResetTokenSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  purpose: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export const verifySessionToken = (token: string, secret: string): SessionToken => {
  const result = sessionTokenSchema.safeParse(jwt.verify(token, secret));
  if (!result.success) throw new jwt.JsonWebTokenError('Token is not a session token');
  return result.data;
};

export const verifyPasswordResetToken = (token: string, secret: string): PasswordResetToken => {
  const result = passwordResetTokenSchema.safeParse(jwt.verify(token, secret));
  if (!result.success) throw new jwt.JsonWebTokenError('Token is not a password reset token');
  return result.data;
};