import type { OpenAI } from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recipe } from '$lib/types.js';
import { logRecipeCreated, logRecipeUpdated, logRecipeDeleted, logRecipeSearch } from '$lib/services/actionLogger.js';

// OpenAI function definitions for recipe operations
export const recipeTools: OpenAI.Chat.Completions.ChatCompletionCreateParams['tools'] = [
  {
    type: 'function',
    function: {
      name: 'search_recipes',
      description: 'Search for recipes based on various criteria like title, ingredients, category, tags, or season',
      parameters: {
        type: 'object',
        properties: {
          query: { 
            type: 'string', 
            description: 'General search query to match against title, ingredients, or description' 
          },
          category: { 
            type: 'string', 
            description: 'Recipe category filter (e.g., "dinner", "dessert", "breakfast", "lunch")' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Tags to filter by (e.g., ["vegetarian", "quick", "healthy"])' 
          },
          season: { 
            type: 'string', 
            description: 'Seasonal filter (e.g., "summer", "winter", "spring", "fall", "year-round")' 
          },
          limit: {
            type: 'number',
            description: 'Maximum number of recipes to return (default 10)'
          }
        },
      },
    },
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
            items: { type: 'string' },
            description: 'List of ingredients needed for the recipe',
          },
          description: { 
            type: 'string', 
            description: 'Detailed cooking instructions and preparation steps' 
          },
          category: { 
            type: 'string', 
            description: 'Recipe category (e.g., "dinner", "dessert", "breakfast", "lunch")' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Optional tags for the recipe (e.g., ["vegetarian", "quick", "healthy"])' 
          },
          season: { 
            type: 'string', 
            description: 'Optional seasonal relevance (e.g., "summer", "winter", "spring", "fall", "year-round")' 
          },
        },
        required: ['title', 'ingredients', 'description', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_recipe',
      description: 'Update an existing recipe with new information',
      parameters: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'Recipe ID to update' 
          },
          title: { 
            type: 'string', 
            description: 'New recipe title' 
          },
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: 'Updated list of ingredients',
          },
          description: { 
            type: 'string', 
            description: 'Updated cooking instructions' 
          },
          category: { 
            type: 'string', 
            description: 'Updated recipe category' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Updated tags' 
          },
          season: { 
            type: 'string', 
            description: 'Updated seasonal relevance' 
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_recipe_eaten',
      description: 'Update the last_eaten timestamp for a recipe to mark it as recently consumed',
      parameters: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'Recipe ID to mark as eaten' 
          },
          date: {
            type: 'string',
            description: 'Optional date when the recipe was eaten (ISO format). If not provided, uses current date.'
          }
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_recipe',
      description: 'Delete a recipe from the database. Use with caution as this cannot be undone.',
      parameters: {
        type: 'object',
        properties: {
          id: { 
            type: 'string', 
            description: 'Recipe ID to delete' 
          },
        },
        required: ['id'],
      },
    },
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
            description: 'Recipe ID to get details for' 
          },
        },
        required: ['id'],
      },
    },
  },
];

// Function call handlers
export class RecipeFunctionHandler {
  constructor(private supabase: SupabaseClient) {}

  async handleFunctionCall(functionName: string, args: any): Promise<any> {
    switch (functionName) {
      case 'search_recipes':
        return await this.searchRecipes(args);
      case 'add_recipe':
        return await this.addRecipe(args);
      case 'update_recipe':
        return await this.updateRecipe(args);
      case 'mark_recipe_eaten':
        return await this.markRecipeEaten(args);
      case 'delete_recipe':
        return await this.deleteRecipe(args);
      case 'get_recipe_details':
        return await this.getRecipeDetails(args);
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private async searchRecipes(args: {
    query?: string;
    category?: string;
    tags?: string[];
    season?: string;
    limit?: number;
  }): Promise<{ recipes: Recipe[]; total: number }> {
    const { query, category, tags, season, limit = 10 } = args;

    let supabaseQuery = this.supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
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
      console.error('Error searching recipes:', error);
      throw new Error('Failed to search recipes');
    }

    // Log the search action
    await logRecipeSearch(this.supabase, query || '', { category, tags, season }, recipes?.length || 0);

    return {
      recipes: recipes || [],
      total: recipes?.length || 0
    };
  }

  private async addRecipe(args: {
    title: string;
    ingredients: string[];
    description: string;
    category: string;
    tags?: string[];
    season?: string;
  }): Promise<{ recipe: Recipe; success: boolean }> {
    const { title, ingredients, description, category, tags, season } = args;

    const { data: recipe, error } = await this.supabase
      .from('recipes')
      .insert([{
        title,
        ingredients,
        description,
        category,
        tags: tags || [],
        season
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating recipe:', error);
      throw new Error('Failed to create recipe');
    }

    // Log the recipe creation
    await logRecipeCreated(this.supabase, recipe as Recipe);

    return { recipe: recipe as Recipe, success: true };
  }

  private async updateRecipe(args: {
    id: string;
    title?: string;
    ingredients?: string[];
    description?: string;
    category?: string;
    tags?: string[];
    season?: string;
  }): Promise<{ recipe: Recipe; success: boolean }> {
    const { id, ...updateData } = args;

    // Get original recipe data for logging
    const { data: originalRecipe } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalRecipe) {
      throw new Error('Recipe not found');
    }

    // Prepare update data
    const updateFields: any = { updated_at: new Date().toISOString() };
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields[key] = value;
      }
    });

