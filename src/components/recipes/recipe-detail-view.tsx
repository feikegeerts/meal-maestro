"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ServingSizeSelector } from "@/components/serving-size-selector";
import { MarkAsEatenSplitButton } from "@/components/recipes/mark-as-eaten-split-button";
import { useAddToShoppingList } from "@/components/recipes/add-to-shopping-list";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Clock,
  Edit,
  Loader2,
  Printer,
  ShoppingCart,
  Tag,
  Trash2,
  RefreshCcw,
  Sparkles,
  AlertTriangle,
  Info,
  Link2,
  NotebookText,
  Wine,
  Slice,
  Utensils,
  X,
} from "lucide-react";
import { ChefHatIcon } from "@/components/ui/chef-hat-icon";
import type {
  Recipe,
  RecipeCategory,
  RecipeSeason,
  RecipeNutritionValues,
  RecipeIngredient,
} from "@/types/recipe";
import {
  formatFraction,
  normalizeIngredientUnit,
  pluralizeUnit,
} from "@/lib/recipe-utils";
import { processInstructions } from "@/lib/utils";
import type { IngredientFormatterService } from "@/utils/ingredient-pluralization";
import { UrlDetector } from "@/lib/url-detector";

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
  tNutrition?: (
    key: string,
    values?: Record<string, string | number | Date>
  ) => string;
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
  const showNeedsIngredientsAlert = Boolean(
    showFetchButton && !canFetchNutrition
  );
  const showAnyNutritionAlert = Boolean(
    nutritionCacheHit || nutritionError || showNeedsIngredientsAlert
  );
  const hasSections =
    Array.isArray(displayRecipe.sections) && displayRecipe.sections.length > 0;

  const allIngredients = useMemo(() => {
    if (hasSections && displayRecipe.sections) {
      return displayRecipe.sections.flatMap((s) => s.ingredients);
    }
    return displayRecipe.ingredients;
  }, [hasSections, displayRecipe.sections, displayRecipe.ingredients]);

  const {
    selectionMode,
    selected,
    selectedCount,
    isLoading: addToListLoading,
    enterSelectionMode,
    exitSelectionMode,
    toggleIngredient,
    handleAdd,
  } = useAddToShoppingList(recipe.id, allIngredients);

  const renderIngredientList = (ingredients: RecipeIngredient[], showCheckboxes = false) => {
    if (!ingredients || ingredients.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">{t("ingredients")}</p>
      );
    }

    return ingredients.map((ingredient, index) => {
      let amountText = "";
      let ingredientNameWithNotes = ingredient.name;

      const hasAmount =
        ingredient.amount !== null && Number.isFinite(ingredient.amount);

      if (hasAmount && ingredient.amount !== null) {
        const smartResult = normalizeIngredientUnit(
          ingredient.amount,
          ingredient.unit
        );
        const finalAmount = smartResult?.amount ?? ingredient.amount;
        const finalUnit = smartResult?.unit ?? ingredient.unit;
        const pluralizedUnit = pluralizeUnit(finalUnit, finalAmount);

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
          const isStandardUnit = standardUnits.includes(pluralizedUnit);
          const translatedUnit = isStandardUnit
            ? tUnits(pluralizedUnit) || pluralizedUnit
            : pluralizedUnit;
          amountText += ` ${translatedUnit}`;
        }

        if (finalAmount > 1) {
          ingredientNameWithNotes = ingredientFormatter.pluralizeIngredientName(
            ingredient.name
          );
        } else if (finalAmount === 1) {
          ingredientNameWithNotes =
            ingredientFormatter.singularizeIngredientName(ingredient.name);
        }
      } else if (ingredient.unit) {
        amountText = tUnits(ingredient.unit) || ingredient.unit;
      }

      if (ingredient.notes) {
        ingredientNameWithNotes += ` (${ingredient.notes})`;
      }

      if (showCheckboxes) {
        return (
          <div
            key={`${ingredient.id}-${index}`}
            className="grid grid-cols-12 gap-3 items-start py-1"
          >
            <div className="col-span-1 flex justify-end pt-0.5">
              <Checkbox
                id={`ingredient-${ingredient.id}`}
                checked={selected.has(ingredient.id)}
                onCheckedChange={() => toggleIngredient(ingredient.id)}
              />
            </div>
            <div className="col-span-3 text-right">
              <span className="font-semibold text-sm">{amountText}</span>
            </div>
            <div className="col-span-8">
              <label
                htmlFor={`ingredient-${ingredient.id}`}
                className="text-sm leading-relaxed cursor-pointer"
              >
                {ingredientNameWithNotes}
              </label>
            </div>
          </div>
        );
      }

      return (
        <div
          key={`${ingredient.id}-${index}`}
          className="grid grid-cols-12 gap-3 items-start py-1"
        >
          <div className="col-span-4 text-right">
            <span className="font-semibold text-sm">{amountText}</span>
          </div>
          <div className="col-span-8">
            <span className="text-sm leading-relaxed">
              {ingredientNameWithNotes}
            </span>
          </div>
        </div>
      );
    });
  };

  const hasTimeMeta =
    typeof recipe.prep_time === "number" ||
    typeof recipe.total_time === "number";
  const referenceText = recipe.reference?.trim() ?? "";
  const referenceIsLink =
    referenceText.length > 0 && UrlDetector.isValidUrl(referenceText);
  const pairingWineText = recipe.pairing_wine?.trim() ?? "";
  const notesText = recipe.notes?.trim() ?? "";
  const utensils =
    Array.isArray(recipe.utensils) && recipe.utensils.length > 0
      ? recipe.utensils
      : [];
  const hasUtensils = utensils.length > 0;

  const renderInstructionsContent = (instructions: string) => {
    const processed = processInstructions(instructions || "");

    if (processed.isStepFormat && processed.steps.length > 1) {
      return (
        <div className="space-y-5">
          {processed.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-9 h-9 bg-card border-2 border-primary text-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                {index + 1}
              </div>
              <p className="leading-relaxed text-base">{step}</p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none mb-5">
        {processed.steps
          .map((paragraph) => paragraph.trim())
          .filter((paragraph) => paragraph.length > 0)
          .map((paragraph, index) => (
            <p key={index} className="leading-relaxed text-base">
              {paragraph}
            </p>
          ))}
      </div>
    );
  };

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

      <Card className="mb-8 print:shadow-none print:border">
        <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 print:grid-cols-1">
            <div className="order-2 lg:order-1 space-y-6 lg:col-span-2">
              <div>
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                  {recipe.title}
                </CardTitle>

                <div className="flex flex-wrap items-center gap-3 header-meta-row">
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

              <div className="flex flex-wrap gap-2 mt-6 print:mt-2">
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

              {(hasTimeMeta || referenceText || pairingWineText || hasUtensils) && (
                <div className="metadata-block mt-6 print:mt-2 text-sm print:text-sm leading-relaxed flex flex-col gap-3 print:gap-2">
                  {hasTimeMeta && (
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                      {typeof recipe.prep_time === "number" ? (
                        <div className="flex items-center gap-2">
                          <Slice className="h-4 w-4 text-primary" />
                          <span className="text-foreground">{`${recipe.prep_time} ${t(
                            "minutesShort"
                          )}. ${t("prepTimeLabel").toLowerCase()}`}</span>
                        </div>
                      ) : null}
                      {typeof recipe.total_time === "number" ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-foreground">
                            {(() => {
                              const waitingTime =
                                typeof recipe.prep_time === "number"
                                  ? recipe.total_time - recipe.prep_time
                                  : recipe.total_time;
                              if (
                                typeof waitingTime === "number" &&
                                waitingTime > 0 &&
                                typeof recipe.prep_time === "number"
                              ) {
                                return `${waitingTime} ${t(
                                  "minutesShort"
                                )}. ${t("totalTimeLabel").toLowerCase()}`;
                              }
                              return `${recipe.total_time} ${t(
                                "minutesShort"
                              )}. ${t("totalTimeLabel").toLowerCase()}`;
                            })()}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {referenceText && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Link2 className="h-4 w-4 mt-0.5" />
                      {referenceIsLink ? (
                        <a
                          href={referenceText}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground underline-offset-4 hover:underline break-words"
                        >
                          {referenceText}
                        </a>
                      ) : (
                        <span className="text-foreground break-words">
                          {referenceText}
                        </span>
                      )}
                    </div>
                  )}

                  {pairingWineText && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wine className="h-4 w-4" />
                      <span className="text-foreground">{pairingWineText}</span>
                    </div>
                  )}

                  {hasUtensils && (
                    <div className="flex flex-col gap-2 text-left text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        <span className="text-foreground font-medium">
                          {t("utensilsLabel")}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {utensils.map((item) => (
                          <Badge
                            key={item}
                            variant="secondary"
                            className="text-xs px-3 py-1"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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

          {hasSections ? (
            <div className="hidden print:flex print:flex-col print:gap-4">
              {displayRecipe.sections?.map((section, index) => (
                <div key={section.id || index} className="print-section-page">
                  <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    <div className="lg:col-span-2 bg-primary/10 rounded-lg p-5 print:bg-muted/30 print:border print:border-muted">
                      <div className="space-y-2">
                        {section.title ? (
                          <p className="text-sm font-semibold text-foreground tracking-tight">
                            {section.title}
                          </p>
                        ) : null}
                        <div className="h-px w-full bg-muted" />
                      </div>
                      {renderIngredientList(section.ingredients)}
                    </div>

                    <div className="lg:col-span-5">
                      <h2 className="text-xl font-semibold mb-3 mt-3">
                        {section.title || t("instructions")}
                      </h2>
                      {renderInstructionsContent(section.instructions || "")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border">
        <CardContent className="p-4 md:px-8 md:py-6 lg:px-12 lg:py-8">
          <div
            className={`grid grid-cols-1 lg:grid-cols-7 gap-6 print:grid-cols-1 ${
              hasSections ? "print:hidden" : ""
            }`}
          >
            <div className="lg:col-span-2 bg-primary/10 rounded-lg p-5 print:bg-muted/30 print:border print:border-muted">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold">{t("ingredients")}</h2>
                  <div className="print:hidden">
                    {selectionMode ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exitSelectionMode}
                          disabled={addToListLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAdd}
                          disabled={addToListLoading || selectedCount === 0}
                        >
                          {addToListLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="mr-2 h-4 w-4" />
                          )}
                          Add {selectedCount} item{selectedCount !== 1 ? "s" : ""}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={enterSelectionMode}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add to list
                      </Button>
                    )}
                  </div>
                </div>
                {onServingChange && (
                  <div className="max-w-[280px]">
                    <ServingSizeSelector
                      recipe={recipe}
                      onServingChange={(_, scaledRecipe) =>
                        onServingChange(scaledRecipe)
                      }
                      showPreview={false}
                    />
                  </div>
                )}
              </div>

              {hasSections ? (
                <div className="space-y-5">
                  {displayRecipe.sections?.map((section, index) => (
                    <div
                      key={section.id || index}
                      className="space-y-2 print:break-inside-avoid"
                    >
                      {section.title ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground tracking-tight">
                            {section.title}
                          </p>
                          <div className="h-px w-full bg-muted" />
                        </div>
                      ) : null}
                      {renderIngredientList(section.ingredients, selectionMode)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {renderIngredientList(displayRecipe.ingredients, selectionMode)}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <h2 className="text-xl font-semibold mb-5 mt-5">
                {t("instructions")}
              </h2>

              {hasSections ? (
                <div className="space-y-6">
                  {displayRecipe.sections?.map((section, index) => (
                    <div
                      key={section.id || index}
                      className="space-y-3 print:break-inside-avoid"
                    >
                      {section.title ? (
                        <div className="space-y-1">
                          <p className="text-base font-semibold leading-snug text-foreground">
                            {section.title}
                          </p>
                          <div className="h-px w-full bg-muted" />
                        </div>
                      ) : (
                        <div className="h-[1px] w-full bg-muted" />
                      )}
                      {renderInstructionsContent(section.instructions || "")}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {renderInstructionsContent(recipe.description)}

                  {processedInstructions.descriptiveText && (
                    <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                      {processedInstructions.descriptiveText.map(
                        (paragraph, index) => (
                          <p
                            key={index}
                            className="text-sm text-muted-foreground leading-relaxed"
                          >
                            {paragraph}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(notesText || tNutrition) && (
        <div className="mt-8 grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          {notesText && (
            <Card className="self-start print:hidden">
              <CardContent className="px-4 py-6 md:px-8 md:py-8 lg:px-10">
                <div className="flex items-start gap-3">
                  <NotebookText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{t("notesLabel")}</h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed recipe-notes">
                      {notesText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {tNutrition && (
            <Card className="print:hidden overflow-hidden">
              <CardContent className="px-4 py-6 md:px-8 md:py-8 lg:px-10 space-y-6">
                <div className="w-full space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl space-y-2">
                      <h2 className="text-xl font-semibold">
                        {tNutrition("title")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {tNutrition("description")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-auto">
                      <Badge className="bg-primary/10 text-primary">
                        {tNutrition("badge")}
                      </Badge>
                      {showFetchButton && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            nutritionFetching ||
                            !canFetchNutrition ||
                            !onFetchNutrition
                          }
                          onClick={() =>
                            onFetchNutrition?.({
                              forceRefresh: nutritionCacheHit === true,
                            })
                          }
                          className="min-w-[160px]"
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

                  <Separator />

                  {showAnyNutritionAlert && (
                    <div className="space-y-4">
                      {nutritionCacheHit && (
                        <Alert className="border-muted-foreground/20 bg-muted/40">
                          <Info className="h-4 w-4" />
                          <AlertTitle>
                            {tNutrition("cacheHit.title")}
                          </AlertTitle>
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

                      {showNeedsIngredientsAlert && (
                        <Alert className="border-sky-500/30 bg-sky-500/10">
                          <Info className="h-4 w-4 text-sky-600" />
                          <AlertTitle>
                            {tNutrition("needsIngredients.title")}
                          </AlertTitle>
                          <AlertDescription>
                            {tNutrition("needsIngredients.body")}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {nutrition ? (
                    <div className="flex flex-col gap-6">
                      <div className="flex-1 min-w-0 flex justify-center">
                        <div className="overflow-hidden rounded-lg border border-border/60 bg-card/70 shadow-sm md:w-fit lg:max-w-2xl w-full">
                          <table className="w-full min-w-[320px] text-xs sm:text-sm">
                            <thead className="bg-muted/40 text-xs font-medium sm:text-sm">
                              <tr>
                                <th className="px-4 py-3 text-left text-foreground">
                                  {tNutrition("results.heading")}
                                </th>
                                <th className="px-4 py-3 text-right text-muted-foreground">
                                  <div className="flex flex-col items-end gap-1">
                                    <span>
                                      {tNutrition("results.perPortion")}
                                    </span>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {nutrientDefinitions
                                .map((definition) => {
                                  const perPortionValue =
                                    nutrition.perPortion[definition.key];
                                  if (
                                    definition.optional &&
                                    typeof perPortionValue !== "number"
                                  ) {
                                    return null;
                                  }
                                  return (
                                    <tr
                                      key={definition.key}
                                      className="odd:bg-muted/20"
                                    >
                                      <th
                                        scope="row"
                                        className="px-4 py-3 text-left font-medium text-foreground"
                                      >
                                        {definition.label}
                                      </th>
                                      <td className="px-4 py-3 text-right text-foreground">
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
                      </div>

                      <div className="w-full space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                          {typeof nutrition.meta.confidence === "number" && (
                            <div className="rounded-md border border-border/50 bg-card/70 p-4 text-sm shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {tNutrition("results.confidence")}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {Math.round(nutrition.meta.confidence * 100)}%
                              </p>
                            </div>
                          )}

                          {nutrition.meta.fetchedAt && (
                            <div className="rounded-md border border-border/50 bg-card/70 p-4 text-sm shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {tNutrition("results.lastFetched")}
                              </p>
                              <p className="mt-2 text-sm font-medium text-foreground">
                                {formatDateWithFallback(
                                  nutrition.meta.fetchedAt,
                                  t("never")
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        {nutrition.meta.warnings?.length ? (
                          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-900 shadow-sm break-words">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                              {tNutrition("results.warnings")}
                            </p>
                            <ul className="mt-2 space-y-2 leading-relaxed">
                              {nutrition.meta.warnings.map((warning, index) => (
                                <li
                                  key={`${warning}-${index}`}
                                  className="flex gap-2"
                                >
                                  <span aria-hidden="true">•</span>
                                  <span className="break-words">{warning}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {nutrition.meta.notes && (
                          <p className="rounded-md border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground break-words">
                            {nutrition.meta.notes}
                          </p>
                        )}
                      </div>
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

                  <p className="text-xs leading-relaxed text-muted-foreground lg:col-span-2">
                    {tNutrition("disclaimer")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
