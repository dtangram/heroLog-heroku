import { v4 as uuidv4 } from 'uuid';
import API from '../../API';
import {
  REQ_COMIC_BOOKS_PENDING,
  REQ_COMIC_BOOKS_SUCCESS,
  REQ_COMIC_BOOKS_ERROR,
  REQ_COMIC_BOOK_PENDING,
  REQ_COMIC_BOOK_SUCCESS,
  REQ_COMIC_BOOK_ERROR,
  ADD_COMIC_BOOK_PENDING,
  ADD_COMIC_BOOK_SUCCESS,
  ADD_COMIC_BOOK_ERROR,
  UPDATE_COMIC_BOOK_PENDING,
  UPDATE_COMIC_BOOK_SUCCESS,
  UPDATE_COMIC_BOOK_ERROR,
  DELETE_COMIC_BOOK_PENDING,
  DELETE_COMIC_BOOK_SUCCESS,
  DELETE_COMIC_BOOK_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

interface ComicBook {
  id: string;
  title: string;
  comicIssue: string;
  author: string;
  penciler: string;
  coverartist: string;
  inker: string;
  volume: string;
  year: string;
  type: string;
  comicBookCover: string;
  titleID: string;
}

interface ComicBookState {
  byId: Record<string, {
    data: ComicBook;
    isLoading: boolean;
    loadedAt: number;
    error: string | null;
  }>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  comicbooklistissues: Record<string, ComicBookState>;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: ComicBook | ComicBook[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | ComicBook | Partial<ComicBook>>;
}

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const shouldFetchTitleComicBooks = (state: RootState, titleID: string): boolean => {
  const titleState = state.comicbooklistissues[titleID];
  
  if (!titleState) return true;
  if (titleState.isLoading) return false;
  if (!titleState.loadedAt) return true;
  
  return !isCached(titleState.loadedAt);
};

const shouldFetchComicBook = (state: RootState, id: string): boolean => {
  const allTitles = Object.values(state.comicbooklistissues);
  const comicBookState = allTitles.find(title => title.byId[id])?.byId[id];
  
  if (!comicBookState) return true;
  if (comicBookState.isLoading) return false;
  if (!comicBookState.loadedAt) return true;
  
  return !isCached(comicBookState.loadedAt);
};

export const fetchComicBooks = (titleID: string): APIAction => ({
  types: [
    REQ_COMIC_BOOKS_PENDING,
    REQ_COMIC_BOOKS_SUCCESS,
    REQ_COMIC_BOOKS_ERROR,
  ],
  callAPI: () => API.get(`/comicbook/titles/${titleID}`),
  shouldCallAPI: (state: RootState) => shouldFetchTitleComicBooks(state, titleID),
  payload: { titleID },
});

export const fetchComicBook = (id: string): APIAction => ({
  types: [
    REQ_COMIC_BOOK_PENDING,
    REQ_COMIC_BOOK_SUCCESS,
    REQ_COMIC_BOOK_ERROR,
  ],
  callAPI: () => API.get(`/comicbook/${id}`),
  shouldCallAPI: (state: RootState) => shouldFetchComicBook(state, id),
  payload: { id },
});

export const createComicBook = (comicbooklistissue: Omit<ComicBook, 'id'>): APIAction => {
  const id = uuidv4();
  
  return {
    types: [
      ADD_COMIC_BOOK_PENDING,
      ADD_COMIC_BOOK_SUCCESS,
      ADD_COMIC_BOOK_ERROR,
    ],
    callAPI: () => API.post('/comicbook/', { id, ...comicbooklistissue }),
    payload: { 
      id, 
      comicbooklistissue: { id, ...comicbooklistissue } as ComicBook,
    },
  };
};

export const updateComicBook = (comicbook: ComicBook): APIAction => {
  const {
    id,
    title,
    comicIssue,
    author,
    penciler,
    coverartist,
    inker,
    volume,
    year,
    type,
    comicBookCover,
  } = comicbook;

  return {
    types: [
      UPDATE_COMIC_BOOK_PENDING,
      UPDATE_COMIC_BOOK_SUCCESS,
      UPDATE_COMIC_BOOK_ERROR,
    ],
    callAPI: () => API.put(`/comicbook/${id}`, {
      title,
      comicIssue,
      author,
      penciler,
      coverartist,
      inker,
      volume,
      year,
      type,
      comicBookCover,
    }),
    payload: { id },
  };
};

export const deleteComicBook = (id: string): APIAction => ({
  types: [
    DELETE_COMIC_BOOK_PENDING,
    DELETE_COMIC_BOOK_SUCCESS,
    DELETE_COMIC_BOOK_ERROR,
  ],
  callAPI: () => API.delete(`/comicbook/${id}`, { params: { id } }),
  payload: { id },
});

export default fetchComicBooks;