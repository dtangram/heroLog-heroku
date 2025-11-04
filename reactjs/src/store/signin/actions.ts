import API from '../../API';
import { clearAnonymousId } from '../../utils/anonymousUser';
import {
  REQ_LOGIN_PENDING,
  REQ_LOGIN_SUCCESS,
  REQ_LOGIN_ERROR,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

interface SignInCredentials {
  username: string;
  password: string;
}

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

interface SignInsState {
  id: string | null;
  byId: Record<string, UserState>;
  allIds: string[];
  loadedAt: number;
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  signins: SignInsState;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: LoginResponse }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: Record<string, string | SignInCredentials>;
}

const isValidUsername = (username: string): boolean => {
  const trimmed = username?.trim();
  return Boolean(trimmed && trimmed.length >= 3);
};

const isValidPassword = (password: string): boolean => {
  return Boolean(password && password.length >= 6);
};

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const storeAuthData = (response: LoginResponse): void => {
  const { token, id } = response;
  
  if (token) {
    localStorage.setItem('token', token);
  }
  
  if (id) {
    localStorage.setItem('id', id);
  }
  
  // Store additional data if present
  if (response.data) {
    try {
      localStorage.setItem('userData', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }
};

export const loginUser = (signin: SignInCredentials): APIAction => {
  const { username, password } = signin;
  
  // Validation
  if (!isValidUsername(username)) {
    throw new Error('Username must be at least 3 characters long');
  }
  
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 6 characters long');
  }
  
  const trimmedUsername = username.trim();
  
  return {
    types: [
      REQ_LOGIN_PENDING,
      REQ_LOGIN_SUCCESS,
      REQ_LOGIN_ERROR,
    ],
    callAPI: async () => {
      try {
        const response = await API.post('/auth/login', {
          username: trimmedUsername,
          password,
        });
        
        if (response?.data) {
          storeAuthData(response.data);
          clearAnonymousId();  
          console.log('🗑️ Cleared anonymous ID after login');
          
          // ✅ Clear publishers cache so Dashboard refetches
          localStorage.removeItem('publishersCache');
        }
        
        return response;
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('id');
        localStorage.removeItem('userData');
        throw error;
      }
    },
    payload: { signin },
  };
};

export const fetchUserProfile = (id: string): APIAction => {
  if (!id?.trim()) {
    throw new Error('User ID is required');
  }

  return {
    types: [
      REQ_LOGIN_PENDING,
      REQ_LOGIN_SUCCESS,
      REQ_LOGIN_ERROR,
    ],
    callAPI: () => API.get(`/users/${id}`),
    shouldCallAPI: (state: RootState) => {
      const userState = state.signins.byId[id];
      
      if (!userState) return true;
      if (userState.isLoading) return false;
      if (!userState.loadedAt) return true;
      
      return !isCached(userState.loadedAt);
    },
    payload: { id },
  };
};

export const logoutUser = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('id');
  localStorage.removeItem('userData');
};

export default loginUser;