import { Request, Response, NextFunction } from 'express';
import debug from 'debug';
import jwt from 'jsonwebtoken';
import { verifySessionToken } from './tokens';
const log = debug('api:auth');

interface AuthErrorResponse {
  loggedIn: false;
  error: string;
  timestamp: string;
}

interface StringValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const ENV = {
  jwtSecret: process.env.JWT_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};

const validateJwtSecret = (): StringValidationResult => {
  if (!ENV.jwtSecret) {
    return {
      isValid: false,
      error: 'JWT_SECRET is not configured'
    };
  }

  return {
    isValid: true,
    value: ENV.jwtSecret
  };
};

const extractToken = (authHeader: string | undefined): StringValidationResult => {
  if (!authHeader) {
    return {
      isValid: false,
      error: 'Authorization header is required'
    };
  }

  // Support both "Bearer <token>" and direct token
  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1].trim();
    
    if (!token) {
      return {
        isValid: false,
        error: 'Token is empty'
      };
    }
    
    return {
      isValid: true,
      value: token
    };
  }

  // Fallback: treat entire header as token
  const token = authHeader.trim();
  
  if (!token) {
    return {
      isValid: false,
      error: 'Token is empty'
    };
  }

  return {
    isValid: true,
    value: token
  };
};

const verifyToken = (
  token: string,
  secret: string
): StringValidationResult => {
  try {
    const decoded = verifySessionToken(token, secret);

    return {
      isValid: true,
      value: decoded.id
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        isValid: false,
        error: 'Token has expired'
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        isValid: false,
        error: 'Invalid token'
      };
    }

    return {
      isValid: false,
      error: 'Token verification failed'
    };
  }
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildAuthErrorResponse = (error: string): AuthErrorResponse => ({
  loggedIn: false,
  error,
  timestamp: new Date().toISOString()
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

const protectedRoute = (
  req: Request,
  res: Response<AuthErrorResponse>,
  next: NextFunction
): Response<AuthErrorResponse> | void => {
  try {
    // Validate JWT secret configuration
    const secretValidation = validateJwtSecret();

    if (!secretValidation.isValid) {
      log('JWT configuration error:', secretValidation.error);
      return res.status(500).json(
        buildAuthErrorResponse('Server configuration error')
      );
    }

    // Extract token from Authorization header
    const tokenValidation = extractToken(req.headers.authorization);

    if (!tokenValidation.isValid) {
      return res.status(401).json(
        buildAuthErrorResponse(tokenValidation.error!)
      );
    }

    // Verify token and extract user ID
    const verificationResult = verifyToken(
      tokenValidation.value!,
      secretValidation.value!
    );

    if (!verificationResult.isValid) {
      return res.status(401).json(
        buildAuthErrorResponse(verificationResult.error!)
      );
    }

    // Attach user ID to request
    req.userId = verificationResult.value!;

    // Continue to next middleware
    return next();

  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Authentication error';

    log('Protected route error:', errorMessage);

    return res.status(500).json(
      buildAuthErrorResponse('Authentication failed')
    );
  }
};

export default protectedRoute;