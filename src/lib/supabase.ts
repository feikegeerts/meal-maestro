import { createClient } from "@supabase/supabase-js";
import {
  clearPendingAuthRedirect,
  sanitizeRedirectPath,
  setPendingAuthRedirect,
} from "./auth-redirect";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for OAuth callback handling
    flowType: "pkce",
  },
});

export type AuthRedirectOptions = {
  redirectPath?: string | null;
  locale?: string | null;
};

const buildCallbackUrl = (options?: AuthRedirectOptions) => {
  const origin = window.location.origin || "";
  const callbackUrl = new URL("/auth/callback", origin);

  const sanitizedPath = sanitizeRedirectPath(options?.redirectPath);

  if (sanitizedPath) {
    callbackUrl.searchParams.set("redirectTo", sanitizedPath);
  }

  return callbackUrl.toString();
};

export const auth = {
  async signInWithGoogle(options?: AuthRedirectOptions) {
    const sanitizedPath = sanitizeRedirectPath(options?.redirectPath);
    if (sanitizedPath) {
      setPendingAuthRedirect(sanitizedPath, options?.locale ?? null);
    } else {
      clearPendingAuthRedirect();
    }

    const redirectTo = buildCallbackUrl(options);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("Google OAuth initiation error:", error);
    }

    return { data, error };
  },

  async signInWithMagicLink(email: string, options?: AuthRedirectOptions) {
    const sanitizedPath = sanitizeRedirectPath(options?.redirectPath);
    if (sanitizedPath) {
      setPendingAuthRedirect(sanitizedPath, options?.locale ?? null);
    } else {
      clearPendingAuthRedirect();
    }

    const redirectTo = buildCallbackUrl(options);

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true, // Allow user creation but use magic link template
        data: {
          originUrl: window.location.origin, // Pass origin to webhook for URL generation
          pageUrl: window.location.href, // Pass full page URL for locale detection
        },
      },
    });

    if (error) {
      console.error("Magic link initiation error:", error);
    }

    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  async getCurrentSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;
