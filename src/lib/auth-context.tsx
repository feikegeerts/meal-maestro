"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { authClient } from "./auth/client";
import type { UserProfile, ProfileUpdatePayload } from "./profile-types";

interface AuthContextType {
  user: { id: string; email?: string; name?: string; image?: string } | null;
  session: { id: string; expiresAt: Date } | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: (options?: { redirectPath?: string | null }) => Promise<void>;
  // TODO: Re-enable when Neon Auth ships webhook support for custom email templates
  // signInWithMagicLink: (
  //   email: string,
  //   options?: { redirectPath?: string | null; locale?: string | null },
  // ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdatePayload) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: sessionData, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const user = sessionData?.user
    ? {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name ?? undefined,
        image: sessionData.user.image ?? undefined,
      }
    : null;

  const session = sessionData?.session
    ? {
        id: sessionData.session.id,
        expiresAt: sessionData.session.expiresAt,
      }
    : null;

  // Fetch profile when user changes
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setProfile(data);
        } else {
          if (!cancelled) setProfile(null);
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signInWithGoogle = useCallback(
    async (options?: { redirectPath?: string | null }) => {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: options?.redirectPath ?? "/recipes",
      });
    },
    [],
  );

  // TODO: Re-enable when Neon Auth ships webhook support for custom email templates.
  // See: https://www.better-auth.com/docs/concepts/email
  // const signInWithMagicLink = useCallback(
  //   async (
  //     email: string,
  //     _options?: { redirectPath?: string | null; locale?: string | null },
  //   ): Promise<{ error?: string }> => {
  //     try {
  //       const { error } = await authClient.emailOtp.sendVerificationOtp({
  //         email,
  //         type: "sign-in",
  //       });
  //       if (error) {
  //         return { error: error.message ?? "Failed to send magic link" };
  //       }
  //       return {};
  //     } catch {
  //       return { error: "Failed to send magic link" };
  //     }
  //   },
  //   [],
  // );

  const signOut = useCallback(async () => {
    setProfile(null);
    await authClient.signOut();
  }, []);

  const updateProfile = useCallback(
    async (updates: ProfileUpdatePayload) => {
      if (!user?.id) return false;

      try {
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          const updatedProfile = await response.json();
          setProfile(updatedProfile);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [user?.id],
  );

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: isPending || profileLoading,
    signInWithGoogle,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  return { user, loading };
}
