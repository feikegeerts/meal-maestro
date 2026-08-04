"use client";

import "@/app/[locale]/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/components/ui/page-loading";
import { authClient } from "@/lib/auth/client";
import { routing } from "@/app/i18n/routing";
import {
  resolveLocaleAwareNavigationTarget,
  resolveLocaleAwarePath,
} from "@/lib/auth-redirect";

/**
 * OAuth callback page.
 *
 * Neon Auth handles the actual OAuth token exchange in the API route handler.
 * This page checks for an active session after the redirect and sends the user
 * to the recipes page (or shows an error).
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const getRedirectTarget = () => {
      const searchParams = new URLSearchParams(window.location.search);
      return resolveLocaleAwareNavigationTarget({
        path: searchParams.get("redirectTo"),
        locale: searchParams.get("locale"),
        availableLocales: routing.locales,
        defaultLocale: routing.defaultLocale,
      });
    };

    const redirectToLoginWithError = (error: string) => {
      const target = getRedirectTarget();
      const loginPath = resolveLocaleAwarePath({
        path: "/login",
        locale: target.locale,
        availableLocales: routing.locales,
        defaultLocale: routing.defaultLocale,
      }).path;
      const params = new URLSearchParams({
        error,
        redirectTo: target.pathname,
      });

      router.replace(`${loginPath}?${params.toString()}`);
    };

    const checkSession = async () => {
      // Give Neon Auth a moment to set the session cookie
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (cancelled) return;

      try {
        const { data: session } = await authClient.getSession();
        if (session?.user) {
          router.replace(getRedirectTarget().path);
        } else {
          redirectToLoginWithError("auth_error");
        }
      } catch {
        redirectToLoginWithError("auth_error");
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="font-sans">
      <PageLoading text="Completing authentication..." />
    </div>
  );
}
