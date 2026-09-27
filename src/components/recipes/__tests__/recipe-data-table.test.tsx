import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { RecipeDataTable } from "@/components/recipes/recipe-data-table";
import type { RecipeTableFeatures } from "@/components/recipes/recipe-table-config";
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

const columns: ColumnDef<RecipeTableFeatures, Recipe, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "category",
    header: "Category",
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
];

const sortableColumns: ColumnDef<RecipeTableFeatures, Recipe, unknown>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Sort title
      </button>
    ),
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

const categoryRecipes = [
  recipes[0],
  { ...recipes[1], category: RecipeCategory.DESSERT },
];

const paginatedRecipes = Array.from({ length: 35 }, (_, index) => ({
  ...recipes[index % recipes.length],
  id: `recipe-${index + 1}`,
  title: `Recipe ${String(35 - index).padStart(2, "0")}`,
}));

function renderTable(
  data: Recipe[] = recipes,
  tableColumns: ColumnDef<RecipeTableFeatures, Recipe, unknown>[] = columns,
) {
  localStorage.setItem("recipeViewMode", "table");
  return render(<RecipeDataTable columns={tableColumns} data={data} />);
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

  it("sorts rows and paginates the sorted result", () => {
    renderTable(paginatedRecipes, sortableColumns);

    expect(screen.getByText("Recipe 35")).toBeInTheDocument();
    expect(screen.queryByText("Recipe 05")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sort title" }));

    expect(screen.getByText("Recipe 01")).toBeInTheDocument();
    expect(screen.queryByText("Recipe 31")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "goToNextPage" }));

    expect(screen.getByText("Recipe 31")).toBeInTheDocument();
    expect(screen.getByText("Recipe 35")).toBeInTheDocument();
    expect(screen.queryByText("Recipe 01")).not.toBeInTheDocument();
  });

  it("filters rows by the selected category", () => {
    renderTable(categoryRecipes);

    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(screen.getByRole("option", { name: "dessert" }));

    expect(screen.getByText("Tomato Soup")).toBeInTheDocument();
    expect(screen.queryByText("Spaghetti Carbonara")).not.toBeInTheDocument();
  });

  it("hides and restores a column from View Options", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: "viewOptions" }));
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "category" }),
    );

    expect(
      screen.queryByRole("columnheader", { name: "Category" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "viewOptions" }));
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "category" }),
    );

    expect(
      screen.getByRole("columnheader", { name: "Category" }),
    ).toBeInTheDocument();
  });

  it("keeps row selection when switching between grid and table views", () => {
    renderTable();

    fireEvent.click(screen.getByTitle("tileView"));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "selectRow" })[0]);

    expect(screen.getAllByText(/rowsSelected/)[0]).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("listView"));

    expect(
      screen.getByRole("row", { name: /Spaghetti Carbonara/ }),
    ).toHaveAttribute("data-state", "selected");
  });
});
