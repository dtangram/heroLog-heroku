import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import debug from 'debug';
import { Model, ModelStatic } from 'sequelize';
import * as passwordResetCtrl from '../controllers/passwordreset';
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
  password: string;
  token?: string;
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
  success: boolean;
}

interface StringValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

interface TokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const log = debug('api:logging');

const ENV = {
  jwtSecret: process.env.JWT_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  minSecretLength: 32,
  minPasswordLength: 8,
  bcryptRounds: 12,
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

const validatePassword = (
  password: string | undefined | null
): StringValidationResult => {
  if (!password || typeof password !== 'string' || !password.trim()) {
    return {
      isValid: false,
      error: 'Password is required'
    };
  }

  if (password.length < ENV.minPasswordLength) {
    return {
      isValid: false,
      error: `Password must be at least ${ENV.minPasswordLength} characters`
    };
  }

  return {
    isValid: true,
    value: password
  };
};

const validateToken = (
  token: string | undefined | null
): StringValidationResult => {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      isValid: false,
      error: 'Reset token is required'
    };
  }

  return {
    isValid: true,
    value: token.trim()
  };
};

// ============================================================================
// TOKEN OPERATIONS
// ============================================================================

const verifyResetToken = (
  token: string,
  secret: string
): StringValidationResult => {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    
    if (!decoded.id) {
      return {
        isValid: false,
        error: 'Invalid token payload'
      };
    }

    return {
      isValid: true,
      value: decoded.id
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        isValid: false,
        error: 'Reset token has expired'
      };
    }
    
    return {
      isValid: false,
      error: 'Invalid reset token'
    };
  }
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findUserById = async (
  userId: string
): Promise<UserInstance | null> =>
  Users.findOne({ where: { id: userId } });

const hashPassword = async (
  password: string
): Promise<string> =>
  bcrypt.hash(password, ENV.bcryptRounds);

const updateUserPassword = async (
  user: UserInstance,
  hashedPassword: string
): Promise<UserInstance> =>
  user.update({ password: hashedPassword });

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
    // Validate password
    const passwordValidation = validatePassword(req.body.password);

    if (!passwordValidation.isValid) {
      sendError(res, 400, passwordValidation.error!);
      return;
    }

    const newPassword = passwordValidation.value!;

    // Validate token
    const tokenValidation = validateToken(req.body.token);

    if (!tokenValidation.isValid) {
      sendError(res, 400, tokenValidation.error!);
      return;
    }

    const token = tokenValidation.value!;

    // Validate JWT secret
    const secretValidation = validateJwtSecret();

    if (!secretValidation.isValid) {
      logError('JWT configuration', new Error(secretValidation.error));
      sendError(res, 500, 'Server configuration error');
      return;
    }

    // Verify reset token
    const tokenVerification = verifyResetToken(token, secretValidation.value!);

    if (!tokenVerification.isValid) {
      sendError(res, 401, tokenVerification.error!);
      return;
    }

    const userId = tokenVerification.value!;

    // Find user
    const user = await findUserById(userId);

    if (!user) {
      sendError(res, 404, 'User not found');
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await updateUserPassword(user, hashedPassword);

    // Send success response
    sendSuccess(res, 'Password reset successfully', { success: true });

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

// GET /passwordreset/:token
// Verify reset token and show reset form
router.get(
  '/:token',
  passwordResetCtrl.passwordReset
);

// POST /passwordreset
// Reset password with token
router.post(
  '/',
  validationCtrl.validate('signin'),
  passwordResetHandler
);

// PUT /passwordreset/passwordResetUpdate
// Update password (alternative endpoint)
router.put(
  '/passwordResetUpdate',
  passwordResetCtrl.passwordResetUpdate
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;