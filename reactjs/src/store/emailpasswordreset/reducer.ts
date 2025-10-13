import createReducer from '../helpers/createReducer';
import {
  REQ_EMAILPASSWORDRESET_PENDING,
  REQ_EMAILPASSWORDRESET_SUCCESS,
  REQ_EMAILPASSWORDRESET_ERROR,
} from '../actionTypes';

interface PasswordResetData {
  id: string;
  email: string;
  message: string;
}

interface PasswordResetState {
  data: PasswordResetData;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

export interface EmailPasswordResetState {
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
    email: string;
  };
  data?: PasswordResetData;
  err?: string;
}

const initialState: EmailPasswordResetState = {
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

// Email password reset - PENDING
const emailPasswordResetPending = (state: object, action: object): object => {
  const typedState = state as EmailPasswordResetState;
  
  return {
    ...typedState,
    isLoading: true,
    error: null,
  };
};

// Email password reset - SUCCESS
const emailPasswordResetSuccess = (state: object, action: object): object => {
  const typedState = state as EmailPasswordResetState;
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

// Email password reset - ERROR
const emailPasswordResetError = (state: object, action: object): object => {
  const typedState = state as EmailPasswordResetState;
  const typedAction = action as Action;
  
  return {
    ...typedState,
    isLoading: false,
    error: typedAction.err || 'Password reset request failed',
  };
};

const reducer = createReducer(initialState, {
  [REQ_EMAILPASSWORDRESET_PENDING]: emailPasswordResetPending,
  [REQ_EMAILPASSWORDRESET_SUCCESS]: emailPasswordResetSuccess,
  [REQ_EMAILPASSWORDRESET_ERROR]: emailPasswordResetError,
});

export default reducer as (state: EmailPasswordResetState | undefined, action: Action) => EmailPasswordResetState;