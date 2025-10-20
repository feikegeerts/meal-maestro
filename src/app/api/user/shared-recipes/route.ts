import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { RecipeShareService } from "@/lib/recipe-share-service";

function resolveLocale(localeParam: string | null): "nl" | "en" {
  if (localeParam === "en") {
    return "en";
  }
  return "nl";
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const locale = resolveLocale(request.nextUrl.searchParams.get("locale"));

  try {
    const links = await RecipeShareService.listShareLinkMetadata(
      supabase,
      user.id
    );

    const payload = links.map((link) => ({
      recipeId: link.recipeId,
      slug: link.slug,
      allowSave: link.allowSave,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      sharePath: RecipeShareService.buildSharePath(
        locale,
        link.slug,
        link.token
      ),
    }));

    return NextResponse.json({ links: payload });
  } catch (error) {
    console.error("Failed to fetch stored share links", error);
    return NextResponse.json(
      { error: "Failed to load stored share links" },
      { status: 500 }
    );
  }
}
