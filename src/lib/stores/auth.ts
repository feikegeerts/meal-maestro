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
        
        // Set up auth state change listener first
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
          
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
          } else if (event === 'INITIAL_SESSION' && !session) {
            set({
              user: null,
              session: null,
              profile: null,
              loading: false,
              initialized: true
            });
          }
        });
        
        // Set a timeout to ensure we initialize even if no session event comes
        setTimeout(() => {
          // Check if we're still not initialized after 3 seconds
          const currentState = new Promise<AuthState>((resolve) => {
            let unsubscribe: (() => void) | undefined;
            unsubscribe = subscribe((state) => {
              if (unsubscribe) unsubscribe();
              resolve(state);
            });
          });
          
          currentState.then(state => {
            if (!state.initialized) {
              set({
                user: null,
                session: null,
                profile: null,
                loading: false,
                initialized: true
              });
            }
          });
        }, 3000);


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

        // Fetch or create user profile with retry logic
        if (user) {
          // Try to fetch profile, but don't block auth if it fails on first attempt
          const fetchProfile = async (retryCount = 0): Promise<void> => {
            try {
              const { data: profileData, error: profileError } = await Promise.race([
                supabaseBrowser
                  .from('user_profiles')
                  .select('*')
                  .eq('id', user.id)
                  .single(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Profile fetch timeout')), retryCount === 0 ? 3000 : 8000)
                )
              ]) as any;
              if (profileError && profileError.code === 'PGRST116') {
                // Profile doesn't exist, create it
                const { data: newProfile, error: createError } = await supabaseBrowser
                  .from('user_profiles')
                  .insert({
                    id: user.id,
                    email: user.email,
                    display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
                    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
                  })
                  .select()
                  .single();

                profile = newProfile;
                update(state => ({ ...state, profile: newProfile }));
              } else if (profileError) {
                console.error('🔥 AUTH STORE: Error fetching user profile:', profileError);
                if (retryCount === 0) {
                  throw new Error('Retry needed');
                }
              } else {
                profile = profileData;
                // Update the store with the fetched profile
                update(state => ({ ...state, profile: profileData }));
              }
            } catch (profileFetchError) {
              console.error('🔥 AUTH STORE: Profile fetch error:', profileFetchError);
              if (
                retryCount === 0 &&
                typeof profileFetchError === 'object' &&
                profileFetchError !== null &&
                'message' in profileFetchError &&
                (profileFetchError as { message?: string }).message !== 'Retry needed'
              ) {
                setTimeout(() => fetchProfile(1), 2000);
              } else {
                profile = null;
              }
            }
          };

          // Start profile fetch but don't await it - let auth continue
          fetchProfile();
        }

        // Always set the session, even if profile operations fail
        set({
          user,
          session,
          profile,
          loading: false,
          initialized: true
        });


      } catch (error) {
        console.error('Error setting session:', error);
        // Even if there's an error, we should still initialize
        set({
          user: session?.user || null,
          session: session || null,
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

        // Also clear server-side session cookies
        try {
          await fetch('/api/auth/sign-out', {
            method: 'POST'
          });
          
        } catch (cookieError) {
          console.error('Error clearing session cookies:', cookieError);
          // Continue anyway - client-side sign out succeeded
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
          let unsubscribe: (() => void) | undefined;
          unsubscribe = subscribe((state) => {
            if (unsubscribe) unsubscribe();
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