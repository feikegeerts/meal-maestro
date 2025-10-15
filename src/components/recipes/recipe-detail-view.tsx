"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Loader2,
  RefreshCcw,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import type {
  Recipe,
  RecipeCategory,
  RecipeSeason,
  RecipeNutritionValues,
} from "@/types/recipe";
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
  tNutrition?: (key: string) => string;
  onFetchNutrition?: (options?: { forceRefresh?: boolean }) => void;
  canFetchNutrition?: boolean;
  nutritionFetching?: boolean;
  nutritionError?: string | null;
  nutritionCacheHit?: boolean | null;
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

type NutrientDefinition = {
  key: keyof RecipeNutritionValues;
  unit: string;
  decimals: number;
  label: string;
  optional?: boolean;
};

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
  tNutrition,
  onFetchNutrition,
  canFetchNutrition = false,
  nutritionFetching = false,
  nutritionError = null,
  nutritionCacheHit = null,
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
  const nutrition = displayRecipe.nutrition ?? recipe.nutrition ?? null;
  const showFetchButton = Boolean(tNutrition && onFetchNutrition);
  const fetchLabel = tNutrition
    ? nutrition
      ? tNutrition("refetch")
      : tNutrition("fetch")
    : "";
  const fetchingLabel = tNutrition ? tNutrition("fetching") : "";
  const nutrientDefinitions = useMemo<NutrientDefinition[]>(() => {
    if (!tNutrition) return [];
    return [
      {
        key: "calories",
        unit: "kcal",
        decimals: 0,
        label: tNutrition("nutrients.calories"),
      },
      {
        key: "protein",
        unit: "g",
        decimals: 1,
        label: tNutrition("nutrients.protein"),
      },
      {
        key: "carbohydrates",
        unit: "g",
        decimals: 1,
        label: tNutrition("nutrients.carbohydrates"),
      },
      {
        key: "fat",
        unit: "g",
        decimals: 1,
        label: tNutrition("nutrients.fat"),
      },
      {
        key: "saturatedFat",
        unit: "g",
        decimals: 1,
        label: tNutrition("nutrients.saturatedFat"),
      },
      {
        key: "fiber",
        unit: "g",
        decimals: 1,
        label: tNutrition("nutrients.fiber"),
      },
      {
        key: "sugars",
        unit: "g",
        decimals: 1,
        label: tNutrition("nutrients.sugars"),
      },
      {
        key: "sodium",
        unit: "mg",
        decimals: 0,
        label: tNutrition("nutrients.sodium"),
      },
      {
        key: "cholesterol",
        unit: "mg",
        decimals: 0,
        label: tNutrition("nutrients.cholesterol"),
        optional: true,
      },
    ];
  }, [tNutrition]);

  const formatNutrientValue = (
    value: number | undefined,
    unit: string,
    decimals: number
  ): string => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "–";
    }
    const fixed =
      decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals);
    return `${fixed} ${unit}`;
  };

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

      {tNutrition && (
        <Card className="mt-8">
          <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8 space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {tNutrition("title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tNutrition("description")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="self-start bg-primary/10 text-primary">
                  {tNutrition("badge")}
                </Badge>
                {showFetchButton && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      nutritionFetching || !canFetchNutrition || !onFetchNutrition
                    }
                    onClick={() =>
                      onFetchNutrition?.({
                        forceRefresh: nutritionCacheHit === true,
                      })
                    }
                    className="min-w-[180px]"
                  >
                    {nutritionFetching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {fetchingLabel}
                      </>
                    ) : nutrition ? (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {fetchLabel}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {fetchLabel}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {nutritionCacheHit && (
              <Alert className="border-muted-foreground/20 bg-muted/40">
                <Info className="h-4 w-4" />
                <AlertTitle>{tNutrition("cacheHit.title")}</AlertTitle>
                <AlertDescription>
                  {tNutrition("cacheHit.body")}
                </AlertDescription>
              </Alert>
            )}

            {nutritionError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{tNutrition("errorTitle")}</AlertTitle>
                <AlertDescription>{nutritionError}</AlertDescription>
              </Alert>
            )}

            {showFetchButton && !canFetchNutrition && (
              <Alert className="border-sky-500/30 bg-sky-500/10">
                <Info className="h-4 w-4 text-sky-600" />
                <AlertTitle>{tNutrition("needsIngredients.title")}</AlertTitle>
                <AlertDescription>
                  {tNutrition("needsIngredients.body")}
                </AlertDescription>
              </Alert>
            )}

            {nutrition ? (
              <div className="mx-auto w-full max-w-3xl space-y-4 text-sm">
                <div className="overflow-hidden rounded-lg border border-border/50">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-muted/40 text-xs font-medium sm:text-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-foreground">
                          {tNutrition("results.heading")}
                        </th>
                        <th className="px-4 py-3 text-right text-muted-foreground">
                          {tNutrition("results.whole")}
                        </th>
                        <th className="px-4 py-3 text-right text-muted-foreground">
                          {tNutrition("results.perPortion")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {nutrientDefinitions
                        .map((definition) => {
                          const totalValue = nutrition.totals[definition.key];
                          const perPortionValue =
                            nutrition.perPortion[definition.key];
                          if (
                            definition.optional &&
                            typeof totalValue !== "number" &&
                            typeof perPortionValue !== "number"
                          ) {
                            return null;
                          }
                          return (
                            <tr key={definition.key}>
                              <th
                                scope="row"
                                className="px-4 py-3 text-left font-medium text-foreground"
                              >
                                {definition.label}
                              </th>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {formatNutrientValue(
                                  typeof totalValue === "number"
                                    ? totalValue
                                    : undefined,
                                  definition.unit,
                                  definition.decimals
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">
                                {formatNutrientValue(
                                  typeof perPortionValue === "number"
                                    ? perPortionValue
                                    : undefined,
                                  definition.unit,
                                  definition.decimals
                                )}
                              </td>
                            </tr>
                          );
                        })
                        .filter(Boolean)}
                    </tbody>
                  </table>
                </div>

                {nutrition.totals.extras?.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {tNutrition("nutrients.extras")}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {nutrition.totals.extras.map((extra) => {
                        const perPortionExtra =
                          nutrition.perPortion.extras?.find(
                            (item) => item.key === extra.key
                          );
                        return (
                          <div
                            key={extra.key}
                            className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">
                                {extra.label || extra.key}
                              </span>
                              <span className="text-muted-foreground">
                                {extra.unit}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-muted-foreground">
                              <span>{tNutrition("results.whole")}</span>
                              <span className="font-medium text-foreground">
                                {formatNutrientValue(
                                  extra.value,
                                  extra.unit,
                                  2
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>{tNutrition("results.perPortion")}</span>
                              <span className="font-medium text-foreground">
                                {formatNutrientValue(
                                  perPortionExtra?.value,
                                  extra.unit,
                                  2
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  {typeof nutrition.meta.confidence === "number" && (
                    <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-foreground">
                        {tNutrition("results.confidence")}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {Math.round(nutrition.meta.confidence * 100)}%
                      </p>
                    </div>
                  )}

                  {nutrition.meta.fetchedAt && (
                    <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm">
                      <p className="font-medium text-foreground">
                        {tNutrition("results.lastFetched")}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {formatDateWithFallback(
                          nutrition.meta.fetchedAt,
                          t("never")
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {nutrition.meta.warnings?.length ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900">
                    <p className="font-medium">
                      {tNutrition("results.warnings")}
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {nutrition.meta.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {nutrition.meta.notes && (
                  <p className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm text-muted-foreground">
                    {nutrition.meta.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
                <p>{tNutrition("emptyState")}</p>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    {t("editDetail")}
                  </Button>
                )}
              </div>
            )}

            <p className="mx-auto max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {tNutrition("disclaimer")}
            </p>
          </CardContent>
        </Card>
      )}
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
