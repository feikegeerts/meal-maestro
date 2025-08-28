"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Recipe, RecipeInput } from "@/types/recipe";
import { RecipeEditForm } from "@/components/recipe-edit-form";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EditRecipePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { getRecipeById, updateRecipe: updateRecipeInContext } = useRecipes();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const t = useTranslations("recipes");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
  }, [user, authLoading, router, id]);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id || typeof id !== "string") {
        setError(t("invalidRecipeId"));
        setLoading(false);
        return;
      }

      try {
        setError(null);

        const contextRecipe = getRecipeById(id);
        if (contextRecipe) {
          setRecipe(contextRecipe);
          setLoading(false);
          return;
        }

        setLoading(true);

        // Fallback to API call
        const response = await fetch(`/api/recipes/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(t("recipeNotFound"));
          } else {
            setError(t("failedToLoad"));
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setRecipe(data.recipe);
      } catch (error) {
        console.error("Error loading recipe:", error);
        setError(t("failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadRecipe();
    }
  }, [id, user, getRecipeById, t]);

  const handleSave = async (recipeData: Partial<RecipeInput>) => {
    if (!recipe) return;

    setSaveLoading(true);
    try {
      const updatedRecipe = await updateRecipe(recipeData);
      setRecipe(updatedRecipe);

      // Navigate back to recipe detail page using replace to avoid history issues
      router.replace(`/recipes/${recipe.id}`);
    } catch (error) {
      console.error("Error updating recipe:", error);
      throw error;
    } finally {
      setSaveLoading(false);
    }
  };

  const updateRecipe = async (updateData: Partial<RecipeInput>) => {
    if (!recipe) throw new Error("Recipe not found");

    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update recipe");
    }

    const data = await response.json();

    // Update context if available
    updateRecipeInContext?.(recipe.id, data.recipe);

    return data.recipe;
  };

  const handleCancel = () => {
    // Use router.back() to go back in history instead of pushing new route
    // This prevents creating duplicate entries in browser history
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Fallback if no history (direct navigation to edit page)
      if (recipe) {
        router.replace(`/recipes/${recipe.id}`);
      } else {
        router.replace("/recipes");
      }
    }
  };

  if (authLoading || loading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              {t("error")}
            </h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/recipes")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToRecipes")}
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!recipe || !user) {
    return <PageLoading />;
  }

  return (
    <PageWrapper>
      <PageHeader
        title={t("editRecipe")}
        subtitle={t("updateRecipe", { title: recipe.title })}
        recipe={recipe}
        backButtonText={t("backToRecipe")}
        onBackClick={handleCancel}
        className="mb-6"
      />

      {/* Form */}
      <RecipeEditForm
        recipe={recipe}
        onSave={handleSave}
        loading={saveLoading}
        includeChat={false}
        standalone={true}
        onCancel={handleCancel}
      />
    </PageWrapper>
  );
}
