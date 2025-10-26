import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';

// Properly typed model interface
interface ComicBookTitleModel {
  findAll: (options: { 
    where?: WhereOptions<ComicBookTitleAttributes>;
    order?: Array<[string, string]>;
  }) => Promise<ComicBookTitleInstance[]>;
  findByPk: (id: string) => Promise<ComicBookTitleInstance | null>;
  create: (data: ComicBookTitleCreationAttributes) => Promise<ComicBookTitleInstance>;
  update: (
    data: Partial<ComicBookTitleAttributes>, 
    options: { where: WhereOptions<ComicBookTitleAttributes>; returning: boolean }
  ) => Promise<[number, ComicBookTitleInstance[]]>;
  destroy: (options: { where: WhereOptions<ComicBookTitleAttributes> }) => Promise<number>;
}

// Model instance interface
interface ComicBookTitleInstance {
  id: string;
  cbTitle: string;
  collectpubId: string | null;
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => ComicBookTitleAttributes;
}

// Fixed interface to match actual model structure (UUIDs, not numbers)
interface ComicBookTitleAttributes {
  id: string;  // UUID string
  cbTitle: string;
  collectpubId: string | null;  // UUID string
  createdAt: Date;
  updatedAt: Date;
}

// Creation interface
interface ComicBookTitleCreationAttributes {
  cbTitle: string;
  collectpubId: string;
}

// API response interface
interface ApiResponse<T = ComicBookTitleAttributes | ComicBookTitleAttributes[]> {
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

// Import models with proper typing
const ComicBookTitles = db.ComicBookTitles as ComicBookTitleModel;

// Type guard for Sequelize errors
const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

// UUID validation - Updated to accept all UUID versions
const isValidUUID = (value: string): boolean => {
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

// Get all comic book titles for a specific publisher
export const getCollectPublisherComicBookTitles = async (
  req: Request<{ pubId: string }>,
  res: Response<ApiResponse<ComicBookTitleAttributes[]>>
): Promise<Response> => {
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
    
    const data = comicbooktitleComicBookTitles.map(title => title.toJSON());
    
    console.log(`✅ Found ${data.length} comic book titles`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getCollectPublisherComicBookTitles');
  }
};

// Get one comic book title by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<ComicBookTitleAttributes>>
): Promise<Response> => {
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
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

// Create a new comic book title
export const createComicBookTitle = async (
  req: Request<{}, {}, Partial<ComicBookTitleCreationAttributes>>,
  res: Response<ApiResponse<ComicBookTitleAttributes>>
): Promise<Response> => {
  console.log('📨 POST /comicbooktitles');
  console.log('📨 Body:', req.body);
  
  const { cbTitle, collectpubId } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body as Record<string, string>, ['cbTitle', 'collectpubId']);
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
    return handleError(res, error as Error, 400, 'createComicBookTitle');
  }
};

// Update an existing comic book title
export const updateComicBookTitle = async (
  req: Request<{ id: string }, {}, Partial<ComicBookTitleAttributes>>,
  res: Response<ApiResponse<ComicBookTitleAttributes>>
): Promise<Response> => {
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
    return handleError(res, error as Error, 400, 'updateComicBookTitle');
  }
};

// Delete a comic book title
export const removeComicBookTitle = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
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
    return handleError(res, error as Error, 500, 'removeComicBookTitle');
  }
};