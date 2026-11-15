import API from '../../API';
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
  sellerUsername?: string | null;
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


/**
 * The Home page reloads the sale list every time it opens, so comics added,
 * edited or deleted on the Sales page (or by other sellers) show up straight
 * away. It only skips a request that's already in progress.
 */
const shouldFetchAllSales = (state: RootState): boolean => !state.salesALL.isLoading;

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