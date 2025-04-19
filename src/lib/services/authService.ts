import { CSRF_COOKIE_NAME, MAX_ATTEMPTS } from '$lib/authConstants';

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

/**
 * Client-side auth service with methods for handling authentication
 */
export const authService = {
  // Track failed login attempts client-side
  loginAttempts: 0,
  lastAttemptTime: 0,

  /**
   * Check if the user has a CSRF token cookie (indicating potential authentication)
   */
  hasCsrfToken(): boolean {
    return !!getCookie(CSRF_COOKIE_NAME);
  },

  /**
   * Get the CSRF token from cookies
   */
  getCsrfToken(): string | null {
    return getCookie(CSRF_COOKIE_NAME);
  },

  /**
   * Attempt login with the provided password
   */
  async login(password: string): Promise<{
    success: boolean;
    csrfToken?: string;
    error?: string;
  }> {
    if (!password.trim()) {
      return { success: false, error: 'Password is required' };
    }

    // Simple client-side throttling
    const now = Date.now();
    if (this.loginAttempts >= MAX_ATTEMPTS && now - this.lastAttemptTime < 60000) {
      return {
        success: false,
        error: 'Too many attempts. Please wait before trying again.',
      };
    }

    this.lastAttemptTime = now;
    this.loginAttempts++;

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: 'Authentication failed' };
      }

      // Reset login attempts on success
      this.loginAttempts = 0;

      return {
        success: true,
        csrfToken: data.csrfToken,
      };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        error: 'Authentication error occurred',
      };
    }
  },

  /**
   * Verify authentication by trying to fetch protected data
   */
  async checkAuthentication(): Promise<{
    isAuthenticated: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/career-events');

      if (response.status === 401) {
        return { isAuthenticated: false };
      }

      if (!response.ok) {
        return {
          isAuthenticated: false,
          error: 'Failed to fetch data',
        };
      }

      const data = await response.json();
      return {
        isAuthenticated: true,
        data,
      };
    } catch (err) {
      console.error('Error checking authentication:', err);
      return {
        isAuthenticated: false,
        error: 'An error occurred while checking authentication',
      };
    }
  },
};
