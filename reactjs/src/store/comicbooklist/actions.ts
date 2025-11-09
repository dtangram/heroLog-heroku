import API from '../../API';
import {
  REQ_COMIC_BOOK_TITLES_PENDING,
  REQ_COMIC_BOOK_TITLES_SUCCESS,
  REQ_COMIC_BOOK_TITLES_ERROR,
  REQ_COMIC_BOOK_TITLE_PENDING,
  REQ_COMIC_BOOK_TITLE_SUCCESS,
  REQ_COMIC_BOOK_TITLE_ERROR,
  ADD_COMIC_BOOK_TITLE_PENDING,
  ADD_COMIC_BOOK_TITLE_SUCCESS,
  ADD_COMIC_BOOK_TITLE_ERROR,
  UPDATE_COMIC_BOOK_TITLE_PENDING,
  UPDATE_COMIC_BOOK_TITLE_SUCCESS,
  UPDATE_COMIC_BOOK_TITLE_ERROR,
  DELETE_COMIC_BOOK_TITLE_PENDING,
  DELETE_COMIC_BOOK_TITLE_SUCCESS,
  DELETE_COMIC_BOOK_TITLE_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

interface ComicBookTitle {
  id: string
  cbTitle: string
  collectpubId: string
  collectPubName: string
}

interface ComicBookTitleState {
  data: ComicBookTitle;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface ComicBookTitlesState {
  byId: Record<string, ComicBookTitleState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  comicbooklists: Record<string, ComicBookTitlesState>;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: ComicBookTitle | ComicBookTitle[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | ComicBookTitle | Partial<ComicBookTitle>>;
}

const isCached = (loadedAt: number): boolean => 
  loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;

const getPublisherState = (state: RootState, collectpubId: string): ComicBookTitlesState | null =>
  state?.comicbooklists?.[collectpubId] || null;

const findTitleState = (state: RootState, id: string): ComicBookTitleState | null => {
  if (!state?.comicbooklists) return null;
  
  const publishers = Object.values(state.comicbooklists);
  
  for (const publisher of publishers) {
    const titleState = publisher?.byId?.[id];
    if (titleState) return titleState;
  }
  
  return null;
};

const shouldFetchPublisherTitles = (state: RootState, collectpubId: string): boolean => {
  const publisherState = getPublisherState(state, collectpubId);
  
  if (!publisherState) return true;
  if (publisherState.isLoading) return false;
  
  return !isCached(publisherState.loadedAt);
};

const shouldFetchTitle = (state: RootState, id: string): boolean => {
  const titleState = findTitleState(state, id);
  
  if (!titleState) return true;
  if (titleState.isLoading) return false;
  
  return !isCached(titleState.loadedAt);
};

const validateComicBookTitle = (title: Partial<ComicBookTitle>): void => {
  if (!title.cbTitle?.trim()) {
    throw new Error('Comic book title is required');
  }
  if (!title.collectpubId?.trim()) {
    throw new Error('Publisher ID is required');
  }
};

export const fetchComicBookTitles = (collectpubId: string): APIAction => ({
  types: [
    REQ_COMIC_BOOK_TITLES_PENDING,
    REQ_COMIC_BOOK_TITLES_SUCCESS,
    REQ_COMIC_BOOK_TITLES_ERROR,
  ],
  callAPI: () => API.get(`comicbooktitles/publishers/${collectpubId}`),
  shouldCallAPI: (state) => shouldFetchPublisherTitles(state, collectpubId),
  payload: { collectpubId },
});

export const fetchComicBookTitle = (id: string): APIAction => ({
  types: [
    REQ_COMIC_BOOK_TITLE_PENDING,
    REQ_COMIC_BOOK_TITLE_SUCCESS,
    REQ_COMIC_BOOK_TITLE_ERROR,
  ],
  callAPI: () => API.get(`/comicbooktitles/${id}`),
  shouldCallAPI: (state) => shouldFetchTitle(state, id),
  payload: { id },
});

export const createComicBookTitle = (
  comicbooklist: Omit<ComicBookTitle, 'id'>
): APIAction => {
  validateComicBookTitle(comicbooklist);

  console.log('Creating comic book title:', comicbooklist);

  return {
    types: [
      ADD_COMIC_BOOK_TITLE_PENDING,
      ADD_COMIC_BOOK_TITLE_SUCCESS,
      ADD_COMIC_BOOK_TITLE_ERROR,
    ],
    callAPI: () => API.post('/comicbooktitles/', {
      cbTitle: comicbooklist.cbTitle.trim(),
      collectpubId: comicbooklist.collectpubId,
      collectPubName: comicbooklist.collectPubName,
    }),
    payload: {
      collectpubId: comicbooklist.collectpubId,
      comicbooklist: {
        cbTitle: comicbooklist.cbTitle
      } as Partial<ComicBookTitle>,
      collectPubName: comicbooklist.collectPubName,
    },
  };
};

export const updateComicBookTitle = (
  { id, cbTitle }: Pick<ComicBookTitle, 'id' | 'cbTitle'>
): APIAction => {
  if (!cbTitle?.trim()) {
    throw new Error('Comic book title is required');
  }

  return {
    types: [
      UPDATE_COMIC_BOOK_TITLE_PENDING,
      UPDATE_COMIC_BOOK_TITLE_SUCCESS,
      UPDATE_COMIC_BOOK_TITLE_ERROR,
    ],
    callAPI: () => API.put(`/comicbooktitles/${id}`, { cbTitle: cbTitle.trim() }),
    payload: { id },
  };
};

export const deleteComicBookTitle = (id: string): APIAction => ({
  types: [
    DELETE_COMIC_BOOK_TITLE_PENDING,
    DELETE_COMIC_BOOK_TITLE_SUCCESS,
    DELETE_COMIC_BOOK_TITLE_ERROR,
  ],
  callAPI: () => API.delete(`/comicbooktitles/${id}`, { params: { id } }),
  payload: { id },
});

export default fetchComicBookTitles;