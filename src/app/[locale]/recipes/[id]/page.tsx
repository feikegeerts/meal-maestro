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
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Recipe, RecipeCategory, RecipeSeason } from "@/types/recipe";
import { useLocalizedDateFormatter } from "@/lib/date-utils";
import { ServingSizeSelector } from "@/components/serving-size-selector";
import Image from "next/image";
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
  Plus,
  Camera,
} from "lucide-react";
import { setRedirectUrl, processInstructions } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRecipeTranslations } from "@/messages";

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

      // Update context to remove the deleted recipe
      removeRecipe(recipe.id);

      router.push("/recipes");
    } catch (error) {
      console.error("Error deleting recipe:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddRecipe = () => {
    router.push("/recipes/add");
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
    <PageWrapper>
      <PageHeader
        recipe={recipe}
        backButtonText={t("back")}
        className="mb-4"
        actions={
          <Button
            onClick={handleAddRecipe}
            disabled={!!actionLoading}
            variant="outline"
            size="default"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addRecipe")}
          </Button>
        }
      />

      {/* Recipe Hero Section */}
      <Card className="mb-8">
        <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
            {/* Content - Left side */}
            <div className="order-2 lg:order-1 space-y-6 lg:col-span-2">
              {/* Title & Category Section */}
              <div>
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                  {recipe.title}
                </CardTitle>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ChefHat className="h-4 w-4" />
                    <span className="text-sm capitalize">
                      {translateCategory(recipe.category as RecipeCategory)}
                    </span>
                  </div>
                  {recipe.season && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm capitalize">
                        {translateSeason(recipe.season as RecipeSeason)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap mt-6">
                <Button
                  onClick={handleMarkEaten}
                  disabled={!!actionLoading}
                  variant="default"
                  size="default"
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
                  size="default"
                  disabled={!!actionLoading}
                  onClick={handleEdit}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("editDetail")}
                </Button>

                <Button
                  onClick={handleDelete}
                  disabled={!!actionLoading}
                  variant="ghost"
                  size="default"
                  className="text-destructive hover:text-destructive"
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

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-6">
                {recipe.cuisine && (
                  <Badge variant="secondary" className="text-sm px-3 py-2">
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("cuisine", recipe.cuisine)}
                  </Badge>
                )}
                {recipe.diet_types?.map((dietType) => (
                  <Badge
                    key={dietType}
                    variant="secondary"
                    className="text-sm px-3 py-2"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("dietType", dietType)}
                  </Badge>
                ))}
                {recipe.cooking_methods?.map((method) => (
                  <Badge
                    key={method}
                    variant="secondary"
                    className="text-sm px-3 py-2"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("cookingMethod", method)}
                  </Badge>
                ))}
                {recipe.dish_types?.map((dishType) => (
                  <Badge
                    key={dishType}
                    variant="secondary"
                    className="text-sm px-3 py-2"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("dishType", dishType)}
                  </Badge>
                ))}
                {recipe.proteins?.map((protein) => (
                  <Badge
                    key={protein}
                    variant="secondary"
                    className="text-sm px-3 py-2"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("protein", protein)}
                  </Badge>
                ))}
                {recipe.occasions?.map((occasion) => (
                  <Badge
                    key={occasion}
                    variant="secondary"
                    className="text-sm px-3 py-2"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("occasion", occasion)}
                  </Badge>
                ))}
                {recipe.characteristics?.map((characteristic) => (
                  <Badge
                    key={characteristic}
                    variant="secondary"
                    className="text-sm px-3 py-2"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {translateTag("characteristic", characteristic)}
                  </Badge>
                ))}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 gap-3 text-sm mt-8">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("createdDetail")}:
                  </span>
                  <span className="font-medium">
                    {formatDateWithFallback(recipe.created_at, t("never"))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("lastEatenDetail")}:
                  </span>
                  <span className="font-medium">
                    {formatDateWithFallback(recipe.last_eaten, t("never"))}
                  </span>
                </div>
              </div>
            </div>

            {/* Large Hero Image - Right side */}
            <div className="order-1 lg:order-2 lg:col-span-3 relative h-64 sm:h-80 lg:h-[600px] group">
              <Image
                src="/placeholder-image.webp"
                alt={`Recipe: ${recipe.title}`}
                fill
                className="rounded-xl object-cover shadow-lg"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 50vw"
              />

              {/* Upload Photo Button Overlay */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="bg-white/90 hover:bg-white text-gray-900 font-semibold shadow-lg"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Add Photo
                    </Button>
                  </div>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Photo uploads coming soon!
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Recipe photos are currently under development and will be
                      available in a future update. Stay tuned!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogAction>OK</AlertDialogAction>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Card Layout */}
      <Card>
        <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Left Column - Ingredients */}
            <div className="lg:col-span-2 bg-primary/10 rounded-lg p-5">
              <h2 className="text-xl font-semibold mb-4">{t("ingredients")}</h2>

              {/* Serving Size Selector */}
              {recipe && (
                <div className="mb-4">
                  <ServingSizeSelector
                    recipe={recipe}
                    onServingChange={(_, scaledRecipe) => {
                      setDisplayRecipe(scaledRecipe);
                    }}
                    showPreview={false}
                  />
                </div>
              )}

              {/* Ingredients List */}
              <div className="space-y-1">
                {(displayRecipe || recipe)?.ingredients.map(
                  (ingredient, index) => {
                    // Format amount and unit
                    const amountText = ingredient.amount
                      ? `${ingredient.amount}${
                          ingredient.unit
                            ? ` ${tUnits(ingredient.unit) || ingredient.unit}`
                            : ""
                        }`
                      : ingredient.unit
                      ? tUnits(ingredient.unit) || ingredient.unit
                      : "";

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-3 items-start py-1"
                      >
                        <div className="col-span-4 text-right">
                          <span className="font-semibold text-sm">
                            {amountText}
                          </span>
                        </div>
                        <div className="col-span-8">
                          <span className="text-sm leading-relaxed">
                            {ingredient.name}
                            {ingredient.notes && (
                              <span className="text-muted-foreground ml-1">
                                ({ingredient.notes})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Right Column - Instructions */}
            <div className="lg:col-span-5">
              <h2 className="text-xl font-semibold mb-5 mt-5">
                {t("gettingStarted")}
              </h2>

              {/* Instructions */}
              <div className="prose prose-sm max-w-none mb-5">
                {(() => {
                  const processed = processInstructions(recipe.description);

                  if (processed.isStepFormat && processed.steps.length > 1) {
                    return (
                      <div className="space-y-5">
                        {/* Numbered steps */}
                        {processed.steps.map((step, index) => (
                          <div key={index} className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-9 h-9 bg-card border-2 border-primary text-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                              {index + 1}
                            </div>
                            <p className="leading-relaxed text-base">{step}</p>
                          </div>
                        ))}

                        {/* Descriptive text (if any) */}
                        {processed.descriptiveText &&
                          processed.descriptiveText.length > 0 && (
                            <div className="mt-6 space-y-3">
                              {processed.descriptiveText.map((text, index) => (
                                <p
                                  key={`desc-${index}`}
                                  className="leading-relaxed text-base pl-13"
                                >
                                  {text}
                                </p>
                              ))}
                            </div>
                          )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-9 h-9 bg-card border-2 border-primary text-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                          1
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-base">
                          {processed.originalText}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
