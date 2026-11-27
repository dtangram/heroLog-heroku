import { Request, Response } from 'express';
import db from '../models';
import type { ComicBookTitleAttributes } from '../models/comicbooktitles';
import type { ApiResult, TitleResult, TitlesResult } from '../types/api';
import { errorMessages } from '../utils/errors';
import { loadTitleSummaries } from '../services/collectionSummary';
import { findDuplicateTitle, duplicateResult } from '../services/duplicates';

// What the title form sends; on an update, fields left out stay as they are
type TitleBody = {
  cbTitle?: string;
  collectpubId?: string;
};

// Validation result interface
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Import models with proper typing
const ComicBookTitles = db.ComicBookTitles;

// UUID validation - Updated to accept all UUID versions
const isValidUUID = (value: string): boolean => {
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

// Get all comic book titles for a specific publisher
export const getCollectPublisherComicBookTitles = async (
  req: Request<{ pubId: string }>,
  res: Response<TitlesResult>
): Promise<Response<TitlesResult>> => {
  const { pubId } = req.params;
  
  console.log('📨 GET /comicbooktitles/publishers/:pubId');
  console.log('Publisher ID:', pubId);
  
  // Validate required parameters
  const validation = validateParams(req.params, ['pubId']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(pubId, 'Publisher ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const comicbooktitleComicBookTitles = await ComicBookTitles.findAll({
      where: { collectpubId: pubId },
      order: [['cbTitle', 'ASC']]
    });
    
    // Each title comes with its issue count, issue range and newest cover
    const summaries = await loadTitleSummaries(comicbooktitleComicBookTitles.map(title => title.id));
    const data = comicbooktitleComicBookTitles.map(title => ({
      ...title.toJSON(),
      ...(summaries[title.id] || { issueCount: 0, coverUrl: null, firstIssue: null, lastIssue: null }),
    }));
    
    console.log(`✅ Found ${data.length} comic book titles`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getCollectPublisherComicBookTitles'));
  }
};

// Get one comic book title by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<TitleResult>
): Promise<Response<TitleResult>> => {
  const { id } = req.params;
  
  console.log('📨 GET /comicbooktitles/:id');
  console.log('Comic book title ID:', id);
  
  // Validate required parameters
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Comic book title ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const comicbooktitle = await ComicBookTitles.findByPk(id);
    
    if (!comicbooktitle) {
      console.log('❌ Comic book title not found');
      return res.status(404).json({ 
        success: false,
        error: 'Comic book title not found' 
      });
    }
    
    console.log('✅ Comic book title found');
    
    return res.status(200).json({
      success: true,
      data: comicbooktitle.toJSON()
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getOneById'));
  }
};

// Create a new comic book title
export const createComicBookTitle = async (
  req: Request<Record<string, string>, TitleResult, TitleBody>,
  res: Response<TitleResult>
): Promise<Response<TitleResult>> => {
  console.log('📨 POST /comicbooktitles');
  console.log('📨 Body:', req.body);
  
  const { cbTitle, collectpubId } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body, ['cbTitle', 'collectpubId']);
  if (!validation.isValid) {
    console.log('❌ Validation failed:', validation.message);
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate cbTitle
  if (!cbTitle) {
    return res.status(400).json({ 
      success: false,
      error: 'Comic book title is required'
    });
  }
  
  const titleValidation = validateString(cbTitle, 'Comic book title');
  if (!titleValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: titleValidation.message 
    });
  }
  
  // Validate collectpubId
  if (!collectpubId) {
    return res.status(400).json({ 
      success: false,
      error: 'Collection publisher ID is required'
    });
  }
  
  const pubIdValidation = validateUUID(collectpubId, 'Collection publisher ID');
  if (!pubIdValidation.isValid) {
    console.log('❌ Invalid UUID:', collectpubId);
    return res.status(400).json({ 
      success: false,
      error: pubIdValidation.message 
    });
  }
  
  console.log('✅ All validations passed, attempting to create...');
  
  try {
    // One title per name under a publisher
    const duplicate = await findDuplicateTitle(collectpubId, cbTitle);
    if (duplicate) return res.status(409).json(duplicateResult(duplicate));

    const newComicBookTitle = await ComicBookTitles.create({
      cbTitle: cbTitle.trim(),
      collectpubId: collectpubId,
    });
    
    const createdData = newComicBookTitle.toJSON();
    
    console.log('✅ Comic book title created successfully');
    console.log('Created data:', createdData);
    
    return res.status(201).json({ 
      success: true,
      data: createdData,
      message: 'Comic book title created successfully'
    });
  } catch (error) {
    console.log('❌ ERROR IN CREATE:', error);
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'createComicBookTitle'));
  }
};

