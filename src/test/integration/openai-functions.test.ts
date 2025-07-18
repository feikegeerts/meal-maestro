import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeFunctionHandler, formatFunctionResult } from '../../lib/services/recipeFunctions.js';
import type { Recipe } from '../../lib/types.js';

// Mock Supabase client
const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Spaghetti Carbonara',
    ingredients: ['spaghetti', 'eggs', 'bacon', 'parmesan cheese', 'black pepper'],
    description: 'Classic Italian pasta dish with eggs, bacon, and cheese',
    category: 'dinner',
    tags: ['italian', 'pasta', 'quick'],
    season: 'year-round',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'Chocolate Chip Cookies',
    ingredients: ['flour', 'sugar', 'butter', 'eggs', 'chocolate chips'],
    description: 'Soft and chewy chocolate chip cookies',
    category: 'dessert',
    tags: ['cookies', 'dessert', 'baking'],
    season: 'year-round',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockRecipes[0], error: null }),
    then: vi.fn().mockResolvedValue({ data: mockRecipes, error: null })
  }))
};

// Mock action logger
vi.mock('../../lib/services/actionLogger.js', () => ({
  logRecipeCreated: vi.fn(),
  logRecipeUpdated: vi.fn(),
  logRecipeDeleted: vi.fn(),
  logRecipeSearch: vi.fn()
}));

describe('OpenAI Recipe Functions Integration', () => {
  let handler: RecipeFunctionHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new RecipeFunctionHandler(mockSupabaseClient as any);
  });

  describe('search_recipes function', () => {
    it('should search recipes by query', async () => {
      const result = await handler.handleFunctionCall('search_recipes', {
        query: 'pasta'
      });

      expect(result).toHaveProperty('recipes');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.recipes)).toBe(true);
      expect(result.total).toBe(2);
    });

    it('should search recipes by category', async () => {
      const result = await handler.handleFunctionCall('search_recipes', {
        category: 'dinner'
      });

      expect(result).toHaveProperty('recipes');
      expect(result).toHaveProperty('total');
    });

    it('should search recipes by tags', async () => {
      const result = await handler.handleFunctionCall('search_recipes', {
        tags: ['italian', 'pasta']
      });

      expect(result).toHaveProperty('recipes');
      expect(result).toHaveProperty('total');
    });

    it('should limit search results', async () => {
      const result = await handler.handleFunctionCall('search_recipes', {
        limit: 1
      });

      expect(result).toHaveProperty('recipes');
      expect(result).toHaveProperty('total');
    });
  });

  describe('add_recipe function', () => {
    it('should add a new recipe', async () => {
      const recipeData = {
        title: 'New Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        description: 'A new recipe',
        category: 'lunch',
        tags: ['easy', 'quick'],
        season: 'summer'
      };

      const result = await handler.handleFunctionCall('add_recipe', recipeData);

      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('success', true);
      expect(result.recipe).toHaveProperty('title', 'New Recipe');
    });

    it('should handle missing optional fields', async () => {
      const recipeData = {
        title: 'Simple Recipe',
        ingredients: ['ingredient1'],
        description: 'A simple recipe',
        category: 'breakfast'
      };

      const result = await handler.handleFunctionCall('add_recipe', recipeData);

      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('update_recipe function', () => {
    it('should update an existing recipe', async () => {
      const updateData = {
        id: '1',
        title: 'Updated Recipe',
        ingredients: ['new ingredient']
      };

      const result = await handler.handleFunctionCall('update_recipe', updateData);

      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('success', true);
    });

    it('should handle partial updates', async () => {
      const updateData = {
        id: '1',
        title: 'Updated Title Only'
      };

      const result = await handler.handleFunctionCall('update_recipe', updateData);

      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('mark_recipe_eaten function', () => {
    it('should mark recipe as eaten', async () => {
      const result = await handler.handleFunctionCall('mark_recipe_eaten', {
        id: '1'
      });

      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('success', true);
    });

    it('should mark recipe as eaten with custom date', async () => {
      const result = await handler.handleFunctionCall('mark_recipe_eaten', {
        id: '1',
        date: '2024-01-15T12:00:00Z'
      });

      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('get_recipe_details function', () => {
    it('should get recipe details', async () => {
      const result = await handler.handleFunctionCall('get_recipe_details', {
        id: '1'
      });

      expect(result).toHaveProperty('recipe');
      expect(result.recipe).toHaveProperty('id', '1');
    });
  });

  describe('delete_recipe function', () => {
    it('should delete a recipe', async () => {
      const result = await handler.handleFunctionCall('delete_recipe', {
        id: '1'
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
    });
  });

  describe('formatFunctionResult', () => {
    it('should format search results for single recipe', () => {
      const result = {
        recipes: [mockRecipes[0]],
        total: 1
      };

      const formatted = formatFunctionResult('search_recipes', result);
      expect(formatted).toContain('Found 1 recipe');
      expect(formatted).toContain('Spaghetti Carbonara');
    });

    it('should format search results for multiple recipes', () => {
      const result = {
        recipes: mockRecipes,
        total: 2
      };

      const formatted = formatFunctionResult('search_recipes', result);
      expect(formatted).toContain('Found 2 recipes');
      expect(formatted).toContain('Which recipe would you like to see');
    });

    it('should format search results for no recipes', () => {
      const result = {
        recipes: [],
        total: 0
      };

      const formatted = formatFunctionResult('search_recipes', result);
      expect(formatted).toContain('No recipes found');
    });

    it('should format add recipe result', () => {
      const result = {
        recipe: mockRecipes[0],
        success: true
      };

      const formatted = formatFunctionResult('add_recipe', result);
      expect(formatted).toContain('Successfully added recipe');
      expect(formatted).toContain('Spaghetti Carbonara');
    });

    it('should format update recipe result', () => {
      const result = {
        recipe: mockRecipes[0],
        success: true
      };

      const formatted = formatFunctionResult('update_recipe', result);
      expect(formatted).toContain('Successfully updated recipe');
    });

    it('should format mark eaten result', () => {
      const result = {
        recipe: { ...mockRecipes[0], last_eaten: '2024-01-15T12:00:00Z' },
        success: true
      };

      const formatted = formatFunctionResult('mark_recipe_eaten', result);
      expect(formatted).toContain('Marked');
      expect(formatted).toContain('as eaten');
    });

    it('should format delete result', () => {
      const result = {
        success: true,
        message: 'Recipe "Test Recipe" has been deleted successfully'
      };

      const formatted = formatFunctionResult('delete_recipe', result);
      expect(formatted).toContain('deleted successfully');
    });

    it('should format recipe details result', () => {
      const result = {
        recipe: mockRecipes[0]
      };

      const formatted = formatFunctionResult('get_recipe_details', result);
      expect(formatted).toContain('Recipe: Spaghetti Carbonara');
      expect(formatted).toContain('Category: dinner');
      expect(formatted).toContain('Ingredients:');
      expect(formatted).toContain('Instructions:');
    });
  });

  describe('Error handling', () => {
    it('should handle unknown function calls', async () => {
      await expect(
        handler.handleFunctionCall('unknown_function', {})
      ).rejects.toThrow('Unknown function: unknown_function');
    });
  });
});