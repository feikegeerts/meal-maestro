import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { access_token, refresh_token, expires_in } = await request.json();
    
    if (!access_token) {
      return json({ error: 'Access token required' }, { status: 400 });
    }

    // Set session cookies for server-side API access
    cookies.set('sb-access-token', access_token, {
      path: '/',
      maxAge: expires_in || 3600, // Default 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    if (refresh_token) {
      cookies.set('sb-refresh-token', refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Error setting session cookies:', error);
    return json({ error: 'Failed to set session cookies' }, { status: 500 });
  }
};