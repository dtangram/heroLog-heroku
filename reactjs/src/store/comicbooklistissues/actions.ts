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
  coboTitleId?: string;  // ✅ Alternative field name from URL
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
  callAPI: () => Promise<{ data: ComicBook | ComicBook[] | { data: ComicBook | ComicBook[] } }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | ComicBook | Partial<ComicBook>>;
  transformResponse?: (response: any) => any;
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

const validateComicBook = (comicBook: Partial<ComicBook>): void => {
  console.log('🔍 Validating comic book:', comicBook);
  
  if (!comicBook.title?.trim()) {
    throw new Error('Comic book title is required');
  }
  if (!comicBook.type) {
    throw new Error('Comic book type is required');
  }
  
  // ✅ Check both titleID and coboTitleId
  const titleId = comicBook.titleID || comicBook.coboTitleId;
  if (!titleId?.trim()) {
    console.error('❌ Missing titleID. Received:', comicBook);
    throw new Error('Title ID is required. Make sure coboTitleId is passed from the form.');
  }
};

// Transform API response to match Redux store expectations
const transformComicBookResponse = (response: any): ComicBook => {
  const data = response.data?.data || response.data || response;
  
  return {
    ...data,
    titleID: data.titleID || data.comicbooktitlerelId,
  };
};

const transformComicBooksResponse = (response: any): ComicBook[] => {
  const data = response.data?.data || response.data || response;
  const books = Array.isArray(data) ? data : [data];
  
  return books.map(book => ({
    ...book,
    titleID: book.titleID || book.comicbooktitlerelId,
  }));
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
  transformResponse: transformComicBooksResponse,
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
  transformResponse: transformComicBookResponse,
});

export const createComicBook = (comicbooklistissue: Omit<ComicBook, 'id'>): APIAction => {
  validateComicBook(comicbooklistissue);
  
  // ✅ Use titleID or coboTitleId
  const titleID = comicbooklistissue.titleID || comicbooklistissue.coboTitleId;
  
  console.log('📝 Creating comic book with titleID:', titleID);
  
  return {
    types: [
      ADD_COMIC_BOOK_PENDING,
      ADD_COMIC_BOOK_SUCCESS,
      ADD_COMIC_BOOK_ERROR,
    ],
    callAPI: () => API.post('/comicbook/', {
      title: comicbooklistissue.title.trim(),
      comicIssue: comicbooklistissue.comicIssue,
      author: comicbooklistissue.author.trim(),
      penciler: comicbooklistissue.penciler.trim(),
      coverartist: comicbooklistissue.coverartist.trim(),
      inker: comicbooklistissue.inker.trim(),
      volume: comicbooklistissue.volume,
      year: comicbooklistissue.year,
      type: comicbooklistissue.type,
      comicBookCover: comicbooklistissue.comicBookCover,
      titleID: titleID,  // ✅ Use the resolved titleID
    }),
    payload: { 
      titleID: titleID!,
      comicbooklistissue: {
        title: comicbooklistissue.title,
        type: comicbooklistissue.type,
      } as Partial<ComicBook>,
    },
    transformResponse: transformComicBookResponse,
  };
};

export const updateComicBook = (comicbook: ComicBook): APIAction => {
  if (!comicbook.title?.trim()) {
    throw new Error('Comic book title is required');
  }
  if (!comicbook.type) {
    throw new Error('Comic book type is required');
  }

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
    titleID,
  } = comicbook;

  return {
    types: [
      UPDATE_COMIC_BOOK_PENDING,
      UPDATE_COMIC_BOOK_SUCCESS,
      UPDATE_COMIC_BOOK_ERROR,
    ],
    callAPI: () => API.put(`/comicbook/${id}`, {
      title: title.trim(),
      comicIssue,
      author: author.trim(),
      penciler: penciler.trim(),
      coverartist: coverartist.trim(),
      inker: inker.trim(),
      volume,
      year,
      type,
      comicBookCover,
    }),
    payload: { 
      id,
      comicbooklistissue: {
        id,
        titleID,
      } as Partial<ComicBook>,
    },
    transformResponse: transformComicBookResponse,
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