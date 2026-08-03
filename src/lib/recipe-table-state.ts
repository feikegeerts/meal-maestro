import type {
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import {
  loadWithTTL,
  removeStored,
  saveWithTTL,
} from "@/lib/session-storage";

export const RECIPE_TABLE_STATE_STORAGE_KEY = "recipeTableState";
export const RECIPE_TABLE_FILTER_STATE_STORAGE_KEY = "recipeTableFilters.v1";
export const RECIPE_TABLE_FILTER_STATE_TTL_MS = 24 * 60 * 60 * 1000;
const RECIPE_TABLE_FILTER_STATE_VERSION = 1;

export interface StoredRecipeTablePreferences {
  sorting?: SortingState;
}

export interface StoredRecipeTableFilters {
  searchInput?: string;
  columnFilters?: ColumnFiltersState;
}

export function getRecipeTableFilterStorageKey(userId?: string | null): string {
  return `${RECIPE_TABLE_FILTER_STATE_STORAGE_KEY}.${userId ?? "anonymous"}`;
}

export function loadRecipeTablePreferences(): StoredRecipeTablePreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(RECIPE_TABLE_STATE_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as StoredRecipeTablePreferences;
    return {
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : undefined,
    };
  } catch {
    return null;
  }
}

export function saveRecipeTablePreferences(sorting: SortingState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      RECIPE_TABLE_STATE_STORAGE_KEY,
      JSON.stringify({ sorting }),
    );
  } catch {
    // Ignore storage failures, such as private browsing quota errors.
  }
}

export function loadRecipeTableFilters(
  userId?: string | null,
): StoredRecipeTableFilters | null {
  return loadWithTTL<StoredRecipeTableFilters>(
    getRecipeTableFilterStorageKey(userId),
    {
      ttlMs: RECIPE_TABLE_FILTER_STATE_TTL_MS,
      version: RECIPE_TABLE_FILTER_STATE_VERSION,
    },
  );
}

export function saveRecipeTableFilters(
  userId: string | null | undefined,
  filters: StoredRecipeTableFilters,
): void {
  if (!filters.searchInput?.trim() && !filters.columnFilters?.length) {
    clearRecipeTableFilters(userId);
    return;
  }

  saveWithTTL(getRecipeTableFilterStorageKey(userId), filters, {
    ttlMs: RECIPE_TABLE_FILTER_STATE_TTL_MS,
    version: RECIPE_TABLE_FILTER_STATE_VERSION,
  });
}

export function clearRecipeTableFilters(userId?: string | null): void {
  removeStored(getRecipeTableFilterStorageKey(userId));
}
