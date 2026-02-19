import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { RecipeSection } from "@/types/recipe";
import { toRecipeResponse } from "@/lib/recipe-response-mapper";
import { ImageService } from "@/lib/image-service";
import { normalizeUtensils } from "@/lib/recipe-utils";
import { RecipeValidator } from "@/lib/recipe-validator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 },
      );
    }

    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .limit(1);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ recipe: toRecipeResponse(recipe) });
  } catch (error) {
    console.error("Unexpected error in recipe API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { id: recipeId } = await params;
    const body = await request.json();
    const {
      title,
      ingredients,
      servings,
      description,
      category,
      cuisine,
      diet_types,
      cooking_methods,
      dish_types,
      proteins,
      occasions,
      characteristics,
      season,
      last_eaten,
      nutrition,
      sections,
      reference,
      pairing_wine,
      notes,
      utensils,
    } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 },
      );
    }

    const validationErrors: string[] = [];
    const bodyRecord = (body || {}) as Record<string, unknown>;

    const normalizedReference = RecipeValidator.normalizeReference(reference, validationErrors);
    const normalizedPairingWine = RecipeValidator.normalizePairingWine(pairing_wine, validationErrors);
    const normalizedNotes = RecipeValidator.normalizeNotes(notes, validationErrors);
    const normalizedUtensils = normalizeUtensils(utensils, validationErrors);

    const {
      prepTime: normalizedPrepTime,
      cookTime: normalizedCookTime,
      totalTime: normalizedTotalTime,
      prepProvided,
      cookProvided,
      totalProvided,
    } = RecipeValidator.normalizeTimes(bodyRecord, validationErrors);

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;

    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return NextResponse.json(
          {
            error:
              "Ingredients must be an array of structured ingredient objects",
          },
          { status: 400 },
        );
      }

      const ingredientError = RecipeValidator.validateIngredients(ingredients);
      if (ingredientError) {
        return NextResponse.json({ error: ingredientError }, { status: 400 });
      }

      updateData.ingredients = ingredients.map(RecipeValidator.normalizeIngredient);
    }

    if (sections !== undefined) {
      if (!Array.isArray(sections)) {
        return NextResponse.json(
          { error: "Sections must be an array when provided" },
          { status: 400 },
        );
      }

      const sectionErrors: string[] = [];
      const normalizedSections = RecipeValidator.validateAndNormalizeSections(
        sections as RecipeSection[],
        sectionErrors,
      );

      if (sectionErrors.length > 0) {
        return NextResponse.json(
          { error: sectionErrors.join("; ") },
          { status: 400 },
        );
      }

      updateData.sections = normalizedSections;
    }

    if (servings !== undefined) {
      const servingsNum = parseInt(servings);
      if (isNaN(servingsNum) || servingsNum <= 0 || servingsNum > 100) {
        return NextResponse.json(
          { error: "Servings must be a number between 1 and 100" },
          { status: 400 },
        );
      }
      updateData.servings = servingsNum;
    }

    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (cuisine !== undefined) updateData.cuisine = cuisine;
    if (diet_types !== undefined) updateData.dietTypes = diet_types;
    if (cooking_methods !== undefined)
      updateData.cookingMethods = cooking_methods;
    if (dish_types !== undefined) updateData.dishTypes = dish_types;
    if (proteins !== undefined) updateData.proteins = proteins;
    if (occasions !== undefined) updateData.occasions = occasions;
    if (characteristics !== undefined)
      updateData.characteristics = characteristics;
    if (season !== undefined) updateData.season = season;
    if (last_eaten !== undefined)
      updateData.lastEaten = last_eaten ? new Date(last_eaten) : null;
    if (nutrition !== undefined) updateData.nutrition = nutrition;
    if (RecipeValidator.hasKey(bodyRecord, "utensils")) {
      updateData.utensils = normalizedUtensils ?? [];
    }
    if (RecipeValidator.hasKey(bodyRecord, "reference")) {
      updateData.reference =
        normalizedReference && normalizedReference.length > 0
          ? normalizedReference
          : null;
    }
    if (RecipeValidator.hasKey(bodyRecord, "pairing_wine")) {
      updateData.pairingWine =
        normalizedPairingWine && normalizedPairingWine.length > 0
          ? normalizedPairingWine
          : null;
    }
    if (RecipeValidator.hasKey(bodyRecord, "notes")) {
      updateData.notes =
        normalizedNotes && normalizedNotes.trim().length > 0
          ? normalizedNotes.trim()
          : null;
    }
    if (prepProvided) {
      updateData.prepTime =
        typeof normalizedPrepTime === "number" ? normalizedPrepTime : null;
    }
    if (cookProvided) {
      updateData.cookTime =
        typeof normalizedCookTime === "number" ? normalizedCookTime : null;
    }
    if (totalProvided || (!totalProvided && (prepProvided || cookProvided))) {
      updateData.totalTime =
        typeof normalizedTotalTime === "number" ? normalizedTotalTime : null;
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join("; ") },
        { status: 400 },
      );
    }

    const [recipe] = await db
      .update(recipes)
      .set(updateData)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .returning();

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      recipe: toRecipeResponse(recipe),
      success: true,
    });
  } catch (error) {
    console.error("Unexpected error in recipe update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;
  // ImageService falls back to env vars when no client is provided
  const imageService = new ImageService();

  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 },
      );
    }

    // First, get the recipe to check if it has an image
    const [recipe] = await db
      .select({ id: recipes.id, imageUrl: recipes.imageUrl })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .limit(1);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    // Delete the recipe from database
    await db
      .delete(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)));

    // Clean up image if it exists (best effort)
    if (recipe.imageUrl) {
      const imageDeleteResult = await imageService.deleteRecipeImage(
        recipe.imageUrl,
        user.id,
      );

      if (!imageDeleteResult.success) {
        console.warn(
          "Failed to delete recipe image during cleanup:",
          imageDeleteResult.error,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in recipe deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
