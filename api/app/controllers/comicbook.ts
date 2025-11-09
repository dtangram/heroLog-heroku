import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import db from '../models';

// Comic book type literal
type ComicBookType = 'regular' | 'variant';

// Model attributes interface
interface ComicBookAttributes {
  id: string;
  title: string;
  comicIssue: string | null;
  author: string | null;
  penciler: string | null;
  coverartist: string | null;
  inker: string | null;
  volume: string | null;
  year: number | null;
  comicBookCover: string | null;
  type: ComicBookType;
  comicbooktitlerelId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Model instance interface
interface ComicBookInstance {
  id: string;
  title: string;
  comicIssue: string | null;
  author: string | null;
  penciler: string | null;
  coverartist: string | null;
  inker: string | null;
  volume: string | null;
  year: number | null;
  comicBookCover: string | null;
  type: ComicBookType;
  comicbooktitlerelId: string;
  createdAt: Date;
  updatedAt: Date;
  toJSON: () => ComicBookAttributes;
}

// Model interface
interface ComicBookModel {
  findAll: (options: { 
    where?: WhereOptions<ComicBookAttributes>;
    order?: Array<[string, string]>;
  }) => Promise<ComicBookInstance[]>;
  findByPk: (id: string) => Promise<ComicBookInstance | null>;
  create: (data: ComicBookCreationAttributes) => Promise<ComicBookInstance>;
  update: (
    data: Partial<ComicBookAttributes>, 
    options: { where: WhereOptions<ComicBookAttributes>; returning: boolean }
  ) => Promise<[number, ComicBookInstance[]]>;
  destroy: (options: { where: WhereOptions<ComicBookAttributes> }) => Promise<number>;
}

// Creation interface
interface ComicBookCreationAttributes {
  title: string;
  comicIssue: string;
  author?: string | null;
  penciler?: string | null;
  coverartist?: string | null;
  inker?: string | null;
  volume?: string | null;
  year?: number | null;
  comicBookCover?: string | null;
  type: ComicBookType;
  comicbooktitlerelId: string;
}

// Frontend request interface (accepts strings from forms)
interface ComicBookCreateRequest {
  title: string;
  comicIssue: string;
  author?: string;
  penciler?: string;
  coverartist?: string;
  inker?: string;
  volume?: string;
  year?: string | number;
  comicBookCover?: string;
  type: ComicBookType;
  titleID: string;
}

// Frontend update request interface
interface ComicBookUpdateRequest {
  title?: string;
  comicIssue?: string;
  author?: string;
  penciler?: string;
  coverartist?: string;
  inker?: string;
  volume?: string;
  year?: string | number;
  comicBookCover?: string;
  type?: ComicBookType;
  comicbooktitlerelId?: string;
}

// API response interface
interface ApiResponse<T = ComicBookAttributes | ComicBookAttributes[]> {
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

// HELPERS
const ComicBooks = db.ComicBooks as ComicBookModel;

// Type guard for Sequelize errors
const isSequelizeError = (error: Error | SequelizeError): error is SequelizeError => {
  return 'errors' in error && Array.isArray((error as SequelizeError).errors);
};

// UUID validation
const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Year validation
const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 1;
};

// Comic book type validation
const isValidComicBookType = (type: string): type is ComicBookType => {
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
  
  const errors: string[] = isSequelizeError(error)
    ? error.errors.map(err => err.message)
    : [error.message];
  
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

// ============================================================================
// CONTROLLERS
// ============================================================================

// Get all comic books for a specific title
export const getComicBooks = async (
  req: Request<{ coboTitleId: string }>,
  res: Response<ApiResponse<ComicBookAttributes[]>>
): Promise<Response> => {
  const { coboTitleId } = req.params;
  
  console.log('GET /comicbook/titles/:coboTitleId');
  console.log('Comic book title ID:', coboTitleId);
  
  const validation = validateParams(req.params, ['coboTitleId']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  const uuidValidation = validateUUID(coboTitleId, 'Comic book title ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const comicbookIssues = await ComicBooks.findAll({
      where: { comicbooktitlerelId: coboTitleId },
      order: [['comicIssue', 'ASC']]
    });
    
    const data = comicbookIssues.map(comic => comic.toJSON());
    
    console.log(`Found ${data.length} comic books`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getComicBooks');
  }
};

// Get all regular comic books
export const getComicBookRegular = async (
  _req: Request,
  res: Response<ApiResponse<ComicBookAttributes[]>>
): Promise<Response> => {
  console.log('GET /comicbook/regular');
  
  try {
    const regularComicBooks = await ComicBooks.findAll({ 
      where: { type: 'regular' },
      order: [['title', 'ASC'], ['comicIssue', 'ASC']]
    });
    
    const data = regularComicBooks.map(comic => comic.toJSON());
    
    console.log(`Found ${data.length} regular comic books`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getComicBookRegular');
  }
};

// Get all variant comic books
export const getComicBookVariant = async (
  _req: Request,
  res: Response<ApiResponse<ComicBookAttributes[]>>
): Promise<Response> => {
  console.log('GET /comicbook/variant');
  
  try {
    const variantComicBooks = await ComicBooks.findAll({ 
      where: { type: 'variant' },
      order: [['title', 'ASC'], ['comicIssue', 'ASC']]
    });
    
    const data = variantComicBooks.map(comic => comic.toJSON());
    
    console.log(`Found ${data.length} variant comic books`);
    
    return res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getComicBookVariant');
  }
};

// Get one comic book by ID
export const getOneById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<ComicBookAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  console.log('GET /comicbook/:id');
  console.log('Comic book ID:', id);
  
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  const uuidValidation = validateUUID(id, 'Comic book ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const comicbook = await ComicBooks.findByPk(id);
    
    if (!comicbook) {
      console.log('Comic book not found');
      return res.status(404).json({ 
        success: false,
        error: 'Comic book not found' 
      });
    }
    
    console.log('Comic book found');
    
    return res.status(200).json({
      success: true,
      data: comicbook.toJSON()
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getOneById');
  }
};

// Create a new comic book
export const createComicBook = async (
  req: Request<Record<string, never>, Record<string, never>, ComicBookCreateRequest>,
  res: Response<ApiResponse<ComicBookAttributes>>
): Promise<Response> => {
  console.log('POST /comicbook');
  console.log('Body:', req.body);
  
  const {
    title,
    comicIssue,
    author,
    penciler,
    coverartist,
    inker,
    volume,
    year,
    comicBookCover,
    type,
    titleID,
  } = req.body;
  
  // Map titleID to comicbooktitlerelId
  const comicbooktitlerelId = titleID;
  
  // Validate required fields
  const validation = validateParams(
    { title, comicIssue, type, titleID } as Record<string, string>, 
    ['title', 'comicIssue', 'type', 'titleID']
  );
  if (!validation.isValid) {
    console.log('Validation failed:', validation.message);
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  // Validate title
  if (!title) {
    return res.status(400).json({ 
      success: false,
      error: 'Title is required' 
    });
  }
  
  const titleValidation = validateString(title, 'Title');
  if (!titleValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: titleValidation.message 
    });
  }
  
  // Validate comicIssue
  if (!comicIssue) {
    return res.status(400).json({ 
      success: false,
      error: 'Comic issue is required' 
    });
  }
  
  const issueValidation = validateString(comicIssue, 'Comic issue');
  if (!issueValidation.isValid) {
    return res.status(400).json({ 
      success: false,
      error: issueValidation.message 
    });
  }
  
  // Validate type
  if (!type || !isValidComicBookType(type)) {
    return res.status(400).json({ 
      success: false,
      error: 'Type must be either "regular" or "variant"'
    });
  }
  
  // Validate titleID
  if (!titleID) {
    return res.status(400).json({ 
      success: false,
      error: 'Title ID is required' 
    });
  }
  
  const titleIdValidation = validateUUID(titleID, 'Title ID');
  if (!titleIdValidation.isValid) {
    console.log('Invalid UUID:', titleID);
    return res.status(400).json({ 
      success: false,
      error: titleIdValidation.message 
    });
  }
  
  // Validate year if provided
  if (year !== undefined && year !== '' && (typeof year !== 'number' || !isValidYear(Number(year)))) {
    return res.status(400).json({ 
      success: false,
      error: 'Year must be a valid number between 1900 and current year + 1'
    });
  }
  
  // Validate optional string fields
  const optionalFields: Array<{ value: string | undefined; name: string }> = [
    { value: author, name: 'Author' },
    { value: penciler, name: 'Penciler' },
    { value: coverartist, name: 'Cover artist' },
    { value: inker, name: 'Inker' },
    { value: volume, name: 'Volume' },
    { value: comicBookCover, name: 'Comic book cover' }
  ];
  
  for (const { value, name } of optionalFields) {
    if (value !== undefined && value !== '') {
      const fieldValidation = validateString(value, name);
      if (!fieldValidation.isValid) {
        return res.status(400).json({ 
          success: false,
          error: fieldValidation.message 
        });
      }
    }
  }
  
  console.log('All validations passed, attempting to create...');
  
  try {
    const newComicBook = await ComicBooks.create({
      title: title.trim(),
      comicIssue: comicIssue.trim(),
      author: author?.trim() || null,
      penciler: penciler?.trim() || null,
      coverartist: coverartist?.trim() || null,
      inker: inker?.trim() || null,
      volume: volume?.trim() || null,
      year: year ? (typeof year === 'string' ? Number(year) : year) : null,
      comicBookCover: comicBookCover?.trim() || null,
      type,
      comicbooktitlerelId,
    });
    
    const createdData = newComicBook.toJSON();
    
    console.log('Comic book created successfully');
    console.log('Created data:', createdData);
    
    return res.status(201).json({ 
      success: true,
      data: createdData,
      message: 'Comic book created successfully'
    });
  } catch (error) {
    console.log('ERROR IN CREATE:', error);
    return handleError(res, error as Error, 400, 'createComicBook');
  }
};

// Update an existing comic book
export const updateComicBook = async (
  req: Request<{ id: string }, Record<string, never>, ComicBookUpdateRequest>,
  res: Response<ApiResponse<ComicBookAttributes>>
): Promise<Response> => {
  const { id } = req.params;
  
  console.log('PUT /comicbook/:id');
  console.log('Comic book ID:', id);
  console.log('Body:', req.body);
  
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  const uuidValidation = validateUUID(id, 'Comic book ID');
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
  
  if (req.body.type && !isValidComicBookType(req.body.type)) {
    return res.status(400).json({ 
      success: false,
      error: 'Type must be either "regular" or "variant"'
    });
  }
  
  // Validate year if provided
  if (req.body.year !== undefined && req.body.year !== null && req.body.year !== '') {
    const yearValue = typeof req.body.year === 'string' ? Number(req.body.year) : req.body.year;
    if (isNaN(yearValue) || !isValidYear(yearValue)) {
      return res.status(400).json({ 
        success: false,
        error: 'Year must be a valid number between 1900 and current year + 1'
      });
    }
  }
  
  if (req.body.comicbooktitlerelId) {
    const titleIdValidation = validateUUID(req.body.comicbooktitlerelId, 'Comic book title relation ID');
    if (!titleIdValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        error: titleIdValidation.message 
      });
    }
  }
  
  // Build properly typed update data
  const updateData: Partial<ComicBookAttributes> = {};
  
  // Handle string fields
  const stringFields: Array<keyof ComicBookUpdateRequest> = [
    'title', 'comicIssue', 'author', 'penciler', 'coverartist', 'inker', 'volume', 'comicBookCover'
  ];
  
  stringFields.forEach(field => {
    const value = req.body[field];
    if (value !== undefined && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        (updateData as Record<string, string>)[field] = trimmed;
      } else {
        (updateData as Record<string, null>)[field] = null;
      }
    }
  });
  
