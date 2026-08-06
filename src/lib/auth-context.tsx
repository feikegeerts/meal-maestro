"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth/client";
import type { UserProfile, ProfileUpdatePayload } from "./profile-types";

const SESSION_REFRESH_THROTTLE_MS = 60 * 1000;
const AUTHENTICATED_QUERY_KEY_PREFIXES = [
  ["user-profile"],
  ["recipes"],
  ["recipe"],
  ["shopping-list"],
  ["custom-units"],
  ["partnerships"],
  ["user-costs"],
] as const;

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
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);
  const lastSessionRefreshAt = useRef(0);
  const sessionRefreshInFlight = useRef<Promise<void> | null>(null);
  const {
    data: sessionData,
    isPending,
    isRefetching,
    refetch: refetchSession,
  } = authClient.useSession();

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
      sessionData?.user,
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
    [sessionData?.session],
  );

  const clearAuthenticatedQueries = useCallback(() => {
    for (const queryKey of AUTHENTICATED_QUERY_KEY_PREFIXES) {
      queryClient.removeQueries({ queryKey });
    }
  }, [queryClient]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousId = previousUserId.current;

    if (previousId && previousId !== currentUserId) {
      clearAuthenticatedQueries();
    }

    previousUserId.current = currentUserId;
  }, [clearAuthenticatedQueries, user?.id]);

  const refreshSessionOnResume = useCallback(async () => {
    if (!user?.id) return;

    if (sessionRefreshInFlight.current) {
      await sessionRefreshInFlight.current;
      return;
    }

    const now = Date.now();
    if (now - lastSessionRefreshAt.current < SESSION_REFRESH_THROTTLE_MS) {
      return;
    }

    lastSessionRefreshAt.current = now;
    const refreshPromise = (async () => {
      try {
        await refetchSession({ query: { disableCookieCache: true } });
      } catch {
        // Keep the current state during transient offline or network failures.
      }
    })();

    sessionRefreshInFlight.current = refreshPromise;
    try {
      await refreshPromise;
    } finally {
      if (sessionRefreshInFlight.current === refreshPromise) {
        sessionRefreshInFlight.current = null;
      }
    }
  }, [refetchSession, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const handleResume = () => {
      void refreshSessionOnResume();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      }
    };

    window.addEventListener("pageshow", handleResume);
    window.addEventListener("focus", handleResume);
    window.addEventListener("online", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handleResume);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("online", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSessionOnResume, user?.id]);

  const profileQueryKey = ["user-profile", user?.id];

  const { data: profile = null, isLoading: profileLoading } =
    useQuery<UserProfile | null>({
      queryKey: profileQueryKey,
      queryFn: async () => {
        const response = await fetch("/api/user/profile");
        if (!response.ok) return null;
        return response.json() as Promise<UserProfile>;
      },
      enabled: !!user?.id,
      staleTime: 10 * 60 * 1000,
    });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: ProfileUpdatePayload) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) return null;
      return response.json() as Promise<UserProfile>;
    },
    onSuccess: (updatedProfile) => {
      if (updatedProfile) {
        queryClient.setQueryData(profileQueryKey, updatedProfile);
      }
    },
  });

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
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      });
      if (error) {
        return { error: error.message ?? "Failed to sign in" };
      }
      await refetchSession({ query: { disableCookieCache: true } });
      return {};
    },
    [refetchSession],
  );

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await authClient.signUp.email({ name, email, password });
      if (error) {
        return { error: error.message ?? "Failed to create account" };
      }
      await refetchSession({ query: { disableCookieCache: true } });
      return {};
    },
    [refetchSession],
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

  const signOut = useCallback(async () => {
    clearAuthenticatedQueries();
    await authClient.signOut();
  }, [clearAuthenticatedQueries]);

  const updateProfile = useCallback(
    async (updates: ProfileUpdatePayload): Promise<boolean> => {
      if (!user?.id) return false;
      const result = await updateProfileMutation.mutateAsync(updates).catch(() => null);
      return result !== null;
    },
    [user?.id, updateProfileMutation],
  );

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: isPending || isRefetching || profileLoading,
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
