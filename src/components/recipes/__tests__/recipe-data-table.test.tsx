import { render, screen, waitFor } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { RecipeDataTable } from "@/components/recipes/recipe-data-table";
import {
  getRecipeTableFilterStorageKey,
  saveRecipeTableFilters,
} from "@/lib/recipe-table-state";
import { RecipeCategory, type Recipe } from "@/types/recipe";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/app/i18n/routing", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-recipes-query", () => ({
  useDeleteRecipesMutation: () => ({ mutateAsync: vi.fn() }),
  useMarkRecipesAsEatenMutation: () => ({ mutateAsync: vi.fn() }),
}));

const columns: ColumnDef<Recipe, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
];

const recipes: Recipe[] = [
  {
    id: "recipe-1",
    title: "Spaghetti Carbonara",
    ingredients: [],
    servings: 2,
    description: "Pasta",
    category: RecipeCategory.MAIN_COURSE,
    user_id: "user-1",
  },
  {
    id: "recipe-2",
    title: "Tomato Soup",
    ingredients: [],
    servings: 2,
    description: "Soup",
    category: RecipeCategory.MAIN_COURSE,
    user_id: "user-1",
  },
];

function renderTable() {
  localStorage.setItem("recipeViewMode", "table");
  return render(<RecipeDataTable columns={columns} data={recipes} />);
}

describe("RecipeDataTable filter state", () => {
  beforeEach(() => {
    Object.defineProperty(CSS, "supports", {
      configurable: true,
      value: () => false,
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  it("restores a session filter after the table is remounted", async () => {
    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    const firstRender = renderTable();

    expect(screen.getByDisplayValue("spaghetti")).toBeInTheDocument();
    expect(screen.getByText("Spaghetti Carbonara")).toBeInTheDocument();
    expect(screen.queryByText("Tomato Soup")).not.toBeInTheDocument();

    firstRender.unmount();
    renderTable();

    expect(screen.getByDisplayValue("spaghetti")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("spaghetti");
  });

  it("clears the filter in the UI and session storage", async () => {
    saveRecipeTableFilters("user-1", {
      searchInput: "spaghetti",
      columnFilters: [],
    });

    renderTable();
    screen.getByRole("button", { name: "clear" }).click();

    await waitFor(() => {
      expect(screen.getByDisplayValue("")).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(
        sessionStorage.getItem(getRecipeTableFilterStorageKey("user-1")),
      ).toBeNull();
    });
  });

  it("does not restore the legacy localStorage filter", () => {
    localStorage.setItem(
      "recipeTableState",
      JSON.stringify({ searchInput: "spaghetti", columnFilters: [] }),
    );

    renderTable();

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
