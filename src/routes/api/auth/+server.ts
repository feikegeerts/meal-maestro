import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';
import { createHash, randomBytes } from 'crypto';
import type { AuthRequest } from '$lib/types';

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

// Simple function to hash the password with a more secure approach
function hashPassword(password: string): string {
  // This function maintains compatibility with your existing hashed password
  return createHash('sha256').update(password).digest('hex');
}

// Function for more secure hashing (for session tokens)
function secureHash(value: string): string {
  const salt = process.env.PASSWORD_SALT || 'timeline-salt-value';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

// Rate limiting implementation
const ipAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

// Function to generate a CSRF token
function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    // Implement rate limiting
    const clientIp = getClientAddress();
    const now = Date.now();

    // Check if the IP is currently locked out
    if (ipAttempts.has(clientIp)) {
      const attempt = ipAttempts.get(clientIp)!;

      // If the IP has too many attempts and is within the lockout period
      if (attempt.count >= MAX_ATTEMPTS && now - attempt.timestamp < LOCKOUT_TIME) {
        return json(
          {
            success: false,
            message: 'Too many login attempts. Please try again later.',
          },
          { status: 429 }
        );
      }

      // Reset if lockout period has passed
      if (now - attempt.timestamp > LOCKOUT_TIME) {
        ipAttempts.set(clientIp, { count: 0, timestamp: now });
      }
    } else {
      ipAttempts.set(clientIp, { count: 0, timestamp: now });
    }

    const data = (await request.json()) as AuthRequest;
    const { password, csrfToken: existingCsrfToken } = data;

    if (!password) {
      // Increment failed attempt count
      const attempt = ipAttempts.get(clientIp)!;
      ipAttempts.set(clientIp, { count: attempt.count + 1, timestamp: now });

      return json({ success: false, message: 'Authentication failed' }, { status: 400 });
    }

    // Get the stored password hash from environment variables
    const correctPasswordHash = process.env.TIMELINE_PASSWORD;

    if (!correctPasswordHash) {
      console.error('Server missing password configuration');
      return json({ success: false, message: 'Authentication failed' }, { status: 500 });
    }

    // Hash the submitted password
    const submittedPasswordHash = hashPassword(password);

    let authenticated = false;

    // Compare the hashed password with the stored hash
    if (submittedPasswordHash === correctPasswordHash) {
      authenticated = true;
    }
    // Try directly comparing with the stored hash (in case the password is already stored unhashed)
    else if (password === correctPasswordHash) {
      authenticated = true;
    }

    if (!authenticated) {
      // Increment failed attempt count
      const attempt = ipAttempts.get(clientIp)!;
      ipAttempts.set(clientIp, { count: attempt.count + 1, timestamp: now });

      return json({ success: false, message: 'Authentication failed' }, { status: 401 });
    }

    // Generate a CSRF token for form submissions
    const csrfToken = generateCsrfToken();

    // Generate a session token with improved entropy
    const sessionToken = createHash('sha256')
      .update(`${password}-${Date.now()}-${randomBytes(32).toString('hex')}`)
      .digest('hex');

    // Reset failed attempts on successful login
    ipAttempts.delete(clientIp);

    // Set the session token in a cookie
    cookies.set('timeline_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: !dev, // Only send over HTTPS in production
      maxAge: 60 * 60 * 4, // 4 hours
      sameSite: 'strict',
    });

    // Store a verification token - using a shortened version of the session token itself for compatibility
    cookies.set('session_verify', sessionToken.substring(0, 10), {
      path: '/',
      httpOnly: true,
      secure: !dev,
      maxAge: 60 * 60 * 4,
      sameSite: 'strict',
    });

    // Set CSRF token in a cookie (accessible to JavaScript)
    cookies.set('timeline_csrf', csrfToken, {
      path: '/',
      httpOnly: false,
      secure: !dev,
      maxAge: 60 * 60 * 4,
      sameSite: 'strict',
    });

    return json({
      success: true,
      csrfToken: csrfToken,
    });
  } catch (error) {
    console.error('Error in authentication:', error);
    return json({ success: false, message: 'Authentication failed' }, { status: 500 });
  }
};
