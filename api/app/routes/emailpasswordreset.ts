import { Router, Request, Response, NextFunction } from 'express';
import debug from 'debug';
import { Model, ModelStatic } from 'sequelize';
import * as emailPasswordResetCtrl from '../controllers/emailpasswordreset';
import * as validationCtrl from '../controllers/validation';

const jwt = require('jsonwebtoken');

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

const models = require('../models') as { Users: UserModel };
const { Users } = models;

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
  const expiresIn = process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1h';
  return jwt.sign({ id: userId }, secret, { expiresIn });
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
// ROUTE HANDLERS
// ============================================================================

const passwordResetHandler = async (
  req: Request<Record<string, never>, PasswordResetSuccessResponse | ErrorResponse, PasswordResetRequestBody>,
  res: Response<PasswordResetSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate email
    const emailValidation = validateEmail(req.body.email);

    if (!emailValidation.isValid) {
      sendError(res, 400, emailValidation.error!);
      return;
    }

    const email = emailValidation.value!;

    // Find user by email
    const user = await findUserByEmail(email);

    if (!user) {
      // Security: Don't reveal if email exists or not
      sendError(res, 404, 'User not found');
      return;
    }

    // Validate JWT secret
    const secretValidation = validateJwtSecret();

    if (!secretValidation.isValid) {
      logError('JWT configuration', new Error(secretValidation.error));
      sendError(res, 500, 'Server configuration error');
      return;
    }

    // Generate password reset token
    const token = generatePasswordResetToken(user.id, secretValidation.value!);

    // Send success response with token
    sendSuccess(res, 'Password reset token generated', { token });

  } catch (error) {
    if (error instanceof Error) {
      logError('Password reset', error);
      const { message, stack } = handleError(error);
      sendError(res, 500, message, stack);
    } else {
      sendError(res, 500, 'An unexpected error occurred');
    }
  }
};

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /emailpasswordreset
// Get password reset page or information
router.get(
  '/emailpasswordreset',
  emailPasswordResetCtrl.emailPasswordReset
);

// POST /emailpasswordreset
// Request password reset token
router.post(
  '/emailpasswordreset',
  validationCtrl.validate('signin'),
  passwordResetHandler
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;