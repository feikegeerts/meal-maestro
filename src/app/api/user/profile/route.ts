import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { UserProfile } from "@/lib/profile-types";

type DrizzleProfile = typeof userProfiles.$inferSelect;

function toSnakeCase(profile: DrizzleProfile): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    role: profile.role,
    language_preference: profile.languagePreference ?? undefined,
    unit_system_preference: profile.unitSystemPreference ?? undefined,
    created_at: profile.createdAt?.toISOString() ?? new Date().toISOString(),
    updated_at: profile.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  try {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))
      .limit(1);

    if (!profile) {
      // Auto-provision profile for authenticated users (replaces old Supabase trigger)
      const displayName =
        user.name || user.email?.split("@")[0] || "User";

      const [newProfile] = await db
        .insert(userProfiles)
        .values({
          id: user.id,
          email: user.email,
          displayName,
          avatarUrl: user.image ?? null,
          role: "user",
        })
        .onConflictDoNothing()
        .returning();

      if (!newProfile) {
        // Race condition: another request created it — fetch it
        const [existing] = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.id, user.id))
          .limit(1);

        return existing
          ? NextResponse.json(toSnakeCase(existing))
          : NextResponse.json(
              { error: "Failed to create profile" },
              { status: 500 },
            );
      }

      return NextResponse.json(toSnakeCase(newProfile));
    }

    return NextResponse.json(toSnakeCase(profile));
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  try {
    const body = await request.json();

    // Only allow updating user-editable fields
    const allowedFields = [
      "display_name",
      "avatar_url",
      "language_preference",
      "unit_system_preference",
    ] as const;

    const updates: Record<string, string> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Map snake_case body fields to camelCase Drizzle columns
    const drizzleUpdates: Record<string, string> = {};
    if ("display_name" in updates)
      drizzleUpdates.displayName = updates.display_name;
    if ("avatar_url" in updates)
      drizzleUpdates.avatarUrl = updates.avatar_url;
    if ("language_preference" in updates)
      drizzleUpdates.languagePreference = updates.language_preference;
    if ("unit_system_preference" in updates)
      drizzleUpdates.unitSystemPreference = updates.unit_system_preference;

    const [updated] = await db
      .update(userProfiles)
      .set(drizzleUpdates)
      .where(eq(userProfiles.id, user.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(toSnakeCase(updated));
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