// Update an existing comic book title
export const updateComicBookTitle = async (
  req: Request<{ id: string }, TitleResult, TitleBody>,
  res: Response<TitleResult>
): Promise<Response<TitleResult>> => {
  const { id } = req.params;
  
  console.log('📨 PUT /comicbooktitles/:id');
  console.log('Comic book title ID:', id);
  console.log('📨 Body:', req.body);
  
  // Validate required parameters
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Comic book title ID');
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
  
  // Sanitize and validate cbTitle if provided
  const updateData: Partial<ComicBookTitleAttributes> = { ...req.body };
  
  if (updateData.cbTitle !== undefined) {
    const titleValidation = validateString(updateData.cbTitle, 'Comic book title');
    if (!titleValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: titleValidation.message 
      });
    }
    updateData.cbTitle = updateData.cbTitle.trim();
  }
  
  // Validate collectpubId if provided
  if (updateData.collectpubId !== undefined && updateData.collectpubId !== null) {
    const pubIdValidation = validateUUID(updateData.collectpubId, 'Collection publisher ID');
    if (!pubIdValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: pubIdValidation.message 
      });
    }
  }
  
  try {
    // Renaming (or moving) a title onto one the publisher already has would make two of them
    if (updateData.cbTitle || updateData.collectpubId) {
      const current = (await ComicBookTitles.findByPk(id))?.toJSON();
      const publisherId = updateData.collectpubId || current?.collectpubId;
      const name = updateData.cbTitle || current?.cbTitle;
      const duplicate = publisherId && name ? await findDuplicateTitle(publisherId, name, id) : null;
      if (duplicate) return res.status(409).json(duplicateResult(duplicate));
    }

    const [rowsUpdated, updatedRecords] = await ComicBookTitles.update(
      updateData,
      {
        where: { id },
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      console.log('❌ No rows updated');
      return res.status(404).json({ 
        success: false,
        error: 'Comic book title not found or no changes made' 
      });
    }
    
    // Handle different database dialects
    let updatedComicBookTitle: ComicBookTitleAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedComicBookTitle = updatedRecords[0].toJSON();
    } else {
      const record = await ComicBookTitles.findByPk(id);
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Comic book title not found after update' 
        });
      }
      updatedComicBookTitle = record.toJSON();
    }
    
    console.log('✅ Comic book title updated successfully');
    
    return res.status(200).json({
      success: true,
      data: updatedComicBookTitle,
      message: 'Comic book title updated successfully'
    });
  } catch (error) {
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'updateComicBookTitle'));
  }
};

// Delete a comic book title
export const removeComicBookTitle = async (
  req: Request<{ id: string }>,
  res: Response<ApiResult>
): Promise<Response<ApiResult>> => {
  const { id } = req.params;
  
  console.log('📨 DELETE /comicbooktitles/:id');
  console.log('Comic book title ID:', id);
  
  // Validate required parameters
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Comic book title ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    // Check if record exists
    const existingRecord = await ComicBookTitles.findByPk(id);
    
    if (!existingRecord) {
      console.log('❌ Comic book title not found');
      return res.status(404).json({ 
        success: false,
        error: 'Comic book title not found' 
      });
    }
    
    const rowsDeleted = await ComicBookTitles.destroy({ 
      where: { id }
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete comic book title' 
      });
    }
    
    console.log('✅ Comic book title deleted successfully');
    
    return res.status(200).json({ 
      success: true,
      message: 'Comic book title deleted successfully' 
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'removeComicBookTitle'));
  }
};