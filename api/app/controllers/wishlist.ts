import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WishListAttributes {
  id?: string;  // ✅ Changed to UUID
  comicBookTitle: string;
  comicIssue: number | null;  // ✅ Changed to number
  comicBookVolume: number | null;  // ✅ Changed to number
  comicBookYear: number | null;  // ✅ Changed to number
  comicBookPublisher: string;
  comicBookCover: string | null;
  type: 'regular' | 'variant';
  wishUsersId: string;  // ✅ Changed to UUID
  createdAt?: Date;
  updatedAt?: Date;
}

interface WishListInstance {
  id?: string;  // ✅ Changed to UUID
  comicBookTitle: string;
  comicIssue: number | null;
  comicBookVolume: number | null;
  comicBookYear: number | null;
  comicBookPublisher: string;
  comicBookCover: string | null;
  type: 'regular' | 'variant';
  wishUsersId: string;  // ✅ Changed to UUID
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => WishListAttributes;
}

interface WishListModel {
  findAll: (options: { where: WhereOptions<WishListAttributes> }) => Promise<WishListInstance[]>;
  findByPk: (id: string) => Promise<WishListInstance | null>;  // ✅ Changed to UUID
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

// ✅ Added UUID validation
/**
 * Forms send numbers as strings ("25", or "" when blank). Convert before
 * saving: "" → null (clears the field), "25" → 25, "25A" → NaN so the check
 * below rejects it. undefined means the field wasn't sent.
 */
const toNumberOrNull = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (text === '') return null;
  return /^\d+$/.test(text) ? Number(text) : NaN;
};

/** Same rules and messages as the sale list update. */
const NUMBER_FIELDS = [
  { field: 'comicIssue', label: 'Comic issue', min: 1 },
  { field: 'comicBookVolume', label: 'Comic book volume', min: 1 },
  { field: 'comicBookYear', label: 'Comic book year', min: 1900 },
] as const;

const validateNumberField = (
  value: number,
  label: string,
  min: number,
  isYear: boolean
): ValidationResult => {
  if (!Number.isInteger(value)) {
    return { isValid: false, message: `${label} must be a valid number` };
  }
  if (isYear) {
    const maxYear = new Date().getFullYear() + 1;
    if (value < min || value > maxYear) {
      return { isValid: false, message: 'Comic book year must be between 1900 and current year + 1' };
    }
  } else if (value < min) {
    return { isValid: false, message: `${label} must be ${min} or greater` };
  }
  return { isValid: true };
};

const validateUUID = (value: string, fieldName: string = 'ID'): ValidationResult => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(value)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid UUID`
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
  
  // ✅ Validate UUID instead of numeric
  const uuidValidation = validateUUID(userId, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const wishLists = await findWishLists({ 
      wishUsersId: userId  // ✅ No parseInt
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
  
  // ✅ Validate UUID instead of numeric
  const uuidValidation = validateUUID(id, 'Wish list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const WishLists = getWishListModel();
    const wishlist = await WishLists.findByPk(id);  // ✅ No parseInt
    
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
  res: Response<ApiResponse<{ id: string }>>  // ✅ Changed to string
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
  
  // ✅ Only validate required fields
  const validation = validateParams(req.body as Record<string, string | number>, [
    'comicBookTitle',
    'comicBookPublisher',
    'type',
    'wishUsersId'
  ]);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate comicBookTitle
  const titleValidation = validateString(comicBookTitle, 'Comic book title');
  if (!titleValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: titleValidation.message 
    });
  }
  
  // Validate comicBookPublisher
  const publisherValidation = validateString(comicBookPublisher, 'Comic book publisher');
  if (!publisherValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: publisherValidation.message 
    });
  }
  
  // Validate type
  const typeValidation = validateType(type!);
  if (!typeValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: typeValidation.message 
    });
  }
  
  // ✅ Validate UUID
  const userIdValidation = validateUUID(wishUsersId!, 'Wish Users ID');
  if (!userIdValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: userIdValidation.message 
    });
  }
  
  // ✅ Convert string numbers to integers
  const comicIssueNum = comicIssue ? parseInt(comicIssue as any, 10) : null;
  const comicBookVolumeNum = comicBookVolume ? parseInt(comicBookVolume as any, 10) : null;
  const comicBookYearNum = comicBookYear ? parseInt(comicBookYear as any, 10) : null;
  
  try {
    const WishLists = getWishListModel();
    const newWishList = await WishLists.create({
      comicBookTitle: comicBookTitle!.trim(),
      comicIssue: comicIssueNum,
      comicBookVolume: comicBookVolumeNum,
      comicBookYear: comicBookYearNum,
      comicBookPublisher: comicBookPublisher!.trim(),
      comicBookCover: comicBookCover?.trim() || null,
      type: type!.toLowerCase() as 'regular' | 'variant',
      wishUsersId: wishUsersId!,  // ✅ UUID string
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
  
  // ✅ Validate UUID
  const uuidValidation = validateUUID(id, 'Wish list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Request body cannot be empty' 
    });
  }
  
  const updateData: Partial<WishListAttributes> = { ...req.body };

  // Convert issue, volume and year from form strings, so a blank field is
  // saved as empty instead of '' (which PostgreSQL rejects for INTEGER columns)
  for (const { field, label, min } of NUMBER_FIELDS) {
    const value = toNumberOrNull((req.body as Record<string, unknown>)[field]);
    if (value === undefined) continue;

    if (value !== null) {
      const numberValidation = validateNumberField(value, label, min, field === 'comicBookYear');
      if (!numberValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: numberValidation.message
        });
      }
    }
    (updateData as Record<string, number | null>)[field] = value;
  }
  
  const stringFields = [
    'comicBookTitle',
    'comicBookPublisher',
    'comicBookCover'
  ] as const;
  
  for (const field of stringFields) {
    if (updateData[field] !== undefined && updateData[field] !== null) {
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
  
  // ✅ Validate UUID if provided
  if (updateData.wishUsersId !== undefined) {
    const userIdValidation = validateUUID(updateData.wishUsersId, 'Wish Users ID');
    if (!userIdValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: userIdValidation.message 
      });
    }
  }
  
  try {
    const WishLists = getWishListModel();
    const [rowsUpdated, updatedRecords] = await WishLists.update(
      updateData,
      {
        where: { id },  // ✅ No parseInt
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
      const record = await WishLists.findByPk(id);  // ✅ No parseInt
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
  
  // ✅ Validate UUID
  const uuidValidation = validateUUID(id, 'Wish list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const WishLists = getWishListModel();
    const existingRecord = await WishLists.findByPk(id);  // ✅ No parseInt
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Wish list not found' 
      });
    }
    
    const rowsDeleted = await WishLists.destroy({ 
      where: { id }  // ✅ No parseInt
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