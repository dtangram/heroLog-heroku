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
  } else {
    console.log('✅ Using existing anonymous ID:', anonymousId);
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
    console.log('✅ Using authenticated user ID:', authenticatedId);
    return authenticatedId;
  }
  
  // Fall back to anonymous ID
  const anonymousId = getAnonymousUserId();
  console.log('📝 Using anonymous user ID:', anonymousId);
  return anonymousId;
};

/**
 * Clear anonymous ID when user signs in
 */
export const clearAnonymousId = (): void => {
  const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (anonymousId) {
    console.log('🗑️ Clearing anonymous user ID:', anonymousId);
    localStorage.removeItem(ANONYMOUS_ID_KEY);
  }
};

/**
 * Get anonymous ID for migration (before clearing)
 */
export const getAnonymousIdForMigration = (): string | null => {
  return localStorage.getItem(ANONYMOUS_ID_KEY);
};