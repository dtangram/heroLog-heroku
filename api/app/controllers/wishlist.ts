import { Request, Response } from 'express';
import { WhereOptions, Model, ModelStatic } from 'sequelize';

/**
 * Interface for WishList attributes
 */
interface WishListAttributes {
  id?: number;
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  comicBookCover: string;
  type: 'regular' | 'variant';
  wishUsersId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Interface for WishList model instance
 */
interface WishListInstance extends Model<WishListAttributes>, WishListAttributes {}

/**
 * Type for WishList model
 */
type WishListModel = ModelStatic<WishListInstance>;

/**
 * Import models with proper typing
 */
const models = require('../models') as {
  WishLists: WishListModel;
};

const { WishLists } = models;

/**
 * Interface for API response structure
 */
interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: string[];
}

/**
 * Interface for validation result
 */
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Interface for Sequelize validation error
 */
interface SequelizeValidationError extends Error {
  errors: Array<{ message: string }>;
}

/**
 * Type guard to check if error has errors array (Sequelize validation errors)
 */
const isSequelizeError = (error: Error): error is SequelizeValidationError => {
  return 'errors' in error && Array.isArray((error as SequelizeValidationError).errors);
};

/**
 * Centralized error handler for consistent error responses
 */
const handleError = (
  res: Response,
  error: Error,
  statusCode: number = 500,
  context: string = ''
): Response<ApiResponse> => {
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

/**
 * Type for request body/params that can be validated
 */
type ValidatableObject = Record<string, string | number | boolean | null | undefined>;

/**
 * Validates that required parameters exist
 */
const validateParams = (
  params: ValidatableObject,
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

/**
 * Validates string input
 */
const validateString = (value: string | number | boolean | null | undefined, fieldName: string): ValidationResult => {
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

/**
 * Validates numeric ID
 */
const validateNumericId = (id: string, fieldName: string = 'ID'): ValidationResult => {
  const numericId = parseInt(id, 10);
  
  if (isNaN(numericId) || numericId <= 0) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid positive number`
    };
  }
  
  return { isValid: true };
};

/**
 * Validates wish list type
 */
const validateType = (type: string): ValidationResult => {
  const validTypes = ['regular', 'variant'];
  
  if (!validTypes.includes(type.toLowerCase())) {
    return {
      isValid: false,
      message: `Type must be either 'regular' or 'variant'`
    };
  }
  
  return { isValid: true };
};

/**
 * Generic function to find wish lists with filters
 */
const findWishLists = async (
  whereClause: WhereOptions<WishListAttributes>
): Promise<WishListAttributes[]> => {
  if (!whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Invalid query parameters');
  }
  
  const results = await WishLists.findAll({ where: whereClause });
  return results.map(item => item.toJSON() as WishListAttributes);
};

/**
 * Get all wish lists for a specific user
 */
export const getWishLists = async (
  req: Request<{ userId: string }>,
  res: Response<ApiResponse<WishListAttributes[]>>
): Promise<Response> => {
  const { userId } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['userId']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate userId is numeric
  const idValidation = validateNumericId(userId, 'User ID');
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
    });
  }
  
  try {
    const wishLists = await findWishLists({ 
      wishUsersId: parseInt(userId, 10) 
    });
    
    return res.status(200).json({
      success: true,
      data: wishLists,
      count: wishLists.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getWishLists');
  }
};

/**
 * Get all wish lists with type 'regular'
 */
export const getRegular = async (
  _req: Request,
  res: Response<ApiResponse<WishListAttributes[]>>
): Promise<Response> => {
  try {
    const regularWishLists = await findWishLists({ type: 'regular' });
    
    return res.status(200).json({
      success: true,
      data: regularWishLists,
      count: regularWishLists.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getRegular');
  }
};

/**
 * Get all wish lists with type 'variant'
 */
export const getVariant = async (
  _req: Request,
  res: Response<ApiResponse<WishListAttributes[]>>
): Promise<Response> => {
  try {
    const variantWishLists = await findWishLists({ type: 'variant' });
    
    return res.status(200).json({
      success: true,
      data: variantWishLists,
      count: variantWishLists.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getVariant');
  }
};

/**
 * Find one wish list by ID
 */
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<WishListAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate id is numeric
  const idValidation = validateNumericId(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
    });
  }
  
  try {
    const wishlist = await WishLists.findByPk(parseInt(id, 10));
    
    if (!wishlist) {
      return res.status(404).json({ 
        success: false,
        error: 'Wish list not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: wishlist.toJSON() as WishListAttributes
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

/**
 * Create a new wish list
 */
export const createWishList = async (
  req: Request<Record<string, never>, Record<string, never>, Partial<WishListAttributes>>,
  res: Response<ApiResponse<{ id: number }>>
): Promise<Response> => {
  const {
    comicBookTitle,
    comicIssue,
    comicBookVolume,
    comicBookYear,
    comicBookPublisher,
    comicBookCover,
    type,
    wishUsersId,
  } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body as ValidatableObject, [
    'comicBookTitle',
    'comicIssue',
    'comicBookVolume',
    'comicBookYear',
    'comicBookPublisher',
    'comicBookCover',
    'type',
    'wishUsersId'
  ]);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate string fields
  const stringFields = [
    { value: comicBookTitle, name: 'Comic book title' },
    { value: comicIssue, name: 'Comic issue' },
    { value: comicBookVolume, name: 'Comic book volume' },
    { value: comicBookYear, name: 'Comic book year' },
    { value: comicBookPublisher, name: 'Comic book publisher' },
    { value: comicBookCover, name: 'Comic book cover' }
  ];
  
  for (const field of stringFields) {
    const stringValidation = validateString(field.value, field.name);
    if (!stringValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: stringValidation.message 
      });
    }
  }
  
  // Validate type
  const typeValidation = validateType(type!);
  if (!typeValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: typeValidation.message 
    });
  }
  
  // Validate wishUsersId
  if (typeof wishUsersId !== 'number' || isNaN(wishUsersId) || wishUsersId <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'wishUsersId must be a valid positive number' 
    });
  }
  
  try {
    const newWishList = await WishLists.create({
      comicBookTitle: comicBookTitle!.trim(),
      comicIssue: comicIssue!.trim(),
      comicBookVolume: comicBookVolume!.trim(),
      comicBookYear: comicBookYear!.trim(),
      comicBookPublisher: comicBookPublisher!.trim(),
      comicBookCover: comicBookCover!.trim(),
      type: type!.toLowerCase() as 'regular' | 'variant',
      wishUsersId: wishUsersId!,
    });
    
    return res.status(201).json({ 
      success: true,
      data: { id: newWishList.id! },
      message: 'Wish list created successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'createWishList');
  }
};

/**
 * Update an existing wish list
 */
export const updateWishList = async (
  req: Request<{ id: string }, Record<string, never>, Partial<WishListAttributes>>,
  res: Response<ApiResponse<WishListAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate id is numeric
  const idValidation = validateNumericId(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
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
  const updateData: Partial<WishListAttributes> = { ...req.body };
  
  // Validate string fields if provided
  const stringFields = [
    'comicBookTitle',
    'comicIssue',
    'comicBookVolume',
    'comicBookYear',
    'comicBookPublisher',
    'comicBookCover'
  ] as const;
  
  for (const field of stringFields) {
    if (updateData[field] !== undefined) {
      const stringValidation = validateString(
        updateData[field], 
        field.replace(/([A-Z])/g, ' $1').trim()
      );
      if (!stringValidation.isValid) {
        return res.status(400).json({ 
          success: false,
          error: stringValidation.message 
        });
      }
      updateData[field] = (updateData[field] as string).trim();
    }
  }
  
  // Validate type if provided
  if (updateData.type !== undefined) {
    const typeValidation = validateType(updateData.type);
    if (!typeValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: typeValidation.message 
      });
    }
    updateData.type = updateData.type.toLowerCase() as 'regular' | 'variant';
  }
  
  // Validate wishUsersId if provided
  if (updateData.wishUsersId !== undefined) {
    if (typeof updateData.wishUsersId !== 'number' || isNaN(updateData.wishUsersId) || updateData.wishUsersId <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'wishUsersId must be a valid positive number' 
      });
    }
  }
  
  try {
    const [rowsUpdated, updatedRecords] = await WishLists.update(
      updateData,
      {
        where: { id: parseInt(id, 10) },
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Wish list not found or no changes made' 
      });
    }
    
    // Handle different database dialects (some don't support returning)
    let updatedWishList: WishListAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedWishList = updatedRecords[0].toJSON() as WishListAttributes;
    } else {
      const record = await WishLists.findByPk(parseInt(id, 10));
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Wish list not found after update' 
        });
      }
      updatedWishList = record.toJSON() as WishListAttributes;
    }
    
    return res.status(200).json({
      success: true,
      data: updatedWishList,
      message: 'Wish list updated successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'updateWishList');
  }
};

/**
 * Delete a wish list
 */
export const removeWishList = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>
): Promise<Response> => {
  const { id } = req.params;
  
  // Validate required parameters
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  // Validate id is numeric
  const idValidation = validateNumericId(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
    });
  }
  
  try {
    // Check if record exists before attempting deletion
    const existingRecord = await WishLists.findByPk(parseInt(id, 10));
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Wish list not found' 
      });
    }
    
    const rowsDeleted = await WishLists.destroy({ 
      where: { id: parseInt(id, 10) } 
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete wish list' 
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Wish list deleted successfully' 
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'removeWishList');
  }
};