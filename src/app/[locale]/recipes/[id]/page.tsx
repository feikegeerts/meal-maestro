"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  useRecipeQuery,
  useUpdateRecipeMutation,
  useDeleteRecipeMutation,
} from "@/lib/hooks/use-recipes-query";
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

export default function RecipeDetailPage() {
  const { id } = useParams();
  const recipeId = typeof id === "string" ? id : "";
  const router = useRouter();
  const { loading: authLoading } = useAuth();

  const { data: recipe, isLoading, isError } = useRecipeQuery(recipeId);
  const updateMutation = useUpdateRecipeMutation();
  const deleteMutation = useDeleteRecipeMutation();

  const [displayRecipe, setDisplayRecipe] = useState<Recipe | null>(null);
  const { formatDateWithFallback } = useLocalizedDateFormatter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastEatenRecentlyUpdated, setLastEatenRecentlyUpdated] = useState(false);
  const t = useTranslations("recipes");
  const tUnits = useTranslations("units");
  const tIngredientPlurals = useTranslations("ingredientPlurals");
  const tNutrition = useTranslations("recipeForm.nutrition");
  const locale = useLocale();
  const [nutritionFetching, setNutritionFetching] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [nutritionCacheHit, setNutritionCacheHit] = useState<boolean | null>(null);
  const { translateCategory, translateSeason, translateTag } = useRecipeTranslations();

  const ingredientFormatter = useMemo(() => {
    const translationAdapter = createTranslationAdapter(tUnits, tIngredientPlurals);
    return new IngredientFormatterService(translationAdapter);
  }, [tUnits, tIngredientPlurals]);

  const canFetchNutrition = useMemo(() => {
    if (!recipe?.id) return false;
    if (!recipe?.servings || recipe.servings <= 0) return false;
    return recipe.ingredients.some(
      (ingredient) => ingredient.name && ingredient.name.trim().length > 0
    );
  }, [recipe]);

  const handleMarkEaten = async (date?: Date) => {
    if (!recipe) return;

    try {
      const dateToUse = toDateOnlyISOString(date);
      const result = await updateMutation.mutateAsync({
        id: recipe.id,
        data: { last_eaten: dateToUse },
      });
      setDisplayRecipe(result.recipe);
      setLastEatenRecentlyUpdated(true);
      setTimeout(() => setLastEatenRecentlyUpdated(false), 2000);
    } catch (error) {
      console.error("Error marking recipe as eaten:", error);
    }
  };

  const handleEdit = () => {
    if (recipe) {
      router.push(`/recipes/${recipe.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !confirm(t("confirmDelete"))) return;

    setActionLoading("delete");
    try {
      await deleteMutation.mutateAsync(recipe.id);
      router.push("/recipes");
    } catch (error) {
      console.error("Error deleting recipe:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetchNutrition = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      if (!recipe?.id) return;

      setNutritionFetching(true);
      setNutritionError(null);
      setNutritionCacheHit(null);

      try {
        const response = await fetch(`/api/recipes/${recipe.id}/nutrition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, forceRefresh }),
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

        setDisplayRecipe((prev) =>
          prev && prev.id === recipe.id
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
    [recipe?.id, locale, tNutrition]
  );

  const handleAddRecipe = () => {
    router.push("/recipes/add");
  };

  const handleImageUpdated = (imageUrl: string | null) => {
    if (recipe) {
      setDisplayRecipe({ ...recipe, image_url: imageUrl });
    }
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (isLoading) {
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

  if (isError || !recipe) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              {t("error")}
            </h1>
            <p className="text-muted-foreground mb-6">{t("failedToLoad")}</p>
            <Button onClick={() => router.push("/recipes")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToRecipes")}
            </Button>
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
      onMarkAsEatenToday={() => handleMarkEaten()}
      onMarkAsEatenOnDate={(date) => handleMarkEaten(date)}
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
    />
  );
}
