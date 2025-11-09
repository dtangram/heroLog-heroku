import { v4 as uuidv4 } from 'uuid';
import API from '../../API';
import {
  REQ_WISHLIST_COMICS_PENDING,
  REQ_WISHLIST_COMICS_SUCCESS,
  REQ_WISHLIST_COMICS_ERROR,
  REQ_WISHLIST_COMIC_PENDING,
  REQ_WISHLIST_COMIC_SUCCESS,
  REQ_WISHLIST_COMIC_ERROR,
  ADD_WISHLIST_COMIC_PENDING,
  ADD_WISHLIST_COMIC_SUCCESS,
  ADD_WISHLIST_COMIC_ERROR,
  UPDATE_WISHLIST_COMIC_PENDING,
  UPDATE_WISHLIST_COMIC_SUCCESS,
  UPDATE_WISHLIST_COMIC_ERROR,
  DELETE_WISHLIST_COMIC_PENDING,
  DELETE_WISHLIST_COMIC_SUCCESS,
  DELETE_WISHLIST_COMIC_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

export interface WishlistComic {
  id: string;
  comicBookTitle: string;
  comicIssue: string;
  comicBookVolume: string;
  comicBookYear: string;
  comicBookPublisher: string;
  comicBookCover: string;
  type: string;
  userId: string;
}

interface WishlistComicState {
  data: WishlistComic;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface WishlistsState {
  byId: Record<string, WishlistComicState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  wishlists: Record<string, WishlistsState>;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: WishlistComic | WishlistComic[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | WishlistComic | Partial<WishlistComic>>;
}

const getUserId = (): string => {
  const userId = localStorage.getItem('id');
  return userId || '';
};

const isCached = (loadedAt: number): boolean => 
  loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;

const getUserWishlists = (state: RootState, userId: string): WishlistsState | null =>
  state?.wishlists?.[userId] || null;

const findWishlistState = (state: RootState, id: string): WishlistComicState | null => {
  if (!state?.wishlists) return null;
  
  const users = Object.values(state.wishlists);
  
  for (const user of users) {
    const wishlistState = user?.byId?.[id];
    if (wishlistState) return wishlistState;
  }
  
  return null;
};

const shouldFetchUserWishlists = (state: RootState, userId: string): boolean => {
  const userWishlists = getUserWishlists(state, userId);
  
  if (!userWishlists) return true;
  if (userWishlists.isLoading) return false;
  
  return !isCached(userWishlists.loadedAt);
};

const shouldFetchWishlist = (state: RootState, id: string): boolean => {
  const wishlistState = findWishlistState(state, id);
  
  if (!wishlistState) return true;
  if (wishlistState.isLoading) return false;
  
  return !isCached(wishlistState.loadedAt);
};

const validateWishlistComic = (wishlist: Partial<WishlistComic>): void => {
  if (!wishlist.comicBookTitle?.trim()) {
    throw new Error('Comic book title is required');
  }
  
  if (!wishlist.comicIssue?.trim()) {
    throw new Error('Comic issue is required');
  }
};

export const fetchWishlists = (): APIAction => {
  const userId = getUserId();
  
  return {
    types: [
      REQ_WISHLIST_COMICS_PENDING,
      REQ_WISHLIST_COMICS_SUCCESS,
      REQ_WISHLIST_COMICS_ERROR,
    ],
    callAPI: () => API.get(`/wishlist/signups/${userId}`),  // ✅ Added /signups
    shouldCallAPI: (state) => shouldFetchUserWishlists(state, userId),
    payload: { userId },
  };
};

export const fetchWishlist = (id: string): APIAction => {
  if (!id?.trim()) {
    throw new Error('Wishlist ID is required');
  }

  return {
    types: [
      REQ_WISHLIST_COMIC_PENDING,
      REQ_WISHLIST_COMIC_SUCCESS,
      REQ_WISHLIST_COMIC_ERROR,
    ],
    callAPI: () => API.get(`/wishlist/${id}`),
    shouldCallAPI: (state) => shouldFetchWishlist(state, id),
    payload: { id },
  };
};

export const createWishlist = (wishlist: Omit<WishlistComic, 'id' | 'userId'>): APIAction => {
  validateWishlistComic(wishlist);
  
  const id = uuidv4();
  const userId = getUserId();
  
  // ✅ Map userId to wishUsersId for the API
  const apiData = {
    id,
    comicBookTitle: wishlist.comicBookTitle,
    comicIssue: wishlist.comicIssue,
    comicBookVolume: wishlist.comicBookVolume,
    comicBookYear: wishlist.comicBookYear,
    comicBookPublisher: wishlist.comicBookPublisher,
    comicBookCover: wishlist.comicBookCover,
    type: wishlist.type,
    wishUsersId: userId,  // ✅ Map userId → wishUsersId
  };
  
  console.log('📤 Creating wishlist with data:', apiData);
  
  return {
    types: [
      ADD_WISHLIST_COMIC_PENDING,
      ADD_WISHLIST_COMIC_SUCCESS,
      ADD_WISHLIST_COMIC_ERROR,
    ],
    callAPI: () => API.post('/wishlist/', apiData),  // ✅ Send mapped data
    payload: { 
      id,
      wishlist: { id, userId, ...wishlist } as WishlistComic,
    },
  };
};

export const updateWishlist = (wishlist: Partial<WishlistComic> & { id: string }): APIAction => {
  validateWishlistComic(wishlist);
  
  const {
    id,
    comicBookTitle,
    comicIssue,
    comicBookVolume,
    comicBookYear,
    comicBookPublisher,
    comicBookCover,
    type,
    userId,  // ✅ Get userId
  } = wishlist;

  // ✅ Map userId to wishUsersId for the API
  const apiData = {
    comicBookTitle: comicBookTitle?.trim(),
    comicIssue: comicIssue?.trim(),
    comicBookVolume: comicBookVolume?.trim(),
    comicBookYear: comicBookYear?.trim(),
    comicBookPublisher: comicBookPublisher?.trim(),
    comicBookCover: comicBookCover?.trim(),
    type: type?.trim(),
    wishUsersId: userId,  // ✅ Map userId → wishUsersId
  };

  return {
    types: [
      UPDATE_WISHLIST_COMIC_PENDING,
      UPDATE_WISHLIST_COMIC_SUCCESS,
      UPDATE_WISHLIST_COMIC_ERROR,
    ],
    callAPI: () => API.put(`/wishlist/${id}`, apiData),  // ✅ Send mapped data
    payload: { id },
  };
};

export const deleteWishlist = (id: string): APIAction => {
  if (!id?.trim()) {
    throw new Error('Wishlist ID is required');
  }

  return {
    types: [
      DELETE_WISHLIST_COMIC_PENDING,
      DELETE_WISHLIST_COMIC_SUCCESS,
      DELETE_WISHLIST_COMIC_ERROR,
    ],
    callAPI: () => API.delete(`/wishlist/${id}`, { params: { id } }),
    payload: { id },
  };
};

export default fetchWishlists;