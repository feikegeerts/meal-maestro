"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { recipeService } from "@/lib/recipe-service";
import { Recipe, RecipesResponse } from "@/types/recipe";
import { RecipeDataTable } from "@/components/recipes/recipe-data-table";
import { recipeColumns } from "@/components/recipes/recipe-columns";
import { Plus, RefreshCw } from "lucide-react";

export default function RecipesPage() {
  const { user, loading } = useAuth();
  const { recipes: contextRecipes, setRecipes: setRecipesInContext } =
    useRecipes();
  const [recipes, setRecipes] = useState<Recipe[]>(contextRecipes);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && contextRecipes.length === 0) {
      loadRecipes();
    } else {
      setRecipes(contextRecipes);
    }
  }, [user, contextRecipes]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecipes = async () => {
    try {
      setRecipesLoading(true);
      setError(null);
      const response: RecipesResponse = await recipeService.getUserRecipes();
      setRecipes(response.recipes);
      setRecipesInContext(response.recipes);
    } catch (err) {
      console.error("Error loading recipes:", err);
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setRecipesLoading(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <PageWrapper className="flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Authentication Required
          </h1>
          <p className="text-muted-foreground">
            Please sign in to access your recipes.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Your Recipes
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage and search through your recipe collection
              </p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              <Button
                variant="outline"
                onClick={loadRecipes}
                disabled={recipesLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${recipesLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Recipe
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-destructive">{error}</p>
              <Button
                variant="link"
                onClick={loadRecipes}
                className="mt-2 text-destructive hover:text-destructive/80 p-0 h-auto"
              >
                Try again
              </Button>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-card rounded-lg shadow-lg p-6">
            {!recipesLoading && recipes.length === 0 && !error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No recipes yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start building your recipe collection! Add your first recipe
                  to get started.
                </p>
                <Button className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Add Your First Recipe
                </Button>
              </div>
            ) : (
              <RecipeDataTable
                columns={recipeColumns}
                data={recipes}
                loading={recipesLoading}
              />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
