"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageLoading } from "@/components/ui/page-loading";
import { Button } from "@/components/ui/button";
import { recipeService } from "@/lib/recipe-service";
import { Recipe, RecipesResponse } from "@/types/recipe";
import { RecipeDataTable } from "@/components/recipes/recipe-data-table";
import { recipeColumns } from "@/components/recipes/recipe-columns";
import { Plus, RefreshCw } from "lucide-react";

export default function RecipesPage() {
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  const loadRecipes = async () => {
    try {
      setRecipesLoading(true);
      setError(null);
      const response: RecipesResponse = await recipeService.getUserRecipes();
      setRecipes(response.recipes);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setRecipesLoading(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please sign in to access your recipes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Recipes
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
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
                <RefreshCw className={`h-4 w-4 ${recipesLoading ? 'animate-spin' : ''}`} />
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <Button 
                variant="link" 
                onClick={loadRecipes}
                className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 p-0 h-auto"
              >
                Try again
              </Button>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {!recipesLoading && recipes.length === 0 && !error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No recipes yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Start building your recipe collection! Add your first recipe to get started.
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
    </div>
  );
}