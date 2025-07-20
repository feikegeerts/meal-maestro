import type { OpenAI } from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recipe, RecipeInput } from '$lib/types.js';
import { RecipeCategory, RecipeSeason, RecipeTag, RECIPE_CATEGORIES, RECIPE_SEASONS, RECIPE_TAGS } from '$lib/types.js';

// Validation functions
export function isValidCategory(category: string): category is RecipeCategory {
  return RECIPE_CATEGORIES.includes(category as RecipeCategory);
}

export function isValidSeason(season: string): season is RecipeSeason {
  return RECIPE_SEASONS.includes(season as RecipeSeason);
}

export function isValidTag(tag: string): tag is RecipeTag {
  return RECIPE_TAGS.includes(tag as RecipeTag);
}

export function validateRecipeInput(input: RecipeInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isValidCategory(input.category)) {
    errors.push(`Invalid category "${input.category}". Must be one of: ${RECIPE_CATEGORIES.join(', ')}`);
  }
  
  if (input.season && !isValidSeason(input.season)) {
    errors.push(`Invalid season "${input.season}". Must be one of: ${RECIPE_SEASONS.join(', ')}`);
  }
  
  const invalidTags = input.tags.filter(tag => !isValidTag(tag));
  if (invalidTags.length > 0) {
    errors.push(`Invalid tags: ${invalidTags.join(', ')}. Available tags: ${RECIPE_TAGS.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

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
            description: 'Recipe category filter. Must be one of: "breakfast", "lunch", "dinner", "dessert", "snack", "appetizer", "beverage"' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Tags to filter by. Common tags include dietary (vegetarian, vegan, gluten-free, keto, paleo), cuisine (italian, mexican, chinese, thai, mediterranean), cooking methods (baking, grilling, one-pot, slow-cooking, instant-pot), characteristics (quick, easy, healthy, spicy, creamy), occasions (party, weeknight, meal-prep, kid-friendly), proteins (chicken, beef, fish, tofu, beans), and dish types (soup, salad, pasta, pizza)' 
          },
          season: { 
            type: 'string', 
            description: 'Seasonal filter. Must be one of: "spring", "summer", "fall", "winter", "year-round"' 
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
            description: 'Recipe category. Must be one of: "breakfast", "lunch", "dinner", "dessert", "snack", "appetizer", "beverage"' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Optional tags for the recipe. Choose from dietary restrictions (vegetarian, vegan, gluten-free, dairy-free, nut-free, keto, paleo, low-carb), cuisines (italian, mexican, chinese, indian, thai, french, mediterranean, american, japanese), cooking methods (baking, grilling, frying, roasting, slow-cooking, air-fryer, instant-pot, one-pot), characteristics (quick, easy, healthy, comfort-food, spicy, mild, sweet, savory, creamy), occasions (party, holiday, weeknight, meal-prep, kid-friendly, date-night), proteins (chicken, beef, pork, fish, seafood, tofu, beans, eggs), and dish types (soup, salad, sandwich, pasta, pizza, cookies, cake)' 
          },
          season: { 
            type: 'string', 
            description: 'Optional seasonal relevance. Must be one of: "spring", "summer", "fall", "winter", "year-round"' 
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
            description: 'Updated recipe category. Must be one of: "breakfast", "lunch", "dinner", "dessert", "snack", "appetizer", "beverage"' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Updated tags. Choose from dietary restrictions (vegetarian, vegan, gluten-free, dairy-free, nut-free, keto, paleo, low-carb), cuisines (italian, mexican, chinese, indian, thai, french, mediterranean, american, japanese), cooking methods (baking, grilling, frying, roasting, slow-cooking, air-fryer, instant-pot, one-pot), characteristics (quick, easy, healthy, comfort-food, spicy, mild, sweet, savory, creamy), occasions (party, holiday, weeknight, meal-prep, kid-friendly, date-night), proteins (chicken, beef, pork, fish, seafood, tofu, beans, eggs), and dish types (soup, salad, sandwich, pasta, pizza, cookies, cake)' 
          },
          season: { 
            type: 'string', 
            description: 'Updated seasonal relevance. Must be one of: "spring", "summer", "fall", "winter", "year-round"' 
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
  constructor(private supabase: SupabaseClient, private userId?: string) {}

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

    // Filter by user if provided
    if (this.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', this.userId);
    }

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

    // Validate input
    const validation = validateRecipeInput({
      title,
      ingredients,
      description,
      category,
      tags: tags || [],
      season
    });

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const insertData: any = {
      title,
      ingredients,
      description,
      category,
      tags: tags || [],
      season
    };

    // Add user_id if provided
    if (this.userId) {
      insertData.user_id = this.userId;
    }

    const { data: recipe, error } = await this.supabase
      .from('recipes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating recipe:', error);
      throw new Error('Failed to create recipe');
    }

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

    // Get original recipe data for validation and logging
    let originalRecipeQuery = this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      originalRecipeQuery = originalRecipeQuery.eq('user_id', this.userId);
    }
    
    const { data: originalRecipe } = await originalRecipeQuery.single();

    if (!originalRecipe) {
      throw new Error('Recipe not found');
    }

    // Validate only the fields being updated
    if (updateData.category && !isValidCategory(updateData.category)) {
      throw new Error(`Invalid category "${updateData.category}". Must be one of: ${RECIPE_CATEGORIES.join(', ')}`);
    }

    if (updateData.season && !isValidSeason(updateData.season)) {
      throw new Error(`Invalid season "${updateData.season}". Must be one of: ${RECIPE_SEASONS.join(', ')}`);
    }

    if (updateData.tags) {
      const invalidTags = updateData.tags.filter(tag => !isValidTag(tag));
      if (invalidTags.length > 0) {
        throw new Error(`Invalid tags: ${invalidTags.join(', ')}. Available tags: ${RECIPE_TAGS.join(', ')}`);
      }
    }

    // Prepare update data
    const updateFields: any = { updated_at: new Date().toISOString() };
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields[key] = value;
      }
    });

    let updateQuery = this.supabase
      .from('recipes')
      .update(updateFields)
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      updateQuery = updateQuery.eq('user_id', this.userId);
    }
    
    const { data: recipe, error } = await updateQuery
      .select()
      .single();

    if (error) {
      console.error('Error updating recipe:', error);
      throw new Error('Failed to update recipe');
    }

    return { recipe: recipe as Recipe, success: true };
  }

  private async markRecipeEaten(args: {
    id: string;
    date?: string;
  }): Promise<{ recipe: Recipe; success: boolean }> {
    const { id, date } = args;
    const eatenDate = date || new Date().toISOString();

    // Get original recipe data for logging
    let originalRecipeQuery = this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      originalRecipeQuery = originalRecipeQuery.eq('user_id', this.userId);
    }
    
    const { data: originalRecipe } = await originalRecipeQuery.single();

    if (!originalRecipe) {
      throw new Error('Recipe not found');
    }

    let updateQuery = this.supabase
      .from('recipes')
      .update({ 
        last_eaten: eatenDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      updateQuery = updateQuery.eq('user_id', this.userId);
    }
    
    const { data: recipe, error } = await updateQuery
      .select()
      .single();

    if (error) {
      console.error('Error marking recipe as eaten:', error);
      throw new Error('Failed to mark recipe as eaten');
    }

    return { recipe: recipe as Recipe, success: true };
  }

  private async deleteRecipe(args: {
    id: string;
  }): Promise<{ success: boolean; message: string }> {
    const { id } = args;

    // Get recipe data before deletion for logging
    let fetchQuery = this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      fetchQuery = fetchQuery.eq('user_id', this.userId);
    }
    
    const { data: recipeToDelete, error: fetchError } = await fetchQuery.single();

    if (fetchError) {
      console.error('Error fetching recipe for deletion:', fetchError);
      throw new Error('Recipe not found');
    }

    let deleteQuery = this.supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      deleteQuery = deleteQuery.eq('user_id', this.userId);
    }
    
    const { error } = await deleteQuery;

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

    let recipeQuery = this.supabase
      .from('recipes')
      .select('*')
      .eq('id', id);
    
    // Filter by user if provided
    if (this.userId) {
      recipeQuery = recipeQuery.eq('user_id', this.userId);
    }
    
    const { data: recipe, error } = await recipeQuery.single();

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
        return `Found 1 recipe: ${result.recipes[0].title} (${result.recipes[0].category}) with ID: ${result.recipes[0].id}`;
      }
      return `Found ${result.total} recipes. Here's an overview:\n${result.recipes
        .map((recipe: Recipe, index: number) => `${index + 1}. ${recipe.title} (${recipe.category}) - ID: ${recipe.id}`)
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