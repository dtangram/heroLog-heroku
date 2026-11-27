import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';
import type { MessagingAttributes, MessagingInstance } from '../models/messagings';
import type { ApiResult, IdResult, MessageResult, MessagesResult } from '../types/api';
import { errorMessages } from '../utils/errors';
import { clientId } from '../utils/clientId';

/** What the message forms send; on an update, fields left out stay as they are */
type MessageBody = {
  /** The ID the app chose for a new message (see utils/clientId.ts) */
  id?: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  messageUsersId?: string;
  userSent?: number;
};

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

const Messagings = db.Messagings;

// UUID validation
const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Centralized error reply. A catch can receive anything, so it's turned into an Error first.
const errorResult = (thrown: Error, context: string): ApiResult => {
  console.error(`Error in ${context}:`, thrown);
  return { success: false, errors: errorMessages(thrown) };
};

// Parameter validation
const validateParams = (
  params: Partial<Record<string, string | number | boolean | Date | null>>,
  requiredFields: string[]
): ValidationResult => {
  const missing = requiredFields.filter(field => !params[field]);
  
  if (missing.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { isValid: true };
};

// String validation
const validateString = (value: string, fieldName: string): ValidationResult => {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      message: `${fieldName} must be a string`
    };
  }
  
  if (value.trim().length === 0) {
    return {
      isValid: false,
      message: `${fieldName} cannot be empty`
    };
  }
  
  return { isValid: true };
};

// Email validation
const validateEmail = (email: string): ValidationResult => {
  if (!isValidEmail(email)) {
    return {
      isValid: false,
      message: 'Invalid email format'
    };
  }
  
  return { isValid: true };
};

// UUID validation
const validateUUID = (value: string, fieldName: string): ValidationResult => {
  if (!isValidUUID(value)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid UUID`
    };
  }
  
  return { isValid: true };
};

// Number validation
const validateNumber = (value: number, fieldName: string): ValidationResult => {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid number`
    };
  }
  
  return { isValid: true };
};

// Generic function to find messagings with filters
const findMessagings = async (
  whereClause: WhereOptions<MessagingAttributes>
): Promise<MessagingInstance[]> => {
  if (!whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Invalid query parameters');
  }
  
  return await Messagings.findAll({ where: whereClause });
};

// Get all received messagings for a specific user
export const getMessagings = async (
  req: Request<{ userId: string }>,
  res: Response<MessagesResult>
): Promise<Response<MessagesResult>> => {
  const { userId } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['userId']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(userId, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const messagings = await findMessagings({ 
      messageUsersId: userId  // No parseInt for UUID
    });
    
    const data = messagings.map(messaging => messaging.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getMessagings'));
  }
};

// Get all sent messagings for a specific user (using userSent number)
export const getSentMessagings = async (
  req: Request<{ userId: string }>,
  res: Response<MessagesResult>
): Promise<Response<MessagesResult>> => {
  const { userId } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['userId']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // For userSent, expecting a numeric ID, so validate as number
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId) || numericUserId <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID must be a valid positive number for sent messages' 
    });
  }
  
  try {
    const messagings = await findMessagings({ 
      userSent: numericUserId  // Keep as number for userSent field
    });
    
    const data = messagings.map(messaging => messaging.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getSentMessagings'));
  }
};

