import createReducer from '../helpers/createReducer';
import {
  REQ_PUBLISHERS_PENDING,
  REQ_PUBLISHERS_SUCCESS,
  REQ_PUBLISHERS_ERROR,
  REQ_PUBLISHER_PENDING,
  REQ_PUBLISHER_SUCCESS,
  REQ_PUBLISHER_ERROR,
  ADD_PUBLISHER_PENDING,
  ADD_PUBLISHER_SUCCESS,
  ADD_PUBLISHER_ERROR,
  UPDATE_PUBLISHER_PENDING,
  UPDATE_PUBLISHER_SUCCESS,
  UPDATE_PUBLISHER_ERROR,
  DELETE_PUBLISHER_PENDING,
  DELETE_PUBLISHER_SUCCESS,
  DELETE_PUBLISHER_ERROR,
} from '../actionTypes';

interface Publisher {
  id: string;
  publisherName: string;
  userId: string;
}

interface PublisherState {
  data: Publisher;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

export interface PublishersState {
  byId: Record<string, PublisherState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface Action {
  type: string;
  payload?: {
    userId?: string;
    id?: string;
    publisher?: Publisher;
  };
  data?: Publisher | Publisher[];
  err?: string;
}

const initialState: PublishersState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const createPublisherState = (
  data: Publisher,
  isLoading = false
): PublisherState => ({
  data,
  isLoading,
  loadedAt: Date.now(),
  error: null,
});

const updatePublisherInState = (
  byId: Record<string, PublisherState>,
  id: string,
  updates: Partial<PublisherState>
): Record<string, PublisherState> => {
  const existingPublisher = byId[id];
  
  if (!existingPublisher) {
    return byId;
  }
  
  return {
    ...byId,
    [id]: {
      ...existingPublisher,
      ...updates,
    },
  };
};

// Fetch all publishers - PENDING
const publishersPending = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  
  return {
    ...typedState,
    isLoading: true,
    error: null,
  };
};

// Fetch all publishers - SUCCESS
const publishersSuccess = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  const typedAction = action as Action;
  const publishers = Array.isArray(typedAction.data) ? typedAction.data : [];
  const now = Date.now();

  const newById = publishers.reduce((acc, publisher) => ({
    ...acc,
    [publisher.id]: createPublisherState(publisher),
  }), typedState.byId);

  const newAllIds = Array.from(new Set([
    ...typedState.allIds,
    ...publishers.map(publisher => publisher.id),
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

// Fetch all publishers - ERROR
const publishersError = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  const typedAction = action as Action;
  
  return {
    ...typedState,
    isLoading: false,
    error: typedAction.err || 'Unknown error',
  };
};

// Fetch/Create/Update single publisher - PENDING
const publisherPending = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  const typedAction = action as Action;
  const { id = '', publisher } = typedAction.payload || {};
  
  const existingPublisher = typedState.byId[id];
  const publisherData = existingPublisher?.data || publisher || {
    id,
    publisherName: '',
    userId: '',
  } as Publisher;

  return {
    ...typedState,
    byId: {
      ...typedState.byId,
      [id]: {
        data: publisherData,
        isLoading: true,
        loadedAt: existingPublisher?.loadedAt || 0,
        error: null,
      },
    },
  };
};

// Fetch/Create single publisher - SUCCESS
const publisherSuccess = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  const typedAction = action as Action;
  const publisher = typedAction.data as Publisher;
  
  if (!publisher || !publisher.id) return typedState;
  
  // ✅ FIX: Use the ID from the publisher data, not from payload
  const publisherId = publisher.id;
  const existingData = typedState.byId[publisherId]?.data || {};

  const newAllIds = typedState.allIds.includes(publisherId)
    ? typedState.allIds
    : [...typedState.allIds, publisherId];

  return {
    ...typedState,
    byId: {
      ...typedState.byId,
      [publisherId]: createPublisherState({ ...existingData, ...publisher }),
    },
    allIds: newAllIds,
  };
};

// Update single publisher - SUCCESS
const publisherSuccessUpdate = (state: object, action: object): object =>
  publisherSuccess(state, action);

// Delete single publisher - SUCCESS
const publisherSuccessDelete = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  const { [id]: _deleted, ...remainingById } = typedState.byId;
  const newAllIds = typedState.allIds.filter(publisherId => publisherId !== id);

  return {
    ...typedState,
    byId: remainingById,
    allIds: newAllIds,
  };
};

// Fetch/Create/Update/Delete single publisher - ERROR
const publisherError = (state: object, action: object): object => {
  const typedState = state as PublishersState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  if (!typedState.byId[id]) return typedState;

  return {
    ...typedState,
    byId: updatePublisherInState(typedState.byId, id, {
      isLoading: false,
      error: typedAction.err || 'Unknown error',
    }),
  };
};

const reducer = createReducer(initialState, {
  [REQ_PUBLISHERS_PENDING]: publishersPending,
  [REQ_PUBLISHERS_SUCCESS]: publishersSuccess,
  [REQ_PUBLISHERS_ERROR]: publishersError,
  [REQ_PUBLISHER_PENDING]: publisherPending,
  [REQ_PUBLISHER_SUCCESS]: publisherSuccess,
  [REQ_PUBLISHER_ERROR]: publisherError,
  [ADD_PUBLISHER_PENDING]: publisherPending,
  [ADD_PUBLISHER_SUCCESS]: publisherSuccess,
  [ADD_PUBLISHER_ERROR]: publisherError,
  [UPDATE_PUBLISHER_PENDING]: publisherPending,
  [UPDATE_PUBLISHER_SUCCESS]: publisherSuccessUpdate,
  [UPDATE_PUBLISHER_ERROR]: publisherError,
  [DELETE_PUBLISHER_PENDING]: publisherPending,
  [DELETE_PUBLISHER_SUCCESS]: publisherSuccessDelete,
  [DELETE_PUBLISHER_ERROR]: publisherError,
});

export default reducer as (state: PublishersState | undefined, action: Action) => PublishersState;