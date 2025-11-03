import { v4 as uuidv4 } from 'uuid';

const ANONYMOUS_ID_KEY = 'anonymousUserId';

/**
 * Get or create anonymous user ID
 */
export const getAnonymousUserId = (): string => {
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
  
  if (!anonymousId) {
    // Generate new anonymous ID
    anonymousId = uuidv4();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
    console.log('📝 Created new anonymous user ID:', anonymousId);
  }
  
  return anonymousId;
};

/**
 * Get current user ID (authenticated or anonymous)
 */
export const getCurrentUserId = (): string => {
  // First check for authenticated user ID
  const authenticatedId = localStorage.getItem('id');
  
  if (authenticatedId && authenticatedId !== 'undefined') {
    return authenticatedId;
  }
  
  // Fall back to anonymous ID
  return getAnonymousUserId();
};

/**
 * Clear anonymous ID when user signs in
 */
export const clearAnonymousId = (): void => {
  localStorage.removeItem(ANONYMOUS_ID_KEY);
  console.log('🗑️ Cleared anonymous user ID');
};

/**
 * Get anonymous ID for migration (before clearing)
 */
export const getAnonymousIdForMigration = (): string | null => {
  return localStorage.getItem(ANONYMOUS_ID_KEY);
};