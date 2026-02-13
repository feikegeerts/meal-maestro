import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { and, desc, eq, ilike, or, sql, inArray, arrayOverlaps } from "drizzle-orm";
import {
  RecipeIngredient,
  RecipeSection,
  RecipesResponse,
} from "@/types/recipe";
import { toRecipeResponse } from "@/lib/recipe-response-mapper";
import {
  MAX_NOTES_LENGTH,
  MAX_PAIRING_WINE_LENGTH,
  MAX_REFERENCE_LENGTH,
  normalizeUtensils,
} from "@/lib/recipe-utils";

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

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") || undefined;
    const category = searchParams.get("category") || undefined;
    const season = searchParams.get("season") || undefined;
    const cuisineParam = searchParams.get("cuisine");
    const dietTypesParam = searchParams.get("diet_types");
    const cookingMethodsParam = searchParams.get("cooking_methods");
    const dishTypesParam = searchParams.get("dish_types");
    const proteinsParam = searchParams.get("proteins");
    const occasionsParam = searchParams.get("occasions");
    const characteristicsParam = searchParams.get("characteristics");

    const cuisine = cuisineParam || undefined;
    const dietTypes = dietTypesParam
      ? dietTypesParam.split(",").map((t) => t.trim())
      : undefined;
    const cookingMethods = cookingMethodsParam
      ? cookingMethodsParam.split(",").map((t) => t.trim())
      : undefined;
    const dishTypes = dishTypesParam
      ? dishTypesParam.split(",").map((t) => t.trim())
      : undefined;
    const proteins = proteinsParam
      ? proteinsParam.split(",").map((t) => t.trim())
      : undefined;
    const occasions = occasionsParam
      ? occasionsParam.split(",").map((t) => t.trim())
      : undefined;
    const characteristics = characteristicsParam
      ? characteristicsParam.split(",").map((t) => t.trim())
      : undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;

    // Build WHERE conditions
    const conditions = [eq(recipes.userId, user.id)];

    if (category) {
      conditions.push(sql`${recipes.category} = ${category}`);
    }

    if (season) {
      conditions.push(sql`${recipes.season} = ${season}`);
    }

    if (cuisine) {
      conditions.push(sql`${recipes.cuisine} = ${cuisine}`);
    }

    if (dietTypes && dietTypes.length > 0) {
      conditions.push(arrayOverlaps(recipes.dietTypes, dietTypes as (typeof recipes.dietTypes._.data)));
    }

    if (cookingMethods && cookingMethods.length > 0) {
      conditions.push(arrayOverlaps(recipes.cookingMethods, cookingMethods as (typeof recipes.cookingMethods._.data)));
    }

    if (dishTypes && dishTypes.length > 0) {
      conditions.push(arrayOverlaps(recipes.dishTypes, dishTypes as (typeof recipes.dishTypes._.data)));
    }

    if (proteins && proteins.length > 0) {
      conditions.push(arrayOverlaps(recipes.proteins, proteins as (typeof recipes.proteins._.data)));
    }

    if (occasions && occasions.length > 0) {
      conditions.push(arrayOverlaps(recipes.occasions, occasions as (typeof recipes.occasions._.data)));
    }

    if (characteristics && characteristics.length > 0) {
      conditions.push(arrayOverlaps(recipes.characteristics, characteristics as (typeof recipes.characteristics._.data)));
    }

    if (query) {
      const likePattern = `%${query}%`;
      const searchConditions = [
        ilike(recipes.title, likePattern),
        ilike(recipes.description, likePattern),
        ilike(recipes.reference, likePattern),
        ilike(recipes.pairingWine, likePattern),
        ilike(recipes.notes, likePattern),
        // Search ingredients JSONB array for matching names
        sql`${recipes.ingredients}::text ILIKE ${likePattern}`,
        // Search utensils text array
        sql`array_to_string(${recipes.utensils}, ',') ILIKE ${likePattern}`,
      ];

      const numericQuery = Number(query);
      if (Number.isFinite(numericQuery)) {
        searchConditions.push(eq(recipes.prepTime, numericQuery));
        searchConditions.push(eq(recipes.cookTime, numericQuery));
        searchConditions.push(eq(recipes.totalTime, numericQuery));
      }

      conditions.push(or(...searchConditions)!);
    }

    const result = await db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.createdAt))
      .limit(limit);

    const response: RecipesResponse = {
      recipes: result.map(toRecipeResponse),
      total: result.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in recipes API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
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

    const hasSections = Array.isArray(sections) && sections.length > 0;
    const bodyRecord = (body || {}) as Record<string, unknown>;
    const validationErrors: string[] = [];

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
    const normalizedUtensils =
      normalizeUtensils(utensils, validationErrors) ?? [];

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

    if (!title || !category || !servings) {
      return NextResponse.json(
        { error: "Missing required fields: title, servings, category" },
        { status: 400 },
      );
    }

    if ((!ingredients || ingredients.length === 0) && !hasSections) {
      return NextResponse.json(
        {
          error:
            "At least one ingredient is required unless sections are provided",
        },
        { status: 400 },
      );
    }

    if ((!description || description.trim().length === 0) && !hasSections) {
      return NextResponse.json(
        { error: "Description is required unless sections are provided" },
        { status: 400 },
      );
    }

    const ingredientsArray = Array.isArray(ingredients) ? ingredients : [];

    // Validate structured ingredients
    if (!Array.isArray(ingredients) && !hasSections) {
      return NextResponse.json(
        {
          error:
            "Ingredients must be an array of structured ingredient objects",
        },
        { status: 400 },
      );
    }

    if (Array.isArray(ingredients)) {
      for (const ingredient of ingredientsArray) {
        if (!ingredient.id || !ingredient.name) {
          return NextResponse.json(
            { error: "Each ingredient must have an id and name" },
            { status: 400 },
          );
        }
        // Normalize amount: treat 0 as null for "to taste" scenarios
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
    }

    const normalizeIngredient = (
      ingredient: RecipeIngredient,
    ): RecipeIngredient => {
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
            normalizedUnit = "clove"; // Convert Dutch garlic clove unit to English
            break;
          case "stuk":
          case "stuks":
          case "units.stuk":
          case "pieces":
            normalizedUnit = null; // Remove unit for countable items
            break;
          default: {
            // Keep valid units, set invalid ones to null
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
        amount:
          ingredient.amount === 0 || typeof ingredient.amount === "undefined"
            ? null
            : ingredient.amount,
        unit: normalizedUnit,
      };
    };

    // Normalize ingredient amounts and units
    const normalizedIngredients = ingredientsArray.map(normalizeIngredient);

    // Validate and normalize sections
    let normalizedSections: RecipeSection[] | undefined;
    if (hasSections) {
      if (!Array.isArray(sections)) {
        return NextResponse.json(
          { error: "Sections must be an array when provided" },
          { status: 400 },
        );
      }

      const sectionErrors: string[] = [];
      normalizedSections = (sections as RecipeSection[]).map(
        (section, index: number) => {
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
                    `Section ${index + 1} ingredient ${
                      ingredientIndex + 1
                    } must have an id and name`,
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
                    `Section ${index + 1} ingredient ${
                      ingredientIndex + 1
                    } amounts must be positive numbers or null`,
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
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join("; ") },
        { status: 400 },
      );
    }

    const descriptionToStore =
      description && description.trim().length > 0
        ? description
        : hasSections
          ? (normalizedSections
              ?.map((section) =>
                section.title
                  ? `${section.title}: ${section.instructions}`
                  : section.instructions,
              )
              .join("\n\n") ?? "")
          : "";

    const [recipe] = await db
      .insert(recipes)
      .values({
        title,
        ingredients: normalizedIngredients,
        sections: normalizedSections ?? [],
        servings: parseInt(servings),
        description: descriptionToStore,
        reference:
          normalizedReference && normalizedReference.length > 0
            ? normalizedReference
            : null,
        prepTime: (normalizedPrepTime as number) ?? null,
        cookTime: (normalizedCookTime as number) ?? null,
        totalTime: (normalizedTotalTime as number) ?? null,
        pairingWine:
          normalizedPairingWine && normalizedPairingWine.length > 0
            ? normalizedPairingWine
            : null,
        notes:
          normalizedNotes && normalizedNotes.trim().length > 0
            ? normalizedNotes.trim()
            : null,
        utensils: normalizedUtensils,
        category,
        cuisine,
        dietTypes: diet_types || [],
        cookingMethods: cooking_methods || [],
        dishTypes: dish_types || [],
        proteins: proteins || [],
        occasions: occasions || [],
        characteristics: characteristics || [],
        season,
        nutrition: nutrition ?? null,
        userId: user.id,
      })
      .returning();

    return NextResponse.json(
      { recipe: toRecipeResponse(recipe), success: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error in recipe creation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Recipe IDs array is required" },
        { status: 400 },
      );
    }

    const deletedRecipes = await db
      .delete(recipes)
      .where(and(eq(recipes.userId, user.id), inArray(recipes.id, ids)))
      .returning({ id: recipes.id });

    return NextResponse.json({
      success: true,
      deletedCount: deletedRecipes.length,
      deletedIds: deletedRecipes.map((r) => r.id),
    });
  } catch (error) {
    console.error("Unexpected error in bulk delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Recipe IDs array is required" },
        { status: 400 },
      );
    }

    if (action === "mark_as_eaten") {
      const { date } = body;
      const dateToUse = date || new Date().toISOString();
      const updatedRecipes = await db
        .update(recipes)
        .set({ lastEaten: new Date(dateToUse) })
        .where(and(eq(recipes.userId, user.id), inArray(recipes.id, ids)))
        .returning({ id: recipes.id });

      return NextResponse.json({
        success: true,
        updatedCount: updatedRecipes.length,
        updatedIds: updatedRecipes.map((r) => r.id),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Unexpected error in bulk update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
