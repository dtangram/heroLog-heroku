import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../models';
import type { CollectionPublisherAttributes } from '../models/collectionpublishers';
import type { ApiResult, PublisherCreatedResult, PublisherResult, PublishersResult } from '../types/api';
import { errorMessages } from '../utils/errors';
import { loadPublisherSummaries } from '../services/collectionSummary';
import { findDuplicatePublisher, duplicateResult } from '../services/duplicates';

// What the publisher form sends; on an update, fields left out stay as they are
type PublisherBody = {
  publisherName?: string;
  collectpubUsersId?: string;
};

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

const CollectionPublishers = db.CollectionPublishers;

// UUID validation
const isValidUUID = (value: string): boolean => {
  // Accepts any UUID format (8-4-4-4-12 hex characters)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
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
  res: Response<PublishersResult>
): Promise<Response<PublishersResult>> => {
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
    
    // Each publisher comes with its title count, issue count and newest cover,
    // so the Dashboard can show an overview rather than a bare list of names
    const summaries = await loadPublisherSummaries(collectPublishers.map(publisher => publisher.id));
    const data = collectPublishers.map(publisher => ({
      ...publisher.toJSON(),
      ...(summaries[publisher.id] || { titleCount: 0, issueCount: 0, coverUrl: null }),
    }));
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getCollectionPublishers'));
  }
};

// Find one collection publisher by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<PublisherResult>
): Promise<Response<PublisherResult>> => {
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getOneById'));
  }
};

// Create a new collection publisher
export const createCollectionPublisher = async (
  req: Request<Record<string, string>, PublisherCreatedResult, PublisherBody>,
  res: Response<PublisherCreatedResult>
): Promise<Response<PublisherCreatedResult>> => {
  const { publisherName, collectpubUsersId } = req.body;
  
  // ADD DETAILED LOGGING
  console.log('CREATE PUBLISHER REQUEST RECEIVED');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('publisherName:', publisherName);
  console.log('collectpubUsersId:', collectpubUsersId);
  console.log('collectpubUsersId type:', typeof collectpubUsersId);
  
  // Validate required fields
  const validation = validateParams(req.body, ['publisherName', 'collectpubUsersId']);
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
    // One publisher per name: "DC" and "DC Comics" count as the same one
    const duplicate = await findDuplicatePublisher(collectpubUsersId, publisherName);
    if (duplicate) return res.status(409).json(duplicateResult(duplicate));

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
    
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'createCollectionPublisher'));
  }
};

// Update an existing collection publisher
export const updateCollectionPublisher = async (
  req: Request<{ id: string }, PublisherResult, PublisherBody>,
  res: Response<PublisherResult>
): Promise<Response<PublisherResult>> => {
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
    // Renaming to a publisher the user already has would make two of them
    if (updateData.publisherName) {
      const current = await CollectionPublishers.findByPk(id);
      const ownerId = current?.toJSON().collectpubUsersId;
      const duplicate = ownerId ? await findDuplicatePublisher(ownerId, updateData.publisherName, id) : null;
      if (duplicate) return res.status(409).json(duplicateResult(duplicate));
    }

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
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'updateCollectionPublisher'));
  }
};

// Delete a collection publisher
export const removeCollectionPublisher = async (
  req: Request<{ id: string }>,
  res: Response<ApiResult>
): Promise<Response<ApiResult>> => {
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'removeCollectionPublisher'));
  }
};

// Get ALL collection publishers (no user filtering)
export const getAllCollectionPublishers = async (
  _req: Request,
  res: Response<PublishersResult>
): Promise<Response<PublishersResult>> => {
  try {
    const collectPublishers = await CollectionPublishers.findAll();
    
    const data = collectPublishers.map(publisher => publisher.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getAllCollectionPublishers'));
  }
};