import { json } from '@sveltejs/kit';
import { supabase } from '$lib/services/supabaseClient';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Test the connection by using the rpc function to check connection
    const { data, error } = await supabase.rpc('version');

    if (error) {
      console.error('Supabase connection error:', error);
      return json({ 
        success: false, 
        error: error.message,
        connection: 'failed'
      }, { status: 500 });
    }

    return json({ 
      success: true, 
      message: 'Supabase connection successful',
      connection: 'active',
      postgres_version: data,
      supabase_url: process.env.SUPABASE_URL?.replace(/\/.*$/, '') || 'Not set'
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: 'failed'
    }, { status: 500 });
  }
};