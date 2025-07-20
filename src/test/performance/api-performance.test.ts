import { describe, it, expect, vi } from 'vitest';
import { calculateCost } from '../../lib/services/openaiService.js';
import { formatFunctionResult } from '../../lib/services/recipeFunctions.js';
import type { Recipe } from '../../lib/types.js';

describe('API Performance Tests', () => {
  const mockRecipes: Recipe[] = Array.from({ length: 100 }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    ingredients: [`ingredient-${i}-1`, `ingredient-${i}-2`, `ingredient-${i}-3`],
    description: `Description for recipe ${i}`,
    category: 'dinner',
    tags: [`tag-${i}`, 'common-tag'],
    season: 'year-round',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }));

  describe('Cost calculation performance', () => {
    it('should calculate costs quickly for different models', () => {
      const models = [
        'gpt-4.1-nano',
        'gpt-4.1-mini', 
        'gpt-4.1',
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4',
        'gpt-3.5-turbo'
      ];
      
      const tokenUsage = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500
      };

      const start = performance.now();
      
      models.forEach(model => {
        const cost = calculateCost(model, tokenUsage);
        expect(cost).toBeGreaterThan(0);
        expect(typeof cost).toBe('number');
      });
      
      const end = performance.now();
      const duration = end - start;
      
      // Should calculate costs for all models in under 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should handle large token counts efficiently', () => {
      const largeTokenUsage = {
        prompt_tokens: 100000,
        completion_tokens: 50000,
        total_tokens: 150000
      };

      const start = performance.now();
      
      // Calculate cost for 100 iterations
      for (let i = 0; i < 100; i++) {
        const cost = calculateCost('gpt-4.1-nano', largeTokenUsage);
        expect(cost).toBeGreaterThan(0);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should handle 100 large calculations in under 5ms
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Function result formatting performance', () => {
    it('should format large search results quickly', () => {
      const searchResult = {
        recipes: mockRecipes,
        total: mockRecipes.length
      };

      const start = performance.now();
      
      const formatted = formatFunctionResult('search_recipes', searchResult);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(formatted).toContain('Found 100 recipes');
      expect(formatted).toContain('Which recipe would you like to see');
      
      // Should format 100 recipes in under 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should format single recipe details quickly', () => {
      const recipeResult = {
        recipe: mockRecipes[0]
      };

      const start = performance.now();
      
      // Format recipe details 50 times
      for (let i = 0; i < 50; i++) {
        const formatted = formatFunctionResult('get_recipe_details', recipeResult);
        expect(formatted).toContain('Recipe: Recipe 0');
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should format recipe details 50 times in under 5ms
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Memory usage patterns', () => {
    it('should not create excessive objects during calculations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many calculations
      for (let i = 0; i < 1000; i++) {
        const tokenUsage = {
          prompt_tokens: Math.floor(Math.random() * 1000),
          completion_tokens: Math.floor(Math.random() * 500),
          total_tokens: 0
        };
        tokenUsage.total_tokens = tokenUsage.prompt_tokens + tokenUsage.completion_tokens;
        
        const cost = calculateCost('gpt-4.1-nano', tokenUsage);
        expect(cost).toBeGreaterThan(0);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });

  describe('Response time benchmarks', () => {
    it('should meet response time requirements', () => {
      const benchmarks = [
        {
          name: 'Cost calculation',
          operation: () => calculateCost('gpt-4.1-nano', { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }),
          maxTime: 1 // 1ms
        },
        {
          name: 'Format search results (10 recipes)',
          operation: () => formatFunctionResult('search_recipes', { recipes: mockRecipes.slice(0, 10), total: 10 }),
          maxTime: 2 // 2ms
        },
        {
          name: 'Format recipe details',
          operation: () => formatFunctionResult('get_recipe_details', { recipe: mockRecipes[0] }),
          maxTime: 1 // 1ms
        },
        {
          name: 'Format add recipe result',
          operation: () => formatFunctionResult('add_recipe', { recipe: mockRecipes[0], success: true }),
          maxTime: 1 // 1ms
        }
      ];

      benchmarks.forEach(benchmark => {
        const start = performance.now();
        
        // Run operation 10 times
        for (let i = 0; i < 10; i++) {
          benchmark.operation();
        }
        
        const end = performance.now();
        const avgTime = (end - start) / 10;
        
        expect(avgTime).toBeLessThan(benchmark.maxTime);
      });
    });
  });

  describe('Scalability tests', () => {
    it('should handle increasing recipe counts without performance degradation', () => {
      const recipeCounts = [10, 50, 100, 200, 500];
      const timings: number[] = [];
      
      recipeCounts.forEach(count => {
        const recipes = mockRecipes.slice(0, count);
        const searchResult = { recipes, total: count };
        
        const start = performance.now();
        
        // Format results 5 times for more accurate timing
        for (let i = 0; i < 5; i++) {
          formatFunctionResult('search_recipes', searchResult);
        }
        
        const end = performance.now();
        const avgTime = (end - start) / 5;
        
        timings.push(avgTime);
      });
      
      // Check that performance doesn't degrade significantly
      // (linear growth is acceptable, but not exponential)
      for (let i = 1; i < timings.length; i++) {
        const growthFactor = timings[i] / timings[i - 1];
        const recipesGrowthFactor = recipeCounts[i] / recipeCounts[i - 1];
        
        // Performance should not degrade more than 2x the recipe count growth
        expect(growthFactor).toBeLessThan(recipesGrowthFactor * 2);
      }
    });
  });

  describe('Error handling performance', () => {
    it('should handle unknown models quickly', () => {
      const tokenUsage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      };

      const start = performance.now();
      
      // Test with unknown model (should fallback to gpt-3.5-turbo)
      for (let i = 0; i < 100; i++) {
        const cost = calculateCost('unknown-model', tokenUsage);
        expect(cost).toBeGreaterThan(0);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should handle unknown models quickly (under 5ms for 100 calls)
      expect(duration).toBeLessThan(5);
    });
  });
});

// Helper function to create mock recipes for testing
function createMockRecipes(count: number): Recipe[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    ingredients: [`ingredient-${i}-1`, `ingredient-${i}-2`],
    description: `Description for recipe ${i}`,
    category: 'dinner',
    tags: [`tag-${i}`],
    season: 'year-round',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }));
}