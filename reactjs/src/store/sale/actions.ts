import { v4 as uuidv4 } from 'uuid';
import API from '../../API';
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

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

export interface SaleComic {
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

interface SalesState {
  byId: Record<string, SaleComicState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  sales: Record<string, SalesState>;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: SaleComic | SaleComic[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | SaleComic | Partial<SaleComic>>;
}

const getUserId = (): string => {
  const userId = localStorage.getItem('id');
  return userId || '';
};

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const shouldFetchUserSales = (state: RootState, userId: string): boolean => {
  const userSales = state.sales[userId];
  
  if (!userSales) return true;
  if (userSales.isLoading) return false;
  if (!userSales.loadedAt) return true;
  
  return !isCached(userSales.loadedAt);
};

const shouldFetchSale = (state: RootState, id: string): boolean => {
  const allUsers = Object.values(state.sales);
  const saleState = allUsers.find(user => user.byId[id])?.byId[id];
  
  if (!saleState) return true;
  if (saleState.isLoading) return false;
  if (!saleState.loadedAt) return true;
  
  return !isCached(saleState.loadedAt);
};

const validateSaleComic = (sale: Partial<SaleComic>): void => {
  if (!sale.comicBookTitle?.trim()) {
    throw new Error('Comic book title is required');
  }
  
  if (!sale.comicIssue?.trim()) {
    throw new Error('Comic issue is required');
  }
};

export const fetchSales = (): APIAction => {
  const userId = getUserId();
  
  return {
    types: [
      REQ_SALE_COMICS_PENDING,
      REQ_SALE_COMICS_SUCCESS,
      REQ_SALE_COMICS_ERROR,
    ],
    callAPI: () => API.get(`/salelist/signups/${userId}`),
    shouldCallAPI: (state: RootState) => shouldFetchUserSales(state, userId),
    payload: { userId },
  };
};

export const fetchSale = (id: string): APIAction => ({
  types: [
    REQ_SALE_COMIC_PENDING,
    REQ_SALE_COMIC_SUCCESS,
    REQ_SALE_COMIC_ERROR,
  ],
  callAPI: () => API.get(`/salelist/${id}`),
  shouldCallAPI: (state: RootState) => shouldFetchSale(state, id),
  payload: { id },
});

export const createSale = (sale: Omit<SaleComic, 'id'>): APIAction => {
  validateSaleComic(sale);
  
  const id = uuidv4();
  
  // ✅ Map userId to saleUsersId for the API
  const apiData = {
    id,
    comicBookTitle: sale.comicBookTitle,
    comicIssue: sale.comicIssue,
    comicBookVolume: sale.comicBookVolume,
    comicBookYear: sale.comicBookYear,
    comicBookPublisher: sale.comicBookPublisher,
    comicBookCover: sale.comicBookCover,
    type: sale.type,
    saleUsersId: sale.userId,  // ✅ Map userId → saleUsersId
  };
  
  console.log('📤 Creating sale with data:', apiData);
  
  return {
    types: [
      ADD_SALE_COMIC_PENDING,
      ADD_SALE_COMIC_SUCCESS,
      ADD_SALE_COMIC_ERROR,
    ],
    callAPI: () => API.post('/salelist/', apiData),  // ✅ Send mapped data
    payload: { 
      id,
      sale: { id, ...sale } as SaleComic,
    },
  };
};

export const updateSale = (sale: SaleComic): APIAction => {
  validateSaleComic(sale);
  
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
  } = sale;

  // ✅ Map userId to saleUsersId for the API
  const apiData = {
    comicBookTitle: comicBookTitle?.trim(),
    comicIssue: comicIssue?.trim(),
    comicBookVolume: comicBookVolume?.trim(),
    comicBookYear: comicBookYear?.trim(),
    comicBookPublisher: comicBookPublisher?.trim(),
    comicBookCover: comicBookCover?.trim(),
    type: type?.trim(),
    saleUsersId: userId,  // ✅ Map userId → saleUsersId
  };

  return {
    types: [
      UPDATE_SALE_COMIC_PENDING,
      UPDATE_SALE_COMIC_SUCCESS,
      UPDATE_SALE_COMIC_ERROR,
    ],
    callAPI: () => API.put(`/salelist/${id}`, apiData),  // ✅ Send mapped data
    payload: { id },
  };
};

export const deleteSale = (id: string): APIAction => ({
  types: [
    DELETE_SALE_COMIC_PENDING,
    DELETE_SALE_COMIC_SUCCESS,
    DELETE_SALE_COMIC_ERROR,
  ],
  callAPI: () => API.delete(`/salelist/${id}`, { params: { id } }),
  payload: { id },
});

export default fetchSales;