import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SaleListType = 'regular' | 'variant';

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

interface SaleListAttributes {
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
}

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

interface ApiResponse<T = SaleListAttributes | SaleListAttributes[]> {
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

interface SequelizeError {
  errors: Array<{ message: string }>;
}

// ============================================================================
// MODEL GETTER
// ============================================================================

const getSaleListModel = (): SaleListModel => {
  const SaleList = (db as any).SaleLists || (db as any).SaleList || (db as any).Salelist || (db as any).salelist;
  
  if (!SaleList) {
    console.error('❌ SaleList model not found. Available models:', Object.keys(db));
    throw new Error('SaleList model not loaded');
  }
  
  return SaleList as SaleListModel;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 1;
};

const isValidSaleListType = (type: string): type is SaleListType => {
  return type === 'regular' || type === 'variant';
};

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

const validateUUID = (value: string, fieldName: string): ValidationResult => {
  if (!isValidUUID(value)) {
    return {
      isValid: false,
      message: `${fieldName} must be a valid UUID`
    };
  }
  
  return { isValid: true };
};

const validateType = (type: string): ValidationResult => {
  if (!isValidSaleListType(type.toLowerCase() as SaleListType)) {
    return {
      isValid: false,
      message: `Type must be either 'regular' or 'variant'`
    };
  }
  
  return { isValid: true };
};

const findSaleLists = async (
  whereClause: WhereOptions<SaleListAttributes>
): Promise<SaleListInstance[]> => {
  if (!whereClause || Object.keys(whereClause).length === 0) {
    throw new Error('Invalid query parameters');
  }
  
  const SaleLists = getSaleListModel();
  return await SaleLists.findAll({ where: whereClause });
};

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

export const getSaleLists = async (
  req: Request<{ userId: string }>,
  res: Response<ApiResponse<SaleListAttributes[]>>
): Promise<Response> => {
  const { userId } = req.params;
  
  const paramValidation = validateParams(req.params, ['userId']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const uuidValidation = validateUUID(userId, 'User ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const saleLists = await findSaleLists({ 
      saleUsersId: userId
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

export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<SaleListAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const uuidValidation = validateUUID(id, 'Sale list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const SaleLists = getSaleListModel();
    const salelist = await SaleLists.findByPk(id);
    
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
  
  console.log('📝 CREATE SALELIST - Received data:', req.body);
  
  // Validate required fields
  const validation = validateParams(req.body as Record<string, string>, [
    'comicBookTitle',
    'comicBookPublisher',
    'type',
    'saleUsersId'
  ]);
  
  if (!validation.isValid) {
    console.log('❌ Missing required fields:', validation.message);
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
    console.log('❌ Title validation failed:', titleValidation.message);
    return res.status(400).json({ success: false, error: titleValidation.message });
  }
  
  // Validate comicBookPublisher
  if (!comicBookPublisher) {
    return res.status(400).json({ success: false, error: 'Comic book publisher is required' });
  }
  const publisherValidation = validateString(comicBookPublisher, 'Comic book publisher');
  if (!publisherValidation.isValid) {
    console.log('❌ Publisher validation failed:', publisherValidation.message);
    return res.status(400).json({ success: false, error: publisherValidation.message });
  }
  
  // Validate type
  if (!type) {
    return res.status(400).json({ success: false, error: 'Type is required' });
  }
  const typeValidation = validateType(type);
  if (!typeValidation.isValid) {
    console.log('❌ Type validation failed:', typeValidation.message);
    return res.status(400).json({ success: false, error: typeValidation.message });
  }
  
  // Validate saleUsersId
  if (!saleUsersId) {
    return res.status(400).json({ success: false, error: 'Sale Users ID is required' });
  }
  const userIdValidation = validateUUID(saleUsersId, 'Sale Users ID');
  if (!userIdValidation.isValid) {
    console.log('❌ User ID validation failed:', userIdValidation.message);
    return res.status(400).json({ success: false, error: userIdValidation.message });
  }
  
  // ✅ Convert string numbers to actual numbers
  const comicIssueNum = comicIssue ? parseInt(comicIssue as any, 10) : null;
  const comicBookVolumeNum = comicBookVolume ? parseInt(comicBookVolume as any, 10) : null;
  const comicBookYearNum = comicBookYear ? parseInt(comicBookYear as any, 10) : null;
  
  // Validate optional numeric fields
  if (comicIssueNum !== null && !isNaN(comicIssueNum)) {
    const issueValidation = validateNumber(comicIssueNum, 'Comic issue', 1);
    if (!issueValidation.isValid) {
      console.log('❌ Issue validation failed:', issueValidation.message);
      return res.status(400).json({ success: false, error: issueValidation.message });
    }
  }
  
  if (comicBookVolumeNum !== null && !isNaN(comicBookVolumeNum)) {
    const volumeValidation = validateNumber(comicBookVolumeNum, 'Comic book volume', 1);
    if (!volumeValidation.isValid) {
      console.log('❌ Volume validation failed:', volumeValidation.message);
      return res.status(400).json({ success: false, error: volumeValidation.message });
    }
  }
  
  if (comicBookYearNum !== null && !isNaN(comicBookYearNum)) {
    if (!isValidYear(comicBookYearNum)) {
      console.log('❌ Year validation failed');
      return res.status(400).json({ 
        success: false, 
        error: 'Comic book year must be between 1900 and current year + 1' 
      });
    }
  }
  
  // Validate optional cover
  if (comicBookCover !== undefined && comicBookCover) {
    const coverValidation = validateString(comicBookCover as string, 'Comic book cover');
    if (!coverValidation.isValid) {
      console.log('❌ Cover validation failed:', coverValidation.message);
      return res.status(400).json({ success: false, error: coverValidation.message });
    }
  }
  
  try {
    const SaleLists = getSaleListModel();
    
    console.log('✅ Creating sale list...');
    const newSaleList = await SaleLists.create({
      comicBookTitle: comicBookTitle.trim(),
      comicIssue: comicIssueNum,
      comicBookVolume: comicBookVolumeNum,
      comicBookYear: comicBookYearNum,
      comicBookPublisher: comicBookPublisher.trim(),
      comicBookCover: comicBookCover?.trim() || null,
      type: type.toLowerCase() as SaleListType,
      saleUsersId: saleUsersId,
    });
    
    console.log('✅ Sale list created successfully:', newSaleList.id);
    
    return res.status(201).json({ 
      success: true,
      data: { id: newSaleList.id },
      message: 'Sale list created successfully'
    });
  } catch (error) {
    console.error('❌ Create sale list error:', error);
    return handleError(res, error as Error, 400, 'createSaleList');
  }
};

export const updateSaleList = async (
  req: Request<{ id: string }, {}, Partial<SaleListAttributes>>,
  res: Response<ApiResponse<SaleListAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const uuidValidation = validateUUID(id, 'Sale list ID');
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
  
  const updateData: Partial<SaleListAttributes> = { ...req.body };
  
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
  
  if (updateData.type !== undefined) {
    const typeValidation = validateType(updateData.type);
    if (!typeValidation.isValid) {
      return res.status(400).json({ success: false, error: typeValidation.message });
    }
    updateData.type = updateData.type.toLowerCase() as SaleListType;
  }
  
  if (updateData.saleUsersId !== undefined && updateData.saleUsersId !== null) {
    const userIdValidation = validateUUID(updateData.saleUsersId, 'Sale Users ID');
    if (!userIdValidation.isValid) {
      return res.status(400).json({ success: false, error: userIdValidation.message });
    }
  }
  
  try {
    const SaleLists = getSaleListModel();
    const [rowsUpdated, updatedRecords] = await SaleLists.update(
      updateData,
      {
        where: { id },
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Sale list not found or no changes made' 
      });
    }
    
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

export const removeSaleList = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { id } = req.params;
  
  const paramValidation = validateParams(req.params, ['id']);
  if (!paramValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: paramValidation.message 
    });
  }
  
  const uuidValidation = validateUUID(id, 'Sale list ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const SaleLists = getSaleListModel();
    const existingRecord = await SaleLists.findByPk(id);
    
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Sale list not found' 
      });
    }
    
    const rowsDeleted = await SaleLists.destroy({ 
      where: { id }
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