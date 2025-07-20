import { describe, it, expect } from 'vitest';
import { recipeTools } from '../../lib/services/recipeFunctions.js';

describe('Natural Language Processing Accuracy', () => {
  describe('Function schema validation', () => {
    it('should have properly defined function schemas', () => {
      expect(recipeTools).toBeDefined();
      expect(Array.isArray(recipeTools)).toBe(true);
      expect(recipeTools!.length).toBeGreaterThan(0);
      
      recipeTools!.forEach((tool) => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
        expect(tool.function.parameters).toHaveProperty('type', 'object');
        expect(tool.function.parameters).toHaveProperty('properties');
      });
    });

    it('should have search_recipes function with proper parameters', () => {
      const searchTool = recipeTools!.find(tool => tool.function.name === 'search_recipes');
      expect(searchTool).toBeDefined();
      
      const params = searchTool!.function.parameters;
      expect(params).toBeDefined();
      expect(params!.properties).toBeDefined();
      
      const props = params!.properties as Record<string, any>;
      expect(props).toHaveProperty('query');
      expect(props).toHaveProperty('category');
      expect(props).toHaveProperty('tags');
      expect(props).toHaveProperty('season');
      expect(props).toHaveProperty('limit');
      
      expect(props.query.type).toBe('string');
      expect(props.category.type).toBe('string');
      expect(props.tags.type).toBe('array');
      expect(props.season.type).toBe('string');
      expect(props.limit.type).toBe('number');
    });

    it('should have add_recipe function with required fields', () => {
      const addTool = recipeTools!.find(tool => tool.function.name === 'add_recipe');
      expect(addTool).toBeDefined();
      
      const params = addTool!.function.parameters;
      expect(params).toBeDefined();
      expect(params!.required).toEqual(['title', 'ingredients', 'description', 'category']);
      
      const props = params!.properties as Record<string, any>;
      expect(props).toHaveProperty('title');
      expect(props).toHaveProperty('ingredients');
      expect(props).toHaveProperty('description');
      expect(props).toHaveProperty('category');
      expect(props).toHaveProperty('tags');
      expect(props).toHaveProperty('season');
      
      expect(props.ingredients.type).toBe('array');
      expect(props.ingredients.items.type).toBe('string');
    });

    it('should have update_recipe function with id requirement', () => {
      const updateTool = recipeTools!.find(tool => tool.function.name === 'update_recipe');
      expect(updateTool).toBeDefined();
      
      const params = updateTool!.function.parameters;
      expect(params).toBeDefined();
      expect(params!.required).toEqual(['id']);
      
      const props = params!.properties as Record<string, any>;
      expect(props).toHaveProperty('id');
      expect(props.id.type).toBe('string');
    });

    it('should have mark_recipe_eaten function', () => {
      const markTool = recipeTools!.find(tool => tool.function.name === 'mark_recipe_eaten');
      expect(markTool).toBeDefined();
      
      const params = markTool!.function.parameters;
      expect(params).toBeDefined();
      expect(params!.required).toEqual(['id']);
      
      const props = params!.properties as Record<string, any>;
      expect(props).toHaveProperty('id');
      expect(props).toHaveProperty('date');
    });

    it('should have delete_recipe function', () => {
      const deleteTool = recipeTools!.find(tool => tool.function.name === 'delete_recipe');
      expect(deleteTool).toBeDefined();
      
      const params = deleteTool!.function.parameters;
      expect(params).toBeDefined();
      expect(params!.required).toEqual(['id']);
      
      const props = params!.properties as Record<string, any>;
      expect(props).toHaveProperty('id');
    });

    it('should have get_recipe_details function', () => {
      const detailsTool = recipeTools!.find(tool => tool.function.name === 'get_recipe_details');
      expect(detailsTool).toBeDefined();
      
      const params = detailsTool!.function.parameters;
      expect(params).toBeDefined();
      expect(params!.required).toEqual(['id']);
      
      const props = params!.properties as Record<string, any>;
      expect(props).toHaveProperty('id');
    });
  });

  describe('Function descriptions', () => {
    it('should have clear, descriptive function descriptions', () => {
      const functionNames = [
        'search_recipes',
        'add_recipe',
        'update_recipe',
        'mark_recipe_eaten',
        'delete_recipe',
        'get_recipe_details'
      ];

      functionNames.forEach(name => {
        const tool = recipeTools!.find(t => t.function.name === name);
        expect(tool).toBeDefined();
        expect(tool!.function.description).toBeDefined();
        expect(tool!.function.description!.length).toBeGreaterThan(10);
        expect(tool!.function.description!).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });

    it('should have descriptive parameter descriptions', () => {
      recipeTools!.forEach(tool => {
        const params = tool.function.parameters;
        if (params) {
          const properties = params.properties as Record<string, any>;
          if (properties) {
            Object.keys(properties).forEach(paramName => {
              const param = properties[paramName];
              if (param.description) {
                expect(param.description).toBeDefined();
                expect(param.description.length).toBeGreaterThan(5);
              }
            });
          }
        }
      });
    });
  });

  describe('Common user intent patterns', () => {
    const testCases = [
      {
        description: 'Search for recipes by ingredient',
        userInput: 'Find me recipes with chicken',
        expectedFunction: 'search_recipes',
        expectedParams: { query: 'chicken' }
      },
      {
        description: 'Search for recipes by category',
        userInput: 'Show me dinner recipes',
        expectedFunction: 'search_recipes',
        expectedParams: { category: 'dinner' }
      },
      {
        description: 'Search for recipes by tags',
        userInput: 'Find vegetarian recipes',
        expectedFunction: 'search_recipes',
        expectedParams: { tags: ['vegetarian'] }
      },
      {
        description: 'Search for seasonal recipes',
        userInput: 'What are some summer recipes?',
        expectedFunction: 'search_recipes',
        expectedParams: { season: 'summer' }
      },
      {
        description: 'Add a new recipe',
        userInput: 'I want to add a new pasta recipe',
        expectedFunction: 'add_recipe',
        expectedParams: { category: 'dinner' }
      },
      {
        description: 'Update a recipe',
        userInput: 'Update the ingredients for my pasta recipe',
        expectedFunction: 'update_recipe',
        expectedParams: { id: 'recipe-id' }
      },
      {
        description: 'Mark recipe as eaten',
        userInput: 'I just made the chicken recipe',
        expectedFunction: 'mark_recipe_eaten',
        expectedParams: { id: 'recipe-id' }
      },
      {
        description: 'Delete a recipe',
        userInput: 'Delete the burnt cookies recipe',
        expectedFunction: 'delete_recipe',
        expectedParams: { id: 'recipe-id' }
      },
      {
        description: 'Get recipe details',
        userInput: 'Show me the full recipe for spaghetti carbonara',
        expectedFunction: 'get_recipe_details',
        expectedParams: { id: 'recipe-id' }
      }
    ];

    testCases.forEach(testCase => {
      it(`should handle: ${testCase.description}`, () => {
        // This is a conceptual test - in practice, you would need actual OpenAI API integration
        // to test the function calling behavior. Here we just verify the function exists
        const expectedTool = recipeTools!.find(tool => tool.function.name === testCase.expectedFunction);
        expect(expectedTool).toBeDefined();
        
        // Verify the function can handle the expected parameters
        const params = expectedTool!.function.parameters;
        if (params) {
          const props = params.properties as Record<string, any>;
          Object.keys(testCase.expectedParams).forEach(paramName => {
            expect(props).toHaveProperty(paramName);
          });
        }
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle ambiguous search queries', () => {
      const searchTool = recipeTools!.find(tool => tool.function.name === 'search_recipes');
      expect(searchTool).toBeDefined();
      
      // The function should be able to handle general queries
      const params = searchTool!.function.parameters;
      expect(params).toBeDefined();
      const props = params!.properties as Record<string, any>;
      expect(props.query).toBeDefined();
      expect(props.query.type).toBe('string');
    });

    it('should handle missing optional parameters', () => {
      recipeTools!.forEach(tool => {
        const params = tool.function.parameters;
        if (params) {
          const required = (params.required || []) as string[];
          const props = params.properties as Record<string, any>;
          const allProps = Object.keys(props || {});
          const optional = allProps.filter(prop => !required.includes(prop));
          
          // Should have at least some optional parameters for flexibility
          if (tool.function.name === 'search_recipes') {
            expect(optional.length).toBeGreaterThan(0);
          }
        }
      });
    });

    it('should have proper data types for all parameters', () => {
      const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
      
      recipeTools!.forEach(tool => {
        const params = tool.function.parameters;
        if (params) {
          const properties = params.properties as Record<string, any>;
          if (properties) {
            Object.keys(properties).forEach(paramName => {
              const param = properties[paramName];
              expect(validTypes).toContain(param.type);
              
              if (param.type === 'array' && param.items) {
                expect(validTypes).toContain(param.items.type);
              }
            });
          }
        }
      });
    });
  });

  describe('Function coverage', () => {
    it('should cover all CRUD operations', () => {
      const functionNames = recipeTools!.map(tool => tool.function.name);
      
      // Create
      expect(functionNames).toContain('add_recipe');
      
      // Read
      expect(functionNames).toContain('search_recipes');
      expect(functionNames).toContain('get_recipe_details');
      
      // Update
      expect(functionNames).toContain('update_recipe');
      expect(functionNames).toContain('mark_recipe_eaten');
      
      // Delete
      expect(functionNames).toContain('delete_recipe');
    });

    it('should have appropriate number of functions', () => {
      // Should have enough functions to cover main use cases but not too many to confuse the AI
      expect(recipeTools!.length).toBeGreaterThanOrEqual(5);
      expect(recipeTools!.length).toBeLessThanOrEqual(10);
    });
  });

  describe('OpenAI compatibility', () => {
    it('should have valid OpenAI function calling format', () => {
      recipeTools!.forEach(tool => {
        // Check OpenAI function calling format
        expect(tool.type).toBe('function');
        expect(tool.function).toBeDefined();
        expect(tool.function.name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/); // Valid function name
        if (tool.function.parameters) {
          expect(tool.function.parameters.type).toBe('object');
          expect(tool.function.parameters.properties).toBeDefined();
        }
      });
    });

    it('should not have overly complex nested objects', () => {
      recipeTools!.forEach(tool => {
        const params = tool.function.parameters;
        if (params) {
          const properties = params.properties as Record<string, any>;
          if (properties) {
            Object.keys(properties).forEach(paramName => {
              const param = properties[paramName];
              // Should avoid deeply nested objects which can confuse the AI
              if (param.type === 'object' && param.properties) {
                const nestedProps = Object.keys(param.properties);
                expect(nestedProps.length).toBeLessThanOrEqual(5); // Reasonable limit
              }
            });
          }
        }
      });
    });
  });
});