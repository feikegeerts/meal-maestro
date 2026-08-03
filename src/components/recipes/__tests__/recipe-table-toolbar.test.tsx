import { fireEvent, render, screen } from "@testing-library/react";
import type { Table } from "@tanstack/react-table";
import type { Recipe } from "@/types/recipe";
import { RecipeTableToolbar } from "@/components/recipes/recipe-table-toolbar";

function createTable(): Table<Recipe> {
  return {
    getColumn: () => undefined,
    getAllColumns: () => [],
  } as unknown as Table<Recipe>;
}

function renderToolbar(overrides: Partial<React.ComponentProps<typeof RecipeTableToolbar>> = {}) {
  const props: React.ComponentProps<typeof RecipeTableToolbar> = {
    table: createTable(),
    searchInput: "",
    onSearchChange: vi.fn(),
    hasFilters: false,
    clearFilters: vi.fn(),
    filteredCount: 10,
    totalCount: 10,
    viewMode: "grid",
    onViewModeChange: vi.fn(),
    sorting: [{ id: "created_at", desc: true }],
    onSortingChange: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<RecipeTableToolbar {...props} />),
    props,
  };
}

describe("RecipeTableToolbar", () => {
  it("shows the active filter, search term, and result count", () => {
    renderToolbar({
      searchInput: "spaghetti",
      hasFilters: true,
      filteredCount: 2,
      totalCount: 10,
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("activeFilters");
    expect(status).toHaveTextContent("searchFilter");
    expect(status).toHaveTextContent("spaghetti");
    expect(status).toHaveTextContent('"count":2');
    expect(status).toHaveTextContent('"total":10');
  });

  it("clears the active filter from the status action", () => {
    const { props } = renderToolbar({
      searchInput: "spaghetti",
      hasFilters: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "clear" }));

    expect(props.clearFilters).toHaveBeenCalledTimes(1);
  });

  it("does not render an active status when no filters are applied", () => {
    renderToolbar();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the active status for column filters without a search term", () => {
    renderToolbar({ hasFilters: true, filteredCount: 4, totalCount: 10 });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("activeFilters");
    expect(status).toHaveTextContent('"count":4');
    expect(status).not.toHaveTextContent("searchFilter");
  });
});
