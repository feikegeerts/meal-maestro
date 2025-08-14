import { OpenAI } from 'openai';
import { RecipeCategory, RecipeSeason, RecipeTag, isValidTag } from '@/types/recipe';

// OpenAI function definition for recipe form assistance
export const recipeFormFunction: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'update_recipe_form',
    description: 'Update the current recipe form with complete recipe data. When creating a new recipe, provide ALL fields including title, ingredients, detailed cooking instructions, category, servings, and tags in a SINGLE function call.',
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
          description: 'REQUIRED: Detailed step-by-step cooking instructions with times, temperatures, and specific techniques. Must be comprehensive cooking directions, not just a brief summary.'
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
};

// Simple function handler for form updates only
export async function updateRecipeForm(args: Record<string, unknown>): Promise<{ formUpdate: unknown; success: boolean }> {
  console.log("🍳 [RecipeForm] Starting form update with args:", JSON.stringify(args, null, 2));
  
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
  
  console.log("🍳 [RecipeForm] Parsed description:", description ? `"${description.slice(0, 200)}..."` : 'null');
  console.log("🍳 [RecipeForm] Description length:", description?.length || 0);

  try {
    // Process ingredients - ensure they have all required fields
    console.log("🍳 [RecipeForm] Processing", ingredients?.length || 0, "ingredients");
    const processedIngredients = ingredients?.filter(ing => ing.name?.trim()).map((ingredient, index) => {
      // Clean up amount - handle invalid values
      let cleanAmount: number | null = ingredient.amount ?? null;
      if (typeof cleanAmount === 'string') {
        // Handle string amounts like "," or other invalid strings
        const trimmedAmount = (cleanAmount as string).trim();
        if (trimmedAmount === '' || trimmedAmount === ',' || isNaN(Number(trimmedAmount))) {
          cleanAmount = null;
        } else {
          cleanAmount = Number(trimmedAmount);
        }
      }
      
      // Clean up unit - handle empty strings
      let cleanUnit = ingredient.unit;
      if (typeof cleanUnit === 'string' && cleanUnit.trim() === '') {
        cleanUnit = null;
      }
      
      const processed = {
        id: `ingredient-${Date.now()}-${index}`,
        name: ingredient.name.trim(),
        amount: cleanAmount ?? null,
        unit: cleanUnit ?? null,
        notes: ingredient.notes ?? ""
      };
      
      console.log(`🍳 [RecipeForm] Ingredient ${index + 1}: "${processed.name}" - amount: ${processed.amount}, unit: "${processed.unit}"`);
      return processed;
    });
    console.log("🍳 [RecipeForm] Processed ingredients:", processedIngredients?.length || 0, "items");

    // Validate tags if provided
    let validTags = tags;
    if (tags) {
      const invalidTags = tags.filter(tag => !isValidTag(tag));
      if (invalidTags.length > 0) {
        console.warn(`Invalid tags filtered out: ${invalidTags.join(', ')}`);
      }
      validTags = tags.filter(tag => isValidTag(tag));
    }

    const formUpdate = {
      title,
      ingredients: processedIngredients,
      servings,
      description,
      category,
      tags: validTags,
      season
    };
    
    console.log("🍳 [RecipeForm] Final form update object:");
    console.log("🍳 [RecipeForm] - title:", title || 'null');
    console.log("🍳 [RecipeForm] - servings:", servings || 'null');
    console.log("🍳 [RecipeForm] - description:", description ? `"${description.slice(0, 100)}..."` : 'null');
    console.log("🍳 [RecipeForm] - category:", category || 'null');
    console.log("🍳 [RecipeForm] - tags:", validTags?.join(', ') || 'none');
    console.log("🍳 [RecipeForm] - season:", season || 'null');
    console.log("🍳 [RecipeForm] - ingredients count:", processedIngredients?.length || 0);

    return {
      formUpdate,
      success: true
    };
  } catch (error) {
    console.error('Error in updateRecipeForm:', error);
    throw new Error(`Failed to update recipe form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to format function results for OpenAI
export function formatFunctionResult(functionName: string, result: unknown): string {
  if (functionName === 'update_recipe_form') {
    const formResult = result as { formUpdate: unknown; success: boolean };
    return JSON.stringify({
      function: 'update_recipe_form',
      result: formResult
    });
  }
  
  return JSON.stringify({ function: functionName, result });
}