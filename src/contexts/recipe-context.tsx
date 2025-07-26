"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Recipe } from '@/types/recipe';

interface RecipeContextType {
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
  getRecipeById: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updatedRecipe: Recipe) => void;
  removeRecipe: (id: string) => void;
  clearRecipes: () => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipesState] = useState<Recipe[]>([]);

  const setRecipes = (newRecipes: Recipe[]) => {
    setRecipesState(newRecipes);
  };

  const getRecipeById = (id: string): Recipe | undefined => {
    return recipes.find(recipe => recipe.id === id);
  };

  const addRecipe = (recipe: Recipe) => {
    setRecipesState(prev => [recipe, ...prev]);
  };

  const updateRecipe = (id: string, updatedRecipe: Recipe) => {
    setRecipesState(prev => 
      prev.map(recipe => recipe.id === id ? updatedRecipe : recipe)
    );
  };

  const removeRecipe = (id: string) => {
    setRecipesState(prev => prev.filter(recipe => recipe.id !== id));
  };

  const clearRecipes = () => {
    setRecipesState([]);
  };

  const value: RecipeContextType = {
    recipes,
    setRecipes,
    getRecipeById,
    addRecipe,
    updateRecipe,
    removeRecipe,
    clearRecipes,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}