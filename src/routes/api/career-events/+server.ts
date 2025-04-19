import { createClient } from '@vercel/edge-config';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';
import { isAuthenticated, validateCsrfToken } from '../../../server/utils/authUtils';

if (dev) {
  dotenv.config({ path: '.env.local' });
}

if (!process.env.EDGE_CONFIG) {
  console.error('Missing EDGE_CONFIG environment variable. Please set it in your .env.local file.');
}

const edgeConfig = createClient(process.env.EDGE_CONFIG || '');

export const GET: RequestHandler = async ({ cookies, request }) => {
  try {
    // Check for authentication using the shared utility
    if (!isAuthenticated(cookies)) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const careerEvents = await edgeConfig.get('careerEvents');

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
  // Check for authentication using the shared utility
  if (!isAuthenticated(cookies)) {
    return json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // CSRF protection using shared utility
    const requestData = await request.json();
    const requestCsrfToken = requestData.csrfToken;

    if (!validateCsrfToken(cookies, requestCsrfToken)) {
      return json({ error: 'Invalid request' }, { status: 403 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error processing request:', error);
    return json({ error: 'An error occurred while processing your request' }, { status: 500 });
  }
}
