import createReducer from '../helpers/createReducer';
import {
  REQ_USERS_PENDING,
  REQ_USERS_SUCCESS,
  REQ_USERS_ERROR,
  REQ_USER_PENDING,
  REQ_USER_SUCCESS,
  REQ_USER_ERROR,
  ADD_USER_PENDING,
  ADD_USER_SUCCESS,
  ADD_USER_ERROR,
  UPDATE_USER_PENDING,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_ERROR,
  DELETE_USER_PENDING,
  DELETE_USER_SUCCESS,
  DELETE_USER_ERROR,
} from '../actionTypes';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  type: string;
  profilePic: string;
}

interface UserState {
  data: User;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

export interface UsersState {
  byId: Record<string, UserState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
  type: string;
}

interface Action {
  type: string;
  payload?: {
    userId?: string;
    id?: string;
    signup?: User;
  };
  data?: User | User[];
  err?: string;
}

const initialState: UsersState = {
  byId: {},
  allIds: [],
  loadedAt: 0,
  isLoading: false,
  error: null,
  type: '',
};

const createUserState = (data: User): UserState => ({
  data,
  isLoading: false,
  loadedAt: Date.now(),
  error: null,
});

const updateUserInState = (
  byId: Record<string, UserState>,
  id: string,
  updates: Partial<UserState>
): Record<string, UserState> => {
  const existingUser = byId[id];
  
  if (!existingUser) {
    return byId;
  }
  
  return {
    ...byId,
    [id]: {
      ...existingUser,
      ...updates,
    },
  };
};

// Fetch all users - PENDING
const signupsPending = (state: object, action: object): object => {
  const typedState = state as UsersState;
  
  return {
    ...typedState,
    isLoading: true,
    error: null,
  };
};

// Fetch all users - SUCCESS
const signupsSuccess = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  const users = Array.isArray(typedAction.data) ? typedAction.data : [];
  const now = Date.now();

  const newById = users.reduce((acc, user) => ({
    ...acc,
    [user.id]: createUserState(user),
  }), typedState.byId);

  const newAllIds = Array.from(new Set([
    ...typedState.allIds,
    ...users.map(user => user.id),
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

// Fetch all users - ERROR
const signupsError = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  
  return {
    ...typedState,
    isLoading: false,
    error: typedAction.err || 'Failed to fetch users',
  };
};

// Fetch/Create/Update single user - PENDING
const signupPending = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  const { id = '', signup } = typedAction.payload || {};
  
  const existingUser = typedState.byId[id];
  const userData = existingUser?.data || signup || {
    id,
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    type: '',
    profilePic: '',
  } as User;

  return {
    ...typedState,
    byId: {
      ...typedState.byId,
      [id]: {
        data: userData,
        isLoading: true,
        loadedAt: existingUser?.loadedAt || 0,
        error: null,
      },
    },
  };
};

// Fetch/Create single user - SUCCESS
const signupSuccess = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  const user = typedAction.data as User;
  
  if (!user) return typedState;
  
  const { id } = user;
  const existingData = typedState.byId[id]?.data || {};

  const newAllIds = typedState.allIds.includes(id)
    ? typedState.allIds
    : [...typedState.allIds, id];

  return {
    ...typedState,
    byId: {
      ...typedState.byId,
      [id]: createUserState({ ...existingData, ...user }),
    },
    allIds: newAllIds,
  };
};

// Update single user - SUCCESS
const signupSuccessUpdate = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  const updatedUser = typedAction.data as User;
  
  if (!updatedUser) return typedState;
  
  const existingData = typedState.byId[id]?.data || {};

  const newAllIds = typedState.allIds.includes(id)
    ? typedState.allIds
    : [...typedState.allIds, id];

  return {
    ...typedState,
    byId: {
      ...typedState.byId,
      [id]: createUserState({ ...existingData, ...updatedUser }),
    },
    allIds: newAllIds,
  };
};

// Delete single user - SUCCESS
const signupSuccessDelete = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};
  
  const { [id]: _deleted, ...remainingById } = typedState.byId;
  const newAllIds = typedState.allIds.filter(userId => userId !== id);

  return {
    ...typedState,
    byId: remainingById,
    allIds: newAllIds,
  };
};

// Fetch/Create/Update/Delete single user - ERROR
const signupError = (state: object, action: object): object => {
  const typedState = state as UsersState;
  const typedAction = action as Action;
  const { id = '' } = typedAction.payload || {};

  if (!typedState.byId[id]) return typedState;

  return {
    ...typedState,
    byId: updateUserInState(typedState.byId, id, {
      isLoading: false,
      error: typedAction.err || 'Unknown error',
    }),
  };
};

const reducer = createReducer(initialState, {
  [REQ_USERS_PENDING]: signupsPending,
  [REQ_USERS_SUCCESS]: signupsSuccess,
  [REQ_USERS_ERROR]: signupsError,
  [REQ_USER_PENDING]: signupPending,
  [REQ_USER_SUCCESS]: signupSuccess,
  [REQ_USER_ERROR]: signupError,
  [ADD_USER_PENDING]: signupPending,
  [ADD_USER_SUCCESS]: signupSuccess,
  [ADD_USER_ERROR]: signupError,
  [UPDATE_USER_PENDING]: signupPending,
  [UPDATE_USER_SUCCESS]: signupSuccessUpdate,
  [UPDATE_USER_ERROR]: signupError,
  [DELETE_USER_PENDING]: signupPending,
  [DELETE_USER_SUCCESS]: signupSuccessDelete,
  [DELETE_USER_ERROR]: signupError,
});

export default reducer as (state: UsersState | undefined, action: Action) => UsersState;