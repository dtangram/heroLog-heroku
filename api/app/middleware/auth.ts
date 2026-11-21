import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    username?: string;
    email?: string;
    /** true for a guest session (no account), see services/guestSession.ts */
    guest?: boolean;
  };
}

interface JwtPayload {
  id: string;
  username?: string;
  email?: string;
  guest?: boolean;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
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
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
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
  _res: Response,
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
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = decoded;
  } catch (error) {
    // Token invalid, continue without user
    console.log('Invalid token, continuing without auth');
  }
  
  next();
};

const readToken = (req: Request): JwtPayload | null => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    return decoded?.id ? decoded : null;
  } catch {
    return null;
  }
};

/**
 * Who is asking: a signed-in user or a guest. Both get a token (guests from
 * POST /auth/guest), so a collection can be limited to its owner without
 * making guests sign up. Collection routes check ownership after this.
 */
export const requireIdentity = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const identity = readToken(req);

  if (!identity) {
    res.status(401).json({ success: false, error: 'Your session has expired. Please refresh the page or sign in.' });
    return;
  }

  req.user = identity;
  next();
};

/** Like requireIdentity, but only for signed-in accounts (not guests). */
export const requireAccount = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const identity = readToken(req);

  if (!identity || identity.guest) {
    res.status(401).json({ success: false, error: 'Please sign in to continue.' });
    return;
  }

  req.user = identity;
  next();
};

export type { AuthRequest };