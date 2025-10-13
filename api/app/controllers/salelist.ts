import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';

// Sale list type literal
type SaleListType = 'regular' | 'variant';

// Properly typed model interface
interface SaleListModel {
  findAll: (options: { where: WhereOptions<SaleListAttributes> }) => Promise<SaleListInstance[]>;
  findByPk: (id: string) => Promise<SaleListInstance | null>;
  create: (data: SaleListCreationAttributes) => Promise<SaleListInstance>;
  update: (
    data: Partial<SaleListAttributes>, 
    options: { where: WhereOptions<SaleListAttributes>; returning: boolean }
  ) => Promise<[number, SaleListInstance[]]>;
  destroy: (options: { where: WhereOptions<SaleListAttributes> }) => Promise<number>;
}

// Model instance interface
interface SaleListInstance {
  id: string;
  comicBookTitle: string;
  comicIssue: number | null;
  comicBookVolume: number | null;
  comicBookYear: number | null;
  comicBookPublisher: string;
  comicBookCover: string | null;
  type: SaleListType;
  saleUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => SaleListAttributes;
}

// Fixed interface to match actual model structure (UUIDs and proper field types)
interface SaleListAttributes {
  id: string;  // UUID string
  comicBookTitle: string;
  comicIssue: number | null;  // INTEGER in model, not string
  comicBookVolume: number | null;  // INTEGER in model, not string  
  comicBookYear: number | null;  // INTEGER in model, not string
  comicBookPublisher: string;
  comicBookCover: string | null;
  type: SaleListType;
  saleUsersId: string | null;  // UUID string
  createdAt: Date;
  updatedAt: Date;
}

// Creation interface
interface SaleListCreationAttributes {
  comicBookTitle: string;
  comicIssue?: number | null;
  comicBookVolume?: number | null;
  comicBookYear?: number | null;
  comicBookPublisher: string;
  comicBookCover?: string | null;
  type: SaleListType;
  saleUsersId: string;
}

// API response interface
interface ApiResponse<T = SaleListAttributes | SaleListAttributes[]> {
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
const models = require('../models') as {
  SaleLists: SaleListModel;
};

const { SaleLists } = models;

// Type guard for Sequelize errors
const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

// UUID validation
const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Year validation
const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 1;
};

