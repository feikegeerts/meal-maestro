import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { RecipeShareService } from "@/lib/recipe-share-service";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ShareRequestBody {
  expiresAt?: string | null;
  allowSave?: boolean;
  locale?: string;
}

async function ensureRecipeOwnership(
  supabase: SupabaseClient,
  userId: string,
  recipeId: string
) {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error verifying recipe ownership", error);
    return NextResponse.json(
      { error: "Failed to verify recipe ownership" },
      { status: 500 }
    );
  }

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const { id: recipeId } = await context.params;

  if (!recipeId) {
    return NextResponse.json(
      { error: "Recipe ID is required" },
      { status: 400 }
    );
  }

  const ownershipError = await ensureRecipeOwnership(
    supabase,
    user.id,
    recipeId
  );
  if (ownershipError) {
    return ownershipError;
  }

  let body: ShareRequestBody = {};

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 0) {
    try {
      body = await request.json();
    } catch (error) {
      console.error("Invalid JSON in share request", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
  }

  const { expiresAt = null, allowSave = true, locale: requestedLocale } = body;

  // Derive locale: prefer explicit body value, else attempt to parse from referer path, else default
  let effectiveLocale = requestedLocale;
  if (!effectiveLocale) {
    try {
      const referer = request.headers.get("referer");
      if (referer) {
        const url = new URL(referer);
        const firstSegment = url.pathname.split("/").filter(Boolean)[0];
        if (["nl", "en"].includes(firstSegment)) {
          effectiveLocale = firstSegment;
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!effectiveLocale || !["nl", "en"].includes(effectiveLocale)) {
    effectiveLocale = "nl"; // default (matches routing.defaultLocale)
  }

  try {
    const result = await RecipeShareService.createShareLink(
      supabase,
      user.id,
      recipeId,
      {
        expiresAt,
        allowSave,
      }
    );

    // Include locale prefix so copied link stays in creator's language context
    const sharePath = `/${effectiveLocale}/share/${
      result.slug
    }?token=${encodeURIComponent(result.token)}`;

    return NextResponse.json(
      {
        sharePath,
        slug: result.slug,
        token: result.token,
        expiresAt: result.expiresAt,
        allowSave: result.allowSave,
        createdAt: result.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create share link", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const { id: recipeId } = await context.params;

  const ownershipError = await ensureRecipeOwnership(
    supabase,
    user.id,
    recipeId
  );
  if (ownershipError) {
    return ownershipError;
  }

  try {
    const existingShare = await RecipeShareService.getShareLinkForRecipe(
      supabase,
      user.id,
      recipeId
    );

    if (!existingShare) {
      return NextResponse.json({ share: null }, { status: 404 });
    }

    return NextResponse.json({
      share: {
        slug: existingShare.slug,
        allowSave: existingShare.allowSave,
        expiresAt: existingShare.expiresAt,
        createdAt: existingShare.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to fetch share link", error);
    return NextResponse.json(
      { error: "Failed to fetch share status" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const { id: recipeId } = await context.params;

  const ownershipError = await ensureRecipeOwnership(
    supabase,
    user.id,
    recipeId
  );
  if (ownershipError) {
    return ownershipError;
  }

  try {
    await RecipeShareService.deleteShareLink(supabase, user.id, recipeId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete share link", error);
    return NextResponse.json(
      { error: "Failed to stop sharing" },
      { status: 500 }
    );
  }
}
