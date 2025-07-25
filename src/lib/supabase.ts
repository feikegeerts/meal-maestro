import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // Enable for OAuth callback handling
        flowType: "pkce",
      },
    });
  }

  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  },
});

export const auth = {
  async signInWithGoogle() {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const redirectTo = isLocalhost
      ? "http://localhost:3000/auth/callback"
      : `${window.location.origin}/auth/callback`;

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

  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;