    const { data: recipe, error } = await this.supabase
      .from('recipes')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recipe:', error);
      throw new Error('Failed to update recipe');
    }

    // Log the recipe update
    await logRecipeUpdated(this.supabase, id, originalRecipe, updateFields);

    return { recipe: recipe as Recipe, success: true };
  }

  private async markRecipeEaten(args: {
    id: string;
    date?: string;
  }): Promise<{ recipe: Recipe; success: boolean }> {
    const { id, date } = args;
    const eatenDate = date || new Date().toISOString();

    // Get original recipe data for logging
    const { data: originalRecipe } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (!originalRecipe) {
      throw new Error('Recipe not found');
    }

    const { data: recipe, error } = await this.supabase
      .from('recipes')
      .update({ 
        last_eaten: eatenDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking recipe as eaten:', error);
      throw new Error('Failed to mark recipe as eaten');
    }

    // Log the recipe update
    await logRecipeUpdated(this.supabase, id, originalRecipe, { last_eaten: eatenDate });

    return { recipe: recipe as Recipe, success: true };
  }

  private async deleteRecipe(args: {
    id: string;
  }): Promise<{ success: boolean; message: string }> {
    const { id } = args;

    // Get recipe data before deletion for logging
    const { data: recipeToDelete, error: fetchError } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching recipe for deletion:', fetchError);
      throw new Error('Recipe not found');
    }

    // Log the recipe deletion BEFORE actually deleting
    await logRecipeDeleted(this.supabase, recipeToDelete as Recipe);

    const { error } = await this.supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recipe:', error);
      throw new Error('Failed to delete recipe');
    }

    return { 
      success: true, 
      message: `Recipe "${recipeToDelete.title}" has been deleted successfully` 
    };
  }

  private async getRecipeDetails(args: {
    id: string;
  }): Promise<{ recipe: Recipe }> {
    const { id } = args;

    const { data: recipe, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching recipe:', error);
      throw new Error('Recipe not found');
    }

    return { recipe: recipe as Recipe };
  }
}

// Helper function to format function call results for AI response
export function formatFunctionResult(functionName: string, result: any): string {
  switch (functionName) {
    case 'search_recipes':
      if (result.recipes.length === 0) {
        return 'No recipes found matching your criteria.';
      }
      if (result.recipes.length === 1) {
        return `Found 1 recipe: ${result.recipes[0].title} (${result.recipes[0].category})`;
      }
      return `Found ${result.total} recipes. Here's an overview:\n${result.recipes
        .map((recipe: Recipe, index: number) => `${index + 1}. ${recipe.title} (${recipe.category})`)
        .join('\n')}\n\nWhich recipe would you like to see the full details for? Please specify by number or name.`;
    
    case 'add_recipe':
      return `Successfully added recipe: "${result.recipe.title}" to the ${result.recipe.category} category.`;
    
    case 'update_recipe':
      return `Successfully updated recipe: "${result.recipe.title}".`;
    
    case 'mark_recipe_eaten':
      return `Marked "${result.recipe.title}" as eaten on ${new Date(result.recipe.last_eaten).toLocaleDateString()}.`;
    
    case 'delete_recipe':
      return result.message;
    
    case 'get_recipe_details':
      const recipe = result.recipe;
      return `Recipe: ${recipe.title}\nCategory: ${recipe.category}\nIngredients: ${recipe.ingredients.join(', ')}\nInstructions: ${recipe.description}${
        recipe.tags?.length ? `\nTags: ${recipe.tags.join(', ')}` : ''
      }${recipe.season ? `\nSeason: ${recipe.season}` : ''}${
        recipe.last_eaten ? `\nLast eaten: ${new Date(recipe.last_eaten).toLocaleDateString()}` : ''
      }`;
    
    default:
      return JSON.stringify(result);
  }
}