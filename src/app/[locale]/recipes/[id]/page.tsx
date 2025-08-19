"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Recipe,
  RecipeCategory,
  RecipeSeason,
  formatIngredientDisplayWithTranslation,
} from "@/types/recipe";
import { useLocalizedDateFormatter } from "@/lib/date-utils";
import { ServingSizeSelector } from "@/components/serving-size-selector";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Utensils,
  Clock,
  Calendar,
  CalendarDays,
  Tag,
  ChefHat,
} from "lucide-react";
import { setRedirectUrl, processInstructions } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRecipeTranslations } from "@/messages";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getRecipeById, updateRecipe: updateRecipeInContext } = useRecipes();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const { formatDateWithFallback } = useLocalizedDateFormatter();
  const [displayRecipe, setDisplayRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const t = useTranslations("recipes");
  const tUnits = useTranslations("units");
  const { translateCategory, translateSeason, translateTag } =
    useRecipeTranslations();

  useEffect(() => {
    if (!authLoading && !user) {
      setRedirectUrl(`/recipes/${id}`);
      router.push("/");
      return;
    }
  }, [user, authLoading, router, id]);

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

    if (user) {
      loadRecipe();
    }
  }, [id, user, getRecipeById, t]);

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

  const handleMarkEaten = async () => {
    if (!recipe) return;

    setActionLoading("mark-eaten");
    try {
      const now = new Date().toISOString();
      const updatedRecipe = await updateRecipe({ last_eaten: now });
      setRecipe(updatedRecipe);
      setDisplayRecipe(updatedRecipe);
    } catch (error) {
      console.error("Error marking recipe as eaten:", error);
    } finally {
      setActionLoading(null);
    }
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

      router.push("/recipes");
    } catch (error) {
      console.error("Error deleting recipe:", error);
    } finally {
      setActionLoading(null);
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

  return (
    <PageWrapper maxWidth="7xl">
      <PageHeader
        recipe={recipe}
        backButtonText={t("back")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleMarkEaten}
              disabled={!!actionLoading}
              variant="outline"
              size="sm"
            >
              {actionLoading === "mark-eaten" ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t("marking")}
                </>
              ) : (
                <>
                  <Utensils className="mr-2 h-4 w-4" />
                  {t("markAsEatenDetail")}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!!actionLoading}
              onClick={handleEdit}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t("editDetail")}
            </Button>

            <Button
              onClick={handleDelete}
              disabled={!!actionLoading}
              variant="destructive"
              size="sm"
            >
              {actionLoading === "delete" ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t("deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("deleteDetail")}
                </>
              )}
            </Button>
          </div>
        }
        className="mb-4"
      />

      {/* Recipe Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl mb-1 sm:mb-2">
                {recipe.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <ChefHat className="mr-1 h-4 w-4" />
                  <span className="capitalize">
                    {translateCategory(recipe.category as RecipeCategory)}
                  </span>
                </div>
                {recipe.season && (
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span className="capitalize">
                      {translateSeason(recipe.season as RecipeSeason)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.cuisine && (
              <Badge variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("cuisine", recipe.cuisine)}
              </Badge>
            )}
            {recipe.diet_types?.map((dietType) => (
              <Badge key={dietType} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("dietType", dietType)}
              </Badge>
            ))}
            {recipe.cooking_methods?.map((method) => (
              <Badge key={method} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("cookingMethod", method)}
              </Badge>
            ))}
            {recipe.dish_types?.map((dishType) => (
              <Badge key={dishType} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("dishType", dishType)}
              </Badge>
            ))}
            {recipe.proteins?.map((protein) => (
              <Badge key={protein} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("protein", protein)}
              </Badge>
            ))}
            {recipe.occasions?.map((occasion) => (
              <Badge key={occasion} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("occasion", occasion)}
              </Badge>
            ))}
            {recipe.characteristics?.map((characteristic) => (
              <Badge
                key={characteristic}
                variant="secondary"
                className="text-xs"
              >
                <Tag className="mr-1 h-3 w-3" />
                {translateTag("characteristic", characteristic)}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Serving Size Selector */}
          {recipe && (
            <ServingSizeSelector
              recipe={recipe}
              onServingChange={(newServings, scaledRecipe) => {
                setDisplayRecipe(scaledRecipe);
              }}
              showPreview={false}
            />
          )}

          <Separator />

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("ingredients")}</h3>
            <ul className="space-y-2">
              {(displayRecipe || recipe)?.ingredients.map(
                (ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span>
                      {formatIngredientDisplayWithTranslation(
                        ingredient,
                        tUnits
                      )}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          <Separator />

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("instructions")}</h3>
            <div className="prose prose-sm max-w-none">
              {(() => {
                const processed = processInstructions(recipe.description);

                if (processed.isStepFormat && processed.steps.length > 1) {
                  return (
                    <ol className="space-y-3 list-decimal list-inside">
                      {processed.steps.map((step, index) => (
                        <li key={index} className="leading-relaxed pl-2">
                          <span className="ml-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  );
                } else {
                  return (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {processed.originalText}
                    </p>
                  );
                }
              })()}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <CalendarDays className="mr-1 h-4 w-4" />
              <span>
                {t("createdDetail")}:{" "}
                {formatDateWithFallback(recipe.created_at, t("never"))}
              </span>
            </div>
            <div className="flex items-center sm:justify-end">
              <Clock className="mr-1 h-4 w-4" />
              <span>
                {t("lastEatenDetail")}:{" "}
                {formatDateWithFallback(recipe.last_eaten, t("never"))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
