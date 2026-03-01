"use client";

import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { useRecipesQuery } from "@/lib/hooks/use-recipes-query";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RecipeDataTable } from "@/components/recipes/recipe-data-table";
import { useRecipeColumns } from "@/components/recipes/recipe-columns";
import { Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function RecipesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const t = useTranslations("recipes");
  const { columns } = useRecipeColumns();

  const {
    data,
    isLoading: recipesLoading,
    isError,
    error,
    refetch,
  } = useRecipesQuery();

  const recipes = data?.recipes ?? [];

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
        recipes={recipes}
        showBackButton={false}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
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
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">
            {error instanceof Error
              ? error.message
              : t("loadError") || "Failed to load recipes"}
          </p>
          <Button
            variant="link"
            onClick={() => refetch()}
            className="mt-2 text-destructive hover:text-destructive/80 p-0 h-auto"
          >
            {t("tryAgain")}
          </Button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card rounded-lg shadow-lg p-3 sm:p-6">
        {!recipesLoading && recipes.length === 0 && !isError ? (
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
            data={recipes}
            loading={recipesLoading}
          />
        )}
      </div>
    </PageWrapper>
  );
}
