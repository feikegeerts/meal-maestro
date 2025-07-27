"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { User, Session, AuthError, OAuthResponse } from "@supabase/supabase-js";
import { auth, supabase } from "./supabase";
import { profileService, UserProfile } from "./profile-service";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{
    data: OAuthResponse["data"] | null;
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

  // Session health monitoring
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
        try {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshData.session && !refreshError) {
            await syncTokensWithServer(refreshData.session);
            return true;
          }
        } catch (refreshError) {
          console.error("Proactive token refresh failed:", refreshError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    }
  }, []);

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
            "All token sync attempts failed. Session may become invalid."
          );
          return;
        }

        // Exponential backoff: wait 1s, then 2s, then 4s
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
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
          const userProfile = await profileService.getUserProfile(
            session.user.id
          );
          setProfile(userProfile);
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
        // Auth state change tracking can be enabled for debugging if needed

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
          setTimeout(async () => {
            try {
              const userProfile = await profileService.getUserProfile(
                session.user.id
              );
              setProfile(userProfile);
            } catch (error) {
              console.error("Error fetching user profile:", error);
              setProfile(null);
            }
          }, 200); // 200ms delay to let Supabase client settle
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

  const value = {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
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
      console.log("User not authenticated");
    }
  }, [user, loading]);

  return { user, loading };
}
