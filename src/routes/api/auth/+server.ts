import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';
import type { AuthRequest } from '$lib/types';
import {
  isValidBcryptHash,
  verifyPassword,
  setAuthCookies,
  checkRateLimit,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '../../../server/utils/authUtils';

// Load environment variables in development
if (dev) {
  dotenv.config({ path: '.env.local' });
}

// Make sure a password is set in environment variables
if (!process.env.TIMELINE_PASSWORD) {
  console.error(
    'Missing TIMELINE_PASSWORD environment variable. Please set it in your .env.local file or Vercel environment variables.'
  );
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    // Implement rate limiting
    const clientIp = getClientAddress();

    // Check if the IP is currently rate limited
    if (!checkRateLimit(clientIp)) {
      console.log('[AUTH] Rate limit exceeded');
      return json(
        {
          success: false,
          message: 'Too many login attempts. Please try again later.',
        },
        { status: 429 }
      );
    }

    const data = (await request.json()) as AuthRequest;
    const { password } = data;

    if (!password) {
      // Increment failed attempt count
      incrementFailedAttempts(clientIp);
      console.log('[AUTH] Authentication failed: Missing password');
      return json({ success: false, message: 'Authentication failed' }, { status: 400 });
    }

    // Get the stored password hash from environment variables
    const storedPasswordHash = process.env.TIMELINE_PASSWORD;

    if (!storedPasswordHash) {
      console.error('[AUTH] Server missing password configuration');
      return json({ success: false, message: 'Authentication failed' }, { status: 500 });
    }

    // Verify the password is in bcrypt format
    if (!isValidBcryptHash(storedPasswordHash)) {
      console.error('[AUTH] Password must be stored as a bcrypt hash');
      return json({ success: false, message: 'Invalid password format' }, { status: 500 });
    }

    const authenticated = await verifyPassword(password, storedPasswordHash);

    if (!authenticated) {
      // Increment failed attempt count
      incrementFailedAttempts(clientIp);
      console.log('[AUTH] Invalid password attempt');
      return json({ success: false, message: 'Authentication failed' }, { status: 401 });
    }

    // Reset failed attempts on successful login
    resetFailedAttempts(clientIp);

    // Log successful authentication
    console.log('[AUTH] Authentication successful');

    // Set authentication cookies and get the CSRF token
    const csrfToken = await setAuthCookies(cookies, password);

    return json({
      success: true,
      csrfToken: csrfToken,
    });
  } catch (error) {
    console.error('[AUTH] Error in authentication:', error);
    return json({ success: false, message: 'Authentication failed' }, { status: 500 });
  }
};
