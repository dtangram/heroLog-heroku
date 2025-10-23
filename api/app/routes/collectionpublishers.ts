import { Router, Request, Response, NextFunction } from 'express';
import { Model, ModelStatic } from 'sequelize';
import * as collectionpublisherCtrl from '../controllers/collectionpublishers';
import * as validationCtrl from '../controllers/validation';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CollectionPublisherAttributes {
  id: string;
  publisherName: string;
  collectpubUsersId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CollectionPublisherInstance 
  extends Model<CollectionPublisherAttributes>, 
  CollectionPublisherAttributes {}

type CollectionPublisherModel = ModelStatic<CollectionPublisherInstance>;

interface FindPublisherRequestBody {
  publisherName: string;
}

interface PublisherSuccessResponse {
  type: 'success';
  message: string;
  data: CollectionPublisherInstance;
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
  CollectionPublishers: CollectionPublisherModel;
};
const { CollectionPublishers } = models;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

const validatePublisherName = (
  publisherName: string | undefined | null
): StringValidationResult => {
  if (!publisherName || typeof publisherName !== 'string' || !publisherName.trim()) {
    return {
      isValid: false,
      error: 'Publisher name is required'
    };
  }

  return {
    isValid: true,
    value: publisherName.trim()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findPublisherByName = async (
  publisherName: string
): Promise<CollectionPublisherInstance | null> =>
  CollectionPublishers.findOne({ 
    where: { publisherName: publisherName.trim() } 
  });

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: CollectionPublisherInstance
): PublisherSuccessResponse => ({
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
  data: CollectionPublisherInstance
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

const findPublisherHandler = async (
  req: Request<Record<string, never>, PublisherSuccessResponse | ErrorResponse, FindPublisherRequestBody>,
  res: Response<PublisherSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate publisher name
    const validation = validatePublisherName(req.body.publisherName);

    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }

    const publisherName = validation.value!;

    // Find publisher
    const publisher = await findPublisherByName(publisherName);

    if (!publisher) {
      sendError(res, 404, 'Publisher not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'Publisher found', publisher);

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

// GET /collectionpublishers/signups/:userId
// Get collection publishers for a specific user signup
router.get(
  '/',
  collectionpublisherCtrl.getCollectionPublishers
);

// POST /collectionpublishers/create
// Create a new publisher
router.post(
  '/create',
  validationCtrl.validate('createCollectionPublisher'),
  collectionpublisherCtrl.createCollectionPublisher
);

// POST /collectionpublishers/search
// Find a publisher by name (search endpoint)
router.post(
  '/search',
  validationCtrl.validate('createCollectionPublisher'),
  findPublisherHandler
);

// GET /collectionpublishers/:id
// Get a single publisher by ID
router.get(
  '/:id',
  collectionpublisherCtrl.getOneById
);

// PUT /collectionpublishers/:id
// Update a publisher
router.put(
  '/:id',
  validationCtrl.validate('editCollectionPublisher'),
  collectionpublisherCtrl.updateCollectionPublisher
);

// DELETE /collectionpublishers/:id
// Delete a publisher
router.delete(
  '/:id',
  validationCtrl.validate('deleteCollectionPublisher'),
  collectionpublisherCtrl.removeCollectionPublisher
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;