import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';
import type { WishListAttributes, WishListCreationAttributes, WishListsModel, WishListType } from '../models/wishlists';
import type { ApiResult, IdResult, WishListResult, WishListsResult } from '../types/api';
import { errorMessages } from '../utils/errors';
import { findCover } from '../services/covers';
import { clientId } from '../utils/clientId';

/** A number as a form sends it: text ("25", or "" when blank), a number, or nothing */
type FormNumber = string | number | null;

/** What the wish list form (and Search's Add to Wish List) sends. On an update, fields left out stay as they are. */
export type WishListBody = {
  /** The ID the app chose for a new item (see utils/clientId.ts) */
  id?: string;
  comicBookTitle?: string;
  comicIssue?: FormNumber;
  comicBookVolume?: FormNumber;
  comicBookYear?: FormNumber;
  comicBookPublisher?: string;
  comicBookCover?: string | null;
  type?: string;
  wishUsersId?: string;
};

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

const getWishListModel = (): WishListsModel => db.WishLists;

// Centralized error reply. A catch can receive anything, so it's turned into an Error first.
const errorResult = (thrown: Error, context: string): ApiResult => {
  console.error(`Error in ${context}:`, thrown);
  return { success: false, errors: errorMessages(thrown) };
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
const toNumberOrNull = (value: FormNumber | undefined): number | null | undefined => {
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

export const getWishLists = async (
  req: Request<{ userId: string }>,
  res: Response<WishListsResult>
): Promise<Response<WishListsResult>> => {
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getWishLists'));
  }
};

export const getRegular = async (
  _req: Request,
  res: Response<WishListsResult>
): Promise<Response<WishListsResult>> => {
  try {
    const regularWishLists = await findWishLists({ type: 'regular' });
    
    return res.status(200).json({
      success: true,
      data: regularWishLists,
      count: regularWishLists.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getRegular'));
  }
};

export const getVariant = async (
  _req: Request,
  res: Response<WishListsResult>
): Promise<Response<WishListsResult>> => {
  try {
    const variantWishLists = await findWishLists({ type: 'variant' });
    
    return res.status(200).json({
      success: true,
      data: variantWishLists,
      count: variantWishLists.length
    });
  } catch (error) {
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getVariant'));
  }
};

export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<WishListResult>
): Promise<Response<WishListResult>> => {
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getOneById'));
  }
};

/**
 * Finds a cover for a wish list item and saves it, unless someone has added
 * their own cover in the meantime. Failures leave the placeholder.
 */
export const addCoverInBackground = (
  id: string,
  series: string,
  issue: number,
  year: number | null
): Promise<void> =>
  findCover({ series, issue, year })
    .then(async cover => {
      if (!cover) return;
      await getWishListModel().update(
        { comicBookCover: cover },
        { where: { id, comicBookCover: null }, returning: false }
      );
    })
    .catch(error => console.warn('Could not save the cover for a wish list item:', error));

export const createWishList = async (
  req: Request<Record<string, string>, IdResult, WishListBody>,
  res: Response<IdResult>
): Promise<Response<IdResult>> => {
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
  const validation = validateParams(req.body, [
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
  const comicIssueNum = comicIssue ? parseInt(String(comicIssue), 10) : null;
  const comicBookVolumeNum = comicBookVolume ? parseInt(String(comicBookVolume), 10) : null;
  const comicBookYearNum = comicBookYear ? parseInt(String(comicBookYear), 10) : null;
  const wishType: WishListType = type!.toLowerCase() === 'variant' ? 'variant' : 'regular';
  
  try {
    const WishLists = getWishListModel();
    const newWishList = await WishLists.create({
      ...clientId(req.body?.id),
      comicBookTitle: comicBookTitle!.trim(),
      comicIssue: comicIssueNum,
      comicBookVolume: comicBookVolumeNum,
      comicBookYear: comicBookYearNum,
      comicBookPublisher: comicBookPublisher!.trim(),
      comicBookCover: comicBookCover?.trim() || null,
      type: wishType,
      wishUsersId: wishUsersId!,  // ✅ UUID string
    });
    
    // No cover given (e.g. added from Search): look one up on Comic Vine.
    // Runs after the reply, so adding to the wish list stays instant.
    if (!newWishList.comicBookCover && comicIssueNum !== null) {
      addCoverInBackground(newWishList.id, comicBookTitle!.trim(), comicIssueNum, comicBookYearNum);
    }

    return res.status(201).json({ 
      success: true,
      data: { id: newWishList.id },
      message: 'Wish list created successfully'
    });
  } catch (error) {
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'createWishList'));
  }
};

export const updateWishList = async (
  req: Request<{ id: string }, WishListResult, WishListBody>,
  res: Response<WishListResult>
): Promise<Response<WishListResult>> => {
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
  
  const body = req.body;
  const updateData: Partial<WishListCreationAttributes> = {};

  // Convert issue, volume and year from form strings, so a blank field is
  // saved as empty instead of '' (which PostgreSQL rejects for INTEGER columns)
  for (const { field, label, min } of NUMBER_FIELDS) {
    const value = toNumberOrNull(body[field]);
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
    updateData[field] = value;
  }
  
  const stringFields = [
    'comicBookTitle',
    'comicBookPublisher',
    'comicBookCover'
  ] as const;
  
  for (const field of stringFields) {
    const value = body[field];
    if (value === null) {
      updateData[field] = null;
    } else if (value !== undefined) {
      const stringValidation = validateString(
        value, 
        field.replace(/([A-Z])/g, ' $1').trim()
      );
      if (!stringValidation.isValid) {
        return res.status(400).json({ 
          success: false,
          error: stringValidation.message 
        });
      }
      updateData[field] = value.trim();
    }
  }
  
  if (body.type !== undefined) {
    const typeValidation = validateType(body.type);
    if (!typeValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: typeValidation.message 
      });
    }
    updateData.type = body.type.toLowerCase() === 'variant' ? 'variant' : 'regular';
  }
  
  // ✅ Validate UUID if provided
  if (body.wishUsersId !== undefined) {
    const userIdValidation = validateUUID(body.wishUsersId, 'Wish Users ID');
    if (!userIdValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: userIdValidation.message 
      });
    }
    updateData.wishUsersId = body.wishUsersId;
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
    return res.status(400).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'updateWishList'));
  }
};

export const removeWishList = async (
  req: Request<{ id: string }>,
  res: Response<ApiResult>
): Promise<Response<ApiResult>> => {
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'removeWishList'));
  }
};