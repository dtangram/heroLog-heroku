import createReducer from '../helpers/createReducer';
import {
  REQ_LOGIN_PENDING,
  REQ_LOGIN_SUCCESS,
  REQ_LOGIN_ERROR,
} from '../actionTypes';

interface LoginResponse {
  id: string;
  token: string;
  username: string;
  email: string;
  data?: Record<string, string>;
}

interface UserState {
  data: LoginResponse;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

export interface SignInsState {
  id: string | null;
  byId: Record<string, UserState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface Action {
  type: string;
  payload?: {
    signin?: {
      username: string;
      password: string;
    };
    id?: string;
  };
  data?: LoginResponse;
  err?: string;
}

const initialState: SignInsState = {
  id: null,
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
};

const createUserState = (data: LoginResponse): UserState => ({
  data,
  isLoading: false,
  loadedAt: Date.now(),
  error: null,
});

// Login/Fetch user - PENDING
const signInPending = (state: object, action: object): object => {
  const typedState = state as SignInsState;
  
  return {
    ...typedState,
    isLoading: true,
    error: null,
  };
};

// Login/Fetch user - SUCCESS
const signInSuccess = (state: object, action: object): object => {
  const typedState = state as SignInsState;
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
      [id]: createUserState(typedAction.data),
    },
    allIds: newAllIds,
    loadedAt: now,
    isLoading: false,
    error: null,
  };
};

// Login/Fetch user - ERROR
const signInError = (state: object, action: object): object => {
  const typedState = state as SignInsState;
  const typedAction = action as Action;
  
  return {
    ...typedState,
    isLoading: false,
    error: typedAction.err || 'Login failed',
  };
};

const reducer = createReducer(initialState, {
  [REQ_LOGIN_PENDING]: signInPending,
  [REQ_LOGIN_SUCCESS]: signInSuccess,
  [REQ_LOGIN_ERROR]: signInError,
});

export default reducer as (state: SignInsState | undefined, action: Action) => SignInsState;