// Find one messaging by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<MessageResult>
): Promise<Response<MessageResult>> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Messaging ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const messaging = await Messagings.findByPk(id);  // No parseInt for UUID
    
    if (!messaging) {
      return res.status(404).json({ 
        success: false,
        error: 'Messaging not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: messaging.toJSON()
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getOneById'));
  }
};

// Create a new messaging
export const createMessaging = async (
  req: Request<Record<string, string>, IdResult, MessageBody>,
  res: Response<IdResult>
): Promise<Response<IdResult>> => {
  const { name, email, subject, message, messageUsersId, userSent } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body, [
    'name',
    'email', 
    'subject',
    'message',
    'messageUsersId'
  ]);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate string fields
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }
  const nameValidation = validateString(name, 'Name');
  if (!nameValidation.isValid) {
    return res.status(400).json({ success: false, error: nameValidation.message });
  }
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  const emailStringValidation = validateString(email, 'Email');
  if (!emailStringValidation.isValid) {
    return res.status(400).json({ success: false, error: emailStringValidation.message });
  }
  const emailFormatValidation = validateEmail(email);
  if (!emailFormatValidation.isValid) {
    return res.status(400).json({ success: false, error: emailFormatValidation.message });
  }
  
  if (!subject) {
    return res.status(400).json({ success: false, error: 'Subject is required' });
  }
  const subjectValidation = validateString(subject, 'Subject');
  if (!subjectValidation.isValid) {
    return res.status(400).json({ success: false, error: subjectValidation.message });
  }
  
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  const messageValidation = validateString(message, 'Message');
  if (!messageValidation.isValid) {
    return res.status(400).json({ success: false, error: messageValidation.message });
  }
  
  // Validate messageUsersId as UUID
  if (!messageUsersId) {
    return res.status(400).json({ success: false, error: 'Message Users ID is required' });
  }
  const userIdValidation = validateUUID(messageUsersId, 'Message Users ID');
  if (!userIdValidation.isValid) {
    return res.status(400).json({ success: false, error: userIdValidation.message });
  }
  
  // Validate userSent as number if provided
  if (userSent !== undefined) {
    const userSentValidation = validateNumber(userSent, 'User Sent');
    if (!userSentValidation.isValid) {
      return res.status(400).json({ success: false, error: userSentValidation.message });
    }
  }
  
  try {
    const newMessaging = await Messagings.create({
      ...clientId(req.body.id),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      messageUsersId: messageUsersId,
      userSent: userSent || null,
    });
    
    return res.status(201).json({ 
      success: true,
      data: { id: newMessaging.id },
      message: 'Messaging created successfully'
    });
  } catch (error) {
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'createMessaging'));
  }
};

// Update an existing messaging
export const updateMessaging = async (
  req: Request<{ id: string }, MessageResult, MessageBody>,
  res: Response<MessageResult>
): Promise<Response<MessageResult>> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Messaging ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  // Validate request body is not empty
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Request body cannot be empty' 
    });
  }
  
  // Sanitize and validate fields if present
  const updateData: MessageBody = { ...req.body };
  
  // Validate string fields if provided
  if (updateData.name !== undefined) {
    const stringValidation = validateString(updateData.name, 'Name');
    if (!stringValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: stringValidation.message 
      });
    }
    updateData.name = updateData.name.trim();
  }
  
  if (updateData.subject !== undefined) {
    const stringValidation = validateString(updateData.subject, 'Subject');
    if (!stringValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: stringValidation.message 
      });
    }
    updateData.subject = updateData.subject.trim();
  }
  
  if (updateData.message !== undefined) {
    const stringValidation = validateString(updateData.message, 'Message');
    if (!stringValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: stringValidation.message 
      });
    }
    updateData.message = updateData.message.trim();
  }
  
  // Validate email if provided
  if (updateData.email !== undefined) {
    const emailStringValidation = validateString(updateData.email, 'Email');
    if (!emailStringValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: emailStringValidation.message 
      });
    }
    const emailFormatValidation = validateEmail(updateData.email);
    if (!emailFormatValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: emailFormatValidation.message 
      });
    }
    updateData.email = updateData.email.trim().toLowerCase();
  }
  
  // Validate messageUsersId if provided
  if (updateData.messageUsersId !== undefined && updateData.messageUsersId !== null) {
    const userIdValidation = validateUUID(updateData.messageUsersId, 'Message Users ID');
    if (!userIdValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: userIdValidation.message 
      });
    }
  }
  
  // Validate userSent if provided
  if (updateData.userSent !== undefined && updateData.userSent !== null) {
    const userSentValidation = validateNumber(updateData.userSent, 'User Sent');
    if (!userSentValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: userSentValidation.message 
      });
    }
  }
  
  try {
    const [rowsUpdated, updatedRecords] = await Messagings.update(
      updateData,
      {
        where: { id },  // No parseInt for UUID
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Messaging not found or no changes made' 
      });
    }
    
    // Handle different database dialects
    let updatedMessaging: MessagingAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedMessaging = updatedRecords[0].toJSON();
    } else {
      const record = await Messagings.findByPk(id);
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Messaging not found after update' 
        });
      }
      updatedMessaging = record.toJSON();
    }
    
    return res.status(200).json({
      success: true,
      data: updatedMessaging,
      message: 'Messaging updated successfully'
    });
  } catch (error) {
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'updateMessaging'));
  }
};

// Delete a messaging
export const removeMessaging = async (
  req: Request<{ id: string }>,
  res: Response<ApiResult>
): Promise<Response<ApiResult>> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Messaging ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    // Check if record exists before attempting deletion
    const existingRecord = await Messagings.findByPk(id);
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Messaging not found' 
      });
    }
    
    const rowsDeleted = await Messagings.destroy({ 
      where: { id }  // No parseInt for UUID
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete messaging' 
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Messaging deleted successfully' 
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'removeMessaging'));
  }
};