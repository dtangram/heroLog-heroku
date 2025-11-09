import createReducer from '../helpers/createReducer';
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

interface ComicBookTitle {
  id: string;
  cbTitle: string;
  collectpubId: string;
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

export interface State {
  [collectpubId: string]: ComicBookTitlesState;
}

interface Action {
  type: string;
  payload?: {
    collectpubId?: string;
    id?: string;
    comicbooklist?: ComicBookTitle;
  };
  data?: ComicBookTitle | ComicBookTitle[];
  err?: string;
}

const initialPublisherState: ComicBookTitlesState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const initialState: State = {};

const getPublisherState = (
  state: State,
  collectpubId: string
): ComicBookTitlesState => state[collectpubId] || initialPublisherState;

const findPublisherIdByTitleId = (state: State, id: string): string | null => {
  const publisherIds = Object.keys(state);
  
  for (const pubId of publisherIds) {
    const publisher = state[pubId];
    if (publisher?.byId?.[id]) {
      return pubId;
    }
  }
  
  return null;
};

const createTitleState = (
  data: ComicBookTitle,
  isLoading = false
): ComicBookTitleState => ({
  data,
  isLoading,
  loadedAt: Date.now(),
  error: null,
});

const updateTitleInState = (
  byId: Record<string, ComicBookTitleState>,
  id: string,
  updates: Partial<ComicBookTitleState>
): Record<string, ComicBookTitleState> => {
  const existingTitle = byId[id];
  
  if (!existingTitle) {
    return byId;
  }
  
  return {
    ...byId,
    [id]: {
      ...existingTitle,
      ...updates,
    },
  };
};

// Fetch all titles for a publisher - PENDING
const comicbooklistsPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { collectpubId = '' } = typedAction.payload || {};
  
  if (!collectpubId) return typedState;
  
  const publisherState = getPublisherState(typedState, collectpubId);

  return {
    ...typedState,
    [collectpubId]: {
      ...publisherState,
      isLoading: true,
      error: null,
    },
  };
};

// Fetch all titles for a publisher - SUCCESS
const comicbooklistsSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { collectpubId = '' } = typedAction.payload || {};
  
  if (!collectpubId) return typedState;
  
  const titles = Array.isArray(typedAction.data) ? typedAction.data : [];
  const publisherState = getPublisherState(typedState, collectpubId);
  const now = Date.now();

  const newById = titles.reduce((acc, title) => ({
    ...acc,
    [title.id]: createTitleState(title),
  }), publisherState.byId);

  const newAllIds = Array.from(new Set([
    ...publisherState.allIds,
    ...titles.map(title => title.id),
  ]));

  return {
    ...typedState,
    [collectpubId]: {
      byId: newById,
      allIds: newAllIds,
      loadedAt: now,
      isLoading: false,
      error: null,
    },
  };
};

// Fetch all titles for a publisher - ERROR
const comicbooklistsError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { collectpubId = '' } = typedAction.payload || {};
  
  if (!collectpubId) return typedState;
  
  const publisherState = getPublisherState(typedState, collectpubId);

  return {
    ...typedState,
    [collectpubId]: {
      ...publisherState,
      isLoading: false,
      error: typedAction.err || 'Unknown error',
    },
  };
};

// Fetch/Create/Update single title - PENDING
const comicbooklistPending = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', comicbooklist } = typedAction.payload || {};
  
  const collectpubId = comicbooklist?.collectpubId || findPublisherIdByTitleId(typedState, id);

  if (!collectpubId) return typedState;

  const publisherState = getPublisherState(typedState, collectpubId);
  const existingTitle = publisherState.byId[id];
  const titleData = existingTitle?.data || comicbooklist || {
    id,
    cbTitle: '',
    collectpubId,
  } as ComicBookTitle;

  return {
    ...typedState,
    [collectpubId]: {
      ...publisherState,
      byId: {
        ...publisherState.byId,
        [id]: {
          data: titleData,
          isLoading: true,
          loadedAt: existingTitle?.loadedAt || 0,
          error: null,
        },
      },
    },
  };
};

