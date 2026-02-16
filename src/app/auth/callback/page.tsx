"use client";

import "@/app/[locale]/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/components/ui/page-loading";
import { authClient } from "@/lib/auth/client";

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
    const checkSession = async () => {
      // Give Neon Auth a moment to set the session cookie
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const { data: session } = await authClient.getSession();
        if (session?.user) {
          router.replace("/nl/recipes");
        } else {
          router.replace("/nl?error=auth_error");
        }
      } catch {
        router.replace("/nl?error=auth_error");
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="font-sans">
      <PageLoading text="Completing authentication..." />
    </div>
  );
}
