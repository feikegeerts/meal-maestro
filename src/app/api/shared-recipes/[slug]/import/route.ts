import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import {
  RecipeShareService,
  SharedRecipeError,
} from "@/lib/recipe-share-service";
import type { Recipe } from "@/types/recipe";

interface ImportRequestBody {
  token?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: "Missing share slug" }, { status: 400 });
  }

  let body: ImportRequestBody;

  try {
    body = await request.json();
  } catch (error) {
    console.error("Invalid JSON payload for shared recipe import", error);
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const token = body.token;

  if (!token) {
    return NextResponse.json({ error: "Missing share token" }, { status: 400 });
  }

  try {
    const sharedData = await RecipeShareService.getSharedRecipe(slug, token);

    if (!sharedData.allowSave) {
      throw new SharedRecipeError(
        "This recipe cannot be imported",
        "FORBIDDEN"
      );
    }

    const recipe = sharedData.recipe;
    const derivedTotalTime =
      recipe.total_time ??
      (typeof recipe.prep_time === "number" || typeof recipe.cook_time === "number"
        ? (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0)
        : null);

    const insertPayload = {
      title: recipe.title,
      ingredients: recipe.ingredients,
      sections: recipe.sections ?? null,
      servings: recipe.servings,
      description: recipe.description,
      reference: recipe.reference ?? null,
      prep_time: recipe.prep_time ?? null,
      cook_time: recipe.cook_time ?? null,
      total_time: derivedTotalTime ?? null,
      pairing_wine: recipe.pairing_wine ?? null,
      notes: recipe.notes ?? null,
      category: recipe.category,
      cuisine: recipe.cuisine ?? undefined,
      diet_types: recipe.diet_types ?? [],
      cooking_methods: recipe.cooking_methods ?? [],
      dish_types: recipe.dish_types ?? [],
      proteins: recipe.proteins ?? [],
      occasions: recipe.occasions ?? [],
      characteristics: recipe.characteristics ?? [],
      season: recipe.season ?? undefined,
      user_id: user.id,
    } satisfies Partial<Recipe> & { user_id: string };

    const { data: inserted, error: insertError } = await supabase
      .from("recipes")
      .insert([insertPayload])
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("Failed to insert imported recipe", insertError);
      return NextResponse.json(
        { error: "Failed to save recipe" },
        { status: 500 }
      );
    }

    let importedRecipe = inserted as Recipe;
    const warnings: string[] = [];

    if (recipe.image_url) {
      try {
        const copyResult = await RecipeShareService.copyImageForUser(
          recipe.image_url,
          user.id,
          importedRecipe.id,
          recipe.image_metadata ?? null
        );

        if (copyResult) {
          const { data: updatedRecipe, error: updateError } = await supabase
            .from("recipes")
            .update({
              image_url: copyResult.imageUrl,
              image_metadata: copyResult.imageMetadata,
            })
            .eq("id", importedRecipe.id)
            .select("*")
            .single();

          if (!updateError && updatedRecipe) {
            importedRecipe = updatedRecipe as Recipe;
          } else if (updateError) {
            console.error(
              "Failed to update imported recipe image",
              updateError
            );
            warnings.push("IMAGE_METADATA_UPDATE_FAILED");
          }
        }
      } catch (error) {
        console.error("Failed to copy image for imported recipe", error);
        warnings.push("IMAGE_COPY_FAILED");
      }
    }

    return NextResponse.json(
      {
        recipe: importedRecipe,
        warnings,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SharedRecipeError) {
      if (error.code === "FORBIDDEN") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.code === "EXPIRED") {
        return NextResponse.json({ error: error.message }, { status: 410 });
      }

      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      );
    }

    console.error("Unexpected error importing shared recipe", error);
    return NextResponse.json(
      { error: "Failed to import shared recipe" },
      { status: 500 }
    );
  }
}
