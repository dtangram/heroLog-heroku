import createReducer from '../helpers/createReducer';
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
  data: ComicBook;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface ComicBooksState {
  byId: Record<string, ComicBookState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

export interface State {
  [titleID: string]: ComicBooksState;
}

interface Action {
  type: string;
  payload?: {
    titleID?: string;
    id?: string;
    comicbooklistissue?: ComicBook;
  };
  data?: ComicBook | ComicBook[];
  err?: string;
}

const initialTitleState: ComicBooksState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const initialState: State = {};

const getTitleState = (state: State, titleID: string): ComicBooksState =>
  state[titleID] || initialTitleState;

const findTitleIdByComicBookId = (state: State, id: string): string | null => {
  const titleIds = Object.keys(state);
  
  for (const titleId of titleIds) {
    const title = state[titleId];
    if (title?.byId?.[id]) {
      return titleId;
    }
  }
  
  return null;
};

const createComicBookState = (
  data: ComicBook,
  isLoading = false
): ComicBookState => ({
  data,
  isLoading,
  loadedAt: Date.now(),
  error: null,
});

const updateComicBookInState = (
  byId: Record<string, ComicBookState>,
  id: string,
  updates: Partial<ComicBookState>
): Record<string, ComicBookState> => {
  const existingComicBook = byId[id];
  
  if (!existingComicBook) {
    return byId;
  }
  
  return {
    ...byId,
    [id]: {
      ...existingComicBook,
      ...updates,
    },
  };
};

// Fetch all comic books for a title - PENDING
const comicbooklistissuesPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { titleID = '' } = typedAction.payload || {};
  
  if (!titleID) return typedState;
  
  const titleState = getTitleState(typedState, titleID);

  return {
    ...typedState,
    [titleID]: {
      ...titleState,
      isLoading: true,
      error: null,
    },
  };
};

// Fetch all comic books for a title - SUCCESS
const comicbooklistissuesSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { titleID = '' } = typedAction.payload || {};
  
  if (!titleID) return typedState;
  
  const comicBooks = Array.isArray(typedAction.data) ? typedAction.data : [];
  const titleState = getTitleState(typedState, titleID);
  const now = Date.now();

  const newById = comicBooks.reduce((acc, comicBook) => ({
    ...acc,
    [comicBook.id]: createComicBookState(comicBook),
  }), titleState.byId);

  const newAllIds = Array.from(new Set([
    ...titleState.allIds,
    ...comicBooks.map(comicBook => comicBook.id),
  ]));

  return {
    ...typedState,
    [titleID]: {
      byId: newById,
      allIds: newAllIds,
      loadedAt: now,
      isLoading: false,
      error: null,
    },
  };
};

// Fetch all comic books for a title - ERROR
const comicbooklistissuesError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { titleID = '' } = typedAction.payload || {};
  
  if (!titleID) return typedState;
  
  const titleState = getTitleState(typedState, titleID);

  return {
    ...typedState,
    [titleID]: {
      ...titleState,
      isLoading: false,
      error: typedAction.err || 'Unknown error',
    },
  };
};

// Fetch/Create/Update single comic book - PENDING
const comicbooklistissuePending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', comicbooklistissue } = typedAction.payload || {};
  
  const titleID = comicbooklistissue?.titleID || findTitleIdByComicBookId(typedState, id);

  if (!titleID) return typedState;

  const titleState = getTitleState(typedState, titleID);
  const existingComicBook = titleState.byId[id];
  const comicBookData = existingComicBook?.data || comicbooklistissue || {
    id,
    title: '',
    comicIssue: '',
    author: '',
    penciler: '',
    coverartist: '',
    inker: '',
    volume: '',
    year: '',
    type: '',
    comicBookCover: '',
    titleID,
  } as ComicBook;

  return {
    ...typedState,
    [titleID]: {
      ...titleState,
      byId: {
        ...titleState.byId,
        [id]: {
          data: comicBookData,
          isLoading: true,
          loadedAt: existingComicBook?.loadedAt || 0,
          error: null,
        },
      },
    },
  };
};

