import { Request, Response } from 'express';
import db from '../models';
import type { SaleListsModel } from '../models/salelists';
import type { ApiResult, PublicSaleListing, PublicSaleListingsResult, SalePreviewResult } from '../types/api';
import { errorMessages } from '../utils/errors';

const getSaleListModel = (): SaleListsModel => db.SaleLists;

// Centralized error reply. A catch can receive anything, so it's turned into an Error first.
const errorResult = (thrown: Error, context: string): ApiResult => {
  console.error(`Error in ${context}:`, thrown);
  return { success: false, errors: errorMessages(thrown) };
};

// Get all sale lists for public display
export const getAllSaleLists = async (
  _req: Request,
  res: Response<PublicSaleListingsResult>
): Promise<Response<PublicSaleListingsResult>> => {
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
    const sellers = sellerIds.length
      ? await db.Users.findAll({ where: { id: sellerIds }, attributes: ['id', 'username'] })
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getAllSaleLists'));
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
export const previewLimit = (value: Request['query'][string]): number => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, PREVIEW_MAX) : PREVIEW_DEFAULT;
};

// GET /salelistALL/preview — the newest listings for the Landing page.
// Public, so it leaves out seller usernames and account IDs.
export const getSalePreview = async (
  req: Request,
  res: Response<SalePreviewResult>
): Promise<Response<SalePreviewResult>> => {
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
    return res.status(500).json(errorResult(error instanceof Error ? error : new Error(String(error)), 'getSalePreview'));
  }
};