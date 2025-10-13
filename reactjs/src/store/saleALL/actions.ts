import API from '../../API';
import {
  REQ_SALE_ALL_COMICS_PENDING,
  REQ_SALE_ALL_COMICS_SUCCESS,
  REQ_SALE_ALL_COMICS_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

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

interface SalesAllState {
  byId: Record<string, SaleComicState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  salesALL: SalesAllState;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: SaleComic[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string>;
}

const getUserId = (): string => {
  const userId = localStorage.getItem('id');
  return userId || '';
};

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const shouldFetchAllSales = (state: RootState): boolean => {
  const { loadedAt, isLoading } = state.salesALL;
  
  if (isLoading) return false;
  if (!loadedAt) return true;
  
  return !isCached(loadedAt);
};

export const fetchAllSales = (): APIAction => {
  const userId = getUserId();
  
  return {
    types: [
      REQ_SALE_ALL_COMICS_PENDING,
      REQ_SALE_ALL_COMICS_SUCCESS,
      REQ_SALE_ALL_COMICS_ERROR,
    ],
    callAPI: () => API.get('/salelistALL/'),
    shouldCallAPI: (state: RootState) => shouldFetchAllSales(state),
    payload: { userId },
  };
};

export default fetchAllSales;