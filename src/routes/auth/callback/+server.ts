import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/services/supabaseClient.js';

export const GET = async ({ url, cookies }) => {
  console.log('Auth callback received:', url.searchParams.toString());
  
  const code = url.searchParams.get('code');
  const error_param = url.searchParams.get('error');
  const next = url.searchParams.get('next') ?? '/';

  // Handle OAuth errors from provider
  if (error_param) {
    console.error('OAuth provider error:', error_param);
    throw redirect(303, `/?auth_error=${encodeURIComponent(error_param)}`);
  }

  if (code) {
    try {
      console.log('Exchanging authorization code for session...');
      
      // Use Supabase to exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Session exchange error:', error.message);
        throw redirect(303, `/?auth_error=${encodeURIComponent(error.message)}`);
      }
      
      if (data.session) {
        console.log('Session created successfully for:', data.user?.email);
        
        // Set session cookies for server-side API access
        cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          maxAge: data.session.expires_in,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        
        if (data.session.refresh_token) {
          cookies.set('sb-refresh-token', data.session.refresh_token, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
        }
        
        console.log('Cookies set successfully');
        
        // Successful authentication - redirect to intended page
        throw redirect(303, next);
      } else {
        console.error('No session data received from Supabase');
        throw redirect(303, '/?auth_error=no_session');
      }
    } catch (err) {
      // Handle any unexpected errors
      if (err instanceof Response) {
        // This is a redirect, let it through
        throw err;
      }
      console.error('Unexpected callback error:', err);
      throw redirect(303, '/?auth_error=callback_failed');
    }
  }

  // No authorization code provided
  console.error('No authorization code in callback');
  throw redirect(303, '/?auth_error=no_code');
};