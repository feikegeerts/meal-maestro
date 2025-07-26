import { Recipe, RecipeSearchParams, RecipesResponse, RecipeInput } from "@/types/recipe";

export interface AuthenticatedFetchOptions extends RequestInit {
  maxRetries?: number;
}

export async function authenticatedFetch(
  url: string, 
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { maxRetries = 1, ...fetchOptions } = options;
  
  const requestOptions: RequestInit = {
    credentials: 'include',
    ...fetchOptions
  };

  let response = await fetch(url, requestOptions);
  
  if (response.status === 401 && maxRetries > 0) {
    try {
      const { supabase } = await import('./supabase');
      
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        return response;
      }
      
      if (session) {
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in
          })
        });
        
        response = await fetch(url, {
          ...requestOptions,
          maxRetries: maxRetries - 1
        } as AuthenticatedFetchOptions);
      }
    } catch (refreshError) {
      console.error('Error during auth refresh retry:', refreshError);
    }
  }
  
  return response;
}

export const recipeService = {
  async getUserRecipes(params?: RecipeSearchParams): Promise<RecipesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.query) searchParams.set('query', params.query);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.season) searchParams.set('season', params.season);
    if (params?.tags?.length) searchParams.set('tags', params.tags.join(','));
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

  async getRecipesByTags(tags: string[]): Promise<RecipesResponse> {
    return this.getUserRecipes({ tags });
  }
};

export default recipeService;