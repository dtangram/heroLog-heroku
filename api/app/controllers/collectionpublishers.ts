import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WhereOptions } from 'sequelize';
import db from '../models';

// Properly typed model interface
interface CollectionPublisherModel {
  findAll: (options?: { where?: WhereOptions<CollectionPublisherAttributes> }) => Promise<CollectionPublisherInstance[]>;
  findByPk: (id: string) => Promise<CollectionPublisherInstance | null>;
  create: (data: CollectionPublisherCreationAttributes) => Promise<CollectionPublisherInstance>;
  update: (
    data: Partial<CollectionPublisherAttributes>, 
    options: { where: WhereOptions<CollectionPublisherAttributes>; returning: boolean }
  ) => Promise<[number, CollectionPublisherInstance[]]>;
  destroy: (options: { where: WhereOptions<CollectionPublisherAttributes> }) => Promise<number>;
}

// Model instance interface
interface CollectionPublisherInstance {
  id: string;
  publisherName: string;
  collectpubUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => CollectionPublisherAttributes;
}

// Fixed interface to match actual model structure
interface CollectionPublisherAttributes {
  id: string;  // UUID string, not number
  publisherName: string;
  collectpubUsersId: string | null;  // UUID string, not number
  createdAt: Date;
  updatedAt: Date;
}

// Creation interface
interface CollectionPublisherCreationAttributes {
  publisherName: string;
  collectpubUsersId: string;
}

// API response interface
interface ApiResponse<T = CollectionPublisherAttributes | CollectionPublisherAttributes[]> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: string[];
}

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Sequelize error interface
interface SequelizeError {
  errors: Array<{ message: string }>;
}

const CollectionPublishers = db.CollectionPublishers as CollectionPublisherModel;

// Type guard for Sequelize errors
const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

