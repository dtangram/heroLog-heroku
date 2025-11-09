import createReducer from '../helpers/createReducer';
import {
  REQ_SALE_COMICS_PENDING,
  REQ_SALE_COMICS_SUCCESS,
  REQ_SALE_COMICS_ERROR,
  REQ_SALE_COMIC_PENDING,
  REQ_SALE_COMIC_SUCCESS,
  REQ_SALE_COMIC_ERROR,
  ADD_SALE_COMIC_PENDING,
  ADD_SALE_COMIC_SUCCESS,
  ADD_SALE_COMIC_ERROR,
  UPDATE_SALE_COMIC_PENDING,
  UPDATE_SALE_COMIC_SUCCESS,
  UPDATE_SALE_COMIC_ERROR,
  DELETE_SALE_COMIC_PENDING,
  DELETE_SALE_COMIC_SUCCESS,
  DELETE_SALE_COMIC_ERROR,
} from '../actionTypes';

interface SaleComic {
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

interface SaleComicState {
  data: SaleComic;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface SalesStateByUser {
  byId: Record<string, SaleComicState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

export interface SalesState {
  [userId: string]: SalesStateByUser;
}

interface Action {
  type: string;
  payload?: {
    userId?: string;
    id?: string;
    sale?: SaleComic;
  };
  data?: SaleComic | SaleComic[];
  err?: string;
}

const initialUserState: SalesStateByUser = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const initialState: SalesState = {};

const getUserState = (state: SalesState, userId: string): SalesStateByUser => {
  return state[userId] || initialUserState;
};

const createSaleComicState = (data: SaleComic, isLoading = false): SaleComicState => ({
  data,
  isLoading,
  loadedAt: Date.now(),
  error: null,
});

const updateSaleComicInState = (
  byId: Record<string, SaleComicState>,
  id: string,
  updates: Partial<SaleComicState>
): Record<string, SaleComicState> => ({
  ...byId,
  [id]: {
    ...byId[id],
    ...updates,
  },
});

// Fetch all sales for a user - PENDING
const salesPending = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
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

// Fetch all sales for a user - SUCCESS
const salesSuccess = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
  const sales = Array.isArray(typedAction.data) ? typedAction.data : [];
  const userState = getUserState(typedState, userId);
  const now = Date.now();

  const newById = sales.reduce((acc, sale) => ({
    ...acc,
    [sale.id]: createSaleComicState(sale),
  }), userState.byId);

  const newAllIds = Array.from(new Set([
    ...userState.allIds,
    ...sales.map(sale => sale.id),
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

// Fetch all sales for a user - ERROR
const salesError = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { userId = '' } = typedAction.payload || {};
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

// Fetch/Create/Update single sale - PENDING
const salePending = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { id = '', sale } = typedAction.payload || {};
  
  // Find the user that contains this sale
  const userId = sale?.userId || 
    Object.keys(typedState).find(key => typedState[key].byId[id]) || '';

  if (!userId) return typedState;

  const userState = getUserState(typedState, userId);
  const existingSale = userState.byId[id]?.data || sale || {} as SaleComic;

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: updateSaleComicInState(userState.byId, id, {
        data: existingSale,
        isLoading: true,
        error: null,
      }),
    },
  };
};

// Fetch/Create single sale - SUCCESS
const saleSuccess = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  const sale = typedAction.data as SaleComic;
  const { userId } = sale;

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
        [id]: createSaleComicState({ ...existingData, ...sale }),
      },
      allIds: newAllIds,
    },
  };
};

// Update single sale - SUCCESS
const saleSuccessUpdate = (state: object, action: object): object => {
  return saleSuccess(state, action);
};

// Delete single sale - SUCCESS
const saleSuccessDelete = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  // Find the user that contains this sale
  const userId = Object.keys(typedState).find(key => typedState[key].byId[id]);
  
  if (!userId) return typedState;

  const userState = typedState[userId];
  const { [id]: deletedSale, ...remainingById } = userState.byId;
  const newAllIds = userState.allIds.filter(saleId => saleId !== id);

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: remainingById,
      allIds: newAllIds,
    },
  };
};

// Fetch/Create/Update/Delete single sale - ERROR
const saleError = (state: object, action: object): object => {
  const typedState = state as SalesState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  // Find the user that contains this sale
  const userId = Object.keys(typedState).find(key => typedState[key].byId[id]);
  
  if (!userId) return typedState;

  const userState = typedState[userId];

  return {
    ...typedState,
    [userId]: {
      ...userState,
      byId: updateSaleComicInState(userState.byId, id, {
        isLoading: false,
        error: typedAction.err || 'Unknown error',
      }),
    },
  };
};

const reducer = createReducer(initialState, {
  [REQ_SALE_COMICS_PENDING]: salesPending,
  [REQ_SALE_COMICS_SUCCESS]: salesSuccess,
  [REQ_SALE_COMICS_ERROR]: salesError,
  [REQ_SALE_COMIC_PENDING]: salePending,
  [REQ_SALE_COMIC_SUCCESS]: saleSuccess,
  [REQ_SALE_COMIC_ERROR]: saleError,
  [ADD_SALE_COMIC_PENDING]: salePending,
  [ADD_SALE_COMIC_SUCCESS]: saleSuccess,
  [ADD_SALE_COMIC_ERROR]: saleError,
  [UPDATE_SALE_COMIC_PENDING]: salePending,
  [UPDATE_SALE_COMIC_SUCCESS]: saleSuccessUpdate,
  [UPDATE_SALE_COMIC_ERROR]: saleError,
  [DELETE_SALE_COMIC_PENDING]: salePending,
  [DELETE_SALE_COMIC_SUCCESS]: saleSuccessDelete,
  [DELETE_SALE_COMIC_ERROR]: saleError,
});

export default reducer as (state: SalesState | undefined, action: Action) => SalesState;