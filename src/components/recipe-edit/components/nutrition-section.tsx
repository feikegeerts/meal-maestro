"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { RecipeIngredient, RecipeNutrition } from "@/types/recipe";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  RefreshCcw,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";

interface NutritionSectionProps {
  recipeId?: string;
  ingredients: RecipeIngredient[];
  servings: number;
  nutrition: RecipeNutrition | null | undefined;
  isStale: boolean;
  onFetchComplete: (payload: {
    nutrition: RecipeNutrition;
    cacheHit: boolean;
  }) => void;
  disabled?: boolean;
}

type NutrientKey =
  | "calories"
  | "protein"
  | "carbohydrates"
  | "fat"
  | "saturatedFat"
  | "fiber"
  | "sugars"
  | "sodium"
  | "cholesterol";

type NutrientDefinition = {
  key: NutrientKey;
  unit: string;
  decimals?: number;
  optional?: boolean;
  label: string;
};

export function NutritionSection({
  recipeId,
  ingredients,
  servings,
  nutrition,
  isStale,
  onFetchComplete,
  disabled = false,
}: NutritionSectionProps) {
  const t = useTranslations("recipeForm.nutrition");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  const nutrientDefinitions: NutrientDefinition[] = useMemo(
    () => [
      { key: "calories", unit: "kcal", label: t("nutrients.calories"), decimals: 0 },
      { key: "protein", unit: "g", label: t("nutrients.protein"), decimals: 1 },
      {
        key: "carbohydrates",
        unit: "g",
        label: t("nutrients.carbohydrates"),
        decimals: 1,
      },
      { key: "fat", unit: "g", label: t("nutrients.fat"), decimals: 1 },
      {
        key: "saturatedFat",
        unit: "g",
        label: t("nutrients.saturatedFat"),
        decimals: 1,
      },
      { key: "fiber", unit: "g", label: t("nutrients.fiber"), decimals: 1 },
      { key: "sugars", unit: "g", label: t("nutrients.sugars"), decimals: 1 },
      {
        key: "sodium",
        unit: "mg",
        label: t("nutrients.sodium"),
        decimals: 0,
      },
      {
        key: "cholesterol",
        unit: "mg",
        label: t("nutrients.cholesterol"),
        decimals: 0,
        optional: true,
      },
    ],
    [t]
  );

  const hasIdentifiableIngredients = useMemo(
    () =>
      ingredients.some(
        (ingredient) => ingredient.name && ingredient.name.trim().length > 0
      ),
    [ingredients]
  );

  const formattedFetchedAt = useMemo(() => {
    if (!nutrition?.meta?.fetchedAt) return null;
    try {
      const formatter = new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return formatter.format(new Date(nutrition.meta.fetchedAt));
    } catch {
      return nutrition.meta.fetchedAt;
    }
  }, [locale, nutrition?.meta?.fetchedAt]);

  const formatValue = useCallback(
    (value: number | undefined, definition: NutrientDefinition) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return "–";
      }
      const decimals =
        typeof definition.decimals === "number" ? definition.decimals : 0;
      const rounded =
        decimals === 0 ? Math.round(value) : value.toFixed(decimals);
      return `${rounded} ${definition.unit}`;
    },
    []
  );

  const canFetch =
    Boolean(recipeId) && hasIdentifiableIngredients && servings > 0;

  const buttonLabel =
    nutrition === null || typeof nutrition === "undefined"
      ? t("fetch")
      : t("refetch");

  const handleFetch = useCallback(
    async (forceRefresh = false) => {
      if (!recipeId || loading) {
        return;
      }
      setLoading(true);
      setError(null);
      setCacheHit(null);

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
              : t("errorFallback")
          );
        }

        if (!payload?.nutrition) {
          throw new Error(t("errorFallback"));
        }

        onFetchComplete({
          nutrition: payload.nutrition,
          cacheHit: Boolean(payload.cacheHit),
        });
        setCacheHit(Boolean(payload.cacheHit));
      } catch (err) {
        const fallbackMessage = t("errorFallback");
        const message =
          err instanceof Error ? err.message || fallbackMessage : fallbackMessage;
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [recipeId, loading, locale, onFetchComplete, t]
  );

  const renderNutrientRows = () => {
    if (!nutrition) return null;

    return nutrientDefinitions
      .filter(
        (definition) =>
          !definition.optional ||
          typeof nutrition.perPortion[definition.key] === "number"
      )
      .map((definition) => (
        <div
          key={definition.key}
          className="grid grid-cols-[2fr_1fr] items-center gap-2 px-4 py-3 text-sm odd:bg-muted/20"
        >
          <span className="font-medium text-foreground">
            {definition.label}
          </span>
          <span className="text-right text-foreground">
            {formatValue(nutrition.perPortion[definition.key], definition)}
          </span>
        </div>
      ));
  };

  return (
    <Card>
      <CardContent className="px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t("title")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <Badge className="bg-primary/10 text-primary">{t("badge")}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || disabled || !canFetch}
                onClick={() => handleFetch(cacheHit === true)}
                className="min-w-[160px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("fetching")}
                  </>
                ) : nutrition ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {buttonLabel}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {buttonLabel}
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {recipeId && !hasIdentifiableIngredients && (
              <Alert className="border-sky-500/30 bg-sky-500/10">
                <Info className="h-4 w-4 text-sky-600" />
                <AlertTitle>{t("needsIngredients.title")}</AlertTitle>
                <AlertDescription>
                  {t("needsIngredients.body")}
                </AlertDescription>
              </Alert>
            )}

            {isStale && nutrition && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
                {t("stale")}
              </div>
            )}

            {cacheHit && (
              <Alert className="border-muted-foreground/20 bg-muted/40">
                <Info className="h-4 w-4" />
                <AlertTitle>{t("cacheHit.title")}</AlertTitle>
                <AlertDescription>{t("cacheHit.body")}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("errorTitle")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {nutrition ? (
              <div className="w-full space-y-5 text-sm md:max-w-2xl">
                <div className="overflow-hidden rounded-lg border border-border/60 bg-card/70 shadow-sm md:w-fit">
                  <div className="grid grid-cols-[2fr_1fr] items-center gap-3 border-b border-border/50 bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
                    <span>{t("results.heading")}</span>
                    <span className="flex flex-col items-end gap-1 text-right">
                      <span className="text-foreground">
                        {t("results.perPortion")}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                        {t("results.perPortionServings", { servings })}
                      </span>
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {renderNutrientRows()}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {typeof nutrition.meta.confidence === "number" && (
                    <div className="rounded-md border border-border/50 bg-card/70 p-4 text-sm shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("results.confidence")}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {Math.round(nutrition.meta.confidence * 100)}%
                      </p>
                    </div>
                  )}
                  {formattedFetchedAt && (
                    <div className="rounded-md border border-border/50 bg-card/70 p-4 text-sm shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("results.lastFetched")}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formattedFetchedAt}
                      </p>
                    </div>
                  )}
                </div>

                {nutrition.meta.warnings?.length ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-900 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {t("results.warnings")}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {nutrition.meta.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`} className="flex gap-2">
                          <span aria-hidden="true">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {nutrition.meta.notes && (
                  <p className="rounded-md border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground">
                    {nutrition.meta.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
                {t("emptyState")}
              </div>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("disclaimer")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