// Fetch/Create single title - SUCCESS
const comicbooklistSuccess = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const title = typedAction.data as ComicBookTitle;
  
  if (!title || !title.id || !title.collectpubId) return typedState;
  
  // ✅ FIX: Use the ID from the title data, not from payload
  const titleId = title.id;
  const { collectpubId } = title;
  
  const publisherState = getPublisherState(typedState, collectpubId);
  const existingData = publisherState.byId[titleId]?.data || {};

  const newAllIds = publisherState.allIds.includes(titleId)
    ? publisherState.allIds
    : [...publisherState.allIds, titleId];

  return {
    ...typedState,
    [collectpubId]: {
      ...publisherState,
      byId: {
        ...publisherState.byId,
        [titleId]: createTitleState({ ...existingData, ...title }),
      },
      allIds: newAllIds,
    },
  };
};

// Update single title - SUCCESS
const comicbooklistSuccessUpdate = (state: object, action: object): object => 
  comicbooklistSuccess(state, action);

// Delete single title - SUCCESS
const comicbooklistSuccessDelete = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  const collectpubId = findPublisherIdByTitleId(typedState, id);
  
  if (!collectpubId) return typedState;

  const publisherState = typedState[collectpubId];
  const { [id]: _deleted, ...remainingById } = publisherState.byId;
  const newAllIds = publisherState.allIds.filter(titleId => titleId !== id);

  return {
    ...typedState,
    [collectpubId]: {
      ...publisherState,
      byId: remainingById,
      allIds: newAllIds,
    },
  };
};

// Fetch/Create/Update/Delete single title - ERROR
const comicbooklistError = (state: object, action: object): object => {
  const typedState = state as State;
  const typedAction = action as Action;
  const { id = '', comicbooklist } = typedAction.payload || {};
  
  const collectpubId = comicbooklist?.collectpubId || findPublisherIdByTitleId(typedState, id);
  
  if (!collectpubId) return typedState;

  const publisherState = typedState[collectpubId];
  
  if (!publisherState?.byId?.[id]) return typedState;

  return {
    ...typedState,
    [collectpubId]: {
      ...publisherState,
      byId: updateTitleInState(publisherState.byId, id, {
        isLoading: false,
        error: typedAction.err || 'Unknown error',
      }),
    },
  };
};

const reducer = createReducer(initialState, {
  [REQ_COMIC_BOOK_TITLES_PENDING]: comicbooklistsPending,
  [REQ_COMIC_BOOK_TITLES_SUCCESS]: comicbooklistsSuccess,
  [REQ_COMIC_BOOK_TITLES_ERROR]: comicbooklistsError,
  [REQ_COMIC_BOOK_TITLE_PENDING]: comicbooklistPending,
  [REQ_COMIC_BOOK_TITLE_SUCCESS]: comicbooklistSuccess,
  [REQ_COMIC_BOOK_TITLE_ERROR]: comicbooklistError,
  [ADD_COMIC_BOOK_TITLE_PENDING]: comicbooklistPending,
  [ADD_COMIC_BOOK_TITLE_SUCCESS]: comicbooklistSuccess,
  [ADD_COMIC_BOOK_TITLE_ERROR]: comicbooklistError,
  [UPDATE_COMIC_BOOK_TITLE_PENDING]: comicbooklistPending,
  [UPDATE_COMIC_BOOK_TITLE_SUCCESS]: comicbooklistSuccessUpdate,
  [UPDATE_COMIC_BOOK_TITLE_ERROR]: comicbooklistError,
  [DELETE_COMIC_BOOK_TITLE_PENDING]: comicbooklistPending,
  [DELETE_COMIC_BOOK_TITLE_SUCCESS]: comicbooklistSuccessDelete,
  [DELETE_COMIC_BOOK_TITLE_ERROR]: comicbooklistError,
});

export default reducer as (state: State | undefined, action: Action) => State;