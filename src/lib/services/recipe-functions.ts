import { OpenAI } from 'openai';
import { Recipe, RecipeCategory, RecipeSeason, RecipeTag, isValidCategory, isValidSeason, isValidTag } from '@/types/recipe';
import { SupabaseClient } from '@supabase/supabase-js';

// OpenAI function definitions for recipe management
export const recipeFunctions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_recipes',
      description: 'Search for recipes based on various criteria such as title, ingredients, category, tags, or season',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'General search query for title, ingredients, or description'
          },
          category: {
            type: 'string',
            description: 'Recipe category filter',
            enum: Object.values(RecipeCategory)
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to filter by from predefined list'
          },
          season: {
            type: 'string',
            description: 'Seasonal filter',
            enum: Object.values(RecipeSeason)
          },
          limit: {
            type: 'number',
            description: 'Maximum number of recipes to return (default 10)',
            minimum: 1,
            maximum: 50
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_recipe',
      description: 'Add a new recipe to the database',
      parameters: {
        type: 'object',
        properties: {
          title: { 
            type: 'string', 
            description: 'Recipe title or name' 
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Ingredient name' },
                amount: { type: 'number', description: 'Amount (can be null for "to taste")' },
                unit: { type: 'string', description: 'Unit of measurement (can be null)' },
                notes: { type: 'string', description: 'Additional notes (optional)' }
              },
              required: ['name']
            },
            description: 'List of structured ingredients needed'
          },
          servings: {
            type: 'number',
            description: 'Number of servings this recipe makes',
            minimum: 1,
            maximum: 100
          },
          description: {
            type: 'string',
            description: 'Detailed cooking instructions and steps'
          },
          category: {
            type: 'string',
            description: 'Recipe category',
            enum: Object.values(RecipeCategory)
          },
          tags: {
            type: 'array',
            items: { 
              type: 'string',
              enum: Object.values(RecipeTag)
            },
            description: 'Optional tags from predefined list'
          },
          season: {
            type: 'string',
            description: 'Optional seasonal relevance',
            enum: Object.values(RecipeSeason)
          }
        },
        required: ['title', 'ingredients', 'servings', 'description', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_recipe_form',
      description: 'Update the current recipe form with new data (for editing recipes in real-time)',
      parameters: {
        type: 'object',
        properties: {
          title: { 
            type: 'string', 
            description: 'Recipe title or name' 
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Ingredient name' },
                amount: { type: 'number', description: 'Amount (can be null for "to taste")' },
                unit: { type: 'string', description: 'Unit of measurement (can be null)' },
                notes: { type: 'string', description: 'Additional notes (optional)' }
              },
              required: ['name']
            },
            description: 'List of structured ingredients needed'
          },
          servings: {
            type: 'number',
            description: 'Number of servings this recipe makes',
            minimum: 1,
            maximum: 100
          },
          description: {
            type: 'string',
            description: 'Detailed cooking instructions and steps'
          },
          category: {
            type: 'string',
            description: 'Recipe category',
            enum: Object.values(RecipeCategory)
          },
          tags: {
            type: 'array',
            items: { 
              type: 'string',
              enum: Object.values(RecipeTag)
            },
            description: 'Optional tags from predefined list'
          },
          season: {
            type: 'string',
            description: 'Optional seasonal relevance',
            enum: Object.values(RecipeSeason)
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recipe_details',
      description: 'Get detailed information about a specific recipe by ID',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The recipe ID to retrieve details for'
          }
        },
        required: ['id']
      }
    }
  }
];