// Fetch/Create single comic book - SUCCESS
const comicbooklistissueSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const comicBook = typedAction.data as ComicBook;
  
  if (!comicBook || !comicBook.id || !comicBook.titleID) return typedState;
  
  // ✅ FIX: Use the ID from the comic book data, not from payload
  const comicBookId = comicBook.id;
  const { titleID } = comicBook;
  
  const titleState = getTitleState(typedState, titleID);
  const existingData = titleState.byId[comicBookId]?.data || {};

  const newAllIds = titleState.allIds.includes(comicBookId)
    ? titleState.allIds
    : [...titleState.allIds, comicBookId];

  return {
    ...typedState,
    [titleID]: {
      ...titleState,
      byId: {
        ...titleState.byId,
        [comicBookId]: createComicBookState({ ...existingData, ...comicBook }),
      },
      allIds: newAllIds,
    },
  };
};

// Update single comic book - SUCCESS
const comicbooklistissueSuccessUpdate = (state: object, action: object): object =>
  comicbooklistissueSuccess(state, action);

// Delete single comic book - SUCCESS
const comicbooklistissueSuccessDelete = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  const titleID = findTitleIdByComicBookId(typedState, id);
  
  if (!titleID) return typedState;

  const titleState = typedState[titleID];
  const { [id]: _deleted, ...remainingById } = titleState.byId;
  const newAllIds = titleState.allIds.filter(comicBookId => comicBookId !== id);

  return {
    ...typedState,
    [titleID]: {
      ...titleState,
      byId: remainingById,
      allIds: newAllIds,
    },
  };
};

// Fetch/Create/Update/Delete single comic book - ERROR
const comicbooklistissueError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', comicbooklistissue } = typedAction.payload || {};
  
  const titleID = comicbooklistissue?.titleID || findTitleIdByComicBookId(typedState, id);
  
  if (!titleID) return typedState;

  const titleState = typedState[titleID];
  
  if (!titleState?.byId?.[id]) return typedState;

  return {
    ...typedState,
    [titleID]: {
      ...titleState,
      byId: updateComicBookInState(titleState.byId, id, {
        isLoading: false,
        error: typedAction.err || 'Unknown error',
      }),
    },
  };
};

const reducer = createReducer(initialState, {
  [REQ_COMIC_BOOKS_PENDING]: comicbooklistissuesPending,
  [REQ_COMIC_BOOKS_SUCCESS]: comicbooklistissuesSuccess,
  [REQ_COMIC_BOOKS_ERROR]: comicbooklistissuesError,
  [REQ_COMIC_BOOK_PENDING]: comicbooklistissuePending,
  [REQ_COMIC_BOOK_SUCCESS]: comicbooklistissueSuccess,
  [REQ_COMIC_BOOK_ERROR]: comicbooklistissueError,
  [ADD_COMIC_BOOK_PENDING]: comicbooklistissuePending,
  [ADD_COMIC_BOOK_SUCCESS]: comicbooklistissueSuccess,
  [ADD_COMIC_BOOK_ERROR]: comicbooklistissueError,
  [UPDATE_COMIC_BOOK_PENDING]: comicbooklistissuePending,
  [UPDATE_COMIC_BOOK_SUCCESS]: comicbooklistissueSuccessUpdate,
  [UPDATE_COMIC_BOOK_ERROR]: comicbooklistissueError,
  [DELETE_COMIC_BOOK_PENDING]: comicbooklistissuePending,
  [DELETE_COMIC_BOOK_SUCCESS]: comicbooklistissueSuccessDelete,
  [DELETE_COMIC_BOOK_ERROR]: comicbooklistissueError,
});

export default reducer as (state: State | undefined, action: Action) => State;