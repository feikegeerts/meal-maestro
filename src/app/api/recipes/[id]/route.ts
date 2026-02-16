import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { RecipeIngredient, RecipeSection } from "@/types/recipe";
import { toRecipeResponse } from "@/lib/recipe-response-mapper";
import { ImageService } from "@/lib/image-service";

type OptionalNumber = number | null | undefined;

function normalizeTimeField(
  value: unknown,
  label: string,
  errors: string[],
): OptionalNumber {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    errors.push(`${label} must be a number of minutes when provided`);
    return undefined;
  }
  if (!Number.isInteger(numeric)) {
    errors.push(`${label} must be a whole number of minutes`);
    return undefined;
  }
  if (numeric < 0) {
    errors.push(`${label} cannot be negative`);
    return undefined;
  }
  return numeric;
}

function hasKey(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

import {
  MAX_NOTES_LENGTH,
  MAX_PAIRING_WINE_LENGTH,
  MAX_REFERENCE_LENGTH,
  normalizeUtensils,
} from "@/lib/recipe-utils";

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
      prep_time,
      cook_time,
      total_time,
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
    const normalizedReference =
      typeof reference === "string" ? reference.trim() : null;
    if (
      normalizedReference &&
      normalizedReference.length > MAX_REFERENCE_LENGTH
    ) {
      validationErrors.push(
        `Reference must be ${MAX_REFERENCE_LENGTH} characters or fewer`,
      );
    }

    const normalizedPairingWine =
      typeof pairing_wine === "string" ? pairing_wine.trim() : null;
    if (
      normalizedPairingWine &&
      normalizedPairingWine.length > MAX_PAIRING_WINE_LENGTH
    ) {
      validationErrors.push(
        `Wine pairing must be ${MAX_PAIRING_WINE_LENGTH} characters or fewer`,
      );
    }

    const normalizedNotes = typeof notes === "string" ? notes : null;
    if (normalizedNotes && normalizedNotes.length > MAX_NOTES_LENGTH) {
      validationErrors.push(
        `Notes must be ${MAX_NOTES_LENGTH} characters or fewer`,
      );
    }
    const normalizedUtensils = normalizeUtensils(utensils, validationErrors);

    const normalizedPrepTime = normalizeTimeField(
      prep_time,
      "Prep time",
      validationErrors,
    );
    const normalizedCookTime = normalizeTimeField(
      cook_time,
      "Cook time",
      validationErrors,
    );
    const totalProvided = hasKey(bodyRecord, "total_time");
    const prepProvided = hasKey(bodyRecord, "prep_time");
    const cookProvided = hasKey(bodyRecord, "cook_time");
    let normalizedTotalTime = normalizeTimeField(
      total_time,
      "Total time",
      validationErrors,
    );

    if (!totalProvided && (prepProvided || cookProvided)) {
      if (
        typeof normalizedPrepTime === "number" ||
        typeof normalizedCookTime === "number"
      ) {
        const prepValue =
          typeof normalizedPrepTime === "number" ? normalizedPrepTime : 0;
        const cookValue =
          typeof normalizedCookTime === "number" ? normalizedCookTime : 0;
        normalizedTotalTime = prepValue + cookValue;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;

    const normalizeIngredient = (ingredient: RecipeIngredient) => {
      let normalizedUnit = ingredient.unit;

      // Convert common non-standard units to standard ones or remove them
      if (typeof normalizedUnit === "string") {
        switch (normalizedUnit.toLowerCase()) {
          case "el":
          case "eetlepel":
            normalizedUnit = "tbsp";
            break;
          case "tl":
          case "theelepel":
            normalizedUnit = "tsp";
            break;
          case "teen":
          case "teentje":
          case "teentjes":
            normalizedUnit = "clove";
            break;
          case "stuk":
          case "stuks":
          case "units.stuk":
          case "pieces":
            normalizedUnit = null;
            break;
          default: {
            const validUnits = [
              "g",
              "kg",
              "ml",
              "l",
              "tbsp",
              "tsp",
              "clove",
            ];
            if (
              !validUnits.includes(normalizedUnit) &&
              normalizedUnit !== "naar smaak" &&
              normalizedUnit !== "to taste"
            ) {
              normalizedUnit = null;
            }
            break;
          }
        }
      }

      return {
        ...ingredient,
        amount: ingredient.amount === 0 ? null : ingredient.amount,
        unit: normalizedUnit,
      };
    };

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

      for (const ingredient of ingredients) {
        if (!ingredient.id || !ingredient.name) {
          return NextResponse.json(
            { error: "Each ingredient must have an id and name" },
            { status: 400 },
          );
        }
        const normalizedAmount =
          ingredient.amount === 0 ? null : ingredient.amount;
        if (
          normalizedAmount !== null &&
          (typeof normalizedAmount !== "number" || normalizedAmount <= 0)
        ) {
          return NextResponse.json(
            { error: "Ingredient amounts must be positive numbers or null" },
            { status: 400 },
          );
        }
      }

      updateData.ingredients = ingredients.map(normalizeIngredient);
    }

    if (sections !== undefined) {
      if (!Array.isArray(sections)) {
        return NextResponse.json(
          { error: "Sections must be an array when provided" },
          { status: 400 },
        );
      }

      const sectionErrors: string[] = [];
      const normalizedSections = sections.map(
        (section: RecipeSection, index: number) => {
          if (!section.id) {
            sectionErrors.push(`Section ${index + 1} is missing an id`);
          }
          if (!section.title || !section.title.trim()) {
            sectionErrors.push(`Section ${index + 1} title is required`);
          }
          if (!section.instructions || !section.instructions.trim()) {
            sectionErrors.push(
              `Section ${index + 1} instructions are required`,
            );
          }
          if (
            !Array.isArray(section.ingredients) ||
            section.ingredients.length === 0
          ) {
            sectionErrors.push(
              `Section ${index + 1} must include at least one ingredient`,
            );
          } else {
            section.ingredients.forEach(
              (ingredient: RecipeIngredient, ingredientIndex: number) => {
                if (!ingredient.id || !ingredient.name) {
                  sectionErrors.push(
                    `Section ${index + 1} ingredient ${ingredientIndex + 1} must have an id and name`,
                  );
                }
                const normalizedAmount =
                  ingredient.amount === 0 ? null : ingredient.amount;
                if (
                  normalizedAmount !== null &&
                  (typeof normalizedAmount !== "number" ||
                    normalizedAmount <= 0)
                ) {
                  sectionErrors.push(
                    `Section ${index + 1} ingredient ${ingredientIndex + 1} amounts must be positive numbers or null`,
                  );
                }
              },
            );
          }

          return {
            ...section,
            title: section.title?.trim?.() ?? section.title,
            instructions: section.instructions,
            ingredients: Array.isArray(section.ingredients)
              ? section.ingredients.map(normalizeIngredient)
              : [],
          };
        },
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
    if (hasKey(bodyRecord, "utensils")) {
      updateData.utensils = normalizedUtensils ?? [];
    }
    if (hasKey(bodyRecord, "reference")) {
      updateData.reference =
        normalizedReference && normalizedReference.length > 0
          ? normalizedReference
          : null;
    }
    if (hasKey(bodyRecord, "pairing_wine")) {
      updateData.pairingWine =
        normalizedPairingWine && normalizedPairingWine.length > 0
          ? normalizedPairingWine
          : null;
    }
    if (hasKey(bodyRecord, "notes")) {
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
