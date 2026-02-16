import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NutritionService, buildCacheKey } from "@/lib/nutrition-service";
import { usageLimitService } from "@/lib/usage-limit-service";
import { usageTrackingService } from "@/lib/usage-tracking-service";
import type { Recipe } from "@/types/recipe";

const nutritionService = new NutritionService();

export async function POST(
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

    const { locale, forceRefresh } = await request
      .json()
      .catch(() => ({ locale: undefined, forceRefresh: false }));

    const [recipe] = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        servings: recipes.servings,
        ingredients: recipes.ingredients,
        nutrition: recipes.nutrition,
      })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .limit(1);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    const typedRecipe = recipe as unknown as Recipe;

    if (
      !Array.isArray(typedRecipe.ingredients) ||
      typedRecipe.ingredients.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Recipe must have at least one ingredient to estimate nutrition",
        },
        { status: 400 },
      );
    }

    const recipeForCache = {
      title: typedRecipe.title,
      servings: typedRecipe.servings,
      ingredients: typedRecipe.ingredients,
      nutrition: typedRecipe.nutrition ?? null,
    };

    const cacheKey = buildCacheKey(recipeForCache);

    if (
      !forceRefresh &&
      typedRecipe.nutrition?.meta?.cacheKey &&
      typedRecipe.nutrition.meta.cacheKey === cacheKey
    ) {
      return NextResponse.json({
        nutrition: typedRecipe.nutrition,
        cacheHit: true,
      });
    }

    await usageLimitService.assertWithinMonthlyLimit(user.id);

    const { nutrition, cacheHit, usage } =
      await nutritionService.fetchWithChatGPT({
        recipe: recipeForCache,
        locale,
        forceRefresh,
        cacheKey,
      });

    if (!cacheHit && usage) {
      const usageLog = await usageTrackingService.logUsage(
        user.id,
        "/api/recipes/[id]/nutrition",
        usage,
      );

      if (!usageLog.success) {
        console.warn("🟡 [Nutrition] Failed to log usage:", usageLog.error);
      } else if (usageLog.limitReached) {
        return NextResponse.json(
          {
            error:
              "Monthly AI usage limit reached. Nutrition estimates are temporarily unavailable.",
          },
          { status: 429 },
        );
      }
    }

    const [updated] = await db
      .update(recipes)
      .set({ nutrition })
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .returning({ nutrition: recipes.nutrition });

    if (!updated) {
      console.error("[Nutrition] Failed to persist nutrition results");
      return NextResponse.json(
        { error: "Failed to persist nutrition data" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      nutrition: updated.nutrition,
      cacheHit,
    });
  } catch (error) {
    console.error("🔴 [Nutrition] API error:", error);
    return NextResponse.json(
      { error: "Failed to estimate nutrition" },
      { status: 500 },
    );
  }
}
