import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import debug from 'debug';
import { Model, ModelStatic } from 'sequelize';
import * as authCtrl from '../controllers/auth';
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
}

interface UserInstance extends Model<UserAttributes>, UserAttributes {}

type UserModel = ModelStatic<UserInstance>;

interface LoginRequestBody {
  login: string;
  password: string;
}

interface LoginSuccessResponse {
  type: 'success';
  message: string;
  data: LoginResponseData;
  timestamp: string;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}

interface LoginResponseData {
  token: string;
}

interface StringValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

interface CredentialsValidationResult {
  isValid: boolean;
  value?: {
    login: string;
    password: string;
  };
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const log = debug('api:logging');

const ENV = {
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
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

const validateLoginCredentials = (
  login: string | undefined | null,
  password: string | undefined | null
): CredentialsValidationResult => {
  if (!login || typeof login !== 'string' || !login.trim()) {
    return {
      isValid: false,
      error: 'Login is required'
    };
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return {
      isValid: false,
      error: 'Password is required'
    };
  }

  return {
    isValid: true,
    value: {
      login: login.trim(),
      password
    }
  };
};

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

const findUserByLogin = async (
  login: string
): Promise<UserInstance | null> =>
  Users.findOne({ where: { username: login.toLowerCase() } });

const verifyUserPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> =>
  bcrypt.compare(password, hashedPassword);

const generateAuthToken = (
  userId: string,
  secret: string
): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: LoginResponseData
): LoginSuccessResponse => ({
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
  data: LoginResponseData
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

const loginHandler = async (
  req: Request<Record<string, never>, LoginSuccessResponse | ErrorResponse, LoginRequestBody>,
  res: Response<LoginSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate credentials
    const credentialsValidation = validateLoginCredentials(
      req.body.login,
      req.body.password
    );

    if (!credentialsValidation.isValid) {
      sendError(res, 400, credentialsValidation.error!);
      return;
    }

    const { login, password } = credentialsValidation.value!;

    // Find user
    const user = await findUserByLogin(login);

    if (!user) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    // Validate user has password
    if (!user.password) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    // Verify password
    const isPasswordValid = await verifyUserPassword(password, user.password);

    if (!isPasswordValid) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    // Validate JWT secret
    const secretValidation = validateJwtSecret();

    if (!secretValidation.isValid) {
      logError('JWT configuration', new Error(secretValidation.error));
      sendError(res, 500, 'Server configuration error');
      return;
    }

    // Generate token
    const token = generateAuthToken(user.id, secretValidation.value!);

    // Send success response
    sendSuccess(res, 'User logged in successfully', { token });

  } catch (error) {
    if (error instanceof Error) {
      logError('Login', error);
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

router.post(
  '/login',
  validationCtrl.validate('signin'),
  loginHandler
);

router.post('/googleLogin', authCtrl.googleLogin);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;