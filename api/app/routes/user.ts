import { Router, Request, Response, NextFunction } from 'express';
import { requireAccount } from '../middleware/auth';
import { ownsParam } from '../middleware/ownership';
import { 
  getUser, 
  getOneById, 
  updateUser, 
  removeUser,
  createUser
} from '../controllers/user';
import { validate } from '../controllers/validation';
import db from '../models';
import type { UserInstance } from '../models/users';
import type { SafeUser } from '../types/api';

// console.log('🔍 Available models:', Object.keys(db));
// console.log('🔍 Users model:', db.Users);
// console.log('🔍 Full db object:', db);

interface FindUserRequestBody {
  username: string;
}

interface UserSuccessResponse {
  type: 'success';
  message: string;
  data: SafeUser;
  timestamp: string;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}

interface StringValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

const ENV = {
  nodeEnv: process.env.NODE_ENV || 'development',
};

const validateUsername = (
  username: string | undefined | null
): StringValidationResult => {
  if (!username || typeof username !== 'string' || !username.trim()) {
    return {
      isValid: false,
      error: 'Username is required'
    };
  }

  if (username.trim().length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters'
    };
  }

  return {
    isValid: true,
    value: username.trim()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findUserByUsername = async (
  username: string
): Promise<UserInstance | null> => {
  // ✅ Access directly from db instead
  const Users = db.Users;
  
  if (!Users) {
    throw new Error('Users model not loaded');
  }
  
  return Users.findOne({ 
    where: { username: username.toLowerCase() } 
  });
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/** Never the password hash or access token: this route needs no sign-in */
const safeUser = (user: UserInstance): SafeUser => {
  const { password, accesstoken, ...safe } = user.toJSON();
  return safe;
};

const buildSuccessResponse = (
  message: string,
  data: UserInstance
): UserSuccessResponse => ({
  type: 'success',
  message,
  data: safeUser(data),
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
  res: Response<UserSuccessResponse | ErrorResponse>,
  message: string,
  data: UserInstance
): void => {
  res.status(200).json(buildSuccessResponse(message, data));
};

const sendError = (
  res: Response<UserSuccessResponse | ErrorResponse>,
  statusCode: number,
  message: string,
  stack?: string
): void => {
  res.status(statusCode).json(buildErrorResponse(message, statusCode, stack));
};

const handleError = (error: Error): { message: string; stack?: string } => ({
  message: error.message || 'An unexpected error occurred',
  ...(ENV.nodeEnv === 'development' && { stack: error.stack })
});

const findUserHandler = async (
  req: Request<Record<string, never>, UserSuccessResponse | ErrorResponse, FindUserRequestBody>,
  res: Response<UserSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Destructure request body
    const { username } = req.body;

    // Validate username
    const { isValid, value, error } = validateUsername(username);

    if (!isValid) {
      sendError(res, 400, error!);
      return;
    }

    // Find user
    const user = await findUserByUsername(value!);

    if (!user) {
      sendError(res, 404, 'User not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'User found', user);

  } catch (error) {
    if (error instanceof Error) {
      const { message, stack } = handleError(error);
      sendError(res, 500, message, stack);
    } else {
      sendError(res, 500, 'An unexpected error occurred');
    }
  }
};

const router = Router();

// GET /users/signups/:userId
// Get a specific user by user ID
router.get(
  '/signups/:userId',
  requireAccount,
  ownsParam('userId'),
  getUser
);

// POST /users
router.post(
  '/',
  createUser
);

// Find a user by username (search endpoint)
router.post(
  '/search',
  validate('signup'),
  findUserHandler
);

// GET /users/:id
// Get a single user by ID
router.get(
  '/:id',
  requireAccount,
  ownsParam('id'),
  getOneById
);

// PUT /users/:id
// Update a user
router.put(
  '/:id',
  requireAccount,
  ownsParam('id'),
  updateUser
);

// DELETE /users/:id
// Delete a user
// Only you can see, change or delete your own account
router.delete(
  '/:id',
  requireAccount,
  ownsParam('id'),
  removeUser
);

export default router;