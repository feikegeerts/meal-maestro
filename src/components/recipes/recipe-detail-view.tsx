"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ServingSizeSelector } from "@/components/serving-size-selector";
import { MarkAsEatenSplitButton } from "@/components/recipes/mark-as-eaten-split-button";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Clock,
  Edit,
  Printer,
  Tag,
  Trash2,
} from "lucide-react";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import type { Recipe, RecipeCategory, RecipeSeason } from "@/types/recipe";
import {
  formatFraction,
  normalizeIngredientUnit,
  pluralizeUnit,
} from "@/lib/recipe-utils";
import { processInstructions } from "@/lib/utils";
import type { IngredientFormatterService } from "@/utils/ingredient-pluralization";

interface RecipeDetailViewProps {
  recipe: Recipe;
  displayRecipe: Recipe;
  onServingChange?: (scaledRecipe: Recipe) => void;
  headerActions?: React.ReactNode;
  banner?: React.ReactNode;
  ingredientFormatter: IngredientFormatterService;
  translateCategory: (category: RecipeCategory) => string;
  translateSeason: (season: RecipeSeason) => string;
  translateTag: (type: string, value: string) => string;
  formatDateWithFallback: (
    date: string | null | undefined,
    fallback: string
  ) => string;
  t: (key: string) => string;
  tUnits: (key: string) => string;
  lastEatenRecentlyUpdated?: boolean;
  actionLoading?: string | null;
  onMarkAsEatenToday?: () => void;
  onMarkAsEatenOnDate?: (date: Date) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  renderImage?: React.ReactNode;
  isLoading?: boolean;
  errorMessage?: string | null;
  onNavigateBack?: () => void;
  additionalActionButtons?: React.ReactNode;
}

