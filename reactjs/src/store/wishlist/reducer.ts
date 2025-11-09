import createReducer from '../helpers/createReducer';
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

interface WishlistComic {
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

export interface State {
  [userId: string]: WishlistsState;
}

interface Action {
  type: string;
  payload?: {
    userId?: string;
    id?: string;
    wishlist?: WishlistComic;
  };
  data?: WishlistComic | WishlistComic[];
  err?: string;
}

const initialUserState: WishlistsState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const initialState: State = {};

const getUserState = (state: State, userId: string): WishlistsState =>
  state[userId] || initialUserState;

const findUserIdByWishlistId = (state: State, id: string): string | null => {
  const userIds = Object.keys(state);
  
  for (const userId of userIds) {
    const userState = state[userId];
    if (userState?.byId?.[id]) {
      return userId;
    }
  }
  
  return null;
};

const createWishlistComicState = (
  data: WishlistComic,
  isLoading = false
): WishlistComicState => ({
  data,
  isLoading,
  loadedAt: Date.now(),
  error: null,
});

const updateWishlistComicInState = (
  byId: Record<string, WishlistComicState>,
  id: string,
  updates: Partial<WishlistComicState>
): Record<string, WishlistComicState> => {
  const existingWishlist = byId[id];
  
  if (!existingWishlist) {
    return byId;
  }
  
  return {
    ...byId,
    [id]: {
      ...existingWishlist,
      ...updates,
    },
  };
};

// Fetch all wishlists for a user - PENDING
const wishlistsPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  
  if (!userId) return typedState;
  
  const userState = getUserState(typedState, userId);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      isLoading: true,
      error: null,
    },
  };
};

// Fetch all wishlists for a user - SUCCESS
const wishlistsSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  
  if (!userId) return typedState;
  
  const wishlists = Array.isArray(typedAction.data) ? typedAction.data : [];
  const userState = getUserState(typedState, userId);
  const now = Date.now();

  const newById = wishlists.reduce((acc, wishlist) => ({
    ...acc,
    [wishlist.id]: createWishlistComicState(wishlist),
  }), userState.byId);

  const newAllIds = Array.from(new Set([
    ...userState.allIds,
    ...wishlists.map(wishlist => wishlist.id),
  ]));

  return {
    ...typedState,
    [userId]: {
      byId: newById,
      allIds: newAllIds,
      loadedAt: now,
      isLoading: false,
      error: null,
    },
  };
};

// Fetch all wishlists for a user - ERROR
const wishlistsError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  
  if (!userId) return typedState;
  
  const userState = getUserState(typedState, userId);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      isLoading: false,
      error: typedAction.err || 'Unknown error',
    },
  };
};

// Fetch/Create/Update single wishlist - PENDING
const wishlistPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', wishlist } = typedAction.payload || {};
  
  const userId = wishlist?.userId || findUserIdByWishlistId(typedState, id);

  if (!userId) return typedState;

  const userState = getUserState(typedState, userId);
  const existingWishlist = userState.byId[id];
  const wishlistData = existingWishlist?.data || wishlist || {
    id,
    comicBookTitle: '',
    comicIssue: '',
    comicBookVolume: '',
    comicBookYear: '',
    comicBookPublisher: '',
    comicBookCover: '',
    type: '',
    userId,
  } as WishlistComic;

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: {
        ...userState.byId,
        [id]: {
          data: wishlistData,
          isLoading: true,
          loadedAt: existingWishlist?.loadedAt || 0,
          error: null,
        },
      },
    },
  };
};

// Fetch/Create single wishlist - SUCCESS
const wishlistSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  const wishlist = typedAction.data as WishlistComic;
  
  if (!wishlist?.userId) return typedState;
  
  const { userId } = wishlist;
  const userState = getUserState(typedState, userId);
  const existingData = userState.byId[id]?.data || {};

  const newAllIds = userState.allIds.includes(id)
    ? userState.allIds
    : [...userState.allIds, id];

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: {
        ...userState.byId,
        [id]: createWishlistComicState({ ...existingData, ...wishlist }),
      },
      allIds: newAllIds,
    },
  };
};

// Update single wishlist - SUCCESS
const wishlistSuccessUpdate = (state: object, action: object): object =>
  wishlistSuccess(state, action);

// Delete single wishlist - SUCCESS
const wishlistSuccessDelete = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  const userId = findUserIdByWishlistId(typedState, id);
  
  if (!userId) return typedState;

  const userState = typedState[userId];
  const { [id]: _deleted, ...remainingById } = userState.byId;
  const newAllIds = userState.allIds.filter(wishlistId => wishlistId !== id);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: remainingById,
      allIds: newAllIds,
    },
  };
};

// Fetch/Create/Update/Delete single wishlist - ERROR
const wishlistError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', wishlist } = typedAction.payload || {};
  
  const userId = wishlist?.userId || findUserIdByWishlistId(typedState, id);
  
  if (!userId) return typedState;

  const userState = typedState[userId];
  
  if (!userState?.byId?.[id]) return typedState;

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: updateWishlistComicInState(userState.byId, id, {
        isLoading: false,
        error: typedAction.err || 'Unknown error',
      }),
    },
  };
};

const reducer = createReducer(initialState, {
  [REQ_WISHLIST_COMICS_PENDING]: wishlistsPending,
  [REQ_WISHLIST_COMICS_SUCCESS]: wishlistsSuccess,
  [REQ_WISHLIST_COMICS_ERROR]: wishlistsError,
  [REQ_WISHLIST_COMIC_PENDING]: wishlistPending,
  [REQ_WISHLIST_COMIC_SUCCESS]: wishlistSuccess,
  [REQ_WISHLIST_COMIC_ERROR]: wishlistError,
  [ADD_WISHLIST_COMIC_PENDING]: wishlistPending,
  [ADD_WISHLIST_COMIC_SUCCESS]: wishlistSuccess,
  [ADD_WISHLIST_COMIC_ERROR]: wishlistError,
  [UPDATE_WISHLIST_COMIC_PENDING]: wishlistPending,
  [UPDATE_WISHLIST_COMIC_SUCCESS]: wishlistSuccessUpdate,
  [UPDATE_WISHLIST_COMIC_ERROR]: wishlistError,
  [DELETE_WISHLIST_COMIC_PENDING]: wishlistPending,
  [DELETE_WISHLIST_COMIC_SUCCESS]: wishlistSuccessDelete,
  [DELETE_WISHLIST_COMIC_ERROR]: wishlistError,
});

export default reducer as (state: State | undefined, action: Action) => State;