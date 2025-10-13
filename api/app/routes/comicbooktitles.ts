import { Router, Request, Response, NextFunction } from 'express';
import { Model, ModelStatic } from 'sequelize';
import * as comicbooktitleCtrl from '../controllers/comicbooktitles';
import * as validationCtrl from '../controllers/validation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ComicBookTitleAttributes {
  id: string;
  cbTitle: string;
  collectpubId: string;
  publisher?: string;
  startYear?: number;
  endYear?: number;
  status?: 'ongoing' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

interface ComicBookTitleInstance 
  extends Model<ComicBookTitleAttributes>, 
  ComicBookTitleAttributes {}

type ComicBookTitleModel = ModelStatic<ComicBookTitleInstance>;

interface FindComicBookTitleRequestBody {
  cbTitle: string;
}

interface ComicBookTitleSuccessResponse {
  type: 'success';
  message: string;
  data: ComicBookTitleInstance;
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
  ComicBookTitles: ComicBookTitleModel;
};
const { ComicBookTitles } = models;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validateCbTitle = (
  cbTitle: string | undefined | null
): StringValidationResult => {
  if (!cbTitle || typeof cbTitle !== 'string' || !cbTitle.trim()) {
    return {
      isValid: false,
      error: 'Comic book title is required'
    };
  }

  return {
    isValid: true,
    value: cbTitle.trim()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findComicBookTitleByName = async (
  cbTitle: string
): Promise<ComicBookTitleInstance | null> =>
  ComicBookTitles.findOne({ 
    where: { cbTitle: cbTitle.trim() } 
  });

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: ComicBookTitleInstance
): ComicBookTitleSuccessResponse => ({
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
  data: ComicBookTitleInstance
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

const findComicBookTitleHandler = async (
  req: Request<Record<string, never>, ComicBookTitleSuccessResponse | ErrorResponse, FindComicBookTitleRequestBody>,
  res: Response<ComicBookTitleSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate cbTitle
    const validation = validateCbTitle(req.body.cbTitle);

    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }

    const cbTitle = validation.value!;

    // Find comic book title
    const comicbooktitle = await findComicBookTitleByName(cbTitle);

    if (!comicbooktitle) {
      sendError(res, 404, 'Comic book title not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'Comic book title found', comicbooktitle);

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

// GET /comicbooktitles/publishers/:pubId
// Get all comic book titles for a specific publisher
router.get(
  '/publishers/:pubId',
  comicbooktitleCtrl.getCollectPublisherComicBookTitles
);

// POST /comicbooktitles
// Find a comic book title by name (search endpoint)
router.post(
  '/',
  validationCtrl.validate('createComicBookTitle'),
  findComicBookTitleHandler
);

// GET /comicbooktitles/:id
// Get a single comic book title by ID
router.get(
  '/:id',
  comicbooktitleCtrl.getOneById
);

// PUT /comicbooktitles/:id
// Update a comic book title
router.put(
  '/:id',
  validationCtrl.validate('editComicBookTitle'),
  comicbooktitleCtrl.updateComicBookTitle
);

// DELETE /comicbooktitles/:id
// Delete a comic book title
router.delete(
  '/:id',
  validationCtrl.validate('deleteComicBookTitle'),
  comicbooktitleCtrl.removeComicBookTitle
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;