// Sale list type validation
const isValidSaleListType = (type: string): type is SaleListType => {
  return type === 'regular' || type === 'variant';
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

// Number validation
const validateNumber = (value: number, fieldName: string, min?: number, max?: number): ValidationResult => {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid number`
    };
  }
  
  if (min !== undefined && value < min) {
    return {
      isValid: false,
      message: `${fieldName} must be ${min} or greater`
    };
  }
  
  if (max !== undefined && value > max) {
    return {
      isValid: false,
      message: `${fieldName} must be ${max} or less`
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

// Sale list type validation
const validateType = (type: string): ValidationResult => {
  if (!isValidSaleListType(type.toLowerCase() as SaleListType)) {
    return {
      isValid: false,
      message: `Type must be either 'regular' or 'variant'`
    };
  }
  
  return { isValid: true };
};

// Generic function to find sale lists with filters
const findSaleLists = async (
  whereClause: WhereOptions<SaleListAttributes>
): Promise<SaleListInstance[]> => {
  if (!whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Invalid query parameters');
  }
  
  return await SaleLists.findAll({ where: whereClause });
};

// Get all sale lists for a specific user
export const getSaleLists = async (
  req: Request<{ userId: string }>,
  res: Response<ApiResponse<SaleListAttributes[]>>
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
  
  // Validate UUID format
  const uuidValidation = validateUUID(userId, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const saleLists = await findSaleLists({ 
      saleUsersId: userId  // No parseInt for UUID
    });
    
    const data = saleLists.map(saleList => saleList.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getSaleLists');
  }
};

// Get all sale lists with type 'regular'
export const getRegular = async (
  _req: Request,
  res: Response<ApiResponse<SaleListAttributes[]>>
): Promise<Response> => {
  try {
    const regularSaleLists = await findSaleLists({ type: 'regular' });
    
    const data = regularSaleLists.map(saleList => saleList.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getRegular');
  }
};

// Get all sale lists with type 'variant'
export const getVariant = async (
  _req: Request,
  res: Response<ApiResponse<SaleListAttributes[]>>
): Promise<Response> => {
  try {
    const variantSaleLists = await findSaleLists({ type: 'variant' });
    
    const data = variantSaleLists.map(saleList => saleList.toJSON());
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getVariant');
  }
};

// Find one sale list by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<SaleListAttributes>>
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
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Sale list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const salelist = await SaleLists.findByPk(id);  // No parseInt for UUID
    
    if (!salelist) {
      return res.status(404).json({ 
        success: false,
        error: 'Sale list not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: salelist.toJSON()
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

// Create a new sale list
export const createSaleList = async (
  req: Request<{}, {}, Partial<SaleListCreationAttributes>>,
  res: Response<ApiResponse<Pick<SaleListAttributes, 'id'>>>
): Promise<Response> => {
  const {
    comicBookTitle,
    comicIssue,
    comicBookVolume,
    comicBookYear,
    comicBookPublisher,
    comicBookCover,
    type,
    saleUsersId,
  } = req.body;
  
  // Validate required fields
  const validation = validateParams(req.body as Record<string, string>, [
    'comicBookTitle',
    'comicBookPublisher',
    'type',
    'saleUsersId'
  ]);
  
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate comicBookTitle
  if (!comicBookTitle) {
    return res.status(400).json({ success: false, error: 'Comic book title is required' });
  }
  const titleValidation = validateString(comicBookTitle, 'Comic book title');
  if (!titleValidation.isValid) {
    return res.status(400).json({ success: false, error: titleValidation.message });
  }
  
  // Validate comicBookPublisher
  if (!comicBookPublisher) {
    return res.status(400).json({ success: false, error: 'Comic book publisher is required' });
  }
  const publisherValidation = validateString(comicBookPublisher, 'Comic book publisher');
  if (!publisherValidation.isValid) {
    return res.status(400).json({ success: false, error: publisherValidation.message });
  }
  
  // Validate type
  if (!type) {
    return res.status(400).json({ success: false, error: 'Type is required' });
  }
  const typeValidation = validateType(type);
  if (!typeValidation.isValid) {
    return res.status(400).json({ success: false, error: typeValidation.message });
  }
  
  // Validate saleUsersId
  if (!saleUsersId) {
    return res.status(400).json({ success: false, error: 'Sale Users ID is required' });
  }
  const userIdValidation = validateUUID(saleUsersId, 'Sale Users ID');
  if (!userIdValidation.isValid) {
    return res.status(400).json({ success: false, error: userIdValidation.message });
  }
  
  // Validate optional string fields
  if (comicBookCover !== undefined) {
    const coverValidation = validateString(comicBookCover as string, 'Comic book cover');
    if (!coverValidation.isValid) {
      return res.status(400).json({ success: false, error: coverValidation.message });
    }
  }
  
  // Validate optional numeric fields
  if (comicIssue !== undefined) {
    const issueValidation = validateNumber(comicIssue as number, 'Comic issue', 1);
    if (!issueValidation.isValid) {
      return res.status(400).json({ success: false, error: issueValidation.message });
    }
  }
  
  if (comicBookVolume !== undefined) {
    const volumeValidation = validateNumber(comicBookVolume as number, 'Comic book volume', 1);
    if (!volumeValidation.isValid) {
      return res.status(400).json({ success: false, error: volumeValidation.message });
    }
  }
  
  if (comicBookYear !== undefined) {
    if (!isValidYear(comicBookYear as number)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comic book year must be between 1900 and current year + 1' 
      });
    }
  }
  
  try {
    const newSaleList = await SaleLists.create({
      comicBookTitle: comicBookTitle.trim(),
      comicIssue: comicIssue || null,
      comicBookVolume: comicBookVolume || null,
      comicBookYear: comicBookYear || null,
      comicBookPublisher: comicBookPublisher.trim(),
      comicBookCover: comicBookCover?.trim() || null,
      type: type.toLowerCase() as SaleListType,
      saleUsersId: saleUsersId,
    });
    
    return res.status(201).json({ 
      success: true,
      data: { id: newSaleList.id },
      message: 'Sale list created successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'createSaleList');
  }
};

// Update an existing sale list
export const updateSaleList = async (
  req: Request<{ id: string }, {}, Partial<SaleListAttributes>>,
  res: Response<ApiResponse<SaleListAttributes>>
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
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Sale list ID');
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
  const updateData: Partial<SaleListAttributes> = { ...req.body };
  
  // Validate string fields if provided
  if (updateData.comicBookTitle !== undefined) {
    const titleValidation = validateString(updateData.comicBookTitle, 'Comic book title');
    if (!titleValidation.isValid) {
      return res.status(400).json({ success: false, error: titleValidation.message });
    }
    updateData.comicBookTitle = updateData.comicBookTitle.trim();
  }
  
  if (updateData.comicBookPublisher !== undefined) {
    const publisherValidation = validateString(updateData.comicBookPublisher, 'Comic book publisher');
    if (!publisherValidation.isValid) {
      return res.status(400).json({ success: false, error: publisherValidation.message });
    }
    updateData.comicBookPublisher = updateData.comicBookPublisher.trim();
  }
  
  if (updateData.comicBookCover !== undefined && updateData.comicBookCover !== null) {
    const coverValidation = validateString(updateData.comicBookCover, 'Comic book cover');
    if (!coverValidation.isValid) {
      return res.status(400).json({ success: false, error: coverValidation.message });
    }
    updateData.comicBookCover = updateData.comicBookCover.trim();
  }
  
  // Validate numeric fields if provided
  if (updateData.comicIssue !== undefined && updateData.comicIssue !== null) {
    const issueValidation = validateNumber(updateData.comicIssue, 'Comic issue', 1);
    if (!issueValidation.isValid) {
      return res.status(400).json({ success: false, error: issueValidation.message });
    }
  }
  
  if (updateData.comicBookVolume !== undefined && updateData.comicBookVolume !== null) {
    const volumeValidation = validateNumber(updateData.comicBookVolume, 'Comic book volume', 1);
    if (!volumeValidation.isValid) {
      return res.status(400).json({ success: false, error: volumeValidation.message });
    }
  }
  
  if (updateData.comicBookYear !== undefined && updateData.comicBookYear !== null) {
    if (!isValidYear(updateData.comicBookYear)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comic book year must be between 1900 and current year + 1' 
      });
    }
  }
  
  // Validate type if provided
  if (updateData.type !== undefined) {
    const typeValidation = validateType(updateData.type);
    if (!typeValidation.isValid) {
      return res.status(400).json({ success: false, error: typeValidation.message });
    }
    updateData.type = updateData.type.toLowerCase() as SaleListType;
  }
  
  // Validate saleUsersId if provided
  if (updateData.saleUsersId !== undefined && updateData.saleUsersId !== null) {
    const userIdValidation = validateUUID(updateData.saleUsersId, 'Sale Users ID');
    if (!userIdValidation.isValid) {
      return res.status(400).json({ success: false, error: userIdValidation.message });
    }
  }
  
  try {
    const [rowsUpdated, updatedRecords] = await SaleLists.update(
      updateData,
      {
        where: { id },  // No parseInt for UUID
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Sale list not found or no changes made' 
      });
    }
    
    // Handle different database dialects
    let updatedSaleList: SaleListAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedSaleList = updatedRecords[0].toJSON();
    } else {
      const record = await SaleLists.findByPk(id);
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Sale list not found after update' 
        });
      }
      updatedSaleList = record.toJSON();
    }
    
    return res.status(200).json({
      success: true,
      data: updatedSaleList,
      message: 'Sale list updated successfully'
    });
  } catch (error) {
    return handleError(res, error as Error, 400, 'updateSaleList');
  }
};

// Delete a sale list
export const removeSaleList = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<never>>
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
  
  // Validate UUID format
  const uuidValidation = validateUUID(id, 'Sale list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    // Check if record exists before attempting deletion
    const existingRecord = await SaleLists.findByPk(id);
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Sale list not found' 
      });
    }
    
    const rowsDeleted = await SaleLists.destroy({ 
      where: { id }  // No parseInt for UUID
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete sale list' 
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Sale list deleted successfully' 
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'removeSaleList');
  }
};