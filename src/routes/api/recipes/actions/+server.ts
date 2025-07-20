import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';

if (dev) {
  dotenv.config({ path: '.env.local' });
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Get query parameters
    const recipeId = url.searchParams.get('recipe_id');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Validate limit
    if (limit <= 0 || limit > 1000) {
      return json({ error: 'Limit must be between 1 and 1000' }, { status: 400 });
    }

    // If everything is valid, return a default response (replace with actual logic as needed)
    return json({ message: 'Success', recipeId, limit });
  } catch (error) {
    console.error('Error fetching action logs:', error);
    return json({ error: 'An error occurred while fetching action logs' }, { status: 500 });
  }
};