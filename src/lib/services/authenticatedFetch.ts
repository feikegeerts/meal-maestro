/**
 * Enhanced fetch wrapper with automatic authentication retry
 */
import { authStore } from '../stores/auth.js';
import { supabaseBrowser } from './supabaseBrowser.js';

export interface AuthenticatedFetchOptions extends RequestInit {
  // Add custom options here if needed
  maxRetries?: number;
}

/**
 * Fetch with automatic authentication retry
 * If a request fails with 401, it will attempt to refresh the session and retry once
 */
export async function authenticatedFetch(
  url: string, 
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { maxRetries = 1, ...fetchOptions } = options;
  
  // Ensure credentials are included for auth cookies
  const requestOptions: RequestInit = {
    credentials: 'include',
    ...fetchOptions
  };

  // First attempt
  let response = await fetch(url, requestOptions);
  
  // If unauthorized and we haven't exceeded retries, try to refresh and retry
  if (response.status === 401 && maxRetries > 0) {
    
    try {
      // Force a session refresh
      const { data: { session }, error } = await supabaseBrowser.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        // Sign out the user if refresh fails
        await authStore.signOut();
        return response; // Return the original 401 response
      }
      
      if (session) {
        // Sync the new session with server
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in
          })
        });
        
        // Retry the original request
        response = await fetch(url, {
          ...requestOptions,
          maxRetries: maxRetries - 1 // Prevent infinite recursion
        } as AuthenticatedFetchOptions);
      }
    } catch (refreshError) {
      console.error('Error during auth refresh retry:', refreshError);
    }
  }
  
  return response;
}

/**
 * Wrapper for common API patterns
 */
export const apiClient = {
  async get(url: string, options?: AuthenticatedFetchOptions) {
    return authenticatedFetch(url, { ...options, method: 'GET' });
  },

  async post(url: string, data?: any, options?: AuthenticatedFetchOptions) {
    return authenticatedFetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
  },

  async put(url: string, data?: any, options?: AuthenticatedFetchOptions) {
    return authenticatedFetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
  },

  async delete(url: string, data?: any, options?: AuthenticatedFetchOptions) {
    return authenticatedFetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
  }
};
