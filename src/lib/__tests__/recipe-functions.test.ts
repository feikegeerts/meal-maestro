import type { OpenAI } from 'openai';
import { createRecipeFormFunction, getAllowedUnits } from '../recipe-functions';
import { COOKING_UNITS } from '../recipe-utils';

describe('getAllowedUnits', () => {
  it('returns full cooking unit list when preference missing or unknown', () => {
    expect(getAllowedUnits()).toEqual(COOKING_UNITS);
    expect(getAllowedUnits('non-existent')).toEqual(COOKING_UNITS);
  });

  it('returns mapped units for known preferences', () => {
    expect(getAllowedUnits('precise-metric')).toEqual(['g', 'kg', 'ml', 'l', 'clove']);
    expect(getAllowedUnits('us-traditional')).toEqual(['tbsp', 'tsp', 'clove']);
    expect(getAllowedUnits('mixed')).toEqual(COOKING_UNITS);
  });
});

describe('createRecipeFormFunction', () => {
  const asFunctionTool = (
    tool: ReturnType<typeof createRecipeFormFunction>
  ): OpenAI.Chat.Completions.ChatCompletionFunctionTool => {
    if (tool.type !== 'function' || !('function' in tool)) {
      throw new Error('Expected ChatCompletion function tool');
    }
    return tool as OpenAI.Chat.Completions.ChatCompletionFunctionTool;
  };

  const getUnitSchema = (tool: ReturnType<typeof createRecipeFormFunction>) => {
    const parameters = asFunctionTool(tool).function.parameters as {
      properties: {
        ingredients: {
          items: {
            properties: {
              unit: {
                enum: string[];
                description: string;
              };
            };
          };
          description: string;
        };
      };
    };

    return {
      unitEnum: parameters.properties.ingredients.items.properties.unit.enum,
      unitDescription: parameters.properties.ingredients.items.properties.unit.description,
      ingredientsDescription: parameters.properties.ingredients.description,
    };
  };

  it('produces a valid tool schema with base units for the preference', () => {
    const tool = createRecipeFormFunction('us-traditional');

    expect(tool.type).toBe('function');

    const { unitEnum } = getUnitSchema(tool);
    expect(unitEnum).toEqual(getAllowedUnits('us-traditional'));
  });

  it('merges sanitized custom units and reflects them in the description', () => {
    const tool = createRecipeFormFunction('us-traditional', [
      ' Jar ',
      'jar',
      'Bag',
      'script-jar',
      '__proto__',
      'Custom Jar',
      'Custom Jar',
    ]);

    const { unitEnum, unitDescription } = getUnitSchema(tool);

    expect(unitEnum).toEqual([
      ...getAllowedUnits('us-traditional'),
      'Jar',
      'Bag',
      'Custom Jar',
    ]);
    expect(unitDescription).toContain('Custom user units available: Jar, Bag, Custom Jar.');
  });

  it('limits custom units to 25 entries after filtering', () => {
    const customUnits = Array.from({ length: 30 }, (_, index) => `Unit${index}`);

    const tool = createRecipeFormFunction('mixed', customUnits);
    const { unitEnum } = getUnitSchema(tool);

    const baseLength = getAllowedUnits('mixed').length;
    const customPortion = unitEnum.slice(baseLength);

    expect(customPortion).toHaveLength(25);
    expect(customPortion[0]).toBe('Unit0');
    expect(customPortion[customPortion.length - 1]).toBe('Unit24');
    expect(customPortion).not.toContain('Unit25');
  });
});
