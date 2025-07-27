"use client";

import { Recipe, RecipeInput, RecipeCategory } from "@/types/recipe";
import { RecipeEditForm } from "@/components/recipe-edit-form";
import { recipeService } from "@/lib/recipe-service";
import { useRecipes } from "@/contexts/recipe-context";

interface RecipeAddFormProps {
  onSuccess?: (recipe: Recipe) => void;
  onStart?: () => void;
  onError?: (error: Error) => void;
  loading?: boolean;
}

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
  category: RecipeCategory.DINNER,
  tags: [],
  season: undefined,
  last_eaten: undefined,
  created_at: undefined,
  updated_at: undefined,
  user_id: "",
};

export function RecipeAddForm({ onSuccess, onStart, onError, loading = false }: RecipeAddFormProps) {
  const { addRecipe } = useRecipes();

  const handleSave = async (recipeData: Partial<RecipeInput>) => {
    if (onStart) {
      onStart();
    }
    
    try {
      const createData: Omit<RecipeInput, 'id'> = {
        title: recipeData.title!,
        ingredients: recipeData.ingredients!,
        servings: recipeData.servings!,
        description: recipeData.description!,
        category: recipeData.category!,
        tags: recipeData.tags || [],
        season: recipeData.season === "none" ? undefined : recipeData.season,
      };

      const { recipe: newRecipe } = await recipeService.createRecipe(createData);
      
      addRecipe(newRecipe);
      
      if (onSuccess) {
        onSuccess(newRecipe);
      }
    } catch (error) {
      console.error("Failed to create recipe:", error);
      if (onError && error instanceof Error) {
        onError(error);
      }
      throw error;
    }
  };

  return (
    <RecipeEditForm
      recipe={defaultRecipe}
      onSave={handleSave}
      loading={loading}
    />
  );
}