"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<{ error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
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

  const user = useMemo(
    () =>
      sessionData?.user
        ? {
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name ?? undefined,
            image: sessionData.user.image ?? undefined,
          }
        : null,
    [
      sessionData?.user?.id,
      sessionData?.user?.email,
      sessionData?.user?.name,
      sessionData?.user?.image,
    ],
  );

  const session = useMemo(
    () =>
      sessionData?.session
        ? {
            id: sessionData.session.id,
            expiresAt: sessionData.session.expiresAt,
          }
        : null,
    [sessionData?.session?.id, sessionData?.session?.expiresAt],
  );

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

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        return { error: error.message ?? "Failed to sign in" };
      }
      return {};
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) {
        return { error: error.message ?? "Failed to create account" };
      }
      return {};
    },
    [],
  );

  const requestPasswordReset = useCallback(
    async (email: string, redirectTo: string): Promise<{ error?: string }> => {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo });
      if (error) {
        return { error: error.message ?? "Failed to send reset email" };
      }
      return {};
    },
    [],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ error?: string }> => {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        return { error: error.message ?? "Failed to change password" };
      }
      return {};
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
    signInWithEmail,
    signUpWithEmail,
    requestPasswordReset,
    changePassword,
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
