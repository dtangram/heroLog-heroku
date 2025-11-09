import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    username?: string;
    email?: string;
  };
}

interface JwtPayload {
  id: string;
  username?: string;
  email?: string;
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

export type { AuthRequest };