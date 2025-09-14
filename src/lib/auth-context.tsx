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
import { profileService, UserProfile } from "./profile-service";
import { tokenManager } from "./token-manager";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  authReady: boolean;
  signInWithGoogle: () => Promise<{
    data: OAuthResponse["data"] | null;
    error: AuthError | null;
  }>;
  signInWithMagicLink: (email: string) => Promise<{
    data: { user: User | null; session: Session | null } | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
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
  const [authReady, setAuthReady] = useState(false);

  // Initialization guards to prevent double mounting in development
  const initializationRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  // Development logging helper
  const logAuthEvent = useCallback((event: string, details?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Auth] ${event}`, details || '');
    }
  }, []);

  // Production-safe error logging
  const logAuthError = useCallback((error: unknown, context: string) => {
    if (process.env.NODE_ENV === 'production') {
      // Log generic error info in production
      console.error(`[Auth] ${context}: Authentication error`);
    } else {
      // Full error details in development
      console.error(`[Auth] ${context}:`, error);
    }
  }, []);

  // Session validation using TokenManager
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const session = await tokenManager.getValidSession();
      return !!session;
    } catch (error) {
      logAuthError(error, "Session validation error");
      return false;
    }
  }, [logAuthError]);

  // Fetch user profile safely
  const fetchUserProfile = useCallback(async (userId: string, retryCount = 0): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      const userProfile = await profileService.getUserProfile(userId);
      if (mountedRef.current) {
        setProfile(userProfile);
      }
    } catch (error) {
      // For newly created users, the profile might not exist yet
      logAuthEvent('Profile fetch failed', { userId, error: (error as Error).message });

      // Retry once after a delay for newly created users
      if (retryCount === 0) {
        setTimeout(() => {
          if (mountedRef.current) {
            fetchUserProfile(userId, 1);
          }
        }, 1000);
      } else {
        setProfile(null);
      }
    }
  }, [logAuthEvent]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Prevent double initialization in development mode
    if (initializationRef.current) {
      logAuthEvent('Skipping duplicate auth initialization');
      return;
    }
    initializationRef.current = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        logAuthEvent('Starting auth initialization');
        const { session } = await auth.getCurrentSession();

        if (!mountedRef.current) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Use TokenManager to ensure tokens are properly synced
        if (session) {
          logAuthEvent('Initial session found, validating with TokenManager');
          await tokenManager.getValidSession();
        }

        // Fetch user profile if user exists
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        logAuthError(error, "Error getting initial session");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        if (!mountedRef.current) return;

        logAuthEvent('Auth state change', { event, hasSession: !!session });

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setAuthReady(true);

        // Use TokenManager for token sync
        if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          await tokenManager.getValidSession();
        }

        // Handle signed out state - clear server cookies
        if (event === "SIGNED_OUT") {
          try {
            await fetch("/api/auth/sign-out", { method: "POST" });
          } catch (error) {
            logAuthError(error, "Failed to clear server cookies on sign out");
          }
        }

        if (session?.user && mountedRef.current) {
          await fetchUserProfile(session.user.id);
        } else if (mountedRef.current) {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, logAuthEvent, logAuthError]);

  // Separate effect for health check management
  useEffect(() => {
    if (!authReady || !session || !user) {
      return;
    }

    let healthCheckInterval: NodeJS.Timeout | null = null;

    if (process.env.NODE_ENV === "production") {
      healthCheckInterval = setInterval(async () => {
        if (!mountedRef.current) return;

        const isValid = await validateSession();
        if (!isValid && mountedRef.current) {
          await signOut();
        }
      }, 10 * 60 * 1000); // Check every 10 minutes
    }

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [authReady, session?.access_token, user?.id, validateSession]); // eslint-disable-line react-hooks/exhaustive-deps

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
        logAuthError(cookieError, "Failed to clear server cookies");
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
      logAuthError(error, "Error signing out");

      // Even if sign out fails, clear local state
      setSession(null);
      setUser(null);
      setProfile(null);

      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  }, [logAuthError]);

  const value = {
    user,
    session,
    profile,
    loading,
    authReady,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
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
