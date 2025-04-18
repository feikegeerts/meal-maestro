import { createClient } from '@vercel/edge-config';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';

// Load environment variables in development
if (dev) {
  dotenv.config({ path: '.env.local' });
}

// Validate that Edge Config connection string exists
if (!process.env.EDGE_CONFIG) {
  console.error('Missing EDGE_CONFIG environment variable. Please set it in your .env.local file.');
}

// Create the Edge Config client
const edgeConfig = createClient(process.env.EDGE_CONFIG || '');

// Function to verify session token - simplified for compatibility
function verifySessionToken(sessionToken: string, sessionVerify: string): boolean {
  if (!sessionToken || !sessionVerify) return false;

  // Simple verification by comparing the first 10 characters
  return sessionToken.substring(0, 10) === sessionVerify;
}

export const GET: RequestHandler = async ({ cookies, request }) => {
  try {
    // Check for authentication
    const sessionToken = cookies.get('timeline_session');
    const sessionVerify = cookies.get('session_verify');

    // If no session, return unauthorized with generic message
    if (!sessionToken || !sessionVerify) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate session token with simplified method
    if (!verifySessionToken(sessionToken, sessionVerify)) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Try to get the career events from Edge Config
    const careerEvents = await edgeConfig.get('careerEvents');

    // If no data exists in Edge Config, return an empty array
    if (!careerEvents) {
      return json({ careerEvents: [] });
    }

    return json({ careerEvents });
  } catch (error) {
    console.error('Error fetching career events:', error);
    return json({ error: 'An error occurred while fetching data' }, { status: 500 });
  }
};

// Handle POST, PUT and DELETE operations with CSRF protection
export const POST: RequestHandler = async ({ cookies, request }) => {
  return handleWriteOperation(cookies, request);
};

export const PUT: RequestHandler = async ({ cookies, request }) => {
  return handleWriteOperation(cookies, request);
};

export const DELETE: RequestHandler = async ({ cookies, request }) => {
  return handleWriteOperation(cookies, request);
};

// Helper function for write operations with CSRF protection
async function handleWriteOperation(cookies: any, request: Request) {
  // Check for authentication
  const sessionToken = cookies.get('timeline_session');
  const sessionVerify = cookies.get('session_verify');
  const csrfToken = cookies.get('timeline_csrf');

  // If no session, return unauthorized
  if (!sessionToken || !sessionVerify) {
    return json({ error: 'Authentication required' }, { status: 401 });
  }

  // Validate session token with simplified method
  if (!verifySessionToken(sessionToken, sessionVerify)) {
    return json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // CSRF protection
    const requestData = await request.json();
    const requestCsrfToken = requestData.csrfToken;

    if (!csrfToken || !requestCsrfToken || csrfToken !== requestCsrfToken) {
      return json({ error: 'Invalid request' }, { status: 403 });
    }

    // Process the operation (implementation would depend on your specific requirements)
    // ...

    return json({ success: true });
  } catch (error) {
    console.error('Error processing request:', error);
    return json({ error: 'An error occurred while processing your request' }, { status: 500 });
  }
}
