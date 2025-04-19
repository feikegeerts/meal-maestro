import { dev } from '$app/environment';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import type { Cookies } from '@sveltejs/kit';

// Constants
export const SALT_ROUNDS = 10;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
export const SESSION_EXPIRY = 60 * 60 * 4; // 4 hours in seconds

// Session cookie names
export const SESSION_COOKIE_NAME = 'timeline_session';
export const SESSION_VERIFY_COOKIE_NAME = 'session_verify';
export const CSRF_COOKIE_NAME = 'timeline_csrf';

// Rate limiting storage
export const ipAttempts = new Map<string, { count: number; timestamp: number }>();

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return generateSecureToken();
}

/**
 * Check if a stored password hash is in valid bcrypt format
 */
export function isValidBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$');
}

/**
 * Verify a session token pair
 * This method performs a comparison of the session token with the verification token.
 */
export function verifySessionToken(sessionToken: string, sessionVerify: string): boolean {
  if (!sessionToken || !sessionVerify) return false;
  return sessionToken === sessionVerify;
}

/**
 * Set authentication cookies after successful login
 */
export async function setAuthCookies(cookies: Cookies, password: string): Promise<string> {
  // Generate a session token with improved entropy
  const sessionToken = await hashPassword(`${password}-${Date.now()}-${generateSecureToken()}`);

  // Generate a CSRF token
  const csrfToken = generateCsrfToken();

  // Set the session token in a cookie
  cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    path: '/',
    httpOnly: true,
    secure: !dev, // Only send over HTTPS in production
    maxAge: SESSION_EXPIRY,
    sameSite: 'strict',
  });

  // Store a verification token
  cookies.set(SESSION_VERIFY_COOKIE_NAME, sessionToken.substring(0, 10), {
    path: '/',
    httpOnly: true,
    secure: !dev,
    maxAge: SESSION_EXPIRY,
    sameSite: 'strict',
  });

  // Set CSRF token in a cookie (accessible to JavaScript)
  cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    path: '/',
    httpOnly: false,
    secure: !dev,
    maxAge: SESSION_EXPIRY,
    sameSite: 'strict',
  });

  return csrfToken;
}

/**
 * Check if the request is authenticated by validating session cookies
 */
export function isAuthenticated(cookies: Cookies): boolean {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME);
  const sessionVerify = cookies.get(SESSION_VERIFY_COOKIE_NAME);

  if (!sessionToken || !sessionVerify) {
    return false;
  }

  return verifySessionToken(sessionToken, sessionVerify);
}

/**
 * Validate CSRF token from a request against the stored cookie
 */
export function validateCsrfToken(cookies: Cookies, requestCsrfToken: string | undefined): boolean {
  const storedCsrfToken = cookies.get(CSRF_COOKIE_NAME);

  if (!storedCsrfToken || !requestCsrfToken) {
    return false;
  }

  return storedCsrfToken === requestCsrfToken;
}

/**
 * Manage rate limiting for login attempts
 * Returns true if the request is allowed, false if it's rate-limited
 */
export function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();

  if (ipAttempts.has(clientIp)) {
    const attempt = ipAttempts.get(clientIp)!;

    // If the IP has too many attempts and is within the lockout period
    if (attempt.count >= MAX_ATTEMPTS && now - attempt.timestamp < LOCKOUT_TIME) {
      return false;
    }

    // Reset if lockout period has passed
    if (now - attempt.timestamp > LOCKOUT_TIME) {
      ipAttempts.set(clientIp, { count: 0, timestamp: now });
    }
  } else {
    ipAttempts.set(clientIp, { count: 0, timestamp: now });
  }

  return true;
}

/**
 * Increment the failed attempt counter for an IP
 */
export function incrementFailedAttempts(clientIp: string): void {
  const now = Date.now();

  if (ipAttempts.has(clientIp)) {
    const attempt = ipAttempts.get(clientIp)!;
    ipAttempts.set(clientIp, { count: attempt.count + 1, timestamp: now });
  } else {
    ipAttempts.set(clientIp, { count: 1, timestamp: now });
  }
}

/**
 * Reset failed attempts for an IP after successful login
 */
export function resetFailedAttempts(clientIp: string): void {
  ipAttempts.delete(clientIp);
}
