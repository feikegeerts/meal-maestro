"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  List,
  Search,
  Settings,
  X,
} from "lucide-react";
import { RECIPE_CATEGORIES, RECIPE_SEASONS } from "@/types/recipe";
import { Table, SortingState } from "@tanstack/react-table";
import { Recipe } from "@/types/recipe";
import { useTranslations } from "next-intl";

const SORT_OPTIONS = [
  { key: "newest", id: "created_at", desc: true },
  { key: "oldest", id: "created_at", desc: false },
  { key: "titleAZ", id: "title", desc: false },
  { key: "titleZA", id: "title", desc: true },
  { key: "lastEaten", id: "last_eaten", desc: true },
] as const;

function getSortKey(sorting: SortingState): string {
  if (sorting.length !== 1) return "";
  const [s] = sorting;
  return (
    SORT_OPTIONS.find((o) => o.id === s.id && o.desc === s.desc)?.key ?? ""
  );
}

interface RecipeTableToolbarProps {
  table: Table<Recipe>;
  searchInput: string;
  onSearchChange: (value: string) => void;
  hasFilters: boolean;
  clearFilters: () => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

export function RecipeTableToolbar({
  table,
  searchInput,
  onSearchChange,
  hasFilters,
  clearFilters,
  viewMode,
  onViewModeChange,
  sorting,
  onSortingChange,
}: RecipeTableToolbarProps) {
  const tTable = useTranslations("recipeTable");
  const tCategories = useTranslations("categories");
  const tSeasons = useTranslations("seasons");

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={tTable("searchPlaceholder")}
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={
            (table.getColumn("category")?.getFilterValue() as string[])?.join(
              ","
            ) || ""
          }
          onValueChange={(value) => {
            const column = table.getColumn("category");
            if (value && value !== "all") {
              column?.setFilterValue([value]);
            } else {
              column?.setFilterValue(undefined);
            }
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={tTable("categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tTable("allCategories")}</SelectItem>
            {RECIPE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category} className="capitalize">
                {tCategories(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            (table.getColumn("season")?.getFilterValue() as string[])?.join(
              ","
            ) || ""
          }
          onValueChange={(value) => {
            const column = table.getColumn("season");
            if (value && value !== "all") {
              column?.setFilterValue([value]);
            } else {
              column?.setFilterValue(undefined);
            }
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={tTable("seasonPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tTable("allSeasons")}</SelectItem>
            {RECIPE_SEASONS.map((season) => (
              <SelectItem key={season} value={season} className="capitalize">
                {tSeasons(season)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={getSortKey(sorting)}
          onValueChange={(key) => {
            const option = SORT_OPTIONS.find((o) => o.key === key);
            if (option) {
              onSortingChange([{ id: option.id, desc: option.desc }]);
            }
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={tTable("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{tTable("sortNewest")}</SelectItem>
            <SelectItem value="oldest">{tTable("sortOldest")}</SelectItem>
            <SelectItem value="titleAZ">{tTable("sortTitleAZ")}</SelectItem>
            <SelectItem value="titleZA">{tTable("sortTitleZA")}</SelectItem>
            <SelectItem value="lastEaten">{tTable("sortLastEaten")}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="h-10 px-3">
            <X className="mr-2 h-4 w-4" />
            {tTable("clear")}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 w-10 p-0">
              <Settings className="h-4 w-4" />
              <span className="sr-only">{tTable("viewOptions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {(() => {
                      switch (column.id) {
                        case "title":
                          return tTable("title");
                        case "category":
                          return tTable("category");
                        case "season":
                          return tTable("season");
                        case "tags":
                          return tTable("tags");
                        case "last_eaten":
                          return tTable("lastEaten");
                        case "created_at":
                          return tTable("created");
                        case "actions":
                          return tTable("actions");
                        default:
                          return column.id;
                      }
                    })()}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            title={tTable("tileView")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="h-10 w-10"
            aria-pressed={viewMode === "table"}
            onClick={() => onViewModeChange("table")}
            title={tTable("listView")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