export function RecipeDetailView({
  recipe,
  displayRecipe,
  onServingChange,
  headerActions,
  banner,
  ingredientFormatter,
  translateCategory,
  translateSeason,
  translateTag,
  formatDateWithFallback,
  t,
  tUnits,
  lastEatenRecentlyUpdated = false,
  actionLoading = null,
  onMarkAsEatenToday,
  onMarkAsEatenOnDate,
  onEdit,
  onDelete,
  renderImage,
  isLoading = false,
  errorMessage = null,
  onNavigateBack,
  additionalActionButtons,
}: RecipeDetailViewProps) {
  const processedInstructions = useMemo(
    () => processInstructions(recipe.description),
    [recipe.description]
  );

  if (isLoading) {
    return <SkeletonRecipeView />;
  }

  if (errorMessage) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              {t("error")}
            </h1>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            {onNavigateBack && (
              <Button onClick={onNavigateBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("backToRecipes")}
              </Button>
            )}
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
        actions={headerActions}
      />

      <Card className="mb-8">
        <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
            <div className="order-2 lg:order-1 space-y-6 lg:col-span-2">
              <div>
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                  {recipe.title}
                </CardTitle>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ChefHatIcon className="h-4 w-4" width={16} height={16} />
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

              {(onMarkAsEatenToday ||
                onEdit ||
                onDelete ||
                additionalActionButtons ||
                banner) && (
                <div className="space-y-3 mt-6">
                  {banner && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      {banner}
                    </div>
                  )}

                  {onMarkAsEatenToday && onMarkAsEatenOnDate && (
                    <div className="flex items-center">
                      <MarkAsEatenSplitButton
                        onMarkAsEatenToday={onMarkAsEatenToday}
                        onMarkAsEatenOnDate={onMarkAsEatenOnDate}
                        disabled={!!actionLoading}
                      />
                    </div>
                  )}

                  {(onEdit || onDelete || additionalActionButtons) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="default"
                          disabled={!!actionLoading}
                          onClick={onEdit}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t("editDetail")}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.print()}
                        title={t("printRecipe")}
                        aria-label={t("printRecipe")}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>

                      {additionalActionButtons}

                      {onDelete && (
                        <Button
                          onClick={onDelete}
                          disabled={!!actionLoading}
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title={t("deleteDetail")}
                        >
                          {actionLoading === "delete" ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                  <span
                    className={`font-medium transition-colors duration-2000 ${
                      lastEatenRecentlyUpdated ? "text-green-600" : ""
                    }`}
                  >
                    {formatDateWithFallback(recipe.last_eaten, t("never"))}
                  </span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-3">
              {renderImage}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="lg:col-span-2 bg-primary/10 rounded-lg p-5">
              <h2 className="text-xl font-semibold mb-4">{t("ingredients")}</h2>

              {onServingChange && (
                <div className="mb-4">
                  <ServingSizeSelector
                    recipe={recipe}
                    onServingChange={(_, scaledRecipe) =>
                      onServingChange(scaledRecipe)
                    }
                    showPreview={false}
                  />
                </div>
              )}

              <div className="space-y-1">
                {displayRecipe.ingredients.map((ingredient, index) => {
                  let amountText = "";
                  let ingredientNameWithNotes = ingredient.name;

                  const hasAmount =
                    ingredient.amount !== null &&
                    Number.isFinite(ingredient.amount);

                  if (hasAmount && ingredient.amount !== null) {
                    const smartResult = normalizeIngredientUnit(
                      ingredient.amount,
                      ingredient.unit
                    );
                    const finalAmount =
                      smartResult?.amount ?? ingredient.amount;
                    const finalUnit = smartResult?.unit ?? ingredient.unit;
                    const pluralizedUnit = pluralizeUnit(
                      finalUnit,
                      finalAmount
                    );

                    amountText = formatFraction(finalAmount);
                    if (pluralizedUnit) {
                      const standardUnits = [
                        "g",
                        "kg",
                        "ml",
                        "l",
                        "tbsp",
                        "tsp",
                        "clove",
                        "cloves",
                      ];
                      const isStandardUnit =
                        standardUnits.includes(pluralizedUnit);
                      const translatedUnit = isStandardUnit
                        ? tUnits(pluralizedUnit) || pluralizedUnit
                        : pluralizedUnit;
                      amountText += ` ${translatedUnit}`;
                    }

                    if (finalAmount > 1) {
                      ingredientNameWithNotes =
                        ingredientFormatter.pluralizeIngredientName(
                          ingredient.name
                        );
                    } else if (finalAmount === 1) {
                      ingredientNameWithNotes =
                        ingredientFormatter.singularizeIngredientName(
                          ingredient.name
                        );
                    }
                  } else if (ingredient.unit) {
                    amountText = tUnits(ingredient.unit) || ingredient.unit;
                  }

                  if (ingredient.notes) {
                    ingredientNameWithNotes += ` (${ingredient.notes})`;
                  }

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
                          {ingredientNameWithNotes}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5">
              <h2 className="text-xl font-semibold mb-5 mt-5">
                {t("gettingStarted")}
              </h2>

              <div className="prose prose-sm max-w-none mb-5">
                {processedInstructions.isStepFormat &&
                processedInstructions.steps.length > 1 ? (
                  <div className="space-y-5">
                    {processedInstructions.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-9 h-9 bg-card border-2 border-primary text-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                          {index + 1}
                        </div>
                        <p className="leading-relaxed text-base">{step}</p>
                      </div>
                    ))}

                    {processedInstructions.descriptiveText &&
                      processedInstructions.descriptiveText.length > 0 && (
                        <div className="mt-6 space-y-3">
                          {processedInstructions.descriptiveText.map(
                            (text, index) => (
                              <p
                                key={`desc-${index}`}
                                className="leading-relaxed text-base pl-13"
                              >
                                {text}
                              </p>
                            )
                          )}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-9 h-9 bg-card border-2 border-primary text-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                      1
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-base">
                      {processedInstructions.originalText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

function SkeletonRecipeView() {
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