// UUID validation
const isValidUUID = (value: string): boolean => {
  // Accepts any UUID format (8-4-4-4-12 hex characters)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Centralized error handler
const handleError = (
  res: Response,
  error: Error | SequelizeError,
  statusCode: number = 500,
  context: string = ''
): Response<ApiResponse<never>> => {
  console.error(`Error in ${context}:`, error);
  
  let errors: string[];
  
  if (isSequelizeError(error)) {
    errors = error.errors.map(err => err.message);
  } else {
    errors = [error.message];
  }
  
  return res.status(statusCode).json({ 
    success: false,
    errors 
  });
};

// Parameter validation
const validateParams = (
  params: Record<string, string>,
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

// Get all collection publishers by user ID (from params or token)
export const getCollectionPublishers = async (
  req: AuthRequest,
  res: Response<ApiResponse<CollectionPublisherAttributes[]>>
): Promise<Response> => {
  // Get from JWT token OR query param
  const userId = req.user?.id || req.query.userId as string;
  
  console.log('GET PUBLISHERS REQUEST');
  console.log('  - User from token:', req.user?.id);
  console.log('  - User from query:', req.query.userId);
  console.log('  - Final userId:', userId);
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }
  
  try {
    const collectPublishers = await CollectionPublishers.findAll({ 
      where: { collectpubUsersId: userId }
    });
    
    console.log(`Found ${collectPublishers.length} publishers for user ${userId}`);
    
    const data = collectPublishers.map(publisher => publisher.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getCollectionPublishers');
  }
};

// Find one collection publisher by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<CollectionPublisherAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const collectpublisher = await CollectionPublishers.findByPk(id);  // No parseInt for UUID
    
    if (!collectpublisher) {
      return res.status(404).json({ 
        success: false,
        error: 'Collection publisher not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: collectpublisher.toJSON()
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

// Create a new collection publisher
export const createCollectionPublisher = async (
  req: Request<{}, {}, Partial<CollectionPublisherCreationAttributes>>,
  res: Response<ApiResponse<Pick<CollectionPublisherAttributes, 'id' | 'publisherName' | 'collectpubUsersId'>>>
): Promise<Response> => {
  const { publisherName, collectpubUsersId } = req.body;
  
  // ADD DETAILED LOGGING
  console.log('CREATE PUBLISHER REQUEST RECEIVED');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('publisherName:', publisherName);
  console.log('collectpubUsersId:', collectpubUsersId);
  console.log('collectpubUsersId type:', typeof collectpubUsersId);
  
  // Validate required fields
  const validation = validateParams(req.body as Record<string, string>, ['publisherName', 'collectpubUsersId']);
  if (!validation.isValid) {
    console.log('Validation failed:', validation.message);
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Additional validation for publisherName
  if (!publisherName) {
    console.log('Publisher name missing');
    return res.status(400).json({ 
      success: false,
      error: 'Publisher name is required' 
    });
  }
  
  const stringValidation = validateString(publisherName, 'Publisher name');
  if (!stringValidation.isValid) {
    console.log('String validation failed:', stringValidation.message);
    return res.status(400).json({ 
      success: false,
      error: stringValidation.message 
    });
  }
  
  // Validate collectpubUsersId is a valid UUID
  if (!collectpubUsersId) {
    console.log('collectpubUsersId missing');
    return res.status(400).json({ 
      success: false,
      error: 'collectpubUsersId is required' 
    });
  }
  
  console.log('Validating UUID:', collectpubUsersId);
  const uuidValidation = validateUUID(collectpubUsersId, 'User ID');
  if (!uuidValidation.isValid) {
    console.log('UUID validation failed:', uuidValidation.message);
    return res.status(400).json({ 
      success: false,
      error: uuidValidation.message 
    });
  }
  
  console.log('All validations passed, attempting to create...');
  
  try {
    const newCollectionPublisher = await CollectionPublishers.create({
      publisherName: publisherName.trim(),
      collectpubUsersId: collectpubUsersId,
    });
    
    console.log('Publisher created successfully:', newCollectionPublisher.id);
    
    return res.status(201).json({ 
      success: true,
      data: {
        id: newCollectionPublisher.id,
        publisherName: newCollectionPublisher.publisherName,
        collectpubUsersId: newCollectionPublisher.collectpubUsersId
      },
      message: 'Collection publisher created successfully'
    });
  } catch (error) {
    console.error('ERROR IN CREATE:');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Full error:', error);
    
    return handleError(res, error as Error, 400, 'createCollectionPublisher');
  }
};

// Update an existing collection publisher
export const updateCollectionPublisher = async (
  req: Request<{ id: string }, {}, Partial<CollectionPublisherAttributes>>,
  res: Response<ApiResponse<CollectionPublisherAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'ID');
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
  
  // Sanitize and validate publisherName if present
  const updateData: Partial<CollectionPublisherAttributes> = { ...req.body };
  
  if (updateData.publisherName !== undefined) {
    const stringValidation = validateString(updateData.publisherName, 'Publisher name');
    if (!stringValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: stringValidation.message 
      });
    }
    updateData.publisherName = updateData.publisherName.trim();
  }
  
  // Validate collectpubUsersId if present
  if (updateData.collectpubUsersId !== undefined && updateData.collectpubUsersId !== null) {
    const uuidValidation = validateUUID(updateData.collectpubUsersId, 'User ID');
    if (!uuidValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: uuidValidation.message 
      });
    }
  }
  
  try {
    const [rowsUpdated, updatedRecords] = await CollectionPublishers.update(
      updateData,
      {
        where: { id },  // No parseInt for UUID
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Collection publisher not found or no changes made' 
      });
    }
    
    // Handle different database dialects
    let updatedCollectionPublisher: CollectionPublisherAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedCollectionPublisher = updatedRecords[0].toJSON();
    } else {
      const record = await CollectionPublishers.findByPk(id);
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Collection publisher not found after update' 
        });
      }
      updatedCollectionPublisher = record.toJSON();
    }
    
    return res.status(200).json({
      success: true,
      data: updatedCollectionPublisher,
      message: 'Collection publisher updated successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'updateCollectionPublisher');
  }
};

// Delete a collection publisher
export const removeCollectionPublisher = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    // Check if record exists before attempting deletion
    const existingRecord = await CollectionPublishers.findByPk(id);
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Collection publisher not found' 
      });
    }
    
    const rowsDeleted = await CollectionPublishers.destroy({ 
      where: { id }  // No parseInt for UUID
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete collection publisher' 
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Collection publisher deleted successfully' 
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'removeCollectionPublisher');
  }
};

// Get ALL collection publishers (no user filtering)
export const getAllCollectionPublishers = async (
  _req: Request,
  res: Response<ApiResponse<CollectionPublisherAttributes[]>>
): Promise<Response> => {
  try {
    const collectPublishers = await CollectionPublishers.findAll();
    
    const data = collectPublishers.map(publisher => publisher.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getAllCollectionPublishers');
  }
};