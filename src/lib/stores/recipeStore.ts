import { writable, derived } from 'svelte/store';
import type { Recipe } from '../types.js';

export interface SearchFilters {
  query: string;
  category: string;
  season: string;
  tags: string[];
}

export interface RecipeState {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  searchFilters: SearchFilters;
  hasActiveSearch: boolean;
  searchResultCount: number;
}

// Initial state
const initialState: RecipeState = {
  recipes: [],
  filteredRecipes: [],
  isLoading: false,
  error: null,
  searchFilters: {
    query: '',
    category: '',
    season: '',
    tags: []
  },
  hasActiveSearch: false,
  searchResultCount: 0
};

// Create the store
function createRecipeStore() {
  const { subscribe, set, update } = writable<RecipeState>(initialState);

  return {
    subscribe,
    
    // Set loading state
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, isLoading: loading }));
    },
    
    // Set error state
    setError: (error: string | null) => {
      update(state => ({ ...state, error }));
    },
    
    // Set recipes and update filtered recipes
    setRecipes: (recipes: Recipe[]) => {
      update(state => {
        const filteredRecipes = filterRecipes(recipes, state.searchFilters);
        return {
          ...state,
          recipes,
          filteredRecipes,
          searchResultCount: filteredRecipes.length
        };
      });
    },
    
    // Add a new recipe
    addRecipe: (recipe: Recipe) => {
      update(state => {
        const newRecipes = [...state.recipes, recipe];
        const filteredRecipes = filterRecipes(newRecipes, state.searchFilters);
        return {
          ...state,
          recipes: newRecipes,
          filteredRecipes,
          searchResultCount: filteredRecipes.length
        };
      });
    },
    
    // Update existing recipe
    updateRecipe: (updatedRecipe: Recipe) => {
      update(state => {
        const newRecipes = state.recipes.map(recipe => 
          recipe.id === updatedRecipe.id ? updatedRecipe : recipe
        );
        const filteredRecipes = filterRecipes(newRecipes, state.searchFilters);
        return {
          ...state,
          recipes: newRecipes,
          filteredRecipes,
          searchResultCount: filteredRecipes.length
        };
      });
    },
    
    // Remove recipe
    removeRecipe: (recipeId: string) => {
      update(state => {
        const newRecipes = state.recipes.filter(recipe => recipe.id !== recipeId);
        const filteredRecipes = filterRecipes(newRecipes, state.searchFilters);
        return {
          ...state,
          recipes: newRecipes,
          filteredRecipes,
          searchResultCount: filteredRecipes.length
        };
      });
    },
    
    // Set search filters and update filtered recipes
    setSearchFilters: (filters: Partial<SearchFilters>) => {
      update(state => {
        const newFilters = { ...state.searchFilters, ...filters };
        const filteredRecipes = filterRecipes(state.recipes, newFilters);
        const hasActiveSearch = hasActiveFilters(newFilters);
        
        return {
          ...state,
          searchFilters: newFilters,
          filteredRecipes,
          hasActiveSearch,
          searchResultCount: filteredRecipes.length
        };
      });
    },
    
    // Clear all search filters
    clearSearchFilters: () => {
      update(state => ({
        ...state,
        searchFilters: {
          query: '',
          category: '',
          season: '',
          tags: []
        },
        filteredRecipes: state.recipes,
        hasActiveSearch: false,
        searchResultCount: state.recipes.length
      }));
    },
    
    // Reset store to initial state
    reset: () => {
      set(initialState);
    }
  };
}

// Helper function to filter recipes based on current filters
function filterRecipes(recipes: Recipe[], filters: SearchFilters): Recipe[] {
  let filtered = [...recipes];
  
  // Apply text search filter
  if (filters.query) {
    const lowerQuery = filters.query.toLowerCase();
    filtered = filtered.filter(recipe => 
      recipe.title.toLowerCase().includes(lowerQuery) ||
      recipe.description.toLowerCase().includes(lowerQuery) ||
      recipe.ingredients.some(ing => ing.toLowerCase().includes(lowerQuery)) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  // Apply category filter
  if (filters.category) {
    filtered = filtered.filter(recipe => recipe.category === filters.category);
  }
  
  // Apply season filter
  if (filters.season) {
    filtered = filtered.filter(recipe => recipe.season === filters.season);
  }
  
  // Apply tags filter
  if (filters.tags.length > 0) {
    filtered = filtered.filter(recipe => 
      filters.tags.some(tag => recipe.tags.includes(tag))
    );
  }
  
  return filtered;
}

// Helper function to check if any filters are active
function hasActiveFilters(filters: SearchFilters): boolean {
  return !!(
    filters.query ||
    filters.category ||
    filters.season ||
    filters.tags.length > 0
  );
}

// Create and export the store
export const recipeStore = createRecipeStore();

// Derived stores for commonly needed data
export const recipes = derived(recipeStore, $store => $store.recipes);
export const filteredRecipes = derived(recipeStore, $store => $store.filteredRecipes);
export const isLoading = derived(recipeStore, $store => $store.isLoading);
export const error = derived(recipeStore, $store => $store.error);
export const searchFilters = derived(recipeStore, $store => $store.searchFilters);
export const hasActiveSearch = derived(recipeStore, $store => $store.hasActiveSearch);
export const searchResultCount = derived(recipeStore, $store => $store.searchResultCount);