/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { Recipe, RecipeCategory, RecipeSeason } from "@/types/recipe";
import { useTranslations } from "next-intl";
import { useLocalizedDateFormatter } from "@/lib/date-utils";
import { getTagLabels, TagTranslator } from "./recipe-table-helpers";

interface RecipeGridViewProps {
  table: Table<Recipe>;
  loading?: boolean;
  onRowMouseEnter: (recipeId: string) => void;
  onRowClick: (recipe: Recipe) => void;
  translateCategory: (category: RecipeCategory) => string;
  translateSeason: (season: RecipeSeason) => string;
  translateTag: TagTranslator;
}

const DEFAULT_PLACEHOLDER = "/placeholder-image.webp";

export function RecipeGridView({
  table,
  loading = false,
  onRowMouseEnter,
  onRowClick,
  translateCategory,
  translateSeason,
  translateTag,
}: RecipeGridViewProps) {
  const tTable = useTranslations("recipeTable");
  const tA11y = useTranslations("accessibility");
  const tRecipes = useTranslations("recipes");
  const { formatDateWithFallback } = useLocalizedDateFormatter();

  if (loading) {
    return (
      <div className="p-1 sm:p-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="group relative flex h-full flex-col gap-0 overflow-hidden rounded-xl border p-0 py-0 shadow-sm"
            >
              <div className="relative w-full overflow-hidden bg-muted rounded-b-none aspect-[16/10] sm:aspect-[4/3] min-h-[100px]">
                <Skeleton className="absolute inset-0 h-full w-full" />
              </div>
              <div className="flex h-full flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
                <div className="flex min-h-[20px] flex-col gap-1.5">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-14" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  if (!rows?.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border text-muted-foreground">
        {tTable("noRecipesFound")}
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => {
          const recipe = row.original as Recipe;
          const tags = getTagLabels(recipe, translateTag);
          const lastEatenLabel = formatDateWithFallback(
            recipe.last_eaten,
            tTable("never")
          );

          return (
            <Card
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className={`group relative flex h-full flex-col gap-0 overflow-hidden border p-0 py-0 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg cursor-pointer ${
                row.getIsSelected()
                  ? "ring-2 ring-primary"
                  : "border-border/80"
              }`}
              onMouseEnter={() => onRowMouseEnter(recipe.id)}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest('[role="checkbox"]') ||
                  target.closest("[data-radix-popper-content-wrapper]") ||
                  target.closest("[data-dropdown-trigger]") ||
                  target.closest('[role="menuitem"]') ||
                  target.closest("a[href]")
                ) {
                  return;
                }
                onRowClick(recipe);
              }}
            >
              <div className="relative w-full overflow-hidden rounded-b-none bg-muted aspect-[16/10] sm:aspect-[4/3] min-h-[100px]">
                <img
                  src={recipe.image_url || DEFAULT_PLACEHOLDER}
                  alt={recipe.title || tRecipes("imageUnavailable")}
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_PLACEHOLDER;
                  }}
                />
                <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                  {recipe.category && (
                    <Badge
                      variant="secondary"
                      className="capitalize bg-background/85 text-foreground shadow-sm backdrop-blur"
                    >
                      {translateCategory(recipe.category as RecipeCategory)}
                    </Badge>
                  )}
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={tA11y("selectRow")}
                    className="border border-border/70 bg-background/80 shadow-sm backdrop-blur"
                  />
                </div>
              </div>

              <CardContent className="flex h-full flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold leading-tight line-clamp-2">
                    {recipe.title}
                  </h3>
                  {recipe.season && (
                    <Badge variant="outline" className="capitalize">
                      {translateSeason(recipe.season as RecipeSeason)}
                    </Badge>
                  )}
                </div>

                <div className="flex min-h-[20px] flex-col gap-1.5">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  <span>{`${tTable("lastEaten")}: ${lastEatenLabel}`}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
