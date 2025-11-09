import createReducer from '../helpers/createReducer';
import {
  REQ_PASSWORDRESET_PENDING,
  REQ_PASSWORDRESET_SUCCESS,
  REQ_PASSWORDRESET_ERROR,
  UPDATE_PASSWORDRESET_PENDING,
  UPDATE_PASSWORDRESET_SUCCESS,
  UPDATE_PASSWORDRESET_ERROR,
} from '../actionTypes';

interface PasswordResetData {
  id: string;
  token: string;
  email: string;
  expiresAt: string;
  isValid: boolean;
}

interface PasswordResetState {
  data: PasswordResetData;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

export interface PasswordResetsState {
  id: string | null;
  byId: Record<string, PasswordResetState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface Action {
  type: string;
  payload?: {
    token: string;
    newPassword?: string;
  };
  data?: PasswordResetData;
  err?: string;
}

const initialState: PasswordResetsState = {
  id: null,
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const createPasswordResetState = (data: PasswordResetData): PasswordResetState => ({
  data,
  isLoading: false,
  loadedAt: Date.now(),
  error: null,
});

// Fetch password reset - PENDING
const passwordResetPending = (state: object, action: object): object => {
  const typedState = state as PasswordResetsState;
  
  return {
    ...typedState,
    isLoading: true,
    error: null,
  };
};

// Fetch password reset - SUCCESS
const passwordResetSuccess = (state: object, action: object): object => {
  const typedState = state as PasswordResetsState;
  const typedAction = action as Action;
  
  if (!typedAction.data) return typedState;
  
  const { id } = typedAction.data;
  const now = Date.now();
  
  const newAllIds = typedState.allIds.includes(id)
    ? typedState.allIds
    : [...typedState.allIds, id];

  return {
    ...typedState,
    id,
    byId: {
      ...typedState.byId,
      [id]: createPasswordResetState(typedAction.data),
    },
    allIds: newAllIds,
    loadedAt: now,
    isLoading: false,
    error: null,
  };
};

// Update password reset - SUCCESS
const passwordResetSuccessUpdate = (state: object, action: object): object => {
  const typedState = state as PasswordResetsState;
  const typedAction = action as Action;
  
  if (!typedAction.data) return typedState;
  
  const { id } = typedAction.data;
  const existingData = typedState.byId[id]?.data || {};
  const now = Date.now();
  
  const newAllIds = typedState.allIds.includes(id)
    ? typedState.allIds
    : [...typedState.allIds, id];

  return {
    ...typedState,
    byId: {
      ...typedState.byId,
      [id]: {
        data: { ...existingData, ...typedAction.data },
        isLoading: false,
        loadedAt: now,
        error: null,
      },
    },
    allIds: newAllIds,
    loadedAt: now,
    isLoading: false,
    error: null,
  };
};

// Fetch/Update password reset - ERROR
const passwordResetError = (state: object, action: object): object => {
  const typedState = state as PasswordResetsState;
  const typedAction = action as Action;
  
  return {
    ...typedState,
    isLoading: false,
    error: typedAction.err || 'Password reset request failed',
  };
};

const reducer = createReducer(initialState, {
  [REQ_PASSWORDRESET_PENDING]: passwordResetPending,
  [REQ_PASSWORDRESET_SUCCESS]: passwordResetSuccess,
  [REQ_PASSWORDRESET_ERROR]: passwordResetError,
  [UPDATE_PASSWORDRESET_PENDING]: passwordResetPending,
  [UPDATE_PASSWORDRESET_SUCCESS]: passwordResetSuccessUpdate,
  [UPDATE_PASSWORDRESET_ERROR]: passwordResetError,
});

export default reducer as (state: PasswordResetsState | undefined, action: Action) => PasswordResetsState;