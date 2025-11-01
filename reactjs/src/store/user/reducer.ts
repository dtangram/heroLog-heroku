import createReducer from '../helpers/createReducer';
import {
  REQ_USER_PROFILE_PENDING,
  REQ_USER_PROFILE_SUCCESS,
  REQ_USER_PROFILE_ERROR,
  REQ_USER_LOGOUT,
} from '../actionTypes';

// ============================================================================
// TYPES
// ============================================================================

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

export interface UserState {
  data: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  loadedAt: number;
}

interface Action {
  type: string;
  payload?: {
    id?: string;
  };
  data?: UserProfile;
  err?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_STATE: UserState = {
  data: null,
  isLoading: false,
  error: null,
  loadedAt: 0,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createLoadingState = (state: UserState): UserState => ({
  ...state,
  isLoading: true,
  error: null,
});

const createSuccessState = (state: UserState, data: UserProfile): UserState => ({
  ...state,
  data,
  isLoading: false,
  error: null,
  loadedAt: Date.now(),
});

const createErrorState = (state: UserState, errorMessage: string): UserState => ({
  ...state,
  isLoading: false,
  error: errorMessage,
});

const isValidUserProfile = (data: UserProfile | null | undefined): data is UserProfile => {
  if (!data) return false;
  
  return Boolean(
    data.id &&
    data.firstname &&
    data.lastname &&
    data.username &&
    data.email &&
    data.type
  );
};

// ============================================================================
// REDUCER HANDLERS
// ============================================================================

const handleUserProfilePending = (state: object, _action: object): object => {
  const typedState = state as UserState;
  return createLoadingState(typedState);
};

const handleUserProfileSuccess = (state: object, action: object): object => {
  console.log('🎯 USER PROFILE SUCCESS:', action);  // ✅ Add this
  const typedState = state as UserState;
  const typedAction = action as Action;
  
  if (!isValidUserProfile(typedAction.data)) {
    console.log('❌ Invalid user data:', typedAction.data);  // ✅ Add this
    return createErrorState(typedState, 'Invalid user profile data received');
  }

  console.log('✅ Valid user data:', typedAction.data);  // ✅ Add this
  return createSuccessState(typedState, typedAction.data);
};

const handleUserProfileError = (state: object, action: object): object => {
  const typedState = state as UserState;
  const typedAction = action as Action;
  
  // Defensive: Provide meaningful error message
  const errorMessage = typedAction.err || 'Failed to load user profile';
  
  return createErrorState(typedState, errorMessage);
};

const handleUserLogout = (_state: object, _action: object): object => {
  // Defensive: Always return fresh initial state on logout
  return { ...INITIAL_STATE };
};

// ============================================================================
// REDUCER
// ============================================================================

const reducer = createReducer(INITIAL_STATE, {
  [REQ_USER_PROFILE_PENDING]: handleUserProfilePending,
  [REQ_USER_PROFILE_SUCCESS]: handleUserProfileSuccess,
  [REQ_USER_PROFILE_ERROR]: handleUserProfileError,
  [REQ_USER_LOGOUT]: handleUserLogout,
});

// ============================================================================
// EXPORTS
// ============================================================================

export default reducer as (
  state: UserState | undefined,
  action: Action
) => UserState;