import { supabase } from './supabaseClient.js';
import type { RequestEvent } from '@sveltejs/kit';

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Get authenticated user from request cookies
 */
export async function getAuthenticatedUser(event: RequestEvent): Promise<AuthUser | null> {
  try {
    // Try to get tokens from cookies first
    let accessToken = event.cookies.get('sb-access-token');
    let refreshToken = event.cookies.get('sb-refresh-token');

    // If not found in cookies, try Authorization header (Bearer <accessToken>; Refresh <refreshToken>)
    if (!accessToken) {
      const authHeader = event.request.headers.get('authorization');
      if (authHeader) {
        // Support: "Bearer <accessToken>" or "Bearer <accessToken>; Refresh <refreshToken>"
        const parts = authHeader.split(';').map(p => p.trim());
        const bearer = parts.find(p => p.toLowerCase().startsWith('bearer '));
        if (bearer) {
          accessToken = bearer.substring(7).trim();
        }
        const refresh = parts.find(p => p.toLowerCase().startsWith('refresh '));
        if (refresh) {
          refreshToken = refresh.substring(8).trim();
        }
      }
    }

    if (!accessToken) {
      return null;
    }

    // Set the session on the server-side client
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Try to refresh the token if we have a refresh token
      if (refreshToken) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });

          if (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear invalid cookies
            event.cookies.delete('sb-access-token', { path: '/' });
            event.cookies.delete('sb-refresh-token', { path: '/' });
            return null;
          }

          if (!refreshData.session) {
            console.error('Token refresh returned no session');
            // Clear invalid cookies
            event.cookies.delete('sb-access-token', { path: '/' });
            event.cookies.delete('sb-refresh-token', { path: '/' });
            return null;
          }

          // Update cookies with new tokens
          event.cookies.set('sb-access-token', refreshData.session.access_token, {
            path: '/',
            maxAge: refreshData.session.expires_in || 3600, // Default 1 hour
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });

          if (refreshData.session.refresh_token) {
            event.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7 days
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          }

          return {
            id: refreshData.session.user.id,
            email: refreshData.session.user.email
          };
        } catch (refreshError) {
          console.error('Token refresh exception:', refreshError);
          // Clear cookies on any refresh failure
          event.cookies.delete('sb-access-token', { path: '/' });
          event.cookies.delete('sb-refresh-token', { path: '/' });
          return null;
        }
      } else {
        // Clear access token cookie if no refresh token
        event.cookies.delete('sb-access-token', { path: '/' });
        return null;
      }

      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Create authenticated Supabase client for the current user
 */
export async function createAuthenticatedClient(event: RequestEvent) {
  const user = await getAuthenticatedUser(event);
  if (!user) {
    return null;
  }

  // Get tokens from cookies or Authorization header (same logic as getAuthenticatedUser)
  let accessToken = event.cookies.get('sb-access-token');
  let refreshToken = event.cookies.get('sb-refresh-token');
  if (!accessToken) {
    const authHeader = event.request.headers.get('authorization');
    if (authHeader) {
      const parts = authHeader.split(';').map(p => p.trim());
      const bearer = parts.find(p => p.toLowerCase().startsWith('bearer '));
      if (bearer) {
        accessToken = bearer.substring(7).trim();
      }
      const refresh = parts.find(p => p.toLowerCase().startsWith('refresh '));
      if (refresh) {
        refreshToken = refresh.substring(8).trim();
      }
    }
  }
  if (!accessToken) {
    return null;
  }

  // Create a client with the user's session
  const authenticatedSupabase = supabase;
  await authenticatedSupabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || ''
  });

  return {
    client: authenticatedSupabase,
    user
  };
}

/**
 * Require authentication middleware
 */
export async function requireAuth(event: RequestEvent): Promise<{
  user: AuthUser;
  client: typeof supabase;
} | Response> {
  const authResult = await createAuthenticatedClient(event);
  
  if (!authResult) {
    return new Response(
      JSON.stringify({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return authResult;
}