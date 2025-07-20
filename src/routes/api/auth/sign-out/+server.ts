import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // Clear session cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    return json({ success: true });
  } catch (error) {
    console.error('Error clearing session cookies:', error);
    return json({ error: 'Failed to clear session cookies' }, { status: 500 });
  }
};