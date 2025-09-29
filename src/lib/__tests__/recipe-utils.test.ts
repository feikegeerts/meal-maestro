import {
  isValidCategory,
  isValidSeason,
  isValidCuisine,
  isValidDietType,
  isValidCookingMethod,
  isValidDishType,
  isValidProteinType,
  isValidOccasionType,
  isValidCharacteristicType,
  validateRecipeInput,
  COOKING_UNITS,
} from '../recipe-utils';
import {
  RECIPE_CATEGORIES,
  RECIPE_SEASONS,
  CUISINE_TYPES,
  DIET_TYPES,
  COOKING_METHOD_TYPES,
  DISH_TYPES,
  PROTEIN_TYPES,
  OCCASION_TYPES,
  CHARACTERISTIC_TYPES,
  RecipeInput,
} from '@/types/recipe';

describe('recipe-utils type guards', () => {
  type GuardCase = {
    label: string;
    guard: (value: string) => boolean;
    values: readonly string[];
  };

  const cases: GuardCase[] = [
    { label: 'category', guard: isValidCategory, values: RECIPE_CATEGORIES },
    { label: 'season', guard: isValidSeason, values: RECIPE_SEASONS },
    { label: 'cuisine', guard: isValidCuisine, values: CUISINE_TYPES },
    { label: 'diet type', guard: isValidDietType, values: DIET_TYPES },
    { label: 'cooking method', guard: isValidCookingMethod, values: COOKING_METHOD_TYPES },
    { label: 'dish type', guard: isValidDishType, values: DISH_TYPES },
    { label: 'protein type', guard: isValidProteinType, values: PROTEIN_TYPES },
    { label: 'occasion type', guard: isValidOccasionType, values: OCCASION_TYPES },
    { label: 'characteristic type', guard: isValidCharacteristicType, values: CHARACTERISTIC_TYPES },
  ];

  cases.forEach(({ label, guard, values }) => {
    it(`accepts valid ${label} values`, () => {
      const sample = values[0];
      expect(sample).toBeDefined();

      if (!sample) {
        throw new Error(`Missing fixture value for ${label}`);
      }

      expect(guard(sample)).toBe(true);
    });

    it(`rejects invalid ${label} values`, () => {
      expect(guard(`not-a-${label}`)).toBe(false);
    });
  });
});

describe('validateRecipeInput', () => {
  const sampleCategory = RECIPE_CATEGORIES[0];
  const sampleSeason = RECIPE_SEASONS[0];
  const sampleCuisine = CUISINE_TYPES[0];
  const sampleDiet = DIET_TYPES[0];
  const sampleMethod = COOKING_METHOD_TYPES[0];
  const sampleDish = DISH_TYPES[0];
  const sampleProtein = PROTEIN_TYPES[0];
  const sampleOccasion = OCCASION_TYPES[0];
  const sampleCharacteristic = CHARACTERISTIC_TYPES[0];
  const sampleUnit = COOKING_UNITS[0] ?? null;

  const createValidInput = (): RecipeInput => ({
    title: 'Sample Recipe',
    description: 'Tasty recipe description',
    category: sampleCategory ?? 'mains',
    season: sampleSeason,
    cuisine: sampleCuisine,
    diet_types: sampleDiet ? [sampleDiet] : undefined,
    cooking_methods: sampleMethod ? [sampleMethod] : undefined,
    dish_types: sampleDish ? [sampleDish] : undefined,
    proteins: sampleProtein ? [sampleProtein] : undefined,
    occasions: sampleOccasion ? [sampleOccasion] : undefined,
    characteristics: sampleCharacteristic ? [sampleCharacteristic] : undefined,
    servings: 4,
    ingredients: [
      {
        id: '1',
        name: 'Tomato',
        amount: 2,
        unit: sampleUnit,
      },
    ],
  });

  it('returns valid when recipe input satisfies all rules', () => {
    const result = validateRecipeInput(createValidInput());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('collects required field and enum validation errors', () => {
    const invalid: RecipeInput = {
      title: ' ',
      description: ' ',
      category: 'invalid-category',
      season: 'invalid-season',
      cuisine: 'invalid-cuisine',
      diet_types: ['invalid-diet'],
      cooking_methods: ['invalid-method'],
      dish_types: ['invalid-dish'],
      proteins: ['invalid-protein'],
      occasions: ['invalid-occasion'],
      characteristics: ['invalid-characteristic'],
      servings: 0,
      ingredients: [],
    };

    const result = validateRecipeInput(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Recipe title is required',
        'Recipe description is required',
        'At least one ingredient is required',
        'Servings must be between 1 and 100',
        expect.stringContaining('Invalid category "invalid-category"'),
        expect.stringContaining('Invalid season "invalid-season"'),
        expect.stringContaining('Invalid cuisine "invalid-cuisine"'),
        expect.stringContaining('Invalid diet types: invalid-diet'),
        expect.stringContaining('Invalid cooking methods: invalid-method'),
        expect.stringContaining('Invalid dish types: invalid-dish'),
        expect.stringContaining('Invalid proteins: invalid-protein'),
        expect.stringContaining('Invalid occasions: invalid-occasion'),
        expect.stringContaining('Invalid characteristics: invalid-characteristic'),
      ])
    );
  });

  it('validates individual ingredient entries', () => {
    const input = createValidInput();
    input.ingredients = [
      {
        id: '1',
        name: '   ',
        amount: -2,
        unit: 'g',
      },
    ];

    const result = validateRecipeInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Ingredient 1 name is required',
        'Ingredient 1 amount must be a positive number or empty for "to taste"',
      ])
    );
  });
});
