import { auth } from "./auth/server";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}

export interface AuthUserWithRole extends AuthUser {
  role: UserRole;
}

export type AuthResult = {
  user: AuthUser;
};

export type AdminAuthResult = {
  user: AuthUserWithRole;
};

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const { data: session } = await auth.getSession();

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}

export async function requireAuth(): Promise<Response | AuthResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return { user };
}

export async function getAuthenticatedUserWithRole(): Promise<AuthUserWithRole | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  try {
    const [profile] = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))
      .limit(1);

    if (!profile) {
      console.error("User profile not found for:", user.id);
      return null;
    }

    return {
      ...user,
      role: profile.role,
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

export async function requireAdmin(): Promise<Response | AdminAuthResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const [profile] = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))
      .limit(1);

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "Failed to verify permissions",
          code: "FORBIDDEN",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
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
        },
      );
    }

    return {
      user: {
        ...user,
        role: profile.role,
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
      },
    );
  }
}
