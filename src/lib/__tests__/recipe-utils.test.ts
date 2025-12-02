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
  scaleRecipe,
  MAX_NOTES_LENGTH,
  MAX_PAIRING_WINE_LENGTH,
  MAX_REFERENCE_LENGTH,
  MAX_UTENSIL_ITEMS,
  MAX_UTENSIL_LENGTH,
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
  Recipe,
  RecipeCategory,
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

  it('requires cacheKey when nutrition meta comes from AI', () => {
    const input = createValidInput();
    input.nutrition = {
      perPortion: {
        calories: 200,
        protein: 10,
        carbohydrates: 30,
        fat: 5,
        saturatedFat: 2,
        fiber: 3,
        sugars: 7.5,
        sodium: 225,
      },
      meta: {
        source: 'ai',
        fetchedAt: new Date().toISOString(),
      },
    };

    const result = validateRecipeInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Nutrition meta.cacheKey is required when nutrition is provided by AI',
      ])
    );
  });

  it('accepts AI nutrition when cacheKey is provided', () => {
    const input = createValidInput();
    input.nutrition = {
      perPortion: {
        calories: 200,
        protein: 10,
        carbohydrates: 30,
        fat: 5,
        saturatedFat: 2,
        fiber: 3,
        sugars: 7.5,
        sodium: 225,
      },
      meta: {
        source: 'ai',
        fetchedAt: new Date().toISOString(),
        cacheKey: 'sample-cache-key',
        servingsSnapshot: input.servings,
      },
    };

    const result = validateRecipeInput(input);
    expect(result.valid).toBe(true);
  });

  it('rejects negative or non-integer time values', () => {
    const input = createValidInput();
    input.prep_time = -5;
    input.cook_time = 12.5;
    input.total_time = Number.NaN;

    const result = validateRecipeInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Prep time cannot be negative',
        'Cook time must be a whole number of minutes',
        'Total time must be a number of minutes when provided',
      ])
    );
  });

  it('rejects overly long reference, wine pairing, or notes', () => {
    const input = createValidInput();
    input.reference = 'a'.repeat(MAX_REFERENCE_LENGTH + 1);
    input.pairing_wine = 'a'.repeat(MAX_PAIRING_WINE_LENGTH + 1);
    input.notes = 'a'.repeat(MAX_NOTES_LENGTH + 1);

    const result = validateRecipeInput(input);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Reference must be'),
        expect.stringContaining('Wine pairing must be'),
        expect.stringContaining('Notes must be'),
      ])
    );
  });

  it('validates utensils length and count', () => {
    const input = createValidInput();
    input.utensils = Array.from(
      { length: MAX_UTENSIL_ITEMS + 1 },
      (_, index) => `Tool ${index}`
    );

    const tooManyResult = validateRecipeInput(input);
    expect(tooManyResult.valid).toBe(false);
    expect(tooManyResult.errors).toEqual(
      expect.arrayContaining([
        `Utensils must have ${MAX_UTENSIL_ITEMS} items or fewer`,
      ])
    );

    input.utensils = [`a`.repeat(MAX_UTENSIL_LENGTH + 1)];
    const tooLongResult = validateRecipeInput(input);
    expect(tooLongResult.valid).toBe(false);
    expect(tooLongResult.errors).toEqual(
      expect.arrayContaining([
        `Each utensil must be ${MAX_UTENSIL_LENGTH} characters or fewer`,
      ])
    );

    input.utensils = ['Whisk', 'Bowl'];
    const validResult = validateRecipeInput(input);
    expect(validResult.valid).toBe(true);
  });
});

describe('scaleRecipe', () => {
  const baseCategory = RECIPE_CATEGORIES[0] ?? RecipeCategory.MAIN_COURSE;

  const baseRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Scalable Recipe',
    description: 'A recipe with nutrition data',
    category: baseCategory,
    servings: 4,
    ingredients: [
      { id: '1', name: 'Ingredient', amount: 100, unit: 'g' },
    ],
    user_id: 'user-1',
    cuisine: undefined,
    diet_types: [],
    cooking_methods: [],
    dish_types: [],
    proteins: [],
    occasions: [],
    characteristics: [],
    season: undefined,
    created_at: undefined,
    updated_at: undefined,
    last_eaten: undefined,
    nutrition: {
      perPortion: {
        calories: 200,
        protein: 10,
        carbohydrates: 30,
        fat: 5,
        saturatedFat: 2,
        fiber: 3,
        sugars: 7.5,
        sodium: 225,
      },
      meta: {
        source: 'ai',
        fetchedAt: new Date().toISOString(),
        cacheKey: 'base-cache-key',
        servingsSnapshot: 4,
      },
    },
  };

  it('preserves per-portion nutrition when scaling recipes', () => {
    const scaled = scaleRecipe(baseRecipe, 8);

    expect(scaled.servings).toBe(8);
    expect(scaled.nutrition?.perPortion.calories).toBeCloseTo(200);
    expect(scaled.nutrition?.perPortion.protein).toBeCloseTo(10);
    expect(scaled.nutrition?.meta.servingsSnapshot).toBe(8);
  });

  it('does not mutate the original recipe nutrition', () => {
    const originalPerPortion = { ...baseRecipe.nutrition?.perPortion };
    const originalMeta = { ...baseRecipe.nutrition?.meta };
    scaleRecipe(baseRecipe, 8);
    expect(baseRecipe.nutrition?.perPortion).toEqual(originalPerPortion);
    expect(baseRecipe.nutrition?.meta).toEqual(originalMeta);
  });
});
