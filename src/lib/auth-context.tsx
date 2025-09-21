"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { User, Session, AuthError, OAuthResponse } from "@supabase/supabase-js";
import { auth, supabase } from "./supabase";
import { profileService } from "./profile-service";
import type { UserProfile, ProfileUpdatePayload } from "./profile-types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{
    data: OAuthResponse["data"] | null;
    error: AuthError | null;
  }>;
  signInWithMagicLink: (email: string) => Promise<{
    data: { user: User | null; session: Session | null } | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: ProfileUpdatePayload) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Global refresh lock to prevent concurrent refresh attempts
  const refreshLockRef = useRef<Promise<boolean> | null>(null);
  const lastRefreshAttempt = useRef<number>(0);
  const REFRESH_COOLDOWN = 5000; // 5 second cooldown between refresh attempts

  // Safe refresh with global lock to prevent race conditions
  const performSafeRefresh = useCallback(async (): Promise<boolean> => {
    const now = Date.now();

    // If a refresh is already in progress, wait for it to complete
    if (refreshLockRef.current) {
      try {
        return await refreshLockRef.current;
      } catch (error) {
        console.error("Error waiting for existing refresh:", error);
        return false;
      }
    }

    // Cooldown check to prevent rapid refresh attempts
    if (now - lastRefreshAttempt.current < REFRESH_COOLDOWN) {
      return false;
    }

    lastRefreshAttempt.current = now;

    // Start a new refresh operation
    const refreshPromise = async (): Promise<boolean> => {
      try {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshData.session && !refreshError) {
          await syncTokensWithServer(refreshData.session);
          return true;
        }

        // Handle specific "Already Used" error gracefully
        if (refreshError?.message?.includes("Already Used")) {
          // Try to get the current session (another process may have refreshed it)
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (session && !sessionError) {
            // Session exists but may not be synced with server - sync it
            await syncTokensWithServer(session);
            return true;
          }
        }

        console.error(
          "Token refresh failed:",
          refreshError?.message,
          refreshError?.status
        );
        return false;
      } catch (error) {
        console.error("Token refresh exception:", error);
        return false;
      } finally {
        // Clear the lock when done
        refreshLockRef.current = null;
      }
    };

    // Store the promise so other calls can wait for it
    refreshLockRef.current = refreshPromise();
    return await refreshLockRef.current;
  }, []);

  // Session health monitoring with race condition protection
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return false;
      }

      // Check if token is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - currentTime : 0;

      if (timeUntilExpiry <= 300) {
        // 5 minutes - proactively refresh
        return await performSafeRefresh();
      }

      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }, [performSafeRefresh]);

  // Sync tokens with server for HTTP-only cookie auth
  const syncTokensWithServer = async (session: Session, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error("Token sync failed on server");
        }

        return;
      } catch (error) {
        console.error(
          `Failed to sync tokens with server (attempt ${attempt}/${retries}):`,
          error
        );

        if (attempt === retries) {
          console.error(
            "All token sync attempts failed. Session may become invalid for server-side operations."
          );
          return;
        }

        // Exponential backoff: wait 1s, then 2s, then 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { session } = await auth.getCurrentSession();
        setSession(session);
        setUser(session?.user ?? null);

        // Sync tokens with server for API access
        if (session) {
          await syncTokensWithServer(session);
        }

        // Fetch user profile if user exists
        if (session?.user) {
          try {
            const userProfile = await profileService.getUserProfile(
              session.user.id
            );
            setProfile(userProfile);
          } catch (error) {
            // This is expected for newly created users as the profile trigger might not have completed yet
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Sync tokens with server whenever session changes or is refreshed
        if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          await syncTokensWithServer(session);
        }

        // Handle signed out state - clear server cookies
        if (event === "SIGNED_OUT") {
          try {
            await fetch("/api/auth/sign-out", { method: "POST" });
          } catch (error) {
            console.error("Failed to clear server cookies on sign out:", error);
          }
        }

        if (session?.user) {
          const fetchProfile = async () => {
            try {
              const userProfile = await profileService.getUserProfile(
                session.user.id
              );
              setProfile(userProfile);
            } catch (error) {
              // For newly created users, the profile might not exist yet due to trigger timing
              // This is normal and expected behavior, not an error
              setProfile(null);
            }
          };

          setTimeout(fetchProfile, 200);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Separate effect for health check management
  useEffect(() => {
    let healthCheckInterval: NodeJS.Timeout | null = null;

    if (process.env.NODE_ENV === "production" && session && user) {
      healthCheckInterval = setInterval(async () => {
        const isValid = await validateSession();
        if (!isValid) {
          await signOut();
        }
      }, 10 * 60 * 1000); // Check every 10 minutes
    }

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [session?.access_token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await auth.signInWithGoogle();
      return result;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      return { data: null, error: error as AuthError };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    // Don't set global loading state for magic link email sending
    // The form component handles its own loading state
    try {
      const result = await auth.signInWithMagicLink(email);
      return result;
    } catch (error) {
      console.error("Error signing in with magic link:", error);
      return { data: null, error: error as AuthError };
    }
  };

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // Clear server-side cookies first
      try {
        await fetch("/api/auth/sign-out", { method: "POST" });
      } catch (cookieError) {
        console.error("Failed to clear server cookies:", cookieError);
        // Continue with client-side sign out even if server cookies fail
      }

      // Clear local state immediately
      setSession(null);
      setUser(null);
      setProfile(null);

      // Then sign out from Supabase client
      const result = await auth.signOut();
      return result;
    } catch (error) {
      console.error("Error signing out:", error);

      // Even if sign out fails, clear local state
      setSession(null);
      setUser(null);
      setProfile(null);

      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: ProfileUpdatePayload) => {
      if (!user?.id) return false;

      try {
        const updatedProfile = await profileService.updateUserProfile(
          user.id,
          updates
        );
        if (updatedProfile) {
          setProfile(updatedProfile);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating profile:", error);
        return false;
      }
    },
    [user?.id]
  );

  const value = {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Could redirect to login page or show login modal
    }
  }, [user, loading]);

  return { user, loading };
}
