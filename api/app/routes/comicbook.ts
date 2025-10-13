import { Router, Request, Response, NextFunction } from 'express';
import { Model, ModelStatic } from 'sequelize';
import * as comicbookCtrl from '../controllers/comicbook';
import * as validationCtrl from '../controllers/validation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ComicBookAttributes {
  id: string;
  title: string;
  issueNumber?: string;
  variant?: boolean;
  coboTitleId: string;
  publisher?: string;
  coverDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ComicBookInstance 
  extends Model<ComicBookAttributes>, 
  ComicBookAttributes {}

type ComicBookModel = ModelStatic<ComicBookInstance>;

interface FindComicBookRequestBody {
  title: string;
}

interface ComicBookSuccessResponse {
  type: 'success';
  message: string;
  data: ComicBookInstance;
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
  ComicBooks: ComicBookModel;
};
const { ComicBooks } = models;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateTitle = (
  title: string | undefined | null
): StringValidationResult => {
  if (!title || typeof title !== 'string' || !title.trim()) {
    return {
      isValid: false,
      error: 'Comic book title is required'
    };
  }

  return {
    isValid: true,
    value: title.trim()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findComicBookByTitle = async (
  title: string
): Promise<ComicBookInstance | null> =>
  ComicBooks.findOne({ 
    where: { title: title.trim() } 
  });

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: ComicBookInstance
): ComicBookSuccessResponse => ({
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
  data: ComicBookInstance
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

const findComicBookHandler = async (
  req: Request<Record<string, never>, ComicBookSuccessResponse | ErrorResponse, FindComicBookRequestBody>,
  res: Response<ComicBookSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate title
    const validation = validateTitle(req.body.title);

    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }

    const title = validation.value!;

    // Find comic book
    const comicbook = await findComicBookByTitle(title);

    if (!comicbook) {
      sendError(res, 404, 'Comic book not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'Comic book found', comicbook);

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

// GET /comicbook/titles/:coboTitleId
// Get all comic books for a specific title
router.get(
  '/titles/:coboTitleId',
  comicbookCtrl.getComicBooks
);

// GET /comicbook/regular
// Get regular (non-variant) comic books
router.get(
  '/regular',
  validationCtrl.validate('createComicBook'),
  comicbookCtrl.getComicBookRegular
);

// GET /comicbook/variant
// Get variant comic books
router.get(
  '/variant',
  validationCtrl.validate('createComicBook'),
  comicbookCtrl.getComicBookVariant
);

// POST /comicbook
// Find a comic book by title (search endpoint)
router.post(
  '/',
  validationCtrl.validate('createComicBook'),
  findComicBookHandler
);

// GET /comicbook/:id
// Get a single comic book by ID
router.get(
  '/:id',
  comicbookCtrl.getOneById
);

// PUT /comicbook/:id
// Update a comic book
router.put(
  '/:id',
  validationCtrl.validate('editComicBook'),
  comicbookCtrl.updateComicBook
);

// DELETE /comicbook/:id
// Delete a comic book
router.delete(
  '/:id',
  validationCtrl.validate('deleteComicBook'),
  comicbookCtrl.removeComicBook
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;