"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/app/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/contexts/recipe-context";
import { PageLoading } from "@/components/ui/page-loading";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageHeader } from "@/components/ui/page-header";
import { Recipe, RecipeInput, RecipeCategory, RecipeSeason } from "@/types/recipe";
import { RecipeEditForm } from "@/components/recipe-edit-form";
import { recipeService } from "@/lib/recipe-service";
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
        cuisine: recipeData.cuisine,
        diet_types: recipeData.diet_types || [],
        cooking_methods: recipeData.cooking_methods || [],
        dish_types: recipeData.dish_types || [],
        proteins: recipeData.proteins || [],
        occasions: recipeData.occasions || [],
        characteristics: recipeData.characteristics || [],
        season: recipeData.season,
      };

      const { recipe: newRecipe } = await recipeService.createRecipe(createData);
      
      // Add the new recipe to context
      addRecipe(newRecipe);
      
      // Navigate to the newly created recipe's detail page
      router.push(`/recipes/${newRecipe.id}`);
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
      <PageHeader
        title={t('addNewRecipe')}
        subtitle={t('createNewRecipe')}
        backButtonText={t('backToRecipes')}
        onBackClick={handleCancel}
        className="mb-6"
      />

      {/* Two-column layout for desktop, single column for mobile */}
      <RecipeEditForm
        recipe={defaultRecipe}
        onSave={handleSave}
        loading={loading}
        includeChat={true}
        standalone={true}
        onCancel={handleCancel}
        layoutMode="two-column"
      />
    </PageWrapper>
  );
}