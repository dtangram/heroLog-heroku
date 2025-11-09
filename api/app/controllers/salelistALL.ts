import { Request, Response } from 'express';
import db from '../models';  // ✅ Import db

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

// Fixed interface to match actual model structure
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

// ✅ Model getter with error handling
const getSaleListModel = (): SaleListModel => {
  const SaleList = (db as any).SaleLists || (db as any).SaleList || (db as any).Salelist;
  
  if (!SaleList) {
    console.error('❌ SaleList model not found. Available models:', Object.keys(db));
    throw new Error('SaleList model not loaded');
  }
  
  return SaleList as SaleListModel;
};

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
    const SaleLists = getSaleListModel();  // ✅ Get model with error handling
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