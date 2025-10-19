"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recipe } from "@/types/recipe";
import { useLocalizedDateFormatter } from "@/lib/date-utils";
import { ArrowLeft, Plus } from "lucide-react";
import { toDateOnlyISOString } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useRecipeTranslations } from "@/messages";
import {
  IngredientFormatterService,
  createTranslationAdapter,
} from "@/utils/ingredient-pluralization";
import { RecipeImageUpload } from "@/components/recipe-image-upload";
import { RecipeDetailView } from "@/components/recipes/recipe-detail-view";
import { ShareRecipeButton } from "@/components/recipes/share-recipe-button";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    getRecipeById,
    updateRecipe: updateRecipeInContext,
    removeRecipe,
  } = useRecipes();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const { formatDateWithFallback } = useLocalizedDateFormatter();
  const [displayRecipe, setDisplayRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastEatenRecentlyUpdated, setLastEatenRecentlyUpdated] =
    useState(false);
  const t = useTranslations("recipes");
  const tUnits = useTranslations("units");
  const tIngredientPlurals = useTranslations("ingredientPlurals");
  const tNutrition = useTranslations("recipeForm.nutrition");
  const locale = useLocale();
  const [nutritionFetching, setNutritionFetching] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [nutritionCacheHit, setNutritionCacheHit] = useState<boolean | null>(
    null
  );
  const { translateCategory, translateSeason, translateTag } =
    useRecipeTranslations();

  // Create ingredient formatter service with proper dependency injection
  const ingredientFormatter = useMemo(() => {
    const translationAdapter = createTranslationAdapter(
      tUnits,
      tIngredientPlurals
    );
    return new IngredientFormatterService(translationAdapter);
  }, [tUnits, tIngredientPlurals]);
  const recipeId = recipe?.id ?? null;
  const canFetchNutrition = useMemo(() => {
    if (!recipeId) return false;
    if (!recipe?.servings || recipe.servings <= 0) return false;
    return recipe.ingredients.some(
      (ingredient) => ingredient.name && ingredient.name.trim().length > 0
    );
  }, [recipeId, recipe]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
  }, [user, authLoading, router, id]);

  useEffect(() => {
    if (recipeId) {
      setNutritionCacheHit(null);
      setNutritionError(null);
    }
  }, [recipeId]);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id || typeof id !== "string") {
        setError(t("invalidRecipeId"));
        setLoading(false);
        return;
      }

      try {
        setError(null);

        const contextRecipe = getRecipeById(id);
        if (contextRecipe) {
          setRecipe(contextRecipe);
          setDisplayRecipe(contextRecipe);
          setLoading(false);
          return;
        }

        setLoading(true);

        // Fallback to API call
        const response = await fetch(`/api/recipes/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(t("recipeNotFound"));
          } else {
            setError(t("failedToLoad"));
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setRecipe(data.recipe);
        setDisplayRecipe(data.recipe);
      } catch (error) {
        console.error("Error loading recipe:", error);
        setError(t("failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadRecipe();
    }
  }, [id, user?.id, getRecipeById, t]);

  const updateRecipe = async (
    updateData: Partial<import("@/types/recipe").RecipeInput>
  ) => {
    if (!recipe) throw new Error("Recipe not found");

    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update recipe");
    }

    const data = await response.json();

    // Update context if available
    updateRecipeInContext?.(recipe.id, data.recipe);

    return data.recipe;
  };

  const handleMarkEaten = async (date?: Date) => {
    if (!recipe) return;

    try {
      const dateToUse = toDateOnlyISOString(date);
      const updatedRecipe = await updateRecipe({ last_eaten: dateToUse });
      setRecipe(updatedRecipe);
      setDisplayRecipe(updatedRecipe);

      // Trigger green fade animation
      setLastEatenRecentlyUpdated(true);
      setTimeout(() => setLastEatenRecentlyUpdated(false), 2000);
    } catch (error) {
      console.error("Error marking recipe as eaten:", error);
    }
  };

  const handleMarkEatenToday = () => {
    handleMarkEaten();
  };

  const handleMarkEatenOnDate = (date: Date) => {
    handleMarkEaten(date);
  };

  const handleEdit = () => {
    if (recipe) {
      router.push(`/recipes/${recipe.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !confirm(t("confirmDelete"))) {
      return;
    }

    setActionLoading("delete");
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t("failedToDelete"));
      }

      // Update context to remove the deleted recipe
      removeRecipe(recipe.id);

      router.push("/recipes");
    } catch (error) {
      console.error("Error deleting recipe:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetchNutrition = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      if (!recipeId) return;

      setNutritionFetching(true);
      setNutritionError(null);
      setNutritionCacheHit(null);

      try {
        const response = await fetch(`/api/recipes/${recipeId}/nutrition`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            forceRefresh,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : tNutrition("errorFallback")
          );
        }

        if (!payload?.nutrition) {
          throw new Error(tNutrition("errorFallback"));
        }

        setRecipe((prev) =>
          prev && prev.id === recipeId
            ? { ...prev, nutrition: payload.nutrition }
            : prev
        );
        setDisplayRecipe((prev) =>
          prev && prev.id === recipeId
            ? { ...prev, nutrition: payload.nutrition }
            : prev
        );
        setNutritionCacheHit(Boolean(payload.cacheHit));
      } catch (error) {
        const fallback = tNutrition("errorFallback");
        const message =
          error instanceof Error ? error.message || fallback : fallback;
        setNutritionError(message);
      } finally {
        setNutritionFetching(false);
      }
    },
    [recipeId, locale, tNutrition]
  );

  const handleAddRecipe = () => {
    router.push("/recipes/add");
  };

  const handleImageUpdated = (imageUrl: string | null) => {
    if (recipe) {
      const updatedRecipe = { ...recipe, image_url: imageUrl };
      setRecipe(updatedRecipe);
      setDisplayRecipe(updatedRecipe);
      updateRecipeInContext?.(recipe.id, updatedRecipe);
    }
  };

  if (authLoading || loading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              {t("error")}
            </h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/recipes")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToRecipes")}
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!recipe) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Separator />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const headerActions = (
    <Button
      onClick={handleAddRecipe}
      disabled={!!actionLoading}
      variant="outline"
      size="default"
    >
      <Plus className="mr-2 h-4 w-4" />
      {t("addRecipe")}
    </Button>
  );

  const displayRecipeValue = displayRecipe ?? recipe;

  return (
    <RecipeDetailView
      recipe={recipe}
      displayRecipe={displayRecipeValue}
      ingredientFormatter={ingredientFormatter}
      translateCategory={translateCategory}
      translateSeason={translateSeason}
      translateTag={translateTag}
      formatDateWithFallback={(date, fallback) =>
        formatDateWithFallback(date ?? undefined, fallback)
      }
      t={t}
      tUnits={tUnits}
      tNutrition={tNutrition}
      onFetchNutrition={handleFetchNutrition}
      canFetchNutrition={canFetchNutrition}
      nutritionFetching={nutritionFetching}
      nutritionError={nutritionError}
      nutritionCacheHit={nutritionCacheHit}
      lastEatenRecentlyUpdated={lastEatenRecentlyUpdated}
      actionLoading={actionLoading}
      onMarkAsEatenToday={handleMarkEatenToday}
      onMarkAsEatenOnDate={handleMarkEatenOnDate}
      onEdit={handleEdit}
      onDelete={handleDelete}
      headerActions={headerActions}
      onServingChange={(scaledRecipe) => setDisplayRecipe(scaledRecipe)}
      renderImage={
        <RecipeImageUpload
          recipeId={recipe.id}
          currentImageUrl={recipe.image_url}
          recipeTitle={recipe.title}
          onImageUpdated={handleImageUpdated}
        />
      }
      additionalActionButtons={
        <ShareRecipeButton
          recipeId={recipe.id}
          disabled={!!actionLoading}
        />
      }
    />
  );
}
