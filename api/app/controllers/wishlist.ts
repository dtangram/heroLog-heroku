import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

interface WishListInstance {
  id?: number;
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  comicBookCover: string;
  type: 'regular' | 'variant';
  wishUsersId: number;
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => WishListAttributes;
}

interface WishListModel {
  findAll: (options: { where: WhereOptions<WishListAttributes> }) => Promise<WishListInstance[]>;
  findByPk: (id: number) => Promise<WishListInstance | null>;
  create: (data: Partial<WishListAttributes>) => Promise<WishListInstance>;
  update: (
    data: Partial<WishListAttributes>,
    options: { where: WhereOptions<WishListAttributes>; returning: boolean }
  ) => Promise<[number, WishListInstance[]]>;
  destroy: (options: { where: WhereOptions<WishListAttributes> }) => Promise<number>;
}

interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: string[];
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface SequelizeValidationError extends Error {
  errors: Array<{ message: string }>;
}

// ============================================================================
// MODEL GETTER
// ============================================================================

const getWishListModel = (): WishListModel => {
  const WishList = (db as any).WishLists || (db as any).Wishlist || (db as any).wishlist;
  
  if (!WishList) {
    console.error('❌ WishList model not found. Available models:', Object.keys(db));
    throw new Error('WishList model not loaded');
  }
  
  return WishList as WishListModel;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isSequelizeError = (error: Error): error is SequelizeValidationError => {
  return 'errors' in error && Array.isArray((error as SequelizeValidationError).errors);
};

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

const validateParams = (
  params: Record<string, string | number | boolean | null | undefined>,
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

const validateString = (
  value: string | number | boolean | null | undefined,
  fieldName: string
): ValidationResult => {
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

const findWishLists = async (
  whereClause: WhereOptions<WishListAttributes>
): Promise<WishListAttributes[]> => {
  if (!whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Invalid query parameters');
  }
  
  const WishLists = getWishListModel();
  const results = await WishLists.findAll({ where: whereClause });
  return results.map(item => item.toJSON());
};

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

export const getWishLists = async (
  req: Request<{ userId: string }>,
  res: Response<ApiResponse<WishListAttributes[]>>
): Promise<Response> => {
  const { userId } = req.params;
  
  const paramValidation = validateParams(req.params, ['userId']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
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

export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<WishListAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const idValidation = validateNumericId(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
    });
  }
  
  try {
    const WishLists = getWishListModel();
    const wishlist = await WishLists.findByPk(parseInt(id, 10));
    
    if (!wishlist) {
      return res.status(404).json({ 
        success: false,
        error: 'Wish list not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: wishlist.toJSON()
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

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
  
  const validation = validateParams(req.body as Record<string, string | number>, [
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
  
  const typeValidation = validateType(type!);
  if (!typeValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: typeValidation.message 
    });
  }
  
  if (typeof wishUsersId !== 'number' || isNaN(wishUsersId) || wishUsersId <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'wishUsersId must be a valid positive number' 
    });
  }
  
  try {
    const WishLists = getWishListModel();
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

export const updateWishList = async (
  req: Request<{ id: string }, Record<string, never>, Partial<WishListAttributes>>,
  res: Response<ApiResponse<WishListAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const idValidation = validateNumericId(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
    });
  }
  
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Request body cannot be empty' 
    });
  }
  
  const updateData: Partial<WishListAttributes> = { ...req.body };
  
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
      updateData[field] = (updateData[field] as string).trim() as any;
    }
  }
  
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
  
  if (updateData.wishUsersId !== undefined) {
    if (typeof updateData.wishUsersId !== 'number' || isNaN(updateData.wishUsersId) || updateData.wishUsersId <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'wishUsersId must be a valid positive number' 
      });
    }
  }
  
  try {
    const WishLists = getWishListModel();
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
    
    let updatedWishList: WishListAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedWishList = updatedRecords[0].toJSON();
    } else {
      const record = await WishLists.findByPk(parseInt(id, 10));
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Wish list not found after update' 
        });
      }
      updatedWishList = record.toJSON();
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

export const removeWishList = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>
): Promise<Response> => {
  const { id } = req.params;
  
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const idValidation = validateNumericId(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: idValidation.message 
    });
  }
  
  try {
    const WishLists = getWishListModel();
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