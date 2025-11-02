import API from '../../API';
import {
  REQ_USER_PROFILE_PENDING,
  REQ_USER_PROFILE_SUCCESS,
  REQ_USER_PROFILE_ERROR,
  REQ_USER_LOGOUT,
} from '../actionTypes';

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

interface UserProfile {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  type: string;
  profilePic: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserProfileState {
  data: UserProfile | undefined;
  isLoading: boolean;
  error: string | null;
  loadedAt: number;
}

interface RootState {
  userProfile: UserProfileState;
}

interface APIAction {
  types: [string, string, string];
  callAPI: () => Promise<{ data: UserProfile }>;
  shouldCallAPI?: (state: RootState) => boolean;
  payload: { id: string };
  transformResponse?: (response: { success?: boolean; data?: UserProfile }) => UserProfile | null;
}

interface SimpleAction {
  type: string;
  payload?: Record<string, unknown>;
}

type Action = APIAction | SimpleAction;

const getUserId = (): string | null => {
  return localStorage.getItem('id');
};

const isCached = (loadedAt: number): boolean => {
  return loadedAt > 0 && Date.now() - loadedAt < CACHE_TIME;
};

const shouldFetchUserProfile = (state: RootState, userId: string): boolean => {
  if (!userId) return false;
 
  const { isLoading, loadedAt } = state.userProfile;
 
  if (isLoading) return false;
  if (!loadedAt) return true;
 
  return !isCached(loadedAt);
};

const clearAuthData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('id');
  localStorage.removeItem('userData');
};

export const fetchUserProfile = (idUser?: string): Action => {
  const userId = idUser || getUserId();
 
  if (!userId) {
    console.warn('No user ID found in localStorage');
    return {
      type: 'USER_PROFILE_FETCH_SKIPPED',
      payload: { reason: 'no_user_id' }
    };
  }

  return {
    types: [
      REQ_USER_PROFILE_PENDING,
      REQ_USER_PROFILE_SUCCESS,
      REQ_USER_PROFILE_ERROR,
    ],
    callAPI: () => API.get(`/users/${userId}`),
    shouldCallAPI: (state: RootState) => shouldFetchUserProfile(state, userId),
    payload: { id: userId },
    transformResponse: (response: { success?: boolean; data?: UserProfile }) => {
      // ✅ Data is at response.data directly
      if (response?.data) {
        console.log('✅ Returning user data:', response.data);
        return response.data;
      }
      
      console.log('❌ No data in response');
      return null;
    },
  };
};

export const logout = (): SimpleAction => {
  clearAuthData();
 
  return {
    type: REQ_USER_LOGOUT,
  };
};

export default fetchUserProfile;