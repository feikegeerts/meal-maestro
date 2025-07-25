import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '../types/supabase.js';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client for browser use with authentication
export const supabaseBrowser = createClient<Database>(
  PUBLIC_SUPABASE_URL, 
  PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disabled because we handle callback manually
      // Configure OAuth flow
      flowType: 'pkce'
    }
  }
);

// Auth helper functions
export const auth = {
  // Sign in with Google with environment-aware redirect
  async signInWithGoogle() {
    // Force localhost for development, use dynamic origin for production
    const redirectTo = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5173/auth/callback'
      : `${window.location.origin}/auth/callback`;
      
    const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });
    
    if (error) {
      console.error('Google OAuth initiation error:', error);
    }
    
    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabaseBrowser.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabaseBrowser.auth.getUser();
    return { user, error };
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabaseBrowser.auth.getSession();
    return { session, error };
  },

  // Subscribe to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabaseBrowser.auth.onAuthStateChange(callback);
  }
};

export default supabaseBrowser;