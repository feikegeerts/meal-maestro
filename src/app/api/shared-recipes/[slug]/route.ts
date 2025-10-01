import { NextRequest, NextResponse } from "next/server";
import {
  RecipeShareService,
  SharedRecipeError,
} from "@/lib/recipe-share-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing share token" },
        { status: 400 }
      );
    }

    const slug = params.slug;

    if (!slug) {
      return NextResponse.json(
        { error: "Missing share slug" },
        { status: 400 }
      );
    }

    try {
      const sharedData = await RecipeShareService.getSharedRecipe(slug, token);
      const signedImageUrl = await RecipeShareService.createSignedImageUrl(
        sharedData.recipe.image_url || null
      );

      const payload = RecipeShareService.buildPublicPayload(
        sharedData,
        signedImageUrl
      );

      // Record view asynchronously
      RecipeShareService.recordView(sharedData.linkId).catch((error) => {
        console.error("Failed to log share view", error);
      });

      return NextResponse.json({
        share: {
          slug,
          expiresAt: payload.expiresAt,
          allowSave: payload.allowSave,
          ownerDisplayName: payload.ownerDisplayName,
        },
        recipe: payload.recipe,
        originalRecipeId: payload.originalRecipeId,
        signedImageUrl: payload.signedImageUrl,
      });
    } catch (error) {
      if (error instanceof SharedRecipeError) {
        const status =
          error.code === "EXPIRED"
            ? 410
            : 404;

        return NextResponse.json(
          { error: error.message },
          { status }
        );
      }

      console.error("Unexpected error fetching shared recipe", error);
      return NextResponse.json(
        { error: "Failed to fetch shared recipe" },
        { status: 500 }
      );
    }
}
