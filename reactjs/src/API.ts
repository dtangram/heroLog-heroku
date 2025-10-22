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

/**
 * Response interceptor
 * Extracts data from successful responses and handles errors
 */
API.interceptors.response.use(
  (response: AxiosResponse): any => {
    return response?.data || {};
  },
  (error: AxiosError) => {
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
    // Pull the token out of local storage
    const token = localStorage.getItem('token');

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