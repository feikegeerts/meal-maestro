"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
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

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { session } = await auth.getCurrentSession();
        setSession(session);
        setUser(session?.user ?? null);

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
      async (_event, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);

        setLoading(false);

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

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await auth.signOut();
      return result;
    } catch (error) {
      console.error("Error signing out:", error);
      return { error: error as AuthError };
    }
  };

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
