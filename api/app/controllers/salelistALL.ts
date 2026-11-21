import { Request, Response } from 'express';
import db from '../models';  // ✅ Import db

// Sale list type literal
type SaleListType = 'regular' | 'variant';

// Properly typed model interface
interface SaleListModel {
  findAll: (options?: {
    attributes?: string[];
    order?: Array<[string, string]>;
    limit?: number;
  }) => Promise<SaleListInstance[]>;
}

interface UserModel {
  findAll: (options: {
    where: { id: string[] };
    attributes: string[];
  }) => Promise<Array<{ id: string; username: string }>>;
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
  /** Dollars; Postgres DECIMAL comes back as a string, e.g. "12.50" (null on older listings) */
  price: string | number | null;
  /** Standard comic grade, e.g. "Near Mint" (null on older listings) */
  comicCondition: string | null;
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
  /** Dollars; Postgres DECIMAL comes back as a string, e.g. "12.50" (null on older listings) */
  price: string | number | null;
  /** Standard comic grade, e.g. "Near Mint" (null on older listings) */
  comicCondition: string | null;
  saleUsersId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// What the Home page receives: the listing plus the seller's public username
interface PublicSaleListing extends SaleListAttributes {
  sellerUsername: string | null;
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
  res: Response<ApiResponse<PublicSaleListing[]>>
): Promise<Response> => {
  try {
    const SaleLists = getSaleListModel();  // ✅ Get model with error handling
    const saleListsInstances = await SaleLists.findAll();
    
    // Convert instances to plain objects
    const listings = saleListsInstances.map(instance => instance.toJSON());

    // Look up sellers' usernames in one query. Only the username is read,
    // never emails, passwords or other private fields.
    const sellerIds = Array.from(
      new Set(listings.map(listing => listing.saleUsersId).filter((id): id is string => Boolean(id)))
    );
    const Users = (db as any).Users as UserModel | undefined;
    const sellers = Users && sellerIds.length
      ? await Users.findAll({ where: { id: sellerIds }, attributes: ['id', 'username'] })
      : [];
    const usernameById = new Map(sellers.map(seller => [seller.id, seller.username]));

    const saleLists: PublicSaleListing[] = listings.map(listing => ({
      ...listing,
      sellerUsername: (listing.saleUsersId && usernameById.get(listing.saleUsersId)) || null,
    }));
    
    return res.status(200).json({
      success: true,
      data: saleLists,
      count: saleLists.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getAllSaleLists');
  }
};

// ============================================================================
// LANDING PAGE PREVIEW (no sign-in)
// ============================================================================

/** What a signed-out visitor sees: the comic and its price, nothing about the seller */
export const PREVIEW_FIELDS = [
  'id',
  'comicBookTitle',
  'comicIssue',
  'comicBookVolume',
  'comicBookYear',
  'comicBookPublisher',
  'comicBookCover',
  'type',
  'price',
  'comicCondition',
];

export const PREVIEW_DEFAULT = 8;
export const PREVIEW_MAX = 12;

/** ?limit= as a whole number from 1 to PREVIEW_MAX (default PREVIEW_DEFAULT) */
export const previewLimit = (value: unknown): number => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, PREVIEW_MAX) : PREVIEW_DEFAULT;
};

// GET /salelistALL/preview — the newest listings for the Landing page.
// Public, so it leaves out seller usernames and account IDs.
export const getSalePreview = async (
  req: Request,
  res: Response<ApiResponse<Partial<SaleListAttributes>[]>>
): Promise<Response> => {
  try {
    const SaleLists = getSaleListModel();
    const instances = await SaleLists.findAll({
      attributes: PREVIEW_FIELDS,
      order: [['createdAt', 'DESC']],
      limit: previewLimit(req.query.limit),
    });
    const listings = instances.map(instance => instance.toJSON());

    return res.status(200).json({
      success: true,
      data: listings,
      count: listings.length
    });
  } catch (error) {
    return handleError(res, error as Error, 500, 'getSalePreview');
  }
};