// Function handlers
export class RecipeFunctionHandler {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}
  
  async handleFunctionCall(functionName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (functionName) {
      case 'search_recipes':
        return await this.searchRecipes(args);
      case 'add_recipe':
        return await this.addRecipe(args);
      case 'update_recipe_form':
        return await this.updateRecipeForm(args);
      case 'get_recipe_details':
        return await this.getRecipeDetails(args);
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private async searchRecipes(args: Record<string, unknown>): Promise<{ recipes: Recipe[]; total: number }> {
    const { query, category, tags, season, limit } = args as {
      query?: string;
      category?: string;
      tags?: string[];
      season?: string;
      limit?: number;
    };
    try {
      let supabaseQuery = this.supabase
        .from('recipes')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(limit || 10);

      if (category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }

      if (season) {
        supabaseQuery = supabaseQuery.eq('season', season);
      }

      if (tags && tags.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('tags', tags);
      }

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${query}%,description.ilike.%${query}%,ingredients.cs.{${query}}`
        );
      }

      const { data: recipes, error } = await supabaseQuery;

      if (error) {
        throw new Error(error.message);
      }

      return {
        recipes: (recipes || []) as unknown as Recipe[],
        total: recipes?.length || 0
      };
    } catch (error) {
      console.error('Error in searchRecipes:', error);
      throw new Error(`Failed to search recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addRecipe(args: Record<string, unknown>): Promise<{ recipe: Recipe; success: boolean }> {
    const { title, ingredients, servings, description, category, tags, season } = args as {
      title: string;
      ingredients: Array<{
        name: string;
        amount?: number | null;
        unit?: string | null;
        notes?: string;
      }>;
      servings: number;
      description: string;
      category: string;
      tags?: string[];
      season?: string;
    };
    try {
      // Validate category
      if (!isValidCategory(category)) {
        throw new Error(`Invalid category "${category}". Valid categories: ${Object.values(RecipeCategory).join(', ')}`);
      }

      // Validate season if provided
      if (season && !isValidSeason(season)) {
        throw new Error(`Invalid season "${season}". Valid seasons: ${Object.values(RecipeSeason).join(', ')}`);
      }

      // Validate and filter tags if provided
      let validTags: string[] = [];
      if (tags) {
        const invalidTags = tags.filter(tag => !isValidTag(tag));
        if (invalidTags.length > 0) {
          console.warn(`Invalid tags filtered out: ${invalidTags.join(', ')}`);
        }
        // Filter to only valid tags
        validTags = tags.filter(tag => isValidTag(tag));
      }

      // Convert ingredients to proper format with IDs
      const formattedIngredients = ingredients.map((ingredient, index) => ({
        id: `ingredient-${Date.now()}-${index}`,
        name: ingredient.name,
        amount: ingredient.amount || null,
        unit: ingredient.unit || null,
        notes: ingredient.notes || undefined
      }));

      const insertData = {
        title,
        ingredients: formattedIngredients,
        servings,
        description,
        category,
        tags: validTags || [],
        season,
        user_id: this.userId
      };

      const { data: recipe, error } = await this.supabase
        .from('recipes')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        recipe: recipe as unknown as Recipe,
        success: true
      };
    } catch (error) {
      console.error('Error in addRecipe:', error);
      throw new Error(`Failed to add recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateRecipeForm(args: Record<string, unknown>): Promise<{ formUpdate: unknown; success: boolean }> {
    const { title, ingredients, servings, description, category, tags, season } = args as {
      title?: string;
      ingredients?: Array<{
        name: string;
        amount?: number | null;
        unit?: string | null;
        notes?: string;
      }>;
      servings?: number;
      description?: string;
      category?: string;
      tags?: string[];
      season?: string;
    };

    try {
      // Validate tags if provided
      if (tags) {
        const invalidTags = tags.filter(tag => !isValidTag(tag));
        if (invalidTags.length > 0) {
          console.warn(`Invalid tags filtered out: ${invalidTags.join(', ')}`);
        }
        // Filter to only valid tags
        const validTags = tags.filter(tag => isValidTag(tag));
        return {
          formUpdate: {
            title,
            ingredients: ingredients?.map((ingredient, index) => ({
              id: `ingredient-${Date.now()}-${index}`,
              name: ingredient.name,
              amount: ingredient.amount || null,
              unit: ingredient.unit || null,
              notes: ingredient.notes || ""
            })),
            servings,
            description,
            category,
            tags: validTags,
            season
          },
          success: true
        };
      }

      return {
        formUpdate: {
          title,
          ingredients: ingredients?.map((ingredient, index) => ({
            id: `ingredient-${Date.now()}-${index}`,
            name: ingredient.name,
            amount: ingredient.amount || null,
            unit: ingredient.unit || null,
            notes: ingredient.notes || ""
          })),
          servings,
          description,
          category,
          tags,
          season
        },
        success: true
      };
    } catch (error) {
      console.error('Error in updateRecipeForm:', error);
      throw new Error(`Failed to update recipe form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getRecipeDetails(args: Record<string, unknown>): Promise<{ recipe: Recipe }> {
    const { id } = args as { id: string };
    try {
      const { data: recipe, error } = await this.supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      return { recipe: recipe as unknown as Recipe };
    } catch (error) {
      console.error('Error in getRecipeDetails:', error);
      throw new Error(`Failed to get recipe details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Helper function to format function results for OpenAI
export function formatFunctionResult(functionName: string, result: unknown): string {
  switch (functionName) {
    case 'search_recipes':
      const searchResult = result as { recipes: Recipe[]; total: number };
      return JSON.stringify({
        function: 'search_recipes',
        result: {
          found: searchResult.total,
          recipes: searchResult.recipes.map((r: Recipe) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            tags: r.tags,
            season: r.season
          }))
        }
      });
    case 'add_recipe':
      const addResult = result as { recipe: Recipe; success: boolean };
      return JSON.stringify({
        function: 'add_recipe',
        result: {
          success: addResult.success,
          recipe: {
            id: addResult.recipe.id,
            title: addResult.recipe.title,
            category: addResult.recipe.category,
            servings: addResult.recipe.servings
          }
        }
      });
    case 'update_recipe_form':
      const formResult = result as { formUpdate: unknown; success: boolean };
      return JSON.stringify({
        function: 'update_recipe_form',
        result: formResult
      });
    case 'get_recipe_details':
      const detailsResult = result as { recipe: Recipe };
      return JSON.stringify({
        function: 'get_recipe_details',
        result: {
          recipe: detailsResult.recipe
        }
      });
    default:
      return JSON.stringify({ function: functionName, result });
  }
}