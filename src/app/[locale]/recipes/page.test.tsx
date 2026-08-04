import { render, screen, waitFor } from "@testing-library/react";
import RecipesPage from "./page";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: true,
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/app/i18n/routing", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/hooks/use-recipes-query", () => ({
  useRecipesQuery: () => ({
    data: { recipes: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/recipes/recipe-columns", () => ({
  useRecipeColumns: () => ({ columns: [] }),
}));

vi.mock("@/components/recipes/recipe-data-table", () => ({
  RecipeDataTable: () => <div data-testid="recipe-data-table" />,
}));

vi.mock("@/components/ui/page-loading", () => ({
  PageLoading: () => <div data-testid="page-loading" />,
}));

vi.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("RecipesPage auth routing", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = true;
    vi.clearAllMocks();
  });

  it("does not redirect while authentication is loading", () => {
    render(<RecipesPage />);

    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("returns unauthenticated users to localized login with the recipes target", async () => {
    const view = render(<RecipesPage />);

    authState.loading = false;
    view.rerender(<RecipesPage />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/login?redirectTo=/recipes");
    });
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it("renders recipes for an authenticated user without redirecting", () => {
    authState.loading = false;
    authState.user = { id: "user-1" };

    render(<RecipesPage />);

    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
