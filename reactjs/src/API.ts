import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Determine the API base URL based on environment
 */
const getBaseURL = (): string => {
  // Check for explicit environment variable first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Determine based on NODE_ENV and hostname
  const { hostname } = window.location;
  const nodeEnv = process.env.NODE_ENV;

  // Production environment
  if (nodeEnv === 'production') {
    // Check if we're on production domain
    if (hostname.includes(`${process.env.REACT_APP_API_URL}`)) {
      return `${process.env.REACT_APP_API_URL}`;
    }
    // Default to staging for other production builds
    return `${process.env.REACT_APP_API_URL}`;
  }

  // Development environment (default to localhost)
  return 'http://localhost:4000';
};

/**
 * Axios instance with custom configuration
 */
const API: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// SESSIONS: every request says who's asking
// ============================================================================

export const GUEST_TOKEN_KEY = 'guestToken';
const ANONYMOUS_ID_KEY = 'anonymousUserId';

let guestSessionRequest: Promise<string | null> | null = null;

/**
 * A guest (no account) gets a token for their anonymous ID the first time
 * they need one, so the API can keep their collection private without
 * making them sign up. A guest from before sessions existed keeps their
 * collection: we send the anonymous ID their browser already has.
 * Several requests at once share one session request.
 */
export const ensureGuestSession = (): Promise<string | null> => {
  const existing = localStorage.getItem(GUEST_TOKEN_KEY);
  if (existing) return Promise.resolve(existing);

  if (!guestSessionRequest) {
    guestSessionRequest = axios
      .post(`${API.defaults.baseURL ?? ''}/auth/guest`, {
        anonymousId: localStorage.getItem(ANONYMOUS_ID_KEY),
      })
      .then(response => {
        const { id, token } = response?.data?.data ?? {};
        if (!id || !token) return null;
        localStorage.setItem(ANONYMOUS_ID_KEY, id);
        localStorage.setItem(GUEST_TOKEN_KEY, token);
        return token as string;
      })
      .catch(error => {
        console.error('Could not start a guest session:', error);
        return null;
      })
      .finally(() => {
        guestSessionRequest = null;
      });
  }

  return guestSessionRequest;
};

/** The signed-in token, or a guest token (starting a guest session if needed). */
export const getSessionToken = async (): Promise<string | null> =>
  localStorage.getItem('token') || ensureGuestSession();

/** Headers for requests that don't go through API (Search uses axios directly). */
export const sessionHeaders = async (): Promise<Record<string, string>> => {
  const token = await getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const isAuthCall = (url = '') => /^\/?auth\//.test(url.replace(API.defaults.baseURL ?? '', ''));

/**
 * Response interceptor
 * Extracts data from successful responses and handles errors
 */
API.interceptors.response.use(
  (response: AxiosResponse): any => {
    return response?.data || {};
  },
  (error: AxiosError) => {
    // A signed-in session that expired: sign out here too, then sign in again
    if (
      error.response?.status === 401 &&
      localStorage.getItem('token') &&
      !isAuthCall(error.config?.url) &&
      window.location.pathname !== '/signin'
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('id');
      localStorage.removeItem('userData');
      window.location.assign('/signin');
    }

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    }

    // Return error for handling in components
    return Promise.reject(error);
  }
);

/**
 * Request interceptor
 * Adds authentication token to requests if available
 */
API.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Signed in: the account's token. Otherwise a guest token, except for
    // /auth/ calls (signing in, starting a guest session) which don't need one.
    const token = localStorage.getItem('token') || (isAuthCall(config.url) ? null : await ensureGuestSession());

    // If there is no token, return config as-is
    if (!token) {
      return config;
    }

    // If there is a token, add it to the headers
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers.token = token; // Keep this if your backend expects 'token' header
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Log the current API base URL in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API.defaults.baseURL);
}

export default API;