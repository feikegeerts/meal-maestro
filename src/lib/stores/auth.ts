import { writable, derived } from 'svelte/store';
import { supabaseBrowser, auth } from '$lib/services/supabaseBrowser.js';
import type { User, Session } from '@supabase/supabase-js';

// Types for our auth state
export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
}

// Create the auth store
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    initialized: false
  });

  return {
    subscribe,
    
    // Initialize auth state
    async initialize() {
      try {
        console.log('Initializing auth state...');
        
        // Set up auth state change listener first
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
          
          if (event === 'SIGNED_IN' && session) {
            await this.setSession(session);
          } else if (event === 'SIGNED_OUT') {
            set({
              user: null,
              session: null,
              profile: null,
              loading: false,
              initialized: true
            });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            await this.setSession(session);
          } else if (event === 'INITIAL_SESSION' && session) {
            await this.setSession(session);
          }
        });
        
        // Get initial session
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
            initialized: true
          });
          return;
        }

        if (session) {
          console.log('Found existing session for:', session.user?.email);
          await this.setSession(session);
        } else {
          console.log('No existing session found');
          set({
            user: null,
            session: null,
            profile: null,
            loading: false,
            initialized: true
          });
        }

      } catch (error) {
        console.error('Error initializing auth:', error);
        set({
          user: null,
          session: null,
          profile: null,
          loading: false,
          initialized: true
        });
      }
    },

    // Set session and fetch user profile
    async setSession(session: Session) {
      try {
        update(state => ({ ...state, loading: true }));
        
        const user = session.user;
        let profile: UserProfile | null = null;

        // Fetch user profile
        if (user) {
          const { data: profileData, error: profileError } = await supabaseBrowser
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
          } else {
            profile = profileData;
          }
        }

        set({
          user,
          session,
          profile,
          loading: false,
          initialized: true
        });

      } catch (error) {
        console.error('Error setting session:', error);
        set({
          user: null,
          session: null,
          profile: null,
          loading: false,
          initialized: true
        });
      }
    },

    // Sign in with Google
    async signInWithGoogle() {
      try {
        update(state => ({ ...state, loading: true }));
        const result = await auth.signInWithGoogle();
        
        if (result.error) {
          update(state => ({ ...state, loading: false }));
          console.error('Google sign-in error:', result.error);
          return { success: false, error: result.error.message };
        }

        return { success: true };
      } catch (error) {
        update(state => ({ ...state, loading: false }));
        console.error('Google sign-in error:', error);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    // Sign out
    async signOut() {
      try {
        update(state => ({ ...state, loading: true }));
        const { error } = await auth.signOut();
        
        if (error) {
          update(state => ({ ...state, loading: false }));
          console.error('Sign out error:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error) {
        update(state => ({ ...state, loading: false }));
        console.error('Sign out error:', error);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    // Update user profile
    async updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>) {
      try {
        const currentState = await new Promise<AuthState>((resolve) => {
          const unsubscribe = subscribe((state) => {
            unsubscribe();
            resolve(state);
          });
        });

        if (!currentState.user) {
          return { success: false, error: 'User not authenticated' };
        }

        const { data, error } = await supabaseBrowser
          .from('user_profiles')
          .update(updates)
          .eq('id', currentState.user.id)
          .select()
          .single();

        if (error) {
          console.error('Profile update error:', error);
          return { success: false, error: error.message };
        }

        // Update local state
        update(state => ({
          ...state,
          profile: data
        }));

        return { success: true, profile: data };
      } catch (error) {
        console.error('Profile update error:', error);
        return { success: false, error: 'An unexpected error occurred' };
      }
    }
  };
}

// Export the auth store instance
export const authStore = createAuthStore();

// Derived stores for common use cases
export const user = derived(authStore, ($authStore) => $authStore.user);
export const session = derived(authStore, ($authStore) => $authStore.session);
export const userProfile = derived(authStore, ($authStore) => $authStore.profile);
export const isAuthenticated = derived(authStore, ($authStore) => !!$authStore.user);
export const isLoading = derived(authStore, ($authStore) => $authStore.loading);
export const isInitialized = derived(authStore, ($authStore) => $authStore.initialized);