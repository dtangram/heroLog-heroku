/**
 * Check if user has a valid token in localStorage
 */
export const hasToken = (): boolean => {
  const token = localStorage.getItem('token');
  return Boolean(token && token !== 'undefined');
};

/**
 * Get dashboard type based on authentication
 * Returns 'dashboardProfile' if authenticated, 'dashboard' if not
 */
export const getDashboard = (): 'dashboardProfile' | 'dashboard' => {
  return hasToken() ? 'dashboardProfile' : 'dashboard';
};