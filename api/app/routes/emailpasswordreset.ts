import { Router, Request, Response, NextFunction } from 'express';
import debug from 'debug';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Model, ModelStatic } from 'sequelize';
import * as emailPasswordResetCtrl from '../controllers/emailpasswordreset';
import db from '../models';


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserAttributes {
  id: string;
  username: string;
  email: string;
  password: string | null;
  firstname: string;
  lastname: string;
  type: 'regular' | 'fixer';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserInstance extends Model<UserAttributes>, UserAttributes {}

type UserModel = ModelStatic<UserInstance>;

interface PasswordResetRequestBody {
  email: string;
}

interface PasswordResetSuccessResponse {
  type: 'success';
  message: string;
  data: PasswordResetResponseData;
  timestamp: string;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}

interface PasswordResetResponseData {
  token: string;
}

interface StringValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const log = debug('api:logging');

const ENV = {
  jwtSecret: process.env.JWT_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  minSecretLength: 32,
};

// ============================================================================
// MODELS
// ============================================================================

const Users = (db as any).Users as UserModel;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateJwtSecret = (): StringValidationResult => {
  if (!ENV.jwtSecret) {
    return {
      isValid: false,
      error: 'JWT_SECRET is not configured'
    };
  }

  if (ENV.jwtSecret.length < ENV.minSecretLength) {
    return {
      isValid: false,
      error: `JWT_SECRET must be at least ${ENV.minSecretLength} characters`
    };
  }

  return {
    isValid: true,
    value: ENV.jwtSecret
  };
};

const validateEmail = (
  email: string | undefined | null
): StringValidationResult => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return {
      isValid: false,
      error: 'Email is required'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.trim();

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  return {
    isValid: true,
    value: trimmedEmail.toLowerCase()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findUserByEmail = async (
  email: string
): Promise<UserInstance | null> =>
  Users.findOne({ where: { email: email.toLowerCase() } });

// ============================================================================
// TOKEN GENERATION
// ============================================================================

const generatePasswordResetToken = (
  userId: string,
  secret: string
): string => {
  return jwt.sign(
    { id: userId }, 
    secret, 
    { expiresIn: '1h' } as SignOptions
  );
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: PasswordResetResponseData
): PasswordResetSuccessResponse => ({
  type: 'success',
  message,
  data,
  timestamp: new Date().toISOString()
});

const buildErrorResponse = (
  message: string,
  statusCode: number,
  stack?: string
): ErrorResponse => ({
  type: 'error',
  message,
  statusCode,
  timestamp: new Date().toISOString(),
  ...(ENV.nodeEnv === 'development' && stack && { stack })
});

// ============================================================================
// RESPONSE SENDERS
// ============================================================================

const sendSuccess = (
  res: Response,
  message: string,
  data: PasswordResetResponseData
): void => {
  res.status(200).json(buildSuccessResponse(message, data));
};

const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  stack?: string
): void => {
  res.status(statusCode).json(buildErrorResponse(message, statusCode, stack));
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

const handleError = (error: Error): { message: string; stack?: string } => ({
  message: error.message || 'An unexpected error occurred',
  ...(ENV.nodeEnv === 'development' && { stack: error.stack })
});

const logError = (context: string, error: Error): void => {
  log(`${context} error:`, error.message);
};

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /emailpasswordreset
router.get('/', emailPasswordResetCtrl.emailPasswordReset);

// POST /emailpasswordreset
router.post('/', emailPasswordResetCtrl.emailPasswordReset);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;