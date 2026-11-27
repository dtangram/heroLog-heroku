import type { DuplicateMatch } from '../services/duplicates';
import type { CollectionPublisherJson } from '../models/collectionpublishers';
import type { ComicBookTitleJson } from '../models/comicbooktitles';
import type { ComicBookJson } from '../models/comicbooks';
import type { MessagingJson } from '../models/messagings';
import type { SaleListJson } from '../models/salelists';
import type { WishListJson } from '../models/wishlists';
import type { UserJson } from '../models/users';

/**
 * What every JSON reply has. Each endpoint's reply extends this with the
 * exact `data` it sends, so a reply can't carry the wrong kind of record.
 */
export interface ApiResult {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
  errors?: string[];
  /** Sent with a 409 when the record already exists */
  duplicate?: DuplicateMatch;
}

/** Replies that only say the record that changed */
export interface IdResult extends ApiResult {
  data?: { id: string };
}

export interface PublisherResult extends ApiResult {
  data?: CollectionPublisherJson;
}
/** Creating a publisher replies with just its id, name and owner */
export interface PublisherCreatedResult extends ApiResult {
  data?: Pick<CollectionPublisherJson, 'id' | 'publisherName' | 'collectpubUsersId'>;
}
export interface PublishersResult extends ApiResult {
  data?: CollectionPublisherJson[];
}

export interface TitleResult extends ApiResult {
  data?: ComicBookTitleJson;
}
export interface TitlesResult extends ApiResult {
  data?: ComicBookTitleJson[];
}

export interface ComicBookResult extends ApiResult {
  data?: ComicBookJson;
}
export interface ComicBooksResult extends ApiResult {
  data?: ComicBookJson[];
}

export interface MessageResult extends ApiResult {
  data?: MessagingJson;
}
export interface MessagesResult extends ApiResult {
  data?: MessagingJson[];
}

export interface SaleListResult extends ApiResult {
  data?: SaleListJson;
}
export interface SaleListsResult extends ApiResult {
  data?: SaleListJson[];
}

/** A listing on Home, with the seller's public username */
export interface PublicSaleListing extends SaleListJson {
  sellerUsername: string | null;
}
export interface PublicSaleListingsResult extends ApiResult {
  data?: PublicSaleListing[];
}
/** The Landing page preview: only the fields a signed-out visitor may see */
export interface SalePreviewResult extends ApiResult {
  data?: Partial<SaleListJson>[];
}

export interface WishListResult extends ApiResult {
  data?: WishListJson;
}
export interface WishListsResult extends ApiResult {
  data?: WishListJson[];
}

/** A user without the password or access token */
export type SafeUser = Omit<UserJson, 'password' | 'accesstoken'>;

/** A form's problems, one per field, e.g. "Email already exists" */
export interface FieldError {
  field: string;
  message: string;
}
export interface FieldErrorsResult {
  success: false;
  errors: FieldError[];
}

export interface UserResult extends ApiResult {
  data?: SafeUser;
}
export interface UsersResult extends ApiResult {
  data?: SafeUser[];
}