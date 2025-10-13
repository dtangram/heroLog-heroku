import { Request, Response } from 'express';

// Sale list type literal
type SaleListType = 'regular' | 'variant';

// Properly typed model interface
interface SaleListModel {
  findAll: () => Promise<SaleListInstance[]>;
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

// API response interface
interface ApiResponse<T = SaleListAttributes[]> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: string[];
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

// Get all sale lists for public display
export const getAllSaleLists = async (
  _req: Request,
  res: Response<ApiResponse<SaleListAttributes[]>>
): Promise<Response> => {
  try {
    const saleListsInstances = await SaleLists.findAll();
    
    // Convert instances to plain objects
    const saleLists = saleListsInstances.map(instance => instance.toJSON());
   
    return res.status(200).json({
      success: true,
      data: saleLists,
      count: saleLists.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getAllSaleLists');
  }
};