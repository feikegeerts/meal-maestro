import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { NutritionService, buildCacheKey } from "@/lib/nutrition-service";
import { usageLimitService } from "@/lib/usage-limit-service";
import { usageTrackingService } from "@/lib/usage-tracking-service";
import type { Recipe } from "@/types/recipe";

const nutritionService = new NutritionService();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;

  try {
    const { id: recipeId } = await params;
    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 }
      );
    }

    const { locale, forceRefresh } = await request
      .json()
      .catch(() => ({ locale: undefined, forceRefresh: false }));

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("id, title, servings, ingredients, nutrition")
      .eq("id", recipeId)
      .eq("user_id", user.id)
      .single();

    if (error || !recipe) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: status === 404 ? "Recipe not found" : "Failed to fetch recipe details" },
        { status }
      );
    }

    const typedRecipe = recipe as unknown as Recipe;

    if (!Array.isArray(typedRecipe.ingredients) || typedRecipe.ingredients.length === 0) {
      return NextResponse.json(
        { error: "Recipe must have at least one ingredient to estimate nutrition" },
        { status: 400 }
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

    const { nutrition, cacheHit, usage } = await nutritionService.fetchWithChatGPT({
      recipe: recipeForCache,
      locale,
      forceRefresh,
      cacheKey,
    });

    if (!cacheHit && usage) {
      const usageLog = await usageTrackingService.logUsage(
        user.id,
        "/api/recipes/[id]/nutrition",
        usage
      );

      if (!usageLog.success) {
        console.warn("🟡 [Nutrition] Failed to log usage:", usageLog.error);
      } else if (usageLog.limitReached) {
        return NextResponse.json(
          {
            error:
              "Monthly AI usage limit reached. Nutrition estimates are temporarily unavailable.",
          },
          { status: 429 }
        );
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("recipes")
      .update({ nutrition })
      .eq("id", recipeId)
      .eq("user_id", user.id)
      .select("nutrition")
      .single();

    if (updateError || !updated) {
      console.error("[Nutrition] Failed to persist nutrition results:", updateError);
      return NextResponse.json(
        { error: "Failed to persist nutrition data" },
        { status: 500 }
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
      { status: 500 }
    );
  }
}
