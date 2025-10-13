import createReducer from '../helpers/createReducer';
import {
  REQ_SALE_ALL_COMICS_PENDING,
  REQ_SALE_ALL_COMICS_SUCCESS,
  REQ_SALE_ALL_COMICS_ERROR,
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

export interface SalesAllState {
  byId: Record<string, SaleComicState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface Action {
  type: string;
  payload?: {
    userId?: string;
  };
  data?: SaleComic[];
  err?: string;
}

const initialState: SalesAllState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const createSaleComicState = (data: SaleComic): SaleComicState => ({
  data,
  isLoading: false,
  loadedAt: Date.now(),
  error: null,
});

// Fetch all sales - PENDING
const salesAllPending = (state: object, action: object): object => {
  const typedState = state as SalesAllState;
  
  return {
    ...typedState,
    isLoading: true,
    error: null,
  };
};

// Fetch all sales - SUCCESS
const salesAllSuccess = (state: object, action: object): object => {
  const typedState = state as SalesAllState;
  const typedAction = action as Action;
  const sales = Array.isArray(typedAction.data) ? typedAction.data : [];
  const now = Date.now();
  
  const newById = sales.reduce((acc, sale) => ({
    ...acc,
    [sale.id]: createSaleComicState(sale),
  }), typedState.byId);
  
  const newAllIds = Array.from(new Set([
    ...typedState.allIds,
    ...sales.map(sale => sale.id),
  ]));

  return {
    ...typedState,
    byId: newById,
    allIds: newAllIds,
    loadedAt: now,
    isLoading: false,
    error: null,
  };
};

// Fetch all sales - ERROR
const salesAllError = (state: object, action: object): object => {
  const typedState = state as SalesAllState;
  const typedAction = action as Action;
  
  return {
    ...typedState,
    isLoading: false,
    error: typedAction.err || 'Failed to fetch all sales',
  };
};

const reducer = createReducer(initialState, {
  [REQ_SALE_ALL_COMICS_PENDING]: salesAllPending,
  [REQ_SALE_ALL_COMICS_SUCCESS]: salesAllSuccess,
  [REQ_SALE_ALL_COMICS_ERROR]: salesAllError,
});

export default reducer as (state: SalesAllState | undefined, action: Action) => SalesAllState;