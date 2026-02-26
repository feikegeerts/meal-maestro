import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { recipes, userProfiles } from "@/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { UserProfile } from "@/lib/profile-types";
import { ImageService } from "@/lib/image-service";
import { parseBody, UserProfilePatchBodySchema } from "@/lib/request-schemas";

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

/**
 * Migrates a user profile from a legacy Supabase UUID to the new Neon Auth UUID.
 * Updates user_profiles.id and cascades the change to all referencing tables.
 * This is a one-time operation per user during the Supabase→Neon migration.
 */
async function migrateUserIdToNeonAuth(
  oldId: string,
  newId: string,
): Promise<DrizzleProfile | null> {
  // Update all FK-referencing tables first, then the profile itself.
  // Uses a single raw SQL statement with CTEs to run atomically on Neon HTTP.
  const result = await db.execute(sql`
    WITH
      update_recipes AS (
        UPDATE recipes SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_api_usage AS (
        UPDATE api_usage SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_monthly_usage AS (
        UPDATE monthly_usage_summary SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_usage_alerts AS (
        UPDATE usage_alert_events SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_rate_limit_user AS (
        UPDATE rate_limit_user SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_rate_limit_violations AS (
        UPDATE rate_limit_violations SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_feedback AS (
        UPDATE feedback SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_deletion_requests AS (
        UPDATE deletion_requests SET user_id = ${newId} WHERE user_id = ${oldId}
      ),
      update_custom_units AS (
        UPDATE custom_units SET user_id = ${newId} WHERE user_id = ${oldId}
      )
    UPDATE user_profiles
    SET id = ${newId}, updated_at = NOW()
    WHERE id = ${oldId}
    RETURNING *
  `);

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    email: row.email as string,
    displayName: row.display_name as string | null,
    avatarUrl: row.avatar_url as string | null,
    role: row.role as DrizzleProfile["role"],
    languagePreference: row.language_preference as string | null,
    unitSystemPreference:
      row.unit_system_preference as DrizzleProfile["unitSystemPreference"],
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
  };
}

/**
 * Re-keys R2 image objects after a user ID migration.
 * Updates image_url in the database to match the new R2 key.
 * Best-effort: logs errors but doesn't fail the migration.
 */
async function rekeyUserImages(oldId: string, newId: string): Promise<void> {
  try {
    const imageService = new ImageService();

    const userRecipes = await db
      .select({ id: recipes.id, imageUrl: recipes.imageUrl })
      .from(recipes)
      .where(and(eq(recipes.userId, newId), isNotNull(recipes.imageUrl)));

    for (const recipe of userRecipes) {
      if (!recipe.imageUrl) continue;

      try {
        const newUrl = await imageService.rekeyImageForUser(
          recipe.imageUrl,
          oldId,
          newId,
        );

        if (newUrl) {
          await db
            .update(recipes)
            .set({ imageUrl: newUrl, updatedAt: new Date() })
            .where(eq(recipes.id, recipe.id));

          console.log(`Re-keyed image for recipe ${recipe.id}`);
        }
      } catch (error) {
        console.warn(
          `Failed to re-key image for recipe ${recipe.id}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.warn("Failed to re-key user images:", error);
  }
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
      // Migration path: look up by email to find a legacy Supabase profile
      if (user.email) {
        const [legacyProfile] = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.email, user.email))
          .limit(1);

        if (legacyProfile) {
          console.log(
            `Migrating user profile from Supabase ID ${legacyProfile.id} to Neon Auth ID ${user.id}`,
          );
          const migrated = await migrateUserIdToNeonAuth(
            legacyProfile.id,
            user.id,
          );
          if (migrated) {
            // Re-key R2 image objects from old user ID to new user ID
            await rekeyUserImages(legacyProfile.id, user.id);
            return NextResponse.json(toSnakeCase(migrated));
          }
        }
      }

      // No legacy profile found — auto-provision for new users
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
    const parsed = parseBody(UserProfilePatchBodySchema, await request.json());
    if (!parsed.success) return parsed.error;

    const { display_name, avatar_url, language_preference, unit_system_preference } = parsed.data;

    // Map snake_case body fields to camelCase Drizzle columns
    const drizzleUpdates: Record<string, string> = {};
    if (display_name !== undefined) drizzleUpdates.displayName = display_name;
    if (avatar_url !== undefined) drizzleUpdates.avatarUrl = avatar_url;
    if (language_preference !== undefined) drizzleUpdates.languagePreference = language_preference;
    if (unit_system_preference !== undefined) drizzleUpdates.unitSystemPreference = unit_system_preference;

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
