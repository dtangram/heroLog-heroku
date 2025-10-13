import { Router, Request, Response, NextFunction } from 'express';
import { Model, ModelStatic } from 'sequelize';
import * as salelistCtrl from '../controllers/salelist';
import * as validationCtrl from '../controllers/validation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SaleListAttributes {
  id: string;
  comicBookTitle: string;
  issueNumber?: string;
  grade?: string;
  price: number;
  saleUsersId: string;
  sold: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SaleListInstance 
  extends Model<SaleListAttributes>, 
  SaleListAttributes {}

type SaleListModel = ModelStatic<SaleListInstance>;

interface FindSaleListRequestBody {
  comicBookTitle: string;
}

interface SaleListSuccessResponse {
  type: 'success';
  message: string;
  data: SaleListInstance;
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
  SaleLists: SaleListModel;
};
const { SaleLists } = models;

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

const findSaleListByTitle = async (
  comicBookTitle: string
): Promise<SaleListInstance | null> =>
  SaleLists.findOne({ 
    where: { comicBookTitle: comicBookTitle.trim() } 
  });

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: SaleListInstance
): SaleListSuccessResponse => ({
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
  data: SaleListInstance
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

const findSaleListHandler = async (
  req: Request<Record<string, never>, SaleListSuccessResponse | ErrorResponse, FindSaleListRequestBody>,
  res: Response<SaleListSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate comic book title
    const validation = validateComicBookTitle(req.body.comicBookTitle);

    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }

    const comicBookTitle = validation.value!;

    // Find sale list
    const saleList = await findSaleListByTitle(comicBookTitle);

    if (!saleList) {
      sendError(res, 404, 'Comic book title not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'Sale list found', saleList);

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

// GET /salelists/signups/:userId
// Get all sale lists for a specific user
router.get(
  '/signups/:userId',
  salelistCtrl.getSaleLists
);

// POST /salelists
// Find a sale list by comic book title (search endpoint)
router.post(
  '/',
  validationCtrl.validate('createSaleList'),
  findSaleListHandler
);

// GET /salelists/:id
// Get a single sale list by ID
router.get(
  '/:id',
  salelistCtrl.getOneById
);

// PUT /salelists/:id
// Update a sale list
router.put(
  '/:id',
  validationCtrl.validate('editSaleList'),
  salelistCtrl.updateSaleList
);

// DELETE /salelists/:id
// Delete a sale list
router.delete(
  '/:id',
  validationCtrl.validate('deleteSaleList'),
  salelistCtrl.removeSaleList
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;