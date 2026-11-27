import { Router, Request, Response, NextFunction } from 'express';
import * as messagingCtrl from '../controllers/messaging';
import * as validationCtrl from '../controllers/validation';
import { requireAccount } from '../middleware/auth';
import { messageRecipient, ownsParam, ownsRecord } from '../middleware/ownership';
import db from '../models';
import type { MessagingInstance, MessagingJson } from '../models/messagings';

type FindMessagingRequestBody = {
  name: string;
};

interface MessagingSuccessResponse {
  type: 'success';
  message: string;
  data: MessagingJson;
  timestamp: string;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  statusCode: number;
  timestamp: string;
  stack?: string;
}

interface ValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

const ENV = {
  nodeEnv: process.env.NODE_ENV || 'development',
};

// models/index.ts uses `export default`; require('../models') returned { default: db }
const Messagings = db.Messagings;

const validateName = (
  name: string | undefined | null
): ValidationResult => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return {
      isValid: false,
      error: 'Message name is required'
    };
  }

  return {
    isValid: true,
    value: name.trim()
  };
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const findMessagingByName = async (
  name: string
): Promise<MessagingInstance | null> =>
  Messagings.findOne({ 
    where: { name: name.trim() } 
  });

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

const buildSuccessResponse = (
  message: string,
  data: MessagingInstance
): MessagingSuccessResponse => ({
  type: 'success',
  message,
  data: data.toJSON(),
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
  res: Response<MessagingSuccessResponse | ErrorResponse>,
  message: string,
  data: MessagingInstance
): void => {
  res.status(200).json(buildSuccessResponse(message, data));
};

const sendError = (
  res: Response<MessagingSuccessResponse | ErrorResponse>,
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

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

const findMessagingHandler = async (
  req: Request<Record<string, never>, MessagingSuccessResponse | ErrorResponse, FindMessagingRequestBody>,
  res: Response<MessagingSuccessResponse | ErrorResponse>,
  _next: NextFunction
): Promise<void> => {
  try {
    // Validate name
    const validation = validateName(req.body.name);

    if (!validation.isValid) {
      sendError(res, 400, validation.error!);
      return;
    }

    const name = validation.value!;

    // Find messaging
    const messaging = await findMessagingByName(name);

    if (!messaging) {
      sendError(res, 404, 'Message not found');
      return;
    }

    // Send success response
    sendSuccess(res, 'Message found', messaging);

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

// Messages are private: you can read your own inbox and the messages sent to you
router.use(requireAccount);

// GET /messagings/signups/:userId
// Get all messages received by a user
router.get(
  '/signups/:userId',
  ownsParam('userId'),
  messagingCtrl.getMessagings
);

// GET /messagings/signupsMessSent/:userId
// Get all messages sent by a user
router.get(
  '/signupsMessSent/:userId',
  ownsParam('userId'),
  messagingCtrl.getSentMessagings
);

// POST /messagings
// Find a message by name (search endpoint)
router.post(
  '/',
  validationCtrl.validate('createMessaging'),
  findMessagingHandler
);

// GET /messagings/:id
// Get a single message by ID
router.get(
  '/:id',
  ownsRecord(messageRecipient),
  messagingCtrl.getOneById
);

// PUT /messagings/:id
// Update a message
router.put(
  '/:id',
  ownsRecord(messageRecipient),
  validationCtrl.validate('editMessaging'),
  messagingCtrl.updateMessaging
);

// DELETE /messagings/:id
// Delete a message
router.delete(
  '/:id',
  ownsRecord(messageRecipient),
  validationCtrl.validate('deleteMessagings'),
  messagingCtrl.removeMessaging
);

export default router;