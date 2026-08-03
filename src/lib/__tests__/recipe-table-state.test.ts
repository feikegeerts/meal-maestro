import {
  clearRecipeTableFilters,
  getRecipeTableFilterStorageKey,
  loadRecipeTableFilters,
  loadRecipeTablePreferences,
  RECIPE_TABLE_FILTER_STATE_TTL_MS,
  saveRecipeTableFilters,
  saveRecipeTablePreferences,
} from "@/lib/recipe-table-state";

describe("recipe table state", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps filters scoped to the current user", () => {
    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    expect(loadRecipeTableFilters("user-1")).toEqual({
      searchInput: "spaghetti",
      columnFilters: [],
    });
    expect(loadRecipeTableFilters("user-2")).toBeNull();
  });

  it("persists column filters alongside the search filter", () => {
    saveRecipeTableFilters("user-1", {
      searchInput: "",
      columnFilters: [{ id: "category", value: ["pasta"] }],
    });

    expect(loadRecipeTableFilters("user-1")).toEqual({
      searchInput: "",
      columnFilters: [{ id: "category", value: ["pasta"] }],
    });
  });

  it("expires filters after the inactivity TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T12:00:00.000Z"));

    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    vi.advanceTimersByTime(RECIPE_TABLE_FILTER_STATE_TTL_MS + 1);

    expect(loadRecipeTableFilters("user-1")).toBeNull();
    expect(
      sessionStorage.getItem(getRecipeTableFilterStorageKey("user-1")),
    ).toBeNull();
  });

  it("removes empty filter state", () => {
    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    saveRecipeTableFilters("user-1", {
      searchInput: "",
      columnFilters: [],
    });

    expect(loadRecipeTableFilters("user-1")).toBeNull();
  });

  it("keeps sorting preferences separate from filters", () => {
    const sorting = [{ id: "title", desc: false }];

    saveRecipeTablePreferences(sorting);
    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    expect(loadRecipeTablePreferences()).toEqual({ sorting });
    expect(loadRecipeTableFilters("user-1")).not.toBeNull();
  });

  it("does not restore legacy search filters from localStorage", () => {
    localStorage.setItem(
      "recipeTableState",
      JSON.stringify({
        sorting: [{ id: "title", desc: false }],
        searchInput: "spaghetti",
        columnFilters: [{ id: "category", value: ["pasta"] }],
      }),
    );

    expect(loadRecipeTablePreferences()).toEqual({
      sorting: [{ id: "title", desc: false }],
    });
    expect(loadRecipeTableFilters("user-1")).toBeNull();
  });

  it("clears persisted filters explicitly", () => {
    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    clearRecipeTableFilters("user-1");

    expect(loadRecipeTableFilters("user-1")).toBeNull();
  });
});
