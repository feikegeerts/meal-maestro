import { Recipe, RecipeSearchParams, RecipesResponse, RecipeInput } from "@/types/recipe";
import { toDateOnlyISOString } from "@/lib/utils";

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}

export const recipeService = {
  async getUserRecipes(params?: RecipeSearchParams): Promise<RecipesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.query) searchParams.set('query', params.query);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.season) searchParams.set('season', params.season);
    if (params?.cuisine) searchParams.set('cuisine', params.cuisine);
    if (params?.diet_types?.length) searchParams.set('diet_types', params.diet_types.join(','));
    if (params?.cooking_methods?.length) searchParams.set('cooking_methods', params.cooking_methods.join(','));
    if (params?.dish_types?.length) searchParams.set('dish_types', params.dish_types.join(','));
    if (params?.proteins?.length) searchParams.set('proteins', params.proteins.join(','));
    if (params?.occasions?.length) searchParams.set('occasions', params.occasions.join(','));
    if (params?.characteristics?.length) searchParams.set('characteristics', params.characteristics.join(','));
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const url = `/api/recipes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await authenticatedFetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch recipes: ${response.status}`);
    }
    
    return response.json();
  },

  async searchRecipes(query: string, options?: Omit<RecipeSearchParams, 'query'>): Promise<RecipesResponse> {
    return this.getUserRecipes({ query, ...options });
  },

  async createRecipe(recipeData: Omit<RecipeInput, 'id'>): Promise<{ recipe: Recipe; success: boolean }> {
    const response = await authenticatedFetch('/api/recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipeData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create recipe: ${response.status}`);
    }

    return response.json();
  },

  async getRecipesByCategory(category: string): Promise<RecipesResponse> {
    return this.getUserRecipes({ category });
  },

  async getRecipesBySeason(season: string): Promise<RecipesResponse> {
    return this.getUserRecipes({ season });
  },

  async getRecipesByCuisine(cuisine: string): Promise<RecipesResponse> {
    return this.getUserRecipes({ cuisine });
  },

  async getRecipesByDietTypes(diet_types: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ diet_types });
  },

  async getRecipesByCookingMethods(cooking_methods: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ cooking_methods });
  },

  async getRecipesByDishTypes(dish_types: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ dish_types });
  },

  async getRecipesByProteins(proteins: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ proteins });
  },

  async getRecipesByOccasions(occasions: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ occasions });
  },

  async getRecipesByCharacteristics(characteristics: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ characteristics });
  },

  async getRecipe(id: string): Promise<Recipe> {
    const response = await authenticatedFetch(`/api/recipes/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch recipe: ${response.status}`);
    }
    
    const data = await response.json();
    return data.recipe;
  },

  async updateRecipe(id: string, recipeData: Partial<RecipeInput>): Promise<{ recipe: Recipe; success: boolean }> {
    const response = await authenticatedFetch(`/api/recipes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipeData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update recipe: ${response.status}`);
    }

    return response.json();
  },

  async deleteRecipe(id: string): Promise<{ success: boolean }> {
    const response = await authenticatedFetch(`/api/recipes/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete recipe: ${response.status}`);
    }

    return response.json();
  },

  async markRecipeAsEaten(id: string, date?: Date): Promise<{ recipe: Recipe; success: boolean }> {
    const dateToUse = toDateOnlyISOString(date);
    return this.updateRecipe(id, { last_eaten: dateToUse });
  },

  async deleteRecipes(ids: string[]): Promise<{ success: boolean; deletedCount: number; deletedIds: string[] }> {
    const response = await authenticatedFetch('/api/recipes', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete recipes: ${response.status}`);
    }

    return response.json();
  },

  async markRecipesAsEaten(ids: string[], date?: Date): Promise<{ success: boolean; updatedCount: number; updatedIds: string[] }> {
    const dateToUse = toDateOnlyISOString(date);
    const response = await authenticatedFetch('/api/recipes', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, action: 'mark_as_eaten', date: dateToUse })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to mark recipes as eaten: ${response.status}`);
    }

    return response.json();
  }
};

export default recipeService;