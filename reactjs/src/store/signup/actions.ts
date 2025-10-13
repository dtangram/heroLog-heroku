import { v4 as uuidv4 } from 'uuid';
import API from '../../API';
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

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

interface User {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password?: string;
  type: string;
  profilePic: string;
}

interface UserState {
  data: User;
  isLoading: boolean;
  loadedAt: number;
  error: string | null;
}

interface UsersState {
  byId: Record<string, UserState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  signups: UsersState;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: User | User[] }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | User | Partial<User>>;
}

const getUserId = (): string => {
  const userId = localStorage.getItem('id');
  return userId || '';
};

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUsername = (username: string): boolean => {
  const trimmed = username?.trim();
  return Boolean(trimmed && trimmed.length >= 3);
};

const isValidPassword = (password: string): boolean => {
  return Boolean(password && password.length >= 8);
};

const validateUser = (user: Partial<User>, isUpdate = false): void => {
  if (!isUpdate || user.firstname !== undefined) {
    if (!user.firstname?.trim()) {
      throw new Error('First name is required');
    }
  }
  
  if (!isUpdate || user.lastname !== undefined) {
    if (!user.lastname?.trim()) {
      throw new Error('Last name is required');
    }
  }
  
  if (!isUpdate || user.username !== undefined) {
    if (!isValidUsername(user.username || '')) {
      throw new Error('Username must be at least 3 characters long');
    }
  }
  
  if (!isUpdate || user.email !== undefined) {
    if (!user.email?.trim() || !isValidEmail(user.email.trim())) {
      throw new Error('Valid email is required');
    }
  }
  
  if (!isUpdate && user.password) {
    if (!isValidPassword(user.password)) {
      throw new Error('Password must be at least 8 characters long');
    }
  }
};

const shouldFetchUsers = (state: RootState): boolean => {
  const { loadedAt, isLoading } = state.signups;
  
  if (isLoading) return false;
  if (!loadedAt) return true;
  
  return !isCached(loadedAt);
};

const shouldFetchUser = (state: RootState, id: string): boolean => {
  const userState = state.signups.byId[id];
  
  if (!userState) return true;
  if (userState.isLoading) return false;
  if (!userState.loadedAt) return true;
  
  return !isCached(userState.loadedAt);
};

export const fetchUsers = (): APIAction => {
  const userId = getUserId();
  
  return {
    types: [
      REQ_USERS_PENDING,
      REQ_USERS_SUCCESS,
      REQ_USERS_ERROR,
    ],
    callAPI: () => API.get(`/users/signups/${userId}`),
    shouldCallAPI: (state: RootState) => shouldFetchUsers(state),
    payload: { userId },
  };
};

export const fetchUser = (id: string): APIAction => {
  if (!id?.trim()) {
    throw new Error('User ID is required');
  }

  return {
    types: [
      REQ_USER_PENDING,
      REQ_USER_SUCCESS,
      REQ_USER_ERROR,
    ],
    callAPI: () => API.get(`/users/${id}`),
    shouldCallAPI: (state: RootState) => shouldFetchUser(state, id),
    payload: { id },
  };
};

export const createUser = (signup: Omit<User, 'id'>): APIAction => {
  validateUser(signup, false);
  
  const id = uuidv4();
  
  return {
    types: [
      ADD_USER_PENDING,
      ADD_USER_SUCCESS,
      ADD_USER_ERROR,
    ],
    callAPI: () => API.post('/users/', { id, ...signup }),
    payload: { 
      id,
      signup: { id, ...signup } as User,
    },
  };
};

export const updateUser = (user: User): APIAction => {
  validateUser(user, true);
  
  const {
    id,
    firstname,
    lastname,
    username,
    email,
    password,
    type,
    profilePic,
  } = user;

  // Build update payload, excluding password if not provided
  const updatePayload: Partial<User> = {
    firstname: firstname?.trim(),
    lastname: lastname?.trim(),
    username: username?.trim(),
    email: email?.trim(),
    type: type?.trim(),
    profilePic: profilePic?.trim(),
  };

  // Only include password if it's provided and valid
  if (password && isValidPassword(password)) {
    updatePayload.password = password;
  }

  return {
    types: [
      UPDATE_USER_PENDING,
      UPDATE_USER_SUCCESS,
      UPDATE_USER_ERROR,
    ],
    callAPI: () => API.put(`/users/${id}`, updatePayload),
    payload: { id },
  };
};

export const deleteUser = (id: string): APIAction => {
  if (!id?.trim()) {
    throw new Error('User ID is required');
  }

  return {
    types: [
      DELETE_USER_PENDING,
      DELETE_USER_SUCCESS,
      DELETE_USER_ERROR,
    ],
    callAPI: () => API.delete(`/users/${id}`, { params: { id } }),
    payload: { id },
  };
};

export default fetchUsers;