"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Recipe } from "@/types/recipe";
import { useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  useDeleteRecipesMutation,
  useMarkRecipesAsEatenMutation,
} from "@/lib/hooks/use-recipes-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRecipeTranslations } from "@/messages";
import {
  RecipeCategory,
  RecipeSeason,
  CuisineType,
  DietType,
  CookingMethodType,
  DishType,
  ProteinType,
  OccasionType,
  CharacteristicType,
} from "@/types/recipe";
import { DateSelectionDialog } from "@/components/ui/date-selection-dialog";
import { Calendar } from "lucide-react";
import { RecipeGridView } from "./recipe-grid-view";
import { RecipeTableView } from "./recipe-table-view";
import { RecipeTableToolbar } from "./recipe-table-toolbar";

const TABLE_STATE_STORAGE_KEY = "recipeTableState";

function loadStoredTableState() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse stored recipe table state", error);
    return null;
  }
}

interface DataTableProps {
  columns: ColumnDef<Recipe, unknown>[];
  data: Recipe[];
  loading?: boolean;
}

export function RecipeDataTable({
  columns,
  data,
  loading = false,
}: DataTableProps) {
  const initialStoredState =
    typeof window !== "undefined" ? loadStoredTableState() : null;
  const initialSearch =
    typeof initialStoredState?.searchInput === "string"
      ? initialStoredState.searchInput
      : typeof initialStoredState?.globalFilter === "string"
      ? initialStoredState.globalFilter
      : "";

  const router = useRouter();
  const deleteRecipesMutation = useDeleteRecipesMutation();
  const markAsEatenMutation = useMarkRecipesAsEatenMutation();
  const t = useTranslations("toast");
  const tTable = useTranslations("recipeTable");
  const { translateTag, translateCategory, translateSeason } =
    useRecipeTranslations();

  const [sorting, setSorting] = React.useState<SortingState>(() =>
    Array.isArray(initialStoredState?.sorting) && initialStoredState.sorting.length > 0
      ? (initialStoredState.sorting as SortingState)
      : [{ id: "created_at", desc: true }]
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    () =>
      Array.isArray(initialStoredState?.columnFilters)
        ? (initialStoredState.columnFilters as ColumnFiltersState)
        : []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState(initialSearch);
  const [searchInput, setSearchInput] = React.useState(initialSearch);
  const [bulkOperationLoading, setBulkOperationLoading] = React.useState(false);
  const [dateDialogOpen, setDateDialogOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [viewMode, setViewMode] = React.useState<"table" | "grid">(() => {
    if (typeof window === "undefined") return "grid";
    const stored = window.localStorage.getItem("recipeViewMode");
    return stored === "table" ? "table" : "grid";
  });
  const [clickedRecipeId, setClickedRecipeId] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  React.useEffect(() => {
    const stored = loadStoredTableState();
    if (!stored) return;

    if (Array.isArray(stored.sorting) && stored.sorting.length > 0) {
      setSorting(stored.sorting);
    }
    if (Array.isArray(stored.columnFilters)) {
      setColumnFilters(stored.columnFilters);
    }

    const persistedSearch =
      typeof stored.searchInput === "string"
        ? stored.searchInput
        : typeof stored.globalFilter === "string"
        ? stored.globalFilter
        : "";

    if (persistedSearch) {
      setSearchInput(persistedSearch);
      setGlobalFilter(persistedSearch);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("recipeViewMode", viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stateToPersist = {
        sorting,
        columnFilters,
        searchInput,
      };
      window.localStorage.setItem(
        TABLE_STATE_STORAGE_KEY,
        JSON.stringify(stateToPersist)
      );
    } catch (error) {
      console.error("Failed to persist recipe table state", error);
    }
  }, [sorting, columnFilters, searchInput]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 30,
      },
    },
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    enableColumnResizing: false,
    globalFilterFn: (row, _columnId, filterValue) => {
      const searchValue =
        typeof filterValue === "string"
          ? filterValue.toLowerCase().trim()
          : String(filterValue ?? "").toLowerCase().trim();

      if (!searchValue) return true;

      const recipe = row.original as Recipe;
      const matchesText = (value?: string | null) =>
        typeof value === "string" &&
        value.toLowerCase().includes(searchValue);
      const matchesArray = (values?: string[] | null) =>
        Array.isArray(values) &&
        values.some((value) => matchesText(value));

      const title = row.getValue("title") as string;
      if (matchesText(title)) return true;

      const category = row.getValue("category") as string;
      if (matchesText(category)) return true;
      if (category) {
        const translatedCategory = translateCategory(
          category as RecipeCategory
        );
        if (matchesText(translatedCategory)) return true;
      }

      const season = row.getValue("season") as string;
      if (matchesText(season)) return true;
      if (season) {
        const translatedSeason = translateSeason(season as RecipeSeason);
        if (matchesText(translatedSeason)) return true;
      }

      const allTags = [
        ...(recipe.cuisine ? [recipe.cuisine] : []),
        ...(recipe.diet_types || []),
        ...(recipe.cooking_methods || []),
        ...(recipe.dish_types || []),
        ...(recipe.proteins || []),
        ...(recipe.occasions || []),
        ...(recipe.characteristics || []),
      ];

      if (matchesArray(allTags)) return true;

      const translatedTags: string[] = [];
      if (recipe.cuisine) {
        translatedTags.push(
          translateTag("cuisine", recipe.cuisine as CuisineType)
        );
      }
      if (recipe.diet_types) {
        recipe.diet_types.forEach((dietType) => {
          translatedTags.push(translateTag("dietType", dietType as DietType));
        });
      }
      if (recipe.cooking_methods) {
        recipe.cooking_methods.forEach((method) => {
          translatedTags.push(
            translateTag("cookingMethod", method as CookingMethodType)
          );
        });
      }
      if (recipe.dish_types) {
        recipe.dish_types.forEach((dishType) => {
          translatedTags.push(translateTag("dishType", dishType as DishType));
        });
      }
      if (recipe.proteins) {
        recipe.proteins.forEach((protein) => {
          translatedTags.push(translateTag("protein", protein as ProteinType));
        });
      }
      if (recipe.occasions) {
        recipe.occasions.forEach((occasion) => {
          translatedTags.push(
            translateTag("occasion", occasion as OccasionType)
          );
        });
      }
      if (recipe.characteristics) {
        recipe.characteristics.forEach((characteristic) => {
          translatedTags.push(
            translateTag("characteristic", characteristic as CharacteristicType)
          );
        });
      }

      if (matchesArray(translatedTags)) return true;

      if (matchesText(recipe.description)) return true;
      if (matchesText(recipe.reference)) return true;
      if (matchesText(recipe.pairing_wine)) return true;
      if (matchesText(recipe.notes)) return true;

      if (matchesArray(recipe.utensils)) return true;

      const timeFields = [
        recipe.prep_time,
        recipe.cook_time,
        recipe.total_time,
      ];
      if (
        timeFields.some(
          (time) =>
            typeof time === "number" &&
            time.toString().includes(searchValue)
        )
      ) {
        return true;
      }

      const sectionsMatch =
        Array.isArray(recipe.sections) &&
        recipe.sections.some((section) => {
          if (
            matchesText(section?.title) ||
            matchesText(section?.instructions)
          ) {
            return true;
          }

          return Array.isArray(section.ingredients)
            ? section.ingredients.some(
                (ingredient) =>
                  matchesText(ingredient.name) ||
                  matchesText(ingredient.notes)
              )
            : false;
        });

      if (sectionsMatch) return true;

      if (
        Array.isArray(recipe.ingredients) &&
        recipe.ingredients.some(
          (ingredient) =>
            matchesText(ingredient.name) || matchesText(ingredient.notes)
        )
      ) {
        return true;
      }

      return false;
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const hasFilters = globalFilter || columnFilters.length > 0;

  const clearFilters = () => {
    setGlobalFilter("");
    setSearchInput("");
    setColumnFilters([]);
  };

  const handleRowClick = (recipe: Recipe) => {
    setClickedRecipeId(recipe.id);
    router.push(`/recipes/${recipe.id}`);
  };

  const handleRowMouseEnter = (recipeId: string) => {
    router.prefetch(`/recipes/${recipeId}`);
  };

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map((row) => (row.original as Recipe).id);
    if (ids.length === 0) return;

    const confirmDelete = window.confirm(
      tTable("confirmDelete", {
        count: ids.length,
        plural: ids.length > 1 ? "s" : "",
      })
    );
    if (!confirmDelete) return;

    setBulkOperationLoading(true);
    try {
      const result = await deleteRecipesMutation.mutateAsync(ids);
      setRowSelection({});
      const message =
        result.deletedCount === 1
          ? t("recipeDeleted", { count: result.deletedCount })
          : t("recipesDeleted", { count: result.deletedCount });
      toast.success(message);
    } catch (error) {
      console.error("Error deleting recipes:", error);
      toast.error(t("deleteRecipeError"));
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleMarkAsEaten = async (date?: Date) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map((row) => (row.original as Recipe).id);
    if (ids.length === 0) return;

    setBulkOperationLoading(true);
    try {
      const result = await markAsEatenMutation.mutateAsync({ ids, date });
      setRowSelection({});
      const message =
        result.updatedCount === 1
          ? t("recipeMarkedEaten", { count: result.updatedCount })
          : t("recipesMarkedEaten", { count: result.updatedCount });
      toast.success(message);
    } catch (error) {
      console.error("Error marking recipes as eaten:", error);
      toast.error(t("markEatenError"));
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleMarkAsEatenOnDate = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map((row) => (row.original as Recipe).id);
    if (ids.length === 0) return;
    setSelectedIds(ids);
    setDateDialogOpen(true);
  };

  const handleDateSelection = (date: Date) => {
    handleMarkAsEaten(date);
  };

  React.useEffect(() => {
    return () => {
      setClickedRecipeId(null);
    };
  }, []);

  return (
    <div className="w-full space-y-4">
      <RecipeTableToolbar
        table={table}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        hasFilters={!!hasFilters}
        clearFilters={clearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sorting={sorting}
        onSortingChange={setSorting}
      />

      {selectedRowCount > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-accent/50 bg-accent/40 p-3 md:flex-row md:items-center md:gap-3">
          <Badge
            variant="secondary"
            className="w-full justify-center md:w-auto"
          >
            {tTable("rowsSelected", {
              count: selectedRowCount,
              total: table.getFilteredRowModel().rows.length,
            })}
          </Badge>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:gap-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={bulkOperationLoading}
              className="w-full md:w-auto"
            >
              {bulkOperationLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {tTable("deleteSelected")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAsEatenOnDate}
              disabled={bulkOperationLoading}
              className="w-full md:w-auto"
            >
              {bulkOperationLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              {tTable("markAsEatenOnDateBulk")}
            </Button>
          </div>
        </div>
      )}

      {viewMode === "table" ? (
        <RecipeTableView
          table={table}
          columns={columns}
          loading={loading}
          clickedRecipeId={clickedRecipeId}
          onRowMouseEnter={handleRowMouseEnter}
          onRowClick={(recipe) => handleRowClick(recipe)}
        />
      ) : (
        <RecipeGridView
          table={table}
          loading={loading}
          onRowMouseEnter={handleRowMouseEnter}
          onRowClick={(recipe) => handleRowClick(recipe)}
          translateCategory={(category) => translateCategory(category)}
          translateSeason={(season) => translateSeason(season)}
          translateTag={translateTag}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedRowCount > 0 && (
            <span>
              {tTable("rowsSelected", {
                count: selectedRowCount,
                total: table.getFilteredRowModel().rows.length,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">{tTable("rowsPerPage")}</p>
            <select
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            {tTable("page", {
              current: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount(),
            })}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">{tTable("goToFirstPage")}</span>
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">{tTable("goToPreviousPage")}</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">{tTable("goToNextPage")}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">{tTable("goToLastPage")}</span>
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DateSelectionDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        onDateSelect={handleDateSelection}
        title={tTable("selectBulkEatenDate")}
        description={tTable("selectBulkDateDescription", {
          count: selectedIds.length,
        })}
      />
    </div>
  );
}
