"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { recipeService } from "@/lib/recipe-service";
import { RecipesResponse } from "@/types/recipe";
import { RecipeDataTable } from "@/components/recipes/recipe-data-table";
import { useRecipeColumns } from "@/components/recipes/recipe-columns";
import { Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function RecipesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { recipes: contextRecipes, setRecipes: setRecipesInContext } =
    useRecipes();
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("recipes");
  const { columns } = useRecipeColumns();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // Load recipes when user is available and context is empty
    if (user && contextRecipes.length === 0) {
      loadRecipes();
    }
  }, [user, loading, contextRecipes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecipes = async () => {
    try {
      setRecipesLoading(true);
      setError(null);
      const response: RecipesResponse = await recipeService.getUserRecipes();
      setRecipesInContext(response.recipes);
    } catch (err) {
      if (err instanceof Error && err.message === "Authentication required") {
        router.push("/login");
        return;
      }
      console.error("Error loading recipes:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("loadError") || "Failed to load recipes"
      );
    } finally {
      setRecipesLoading(false);
    }
  };

  const handleAddRecipe = () => {
    router.push("/recipes/add");
  };

  if (loading || !user) {
    return <PageLoading />;
  }

  return (
    <PageWrapper>
      <PageHeader
        title={t("title")}
        subtitle={t("description")}
        recipes={contextRecipes}
        showBackButton={false}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadRecipes}
              disabled={recipesLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${recipesLoading ? "animate-spin" : ""}`}
              />
              {t("refresh")}
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={handleAddRecipe}
            >
              <Plus className="h-4 w-4" />
              {t("addRecipe")}
            </Button>
          </div>
        }
        className="mb-6"
      />

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">{error}</p>
          <Button
            variant="link"
            onClick={loadRecipes}
            className="mt-2 text-destructive hover:text-destructive/80 p-0 h-auto"
          >
            {t("tryAgain")}
          </Button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card rounded-lg shadow-lg p-3 sm:p-6">
        {!recipesLoading && contextRecipes.length === 0 && !error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("noRecipes")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("noRecipesDescription")}
            </p>
            <Button
              className="flex items-center gap-2 mx-auto"
              onClick={handleAddRecipe}
            >
              <Plus className="h-4 w-4" />
              {t("addFirstRecipe")}
            </Button>
          </div>
        ) : (
          <RecipeDataTable
            columns={columns}
            data={contextRecipes}
            loading={recipesLoading}
          />
        )}
      </div>
    </PageWrapper>
  );
}
