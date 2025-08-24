import { useEffect, useCallback, useRef } from "react";
import { Recipe, RecipeInput, validateRecipeInput } from "@/types/recipe";
import { FORM_CONFIG } from "../config/form-constants";

interface UseAutoSaveOptions {
  formData: RecipeInput;
  originalRecipe: Recipe;
  onSave: (recipeData: Partial<RecipeInput>) => Promise<void>;
  enabled?: boolean;
}

interface AutoSaveState {
  hasChanges: boolean;
  isValid: boolean;
}

export function useAutoSave({
  formData,
  originalRecipe,
  onSave,
  enabled = true,
}: UseAutoSaveOptions) {
  const autoSaveStateRef = useRef<AutoSaveState>({ hasChanges: false, isValid: false });

  const hasFormChanges = useCallback((): boolean => {
    return (
      formData.title !== originalRecipe.title ||
      JSON.stringify(formData.ingredients) !== JSON.stringify(originalRecipe.ingredients) ||
      formData.servings !== originalRecipe.servings ||
      formData.description !== originalRecipe.description ||
      formData.category !== originalRecipe.category ||
      formData.cuisine !== originalRecipe.cuisine ||
      JSON.stringify(formData.diet_types) !== JSON.stringify(originalRecipe.diet_types) ||
      JSON.stringify(formData.cooking_methods) !== JSON.stringify(originalRecipe.cooking_methods) ||
      JSON.stringify(formData.dish_types) !== JSON.stringify(originalRecipe.dish_types) ||
      JSON.stringify(formData.proteins) !== JSON.stringify(originalRecipe.proteins) ||
      JSON.stringify(formData.occasions) !== JSON.stringify(originalRecipe.occasions) ||
      JSON.stringify(formData.characteristics) !== JSON.stringify(originalRecipe.characteristics) ||
      formData.season !== originalRecipe.season
    );
  }, [formData, originalRecipe]);

  const updateAutoSaveState = useCallback(() => {
    if (!enabled) return;

    const hasChanges = hasFormChanges();
    const validation = validateRecipeInput(formData);
    
    autoSaveStateRef.current = {
      hasChanges,
      isValid: validation.valid,
    };
  }, [formData, hasFormChanges, enabled]);

  const triggerAutoSave = useCallback(async (): Promise<boolean> => {
    if (!enabled || !autoSaveStateRef.current.hasChanges) {
      return true;
    }

    if (!autoSaveStateRef.current.isValid) {
      return false;
    }

    try {
      const updateData: Partial<RecipeInput> = {
        title: formData.title,
        ingredients: formData.ingredients,
        servings: formData.servings,
        description: formData.description,
        category: formData.category,
        cuisine: formData.cuisine,
        diet_types: formData.diet_types,
        cooking_methods: formData.cooking_methods,
        dish_types: formData.dish_types,
        proteins: formData.proteins,
        occasions: formData.occasions,
        characteristics: formData.characteristics,
        season: formData.season,
      };

      await onSave(updateData);
      return true;
    } catch (error) {
      console.error("Auto-save failed:", error);
      return false;
    }
  }, [formData, onSave, enabled]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      updateAutoSaveState();
    }, FORM_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(debounceTimer);
  }, [updateAutoSaveState]);

  return {
    triggerAutoSave,
    hasChanges: autoSaveStateRef.current.hasChanges,
    isValid: autoSaveStateRef.current.isValid,
  };
}