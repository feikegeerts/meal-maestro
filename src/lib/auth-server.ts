import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthUserWithRole extends AuthUser {
  role: UserRole;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Token is invalid/expired - clear stale cookies and return null
      // Let client-side handle the refresh to avoid race conditions
      cookieStore.delete("sb-access-token");
      cookieStore.delete("sb-refresh-token");
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

export async function createAuthenticatedClient() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;
  const refreshToken = cookieStore.get("sb-refresh-token")?.value;

  if (!accessToken) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });

  return {
    client: supabase,
    user,
  };
}

export async function requireAuth() {
  const authResult = await createAuthenticatedClient();

  if (!authResult) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return authResult;
}

export async function getAuthenticatedUserWithRole(): Promise<AuthUserWithRole | null> {
  const authResult = await createAuthenticatedClient();

  if (!authResult) {
    return null;
  }

  const { client, user } = authResult;

  try {
    const { data: profile, error } = await client
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return {
      ...user,
      role: profile.role as UserRole,
    };
  } catch (error) {
    console.error("Error in getAuthenticatedUserWithRole:", error);
    return null;
  }
}

export async function isUserAdmin(): Promise<boolean> {
  const userWithRole = await getAuthenticatedUserWithRole();
  return userWithRole?.role === "admin";
}

export async function requireAdmin() {
  const authResult = await createAuthenticatedClient();

  if (!authResult) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { client, user } = authResult;

  try {
    const { data: profile, error } = await client
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error("Error fetching user profile for admin check:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to verify permissions",
          code: "FORBIDDEN",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({
          error: "Admin access required",
          code: "FORBIDDEN",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return {
      client,
      user: {
        ...user,
        role: profile.role as UserRole,
      },
    };
  } catch (error) {
    console.error("Error in requireAdmin:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error during admin verification",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
