"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Recipe, RecipeInput, RecipeCategory, RecipeSeason } from "@/types/recipe";
import { RecipeEditForm } from "@/components/recipe-edit-form";
import { recipeService } from "@/lib/recipe-service";
import { ArrowLeft } from "lucide-react";
import { setRedirectUrl } from "@/lib/utils";
import { useTranslations } from 'next-intl';

const generateIngredientId = () => `ingredient-${Date.now()}-${Math.random()}`;

const defaultRecipe: Recipe = {
  id: "",
  title: "",
  ingredients: [{
    id: generateIngredientId(),
    name: "",
    amount: null,
    unit: null,
    notes: ""
  }],
  servings: 4,
  description: "",
  category: RecipeCategory.MAIN_COURSE,
  tags: [],
  season: RecipeSeason.YEAR_ROUND,
  last_eaten: undefined,
  created_at: undefined,
  updated_at: undefined,
  user_id: "",
};

export default function AddRecipePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addRecipe } = useRecipes();
  const [loading, setLoading] = useState(false);
  const t = useTranslations('recipes');

  useEffect(() => {
    if (!authLoading && !user) {
      setRedirectUrl("/recipes/add");
      router.push("/");
      return;
    }
  }, [user, authLoading, router]);

  const handleSave = async (recipeData: Partial<RecipeInput>) => {
    setLoading(true);
    
    try {
      const createData: Omit<RecipeInput, 'id'> = {
        title: recipeData.title!,
        ingredients: recipeData.ingredients!,
        servings: recipeData.servings!,
        description: recipeData.description!,
        category: recipeData.category!,
        tags: recipeData.tags || [],
        season: recipeData.season,
      };

      const { recipe: newRecipe } = await recipeService.createRecipe(createData);
      
      // Add the new recipe to context
      addRecipe(newRecipe);
      
      // Navigate back to recipes page
      router.push("/recipes");
    } catch (error) {
      console.error("Failed to create recipe:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/recipes");
  };

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return null;
  }

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 pt-4 pb-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="flex items-center"
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToRecipes')}
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {t('addNewRecipe')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('createNewRecipe')}
              </p>
            </div>
          </div>
        </div>

        {/* Two-column layout for desktop, single column for mobile */}
        <div className="max-w-7xl mx-auto">
          <RecipeEditForm
            recipe={defaultRecipe}
            onSave={handleSave}
            loading={loading}
            includeChat={true}
            standalone={true}
            onCancel={handleCancel}
            layoutMode="two-column"
          />
        </div>
      </div>
    </PageWrapper>
  );
}