import { Router, Request, Response, NextFunction } from 'express';
import { Model, ModelStatic } from 'sequelize';
import { 
  getUser, 
  getRegular, 
  getFixer, 
  getOneById, 
  updateUser, 
  removeUser,
  createUser
} from '../controllers/user';
import { validate } from '../controllers/validation';
import db from '../models';

// console.log('🔍 Available models:', Object.keys(db));
// console.log('🔍 Users model:', db.Users);
// console.log('🔍 Full db object:', db);

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
  profilePic?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserInstance extends Model<UserAttributes>, UserAttributes {}

type UserModel = ModelStatic<UserInstance>;

interface FindUserRequestBody {
  username: string;
}

interface UserSuccessResponse {
  type: 'success';
  message: string;
  data: UserInstance;
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

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENV = {
  nodeEnv: process.env.NODE_ENV || 'development',
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

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
  const Users = db.Users as UserModel;
  
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

const buildSuccessResponse = (
  message: string,
  data: UserInstance
): UserSuccessResponse => ({
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
  data: UserInstance
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

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

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

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

const router = Router();

// GET /users/signups/:userId
// Get a specific user by user ID
router.get(
  '/signups/:userId',
  getUser
);

// GET /users/regular
// Get all regular type users
router.get(
  '/regular',
  getRegular
);

// GET /users/fixer
// Get all fixer type users
router.get(
  '/fixer',
  getFixer
);

// POST /users
router.post(
  '/',
  validate('signup'),
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
  getOneById
);

// PUT /users/:id
// Update a user
router.put(
  '/:id',
  updateUser
);

// DELETE /users/:id
// Delete a user
router.delete(
  '/:id',
  removeUser
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;