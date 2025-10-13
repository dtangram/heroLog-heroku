import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { Model, ModelStatic } from 'sequelize';
import {
  getRegular,
  getVariant,
  getWishLists,
  getOneById,
  updateWishList,
  removeWishList
} from '../controllers/wishlist';
import { validate } from '../controllers/validation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WishListAttributes {
  id: string;
  comicBookTitle: string;
  issueNumber?: string;
  variant?: boolean;
  wishUsersId: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt?: Date;
  updatedAt?: Date;
}

interface WishListInstance 
  extends Model<WishListAttributes>, 
  WishListAttributes {}

type WishListModel = ModelStatic<WishListInstance>;

interface FindWishListRequestBody {
  comicBookTitle: string;
}

interface WishListSuccessResponse {
  type: 'success';
  message: string;
  data: WishListInstance;
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
// MODELS
// ============================================================================

const models = require('../models') as { 
  WishLists: WishListModel;
};
const { WishLists } = models;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateComicBookTitle = (
  comicBookTitle: string | undefined | null
): StringValidationResult => {
  if (!comicBookTitle || typeof comicBookTitle !== 'string' || !comicBookTitle.trim()) {
    return {
      isValid: false,
      error: 'Comic book title is required'
    };
  }

  return {
    isValid: true,
    value: comicBookTitle.trim()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findWishListByTitle = async (
  comicBookTitle: string
): Promise<WishListInstance | null> =>
  WishLists.findOne({ 
    where: { comicBookTitle: comicBookTitle.trim() } 
  });

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: WishListInstance
): WishListSuccessResponse => ({
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
  data: WishListInstance
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

const findWishListHandler = async (
  req: Request<Record<string, never>, WishListSuccessResponse | ErrorResponse, FindWishListRequestBody>,
  res: Response<WishListSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Destructure request body
    const { comicBookTitle } = req.body;

    // Validate comic book title
    const { isValid, value, error } = validateComicBookTitle(comicBookTitle);

    if (!isValid) {
      sendError(res, 400, error!);
      return;
    }

    // Find wish list
    const wishList = await findWishListByTitle(value!);

    if (!wishList) {
      sendError(res, 404, 'Comic book title not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'Wish list item found', wishList);

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

// GET /wishlists/regular
// Get all regular (non-variant) wish list items
router.get(
  '/regular',
  getRegular
);

// GET /wishlists/variant
// Get all variant wish list items
router.get(
  '/variant',
  getVariant
);

// GET /wishlists/signups/:userId
// Get all wish lists for a specific user
router.get(
  '/signups/:userId',
  getWishLists
);

// POST /wishlists
// Find a wish list item by comic book title (search endpoint)
router.post(
  '/',
  validate('createWishLists'),
  findWishListHandler
);

// GET /wishlists/:id
// Get a single wish list item by ID
router.get(
  '/:id',
  getOneById
);

// PUT /wishlists/:id
// Update a wish list item
router.put(
  '/:id',
  validate('editWishLists') as unknown as RequestHandler,
  updateWishList as unknown as RequestHandler
);

// DELETE /wishlists/:id
// Delete a wish list item
router.delete(
  '/:id',
  validate('deleteWishLists'),
  removeWishList
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;