import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { RecipeShareService } from "@/lib/recipe-share-service";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ShareRequestBody {
  expiresAt?: string | null;
  allowSave?: boolean;
  locale?: string;
}

function resolveLocale(
  request: NextRequest,
  explicitLocale?: string | null
): "nl" | "en" {
  let effectiveLocale = explicitLocale;
  if (!effectiveLocale) {
    try {
      const referer = request.headers.get("referer");
      if (referer) {
        const url = new URL(referer);
        const firstSegment = url.pathname.split("/").filter(Boolean)[0];
        if (firstSegment === "nl" || firstSegment === "en") {
          effectiveLocale = firstSegment;
        }
      }
    } catch {
      /* ignore parsing errors */
    }
  }

  if (effectiveLocale !== "nl" && effectiveLocale !== "en") {
    return "nl";
  }

  return effectiveLocale;
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
  const effectiveLocale = resolveLocale(request, requestedLocale);

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

    try {
      await RecipeShareService.saveShareLinkMetadata(
        supabase,
        user.id,
        recipeId,
        {
          slug: result.slug,
          token: result.token,
          allowSave: result.allowSave,
          expiresAt: result.expiresAt,
          createdAt: result.createdAt,
        }
      );
    } catch (metadataError) {
      console.error(
        "Failed to persist share link metadata to profile",
        metadataError
      );
    }

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
  request: NextRequest,
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

    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const effectiveLocale = resolveLocale(request, requestedLocale);
    let sharePath: string | null = null;
    try {
      const metadata = await RecipeShareService.getShareLinkMetadataForRecipe(
        supabase,
        user.id,
        recipeId
      );
      if (metadata) {
        sharePath = RecipeShareService.buildSharePath(
          effectiveLocale,
          metadata.slug,
          metadata.token
        );
      }
    } catch (metadataError) {
      console.error(
        "Failed to load stored share link metadata",
        metadataError
      );
    }

    return NextResponse.json({
      share: {
        slug: existingShare.slug,
        allowSave: existingShare.allowSave,
        expiresAt: existingShare.expiresAt,
        createdAt: existingShare.createdAt,
        sharePath,
        tokenPersisted: sharePath !== null,
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
    try {
      await RecipeShareService.removeShareLinkMetadata(
        supabase,
        user.id,
        recipeId
      );
    } catch (metadataError) {
      console.error(
        "Failed to remove stored share link metadata",
        metadataError
      );
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete share link", error);
    return NextResponse.json(
      { error: "Failed to stop sharing" },
      { status: 500 }
    );
  }
}