  // Handle year field
  if (req.body.year !== undefined) {
    if (req.body.year === '') {
      updateData.year = null;
    } else if (typeof req.body.year === 'string') {
      updateData.year = Number(req.body.year);
    } else {
      updateData.year = req.body.year;
    }
  }
  
  // Handle type field
  if (req.body.type) {
    updateData.type = req.body.type;
  }
  
  // Handle foreign key
  if (req.body.comicbooktitlerelId) {
    updateData.comicbooktitlerelId = req.body.comicbooktitlerelId;
  }
  
  console.log('Sanitized update data:', updateData);
  
  try {
    const [rowsUpdated, updatedRecords] = await ComicBooks.update(
      updateData,
      {
        where: { id },
        returning: true,
      }
    );
    
    if (rowsUpdated === 0) {
      console.log('No rows updated');
      return res.status(404).json({ 
        success: false,
        error: 'Comic book not found or no changes made' 
      });
    }
    
    let updatedComicBook: ComicBookAttributes;
    
    if (updatedRecords && updatedRecords.length > 0) {
      updatedComicBook = updatedRecords[0].toJSON();
    } else {
      const record = await ComicBooks.findByPk(id);
      if (!record) {
        return res.status(404).json({ 
          success: false,
          error: 'Comic book not found after update' 
        });
      }
      updatedComicBook = record.toJSON();
    }
    
    console.log('Comic book updated successfully');
    
    return res.status(200).json({
      success: true,
      data: updatedComicBook,
      message: 'Comic book updated successfully'
    });
  } catch (error) {
    console.log('ERROR IN UPDATE:', error);
    return handleError(res, error as Error, 400, 'updateComicBook');
  }
};

// Delete a comic book
export const removeComicBook = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<never>>
): Promise<Response> => {
  const { id } = req.params;
  
  console.log('DELETE /comicbook/:id');
  console.log('Comic book ID:', id);
  
  const validation = validateParams(req.params, ['id']);
  if (!validation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.message 
    });
  }
  
  const uuidValidation = validateUUID(id, 'Comic book ID');
  if (!uuidValidation.isValid) {
    return res.status(400).json({ 
      success: false, 
      error: uuidValidation.message 
    });
  }
  
  try {
    const existingRecord = await ComicBooks.findByPk(id);
    
    if (!existingRecord) {
      console.log('Comic book not found');
      return res.status(404).json({ 
        success: false,
        error: 'Comic book not found' 
      });
    }
    
    const rowsDeleted = await ComicBooks.destroy({ 
      where: { id }
    });
    
    if (rowsDeleted === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete comic book' 
      });
    }
    
    console.log('Comic book deleted successfully');
    
    return res.status(200).json({ 
      success: true,
      message: 'Comic book deleted successfully' 
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'removeComicBook');
  }
};