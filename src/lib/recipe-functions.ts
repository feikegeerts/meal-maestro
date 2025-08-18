import { OpenAI } from 'openai';
import { 
  RecipeCategory, 
  RecipeSeason, 
  CuisineType,
  DietType,
  CookingMethodType,
  DishType,
  ProteinType,
  OccasionType,
  CharacteristicType,
  isValidCuisine,
  isValidDietType,
  isValidCookingMethod,
  isValidDishType,
  isValidProteinType,
  isValidOccasionType,
  isValidCharacteristicType,
  COOKING_UNITS 
} from '@/types/recipe';

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
              unit: { 
                type: 'string', 
                enum: COOKING_UNITS,
                description: 'Unit of measurement - REQUIRED for most ingredients. Choose appropriate unit: cups/tablespoons/teaspoons for liquids and dry goods, pieces/whole/cloves for individual items, oz/lb/g for weight. Only use null for "to taste" items.' 
              },
              notes: { type: 'string', description: 'Additional notes (optional)' }
            },
            required: ['name']
          },
          description: 'List of structured ingredients with proper amounts and units. IMPORTANT: Always provide appropriate units for ingredients (cups, tablespoons, pieces, cloves, etc.). Only omit units for "to taste" items.'
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
        cuisine: {
          type: 'string',
          enum: Object.values(CuisineType),
          description: 'Optional cuisine type - single value describing the primary culinary tradition'
        },
        diet_types: {
          type: 'array',
          items: { 
            type: 'string',
            enum: Object.values(DietType)
          },
          description: 'Optional dietary requirements/restrictions - multiple values allowed'
        },
        cooking_methods: {
          type: 'array',
          items: { 
            type: 'string',
            enum: Object.values(CookingMethodType)
          },
          description: 'Optional cooking methods used - multiple values allowed'
        },
        dish_types: {
          type: 'array',
          items: { 
            type: 'string',
            enum: Object.values(DishType)
          },
          description: 'Optional dish/meal types - multiple values allowed'
        },
        proteins: {
          type: 'array',
          items: { 
            type: 'string',
            enum: Object.values(ProteinType)
          },
          description: 'Optional protein sources in the recipe - multiple values allowed'
        },
        occasions: {
          type: 'array',
          items: { 
            type: 'string',
            enum: Object.values(OccasionType)
          },
          description: 'Optional occasions suitable for this recipe - multiple values allowed'
        },
        characteristics: {
          type: 'array',
          items: { 
            type: 'string',
            enum: Object.values(CharacteristicType)
          },
          description: 'Optional recipe characteristics like easy, quick, budget, etc. - multiple values allowed'
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
  const { 
    title, 
    ingredients, 
    servings, 
    description, 
    category, 
    cuisine,
    diet_types,
    cooking_methods,
    dish_types,
    proteins,
    occasions,
    characteristics,
    season 
  } = args as {
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
    cuisine?: string;
    diet_types?: string[];
    cooking_methods?: string[];
    dish_types?: string[];
    proteins?: string[];
    occasions?: string[];
    characteristics?: string[];
    season?: string;
  };

  try {
    // Process ingredients - ensure they have all required fields
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
      
      return {
        id: `ingredient-${Date.now()}-${index}`,
        name: ingredient.name.trim(),
        amount: cleanAmount ?? null,
        unit: cleanUnit ?? null,
        notes: ingredient.notes ?? ""
      };
    });

    // Validate categorized tags if provided
    let validCuisine = cuisine;
    if (cuisine && !isValidCuisine(cuisine)) {
      console.warn(`Invalid cuisine filtered out: ${cuisine}`);
      validCuisine = undefined;
    }

    let validDietTypes = diet_types;
    if (diet_types) {
      const invalidDietTypes = diet_types.filter(dietType => !isValidDietType(dietType));
      if (invalidDietTypes.length > 0) {
        console.warn(`Invalid diet types filtered out: ${invalidDietTypes.join(', ')}`);
      }
      validDietTypes = diet_types.filter(dietType => isValidDietType(dietType));
    }

    let validCookingMethods = cooking_methods;
    if (cooking_methods) {
      const invalidCookingMethods = cooking_methods.filter(method => !isValidCookingMethod(method));
      if (invalidCookingMethods.length > 0) {
        console.warn(`Invalid cooking methods filtered out: ${invalidCookingMethods.join(', ')}`);
      }
      validCookingMethods = cooking_methods.filter(method => isValidCookingMethod(method));
    }

    let validDishTypes = dish_types;
    if (dish_types) {
      const invalidDishTypes = dish_types.filter(dishType => !isValidDishType(dishType));
      if (invalidDishTypes.length > 0) {
        console.warn(`Invalid dish types filtered out: ${invalidDishTypes.join(', ')}`);
      }
      validDishTypes = dish_types.filter(dishType => isValidDishType(dishType));
    }

    let validProteins = proteins;
    if (proteins) {
      const invalidProteins = proteins.filter(protein => !isValidProteinType(protein));
      if (invalidProteins.length > 0) {
        console.warn(`Invalid proteins filtered out: ${invalidProteins.join(', ')}`);
      }
      validProteins = proteins.filter(protein => isValidProteinType(protein));
    }

    let validOccasions = occasions;
    if (occasions) {
      const invalidOccasions = occasions.filter(occasion => !isValidOccasionType(occasion));
      if (invalidOccasions.length > 0) {
        console.warn(`Invalid occasions filtered out: ${invalidOccasions.join(', ')}`);
      }
      validOccasions = occasions.filter(occasion => isValidOccasionType(occasion));
    }

    let validCharacteristics = characteristics;
    if (characteristics) {
      const invalidCharacteristics = characteristics.filter(characteristic => !isValidCharacteristicType(characteristic));
      if (invalidCharacteristics.length > 0) {
        console.warn(`Invalid characteristics filtered out: ${invalidCharacteristics.join(', ')}`);
      }
      validCharacteristics = characteristics.filter(characteristic => isValidCharacteristicType(characteristic));
    }

    const formUpdate = {
      title,
      ingredients: processedIngredients,
      servings,
      description,
      category,
      cuisine: validCuisine,
      diet_types: validDietTypes,
      cooking_methods: validCookingMethods,
      dish_types: validDishTypes,
      proteins: validProteins,
      occasions: validOccasions,
      characteristics: validCharacteristics,
      season
    };

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