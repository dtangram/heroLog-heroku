import { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ApiResult } from '../types/api';
import type { JsonObject } from '../types/json';
import { SessionToken, verifySessionToken } from '../utils/tokens';

/**
 * A request whose token has been read: who is asking, and the JSON body they
 * sent. Its reply can be any JSON object, so the same middleware can guard
 * routes that reply in different shapes.
 */
interface AuthRequest extends Request<ParamsDictionary, object, JsonObject | undefined> {
  user?: SessionToken;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response<ApiResult>,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
    return;
  }

  try {
    const decoded = verifySessionToken(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
    return;
  }
};

// ✅ Add optional authentication - allows requests without tokens
export const optionalAuth = (
  req: AuthRequest,
  _res: Response<ApiResult>,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // If no token, continue without user
  if (!token) {
    next();
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    next();
    return;
  }

  try {
    const decoded = verifySessionToken(token, jwtSecret);
    req.user = decoded;
  } catch (error) {
    // Token invalid, continue without user
    console.log('Invalid token, continuing without auth');
  }
  
  next();
};

const readToken = (req: Request): SessionToken | null => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;

  try {
    const decoded = verifySessionToken(token, jwtSecret);
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Who is asking: a signed-in user or a guest. Both get a token (guests from
 * POST /auth/guest), so a collection can be limited to its owner without
 * making guests sign up. Collection routes check ownership after this.
 */
export const requireIdentity = (req: AuthRequest, res: Response<ApiResult>, next: NextFunction): void => {
  const identity = readToken(req);

  if (!identity) {
    res.status(401).json({ success: false, error: 'Your session has expired. Please refresh the page or sign in.' });
    return;
  }

  req.user = identity;
  next();
};

/** Like requireIdentity, but only for signed-in accounts (not guests). */
export const requireAccount = (req: AuthRequest, res: Response<ApiResult>, next: NextFunction): void => {
  const identity = readToken(req);

  if (!identity || identity.guest) {
    res.status(401).json({ success: false, error: 'Please sign in to continue.' });
    return;
  }

  req.user = identity;
  next();
};

export type { AuthRequest };