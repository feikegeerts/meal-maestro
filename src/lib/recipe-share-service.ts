import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import type { Recipe } from "@/types/recipe";

interface ShareLinkOptions {
  expiresAt?: string | null;
  allowSave?: boolean;
}

export interface CreatedShareLink {
  slug: string;
  token: string;
  expiresAt: string | null;
  allowSave: boolean;
  createdAt: string | null;
}

export interface ShareLinkRecord {
  slug: string;
  allowSave: boolean;
  expiresAt: string | null;
  createdAt: string | null;
}

export interface SharedRecipePublicPayload {
  recipe: Omit<Recipe, "user_id"> & { user_id?: never };
  originalRecipeId: string;
  allowSave: boolean;
  expiresAt: string | null;
  ownerDisplayName: string | null;
  signedImageUrl: string | null;
}

interface SharedRecipeInternalPayload {
  linkId: string;
  allowSave: boolean;
  expiresAt: string | null;
  ownerId: string;
  ownerDisplayName: string | null;
  recipe: Recipe;
}

export class SharedRecipeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "TOKEN_INVALID"
      | "EXPIRED"
      | "FORBIDDEN"
      | "IMAGE_COPY_FAILED"
  ) {
    super(message);
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHARE_BUCKET = "recipe-images";

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for share service operations"
    );
  }

  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateSlug(): string {
  return randomBytes(6).toString("base64url");
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function sanitizeRecipeForPublic(
  recipe: Recipe
): SharedRecipePublicPayload["recipe"] {
  const {
    user_id: removedUserId,
    image_url: removedImageUrl,
    ...rest
  } = recipe;
  void removedUserId;
  void removedImageUrl;
  return {
    ...rest,
    image_url: null,
  };
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiryDate = new Date(expiresAt);
  return (
    Number.isFinite(expiryDate.getTime()) && expiryDate.getTime() < Date.now()
  );
}

function extractStoragePathFromUrl(
  url: string | null | undefined
): string | null {
  if (!url) {
    return null;
  }

  try {
    const match = url.match(
      /\/storage\/v1\/object\/public\/recipe-images\/(.+)$/
    );
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function deriveDestinationPath(
  userId: string,
  recipeId: string,
  sourcePath: string
): string {
  const extensionMatch = sourcePath.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? `.${extensionMatch[1]}` : ".webp";
  const timestamp = Date.now();
  return `${userId}/${recipeId}/${timestamp}${extension}`;
}

export class RecipeShareService {
  static async createShareLink(
    supabaseClient: SupabaseClient,
    userId: string,
    recipeId: string,
    options: ShareLinkOptions = {}
  ): Promise<CreatedShareLink> {
    const allowSave = options.allowSave ?? true;
    const expiresAt = options.expiresAt ?? null;

    // Ensure we only keep a single active share per recipe
    await supabaseClient
      .from("shared_recipe_links")
      // Removed returning option; not part of the typed DeleteModifier interface in current supabase-js version
      .delete()
      .eq("recipe_id", recipeId)
      .eq("owner_id", userId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = generateSlug();
      const token = generateToken();
      const tokenHash = hashToken(token);

      const { data, error } = await supabaseClient
        .from("shared_recipe_links")
        .insert([
          {
            recipe_id: recipeId,
            owner_id: userId,
            slug,
            token_hash: tokenHash,
            allow_save: allowSave,
            expires_at: expiresAt,
          },
        ])
        .select("slug, expires_at, allow_save, created_at")
        .single();

      if (error) {
        // Retry on duplicate slug
        if (error.code === "23505") {
          continue;
        }

        throw error;
      }

      return {
        slug: data.slug,
        token,
        expiresAt: data.expires_at,
        allowSave: data.allow_save,
        createdAt: data.created_at ?? null,
      };
    }

    throw new Error(
      "Failed to generate unique share slug after multiple attempts"
    );
  }

  static async getShareLinkForRecipe(
    supabaseClient: SupabaseClient,
    userId: string,
    recipeId: string
  ): Promise<ShareLinkRecord | null> {
    const { data, error } = await supabaseClient
      .from("shared_recipe_links")
      .select("slug, allow_save, expires_at, created_at")
      .eq("recipe_id", recipeId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      slug: data.slug,
      allowSave: data.allow_save ?? true,
      expiresAt: data.expires_at ?? null,
      createdAt: data.created_at ?? null,
    };
  }

  static async deleteShareLink(
    supabaseClient: SupabaseClient,
    userId: string,
    recipeId: string
  ): Promise<void> {
    await supabaseClient
      .from("shared_recipe_links")
      // Removed returning option; not part of the typed DeleteModifier interface in current supabase-js version
      .delete()
      .eq("recipe_id", recipeId)
      .eq("owner_id", userId);
  }

  static async getSharedRecipe(
    slug: string,
    token: string
  ): Promise<SharedRecipeInternalPayload> {
    const admin = getAdminClient();

    const { data: link, error: linkError } = await admin
      .from("shared_recipe_links")
      .select("id, recipe_id, owner_id, token_hash, allow_save, expires_at")
      .eq("slug", slug)
      .maybeSingle();

    if (linkError) {
      throw linkError;
    }

    if (!link) {
      throw new SharedRecipeError("Share link not found", "NOT_FOUND");
    }

    if (isExpired(link.expires_at)) {
      throw new SharedRecipeError("Share link expired", "EXPIRED");
    }

    if (hashToken(token) !== link.token_hash) {
      throw new SharedRecipeError("Invalid share token", "TOKEN_INVALID");
    }

    const { data: recipe, error: recipeError } = await admin
      .from("recipes")
      .select(
        "id, title, ingredients, servings, description, category, cuisine, diet_types, cooking_methods, dish_types, proteins, occasions, characteristics, season, last_eaten, image_url, image_metadata, created_at, updated_at, user_id"
      )
      .eq("id", link.recipe_id)
      .maybeSingle();

    if (recipeError) {
      throw recipeError;
    }

    if (!recipe) {
      throw new SharedRecipeError(
        "Original recipe no longer exists",
        "NOT_FOUND"
      );
    }

    const { data: ownerProfile } = await admin
      .from("user_profiles")
      .select("display_name")
      .eq("id", link.owner_id)
      .maybeSingle();

    return {
      linkId: link.id,
      allowSave: link.allow_save,
      expiresAt: link.expires_at,
      ownerId: link.owner_id,
      ownerDisplayName: ownerProfile?.display_name ?? null,
      recipe: recipe as Recipe,
    };
  }

  static async createSignedImageUrl(
    url: string | null | undefined
  ): Promise<string | null> {
    const admin = getAdminClient();
    const sourcePath = extractStoragePathFromUrl(url);

    if (!sourcePath) {
      return null;
    }

    const { data, error } = await admin.storage
      .from(SHARE_BUCKET)
      .createSignedUrl(sourcePath, 60 * 60); // 1 hour

    if (error) {
      console.error("Failed to create signed image url", error);
      return null;
    }

    return data?.signedUrl ?? null;
  }

  static async recordView(linkId: string): Promise<void> {
    try {
      const admin = getAdminClient();
      const { data, error } = await admin
        .from("shared_recipe_links")
        .select("view_count")
        .eq("id", linkId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      await admin
        .from("shared_recipe_links")
        .update({
          view_count: (data?.view_count ?? 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", linkId);
    } catch (error) {
      console.error("Failed to record share view", error);
    }
  }

  static async copyImageForUser(
    sourceUrl: string,
    newUserId: string,
    newRecipeId: string,
    metadata: Recipe["image_metadata"] | null | undefined
  ): Promise<{
    imageUrl: string;
    imageMetadata: Recipe["image_metadata"];
  } | null> {
    const admin = getAdminClient();
    const sourcePath = extractStoragePathFromUrl(sourceUrl);

    if (!sourcePath) {
      return null;
    }

    const destinationPath = deriveDestinationPath(
      newUserId,
      newRecipeId,
      sourcePath
    );

    const { error: copyError } = await admin.storage
      .from(SHARE_BUCKET)
      .copy(sourcePath, destinationPath);

    if (copyError) {
      console.error("Failed to copy shared recipe image", copyError);
      throw new SharedRecipeError(
        "Unable to copy shared recipe image",
        "IMAGE_COPY_FAILED"
      );
    }

    const { data: publicUrlData } = admin.storage
      .from(SHARE_BUCKET)
      .getPublicUrl(destinationPath);

    const newMetadata = metadata
      ? {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        }
      : null;

    return {
      imageUrl: publicUrlData.publicUrl,
      imageMetadata: newMetadata,
    };
  }

  static buildPublicPayload(
    data: SharedRecipeInternalPayload,
    signedImageUrl: string | null
  ): SharedRecipePublicPayload {
    const sanitizedRecipe = sanitizeRecipeForPublic(data.recipe);

    return {
      recipe: sanitizedRecipe,
      originalRecipeId: data.recipe.id,
      allowSave: data.allowSave,
      expiresAt: data.expiresAt,
      ownerDisplayName: data.ownerDisplayName,
      signedImageUrl,
    };
  }
}
