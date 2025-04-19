/**
 * This file contains constants that are safe to use on both client and server
 */

// Cookie names that need to be accessible to the client
export const CSRF_COOKIE_NAME = 'timeline_csrf';

// Rate limiting constants shared between client and server
export const MAX_ATTEMPTS = 5;
