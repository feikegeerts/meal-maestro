"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { RecipeIngredient, RecipeNutrition } from "@/types/recipe";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
          typeof nutrition.totals[definition.key] === "number"
      )
      .map((definition) => (
        <div
          key={definition.key}
          className="grid grid-cols-1 gap-1 py-2 text-sm md:grid-cols-[2fr_1fr_1fr]"
        >
          <span className="font-medium text-foreground">
            {definition.label}
          </span>
          <span className="text-muted-foreground md:text-right">
            {formatValue(nutrition.totals[definition.key], definition)}
          </span>
          <span className="text-muted-foreground md:text-right">
            {formatValue(nutrition.perPortion[definition.key], definition)}
          </span>
        </div>
      ));
  };

  const extrasMarkup = () => {
    if (!nutrition?.totals.extras?.length) return null;
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-foreground">
          {t("nutrients.extras")}
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {nutrition.totals.extras.map((extra) => {
            const perPortionExtra = nutrition.perPortion.extras?.find(
              (item) => item.key === extra.key
            );
            return (
              <div
                key={extra.key}
                className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {extra.label || extra.key}
                  </span>
                  <span className="text-muted-foreground">
                    {extra.unit}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 text-muted-foreground">
                  <span>{t("results.whole")}</span>
                  <span className="text-right">
                    {formatValue(extra.value, {
                      key: "protein",
                      label: extra.key,
                      unit: extra.unit,
                      decimals: 2,
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-2 text-muted-foreground">
                  <span>{t("results.perPortion")}</span>
                  <span className="text-right">
                    {formatValue(perPortionExtra?.value, {
                      key: "protein",
                      label: extra.key,
                      unit: extra.unit,
                      decimals: 2,
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t("title")}
              </h3>
              <Badge className="bg-primary/10 text-primary">
                {t("badge")}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || disabled || !canFetch}
              onClick={() => handleFetch(cacheHit === true)}
              className="min-w-[180px]"
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
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900">
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/50 bg-muted/30 p-4 text-sm md:grid-cols-[2fr_1fr_1fr]">
              <span className="font-medium text-foreground">
                {t("results.heading")}
              </span>
              <span className="font-medium text-muted-foreground md:text-right">
                {t("results.whole")}
              </span>
              <span className="font-medium text-muted-foreground md:text-right">
                {t("results.perPortion")}
              </span>
            </div>

            <div className="divide-y divide-border/40 rounded-lg border border-border/50">
              {renderNutrientRows()}
            </div>

            {extrasMarkup()}

            <div className="grid gap-2 rounded-md border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground md:grid-cols-2">
              {typeof nutrition.meta.confidence === "number" && (
                <div>
                  <span className="font-medium text-foreground">
                    {t("results.confidence")}
                  </span>
                  <div className="mt-1">
                    {Math.round(nutrition.meta.confidence * 100)}%
                  </div>
                </div>
              )}
              {formattedFetchedAt && (
                <div>
                  <span className="font-medium text-foreground">
                    {t("results.lastFetched")}
                  </span>
                  <div className="mt-1">{formattedFetchedAt}</div>
                </div>
              )}
            </div>

            {nutrition.meta.warnings?.length ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900">
                <p className="font-medium">{t("results.warnings")}</p>
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
          <div className="rounded-md border border-dashed border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
            {t("emptyState")}
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
