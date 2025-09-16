export enum RecipeCategory {
  BREAKFAST = 'breakfast',
  BRUNCH = 'brunch',
  LUNCH = 'lunch',
  APPETIZER = 'appetizer',
  MAIN_COURSE = 'main-course',
  SIDE_DISH = 'side-dish',
  DESSERT = 'dessert',
  PASTRY = 'pastry',
  SNACK = 'snack'
}

export enum RecipeSeason {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter',
  YEAR_ROUND = 'year-round'
}

// Cuisine types (single value per recipe)
export enum CuisineType {
  DUTCH = 'dutch',
  ITALIAN = 'italian',
  ASIAN = 'asian',
  CHINESE = 'chinese',
  THAI = 'thai',
  JAPANESE = 'japanese',
  VIETNAMESE = 'vietnamese',
  INDONESIAN = 'indonesian',
  INDIAN = 'indian',
  MEXICAN = 'mexican',
  AMERICAN = 'american',
  FRENCH = 'french',
  GREEK = 'greek',
  SPANISH = 'spanish',
  TURKISH = 'turkish',
  MOROCCAN = 'moroccan',
  ARGENTINIAN = 'argentinian',
  SOUTH_AMERICAN = 'south-american',
  CENTRAL_AMERICAN = 'central-american',
  MIDDLE_EASTERN = 'middle-eastern',
  ENGLISH = 'english',
  SURINAMESE = 'surinamese',
  MEDITERRANEAN = 'mediterranean',
  SCANDINAVIAN = 'scandinavian'
}

// Diet types (multiple values per recipe)
export enum DietType {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  LACTOSE_FREE = 'lactose-free',
  HIGH_PROTEIN = 'high-protein',
  KETO = 'keto',
  WITHOUT_MEAT = 'without-meat',
  WITHOUT_MEAT_FISH = 'without-meat-fish'
}

// Cooking method types (multiple values per recipe)
export enum CookingMethodType {
  BAKING = 'baking',
  COOKING = 'cooking',
  GRILLING = 'grilling',
  BARBECUE = 'barbecue',
  OVEN = 'oven',
  AIR_FRYER = 'air-fryer',
  DEEP_FRYING = 'deep-frying',
  STIR_FRY = 'stir-fry',
  STEWING = 'stewing',
  STEAMING = 'steaming',
  POACHING = 'poaching'
}

// Dish types (multiple values per recipe)
export enum DishType {
  SOUP = 'soup',
  SALAD = 'salad',
  PASTA = 'pasta',
  RICE = 'rice',
  BREAD_SANDWICHES = 'bread-sandwiches',
  STAMPPOT = 'stamppot',
  QUICHE = 'quiche',
  WRAP = 'wrap',
  SAUCE_DRESSING = 'sauce-dressing'
}

// Protein types (multiple values per recipe)
export enum ProteinType {
  MEAT = 'meat',
  FISH = 'fish',
  POULTRY = 'poultry',
  SHELLFISH = 'shellfish',
  MEAT_SUBSTITUTE = 'meat-substitute'
}

// Occasion types (multiple values per recipe)
export enum OccasionType {
  CHRISTMAS = 'christmas',
  EASTER = 'easter',
  NEW_YEAR = 'new-year',
  BIRTHDAY = 'birthday',
  MOTHERS_DAY = 'mothers-day',
  PICNIC = 'picnic',
  DRINKS = 'drinks',
  PARTY_SNACK = 'party-snack'
}

// Characteristic types (multiple values per recipe)
export enum CharacteristicType {
  EASY = 'easy',
  QUICK = 'quick',
  BUDGET = 'budget',
  HEALTHY = 'healthy',
  LIGHT = 'light'
}

export const RECIPE_CATEGORIES = Object.values(RecipeCategory);
export const RECIPE_SEASONS = Object.values(RecipeSeason);
export const CUISINE_TYPES = Object.values(CuisineType);
export const DIET_TYPES = Object.values(DietType);
export const COOKING_METHOD_TYPES = Object.values(CookingMethodType);
export const DISH_TYPES = Object.values(DishType);
export const PROTEIN_TYPES = Object.values(ProteinType);
export const OCCASION_TYPES = Object.values(OccasionType);
export const CHARACTERISTIC_TYPES = Object.values(CharacteristicType);

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  notes?: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
  servings: number;
  description: string;
  category: RecipeCategory;
  season?: RecipeSeason;
  cuisine?: CuisineType;
  diet_types?: DietType[];
  cooking_methods?: CookingMethodType[];
  dish_types?: DishType[];
  proteins?: ProteinType[];
  occasions?: OccasionType[];
  characteristics?: CharacteristicType[];
  last_eaten?: string;
  image_url?: string | null;
  image_metadata?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    dimensions: { width: number; height: number };
    format: string;
    uploadedAt: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}

export interface RecipeInput {
  id?: string;
  title: string;
  ingredients: RecipeIngredient[];
  servings: number;
  description: string;
  category: string;
  season?: string;
  cuisine?: string;
  diet_types?: string[];
  cooking_methods?: string[];
  dish_types?: string[];
  proteins?: string[];
  occasions?: string[];
  characteristics?: string[];
  last_eaten?: string;
}

export interface RecipeSearchParams {
  query?: string;
  category?: string;
  cuisine?: string;
  diet_types?: string[];
  cooking_methods?: string[];
  dish_types?: string[];
  proteins?: string[];
  occasions?: string[];
  characteristics?: string[];
  season?: string;
  limit?: number;
}

export interface RecipesResponse {
  recipes: Recipe[];
  total?: number;
}

export function isValidCategory(category: string): category is RecipeCategory {
  return RECIPE_CATEGORIES.includes(category as RecipeCategory);
}

export function isValidSeason(season: string): season is RecipeSeason {
  return RECIPE_SEASONS.includes(season as RecipeSeason);
}

export function isValidCuisine(cuisine: string): cuisine is CuisineType {
  return CUISINE_TYPES.includes(cuisine as CuisineType);
}

export function isValidDietType(dietType: string): dietType is DietType {
  return DIET_TYPES.includes(dietType as DietType);
}

export function isValidCookingMethod(cookingMethod: string): cookingMethod is CookingMethodType {
  return COOKING_METHOD_TYPES.includes(cookingMethod as CookingMethodType);
}

export function isValidDishType(dishType: string): dishType is DishType {
  return DISH_TYPES.includes(dishType as DishType);
}

export function isValidProteinType(proteinType: string): proteinType is ProteinType {
  return PROTEIN_TYPES.includes(proteinType as ProteinType);
}

export function isValidOccasionType(occasionType: string): occasionType is OccasionType {
  return OCCASION_TYPES.includes(occasionType as OccasionType);
}

export function isValidCharacteristicType(characteristicType: string): characteristicType is CharacteristicType {
  return CHARACTERISTIC_TYPES.includes(characteristicType as CharacteristicType);
}

export function validateRecipeInput(input: RecipeInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Recipe title is required');
  }
  
  if (!input.description || input.description.trim().length === 0) {
    errors.push('Recipe description is required');
  }
  
  if (!input.ingredients || input.ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  } else {
    input.ingredients.forEach((ingredient, index) => {
      if (!ingredient.name || ingredient.name.trim().length === 0) {
        errors.push(`Ingredient ${index + 1} name is required`);
      }
      // Normalize amount: treat 0 as null for "to taste" scenarios
      const normalizedAmount = ingredient.amount === 0 ? null : ingredient.amount;
      if (normalizedAmount !== null && (isNaN(normalizedAmount) || normalizedAmount <= 0)) {
        errors.push(`Ingredient ${index + 1} amount must be a positive number or empty for "to taste"`);
      }
    });
  }
  
  if (!input.servings || input.servings <= 0 || input.servings > 100) {
    errors.push('Servings must be between 1 and 100');
  }
  
  if (!isValidCategory(input.category)) {
    errors.push(`Invalid category "${input.category}". Must be one of: ${RECIPE_CATEGORIES.join(', ')}`);
  }
  
  if (input.season && !isValidSeason(input.season)) {
    errors.push(`Invalid season "${input.season}". Must be one of: ${RECIPE_SEASONS.join(', ')}`);
  }
  
  if (input.cuisine && !isValidCuisine(input.cuisine)) {
    errors.push(`Invalid cuisine "${input.cuisine}". Must be one of: ${CUISINE_TYPES.join(', ')}`);
  }
  
  if (input.diet_types) {
    const invalidDietTypes = input.diet_types.filter(dietType => !isValidDietType(dietType));
    if (invalidDietTypes.length > 0) {
      errors.push(`Invalid diet types: ${invalidDietTypes.join(', ')}. Available diet types: ${DIET_TYPES.join(', ')}`);
    }
  }
  
  if (input.cooking_methods) {
    const invalidCookingMethods = input.cooking_methods.filter(method => !isValidCookingMethod(method));
    if (invalidCookingMethods.length > 0) {
      errors.push(`Invalid cooking methods: ${invalidCookingMethods.join(', ')}. Available cooking methods: ${COOKING_METHOD_TYPES.join(', ')}`);
    }
  }
  
  if (input.dish_types) {
    const invalidDishTypes = input.dish_types.filter(dishType => !isValidDishType(dishType));
    if (invalidDishTypes.length > 0) {
      errors.push(`Invalid dish types: ${invalidDishTypes.join(', ')}. Available dish types: ${DISH_TYPES.join(', ')}`);
    }
  }
  
  if (input.proteins) {
    const invalidProteins = input.proteins.filter(protein => !isValidProteinType(protein));
    if (invalidProteins.length > 0) {
      errors.push(`Invalid proteins: ${invalidProteins.join(', ')}. Available proteins: ${PROTEIN_TYPES.join(', ')}`);
    }
  }
  
  if (input.occasions) {
    const invalidOccasions = input.occasions.filter(occasion => !isValidOccasionType(occasion));
    if (invalidOccasions.length > 0) {
      errors.push(`Invalid occasions: ${invalidOccasions.join(', ')}. Available occasions: ${OCCASION_TYPES.join(', ')}`);
    }
  }
  
  if (input.characteristics) {
    const invalidCharacteristics = input.characteristics.filter(characteristic => !isValidCharacteristicType(characteristic));
    if (invalidCharacteristics.length > 0) {
      errors.push(`Invalid characteristics: ${invalidCharacteristics.join(', ')}. Available characteristics: ${CHARACTERISTIC_TYPES.join(', ')}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Smart unit conversion utilities
interface SmartUnitResult {
  amount: number;
  unit: string;
}

export function smartWeightConversion(amount: number, unit: string): SmartUnitResult {
  if (unit === 'g' && amount >= 1000) {
    return {
      amount: amount / 1000,
      unit: 'kg'
    };
  }
  if (unit === 'kg' && amount < 1) {
    return {
      amount: amount * 1000,
      unit: 'g'
    };
  }
  return { amount, unit };
}

export function smartVolumeConversion(amount: number, unit: string): SmartUnitResult {
  if (unit === 'ml' && amount >= 1000) {
    return {
      amount: amount / 1000,
      unit: 'l'
    };
  }
  if (unit === 'l' && amount < 1) {
    return {
      amount: amount * 1000,
      unit: 'ml'
    };
  }
  return { amount, unit };
}

export function smartImperialWeightConversion(amount: number, unit: string): SmartUnitResult {
  if (unit === 'oz' && amount >= 16) {
    return {
      amount: amount / 16,
      unit: 'lb'
    };
  }
  if (unit === 'lb' && amount < 1) {
    return {
      amount: amount * 16,
      unit: 'oz'
    };
  }
  return { amount, unit };
}

export function smartImperialVolumeConversion(amount: number, unit: string): SmartUnitResult {
  if (unit === 'fl oz' && amount >= 8) {
    return {
      amount: amount / 8,
      unit: 'cup'
    };
  }
  if (unit === 'cup' && amount < 1) {
    return {
      amount: amount * 8,
      unit: 'fl oz'
    };
  }
  return { amount, unit };
}

export function normalizeIngredientUnit(amount: number | null, unit: string | null): SmartUnitResult | null {
  if (amount === null || unit === null) return null;

  // Only apply smart conversions to standard units
  if (!isStandardUnit(unit)) {
    return { amount, unit };
  }

  // Apply smart conversions based on unit type
  if (unit === 'g' || unit === 'kg') {
    return smartWeightConversion(amount, unit);
  }
  if (unit === 'ml' || unit === 'l') {
    return smartVolumeConversion(amount, unit);
  }
  if (unit === 'oz' || unit === 'lb') {
    return smartImperialWeightConversion(amount, unit);
  }
  if (unit === 'fl oz' || unit === 'cup') {
    return smartImperialVolumeConversion(amount, unit);
  }

  // Return as-is for non-convertible standard units
  return { amount, unit };
}

// Utility functions for ingredient scaling
export function formatFraction(num: number): string {
  const tolerance = 1e-6;
  const commonFractions: [number, string][] = [
    [1/4, '¼'], [1/3, '⅓'], [1/2, '½'], [2/3, '⅔'], [3/4, '¾'],
    [1/8, '⅛'], [3/8, '⅜'], [5/8, '⅝'], [7/8, '⅞']
  ];
  
  const wholePart = Math.floor(num);
  const fractionalPart = num - wholePart;
  
  if (fractionalPart < tolerance) {
    return wholePart.toString();
  }
  
  for (const [decimal, fraction] of commonFractions) {
    if (Math.abs(fractionalPart - decimal) < tolerance) {
      return wholePart > 0 ? `${wholePart} ${fraction}` : fraction;
    }
  }
  
  return num.toFixed(2).replace(/\.?0+$/, '');
}

export function pluralizeUnit(unit: string | null, amount: number): string | null {
  if (!unit) return null;

  const singularToPlural: Record<string, string> = {
    'tbsp': 'tbsp',
    'tsp': 'tsp',
    'g': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
    'clove': 'cloves',
    'cup': 'cups',
    'fl oz': 'fl oz',
    'oz': 'oz',
    'lb': 'lbs'
  };

  if (amount === 1) {
    const singularForm = Object.keys(singularToPlural).find(key =>
      singularToPlural[key] === unit
    );
    return singularForm || unit;
  }

  return singularToPlural[unit] || unit;
}

export function scaleIngredient(ingredient: RecipeIngredient, ratio: number): RecipeIngredient {
  if (ingredient.amount === null) {
    return { ...ingredient };
  }
  
  const scaledAmount = ingredient.amount * ratio;
  
  // Apply smart unit conversion to scaled amount
  const smartResult = normalizeIngredientUnit(scaledAmount, ingredient.unit);
  const finalAmount = smartResult ? smartResult.amount : scaledAmount;
  const finalUnit = smartResult ? smartResult.unit : ingredient.unit;
  const scaledUnit = pluralizeUnit(finalUnit, finalAmount);
  
  return {
    ...ingredient,
    amount: finalAmount,
    unit: scaledUnit
  };
}

export function scaleRecipe(recipe: Recipe, newServings: number): Recipe {
  const ratio = newServings / recipe.servings;
  const scaledIngredients = recipe.ingredients.map(ingredient => 
    scaleIngredient(ingredient, ratio)
  );
  
  return {
    ...recipe,
    ingredients: scaledIngredients,
    servings: newServings
  };
}

export function formatIngredientDisplay(ingredient: RecipeIngredient): string {
  if (ingredient.amount === null) {
    const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
    return `${ingredient.name}${notes}`;
  }
  
  // Handle NaN or invalid numbers
  if (isNaN(ingredient.amount) || !isFinite(ingredient.amount)) {
    const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
    return `${ingredient.name}${notes}`;
  }
  
  // Apply smart unit conversion
  const smartResult = normalizeIngredientUnit(ingredient.amount, ingredient.unit);
  const amount = smartResult ? formatFraction(smartResult.amount) : formatFraction(ingredient.amount);
  const unit = smartResult ? ` ${smartResult.unit}` : ingredient.unit ? ` ${ingredient.unit}` : '';
  const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
  
  return `${amount}${unit} ${ingredient.name}${notes}`;
}


// Standard cooking units that support smart conversions (11 total)
export const STANDARD_COOKING_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tbsp',
  'tsp',
  'clove',
  'cup',
  'fl oz',
  'oz',
  'lb'
];

// Legacy export for backward compatibility
export const COOKING_UNITS = STANDARD_COOKING_UNITS;

// Unit-based step sizes for quantity inputs
const UNIT_STEP_CONFIG: Record<string, number> = {
  // Large volume units - maintain current behavior
  'ml': 25,
  'l': 0.25,

  // Weight units - reasonable increments
  'g': 25,
  'kg': 0.25,

  // Small volume units - smaller increments
  'tbsp': 0.5,
  'tsp': 0.25,

  // Discrete/count units - step of 1
  'clove': 1,

  // US Imperial units
  'cup': 0.25,
  'fl oz': 0.5,
  'oz': 0.25,
  'lb': 0.25
};

/**
 * Returns the appropriate step size for quantity inputs based on unit type
 * @param unit - The cooking unit (or null for unitless ingredients)
 * @returns Step size as a number
 */
export function getStepSizeForUnit(unit: string | null): number {
  if (!unit) {
    return 1; // Default step for unitless ingredients
  }

  return UNIT_STEP_CONFIG[unit] || 1; // Default to 1 for unknown/custom units
}

/**
 * Checks if a unit is a standard unit that supports smart conversions
 * @param unit - The unit to check
 * @returns True if it's a standard unit
 */
export function isStandardUnit(unit: string | null): boolean {
  if (!unit) return false;
  return STANDARD_COOKING_UNITS.includes(unit);
}

/**
 * Interface for custom units from the database
 */
export interface CustomUnit {
  id: string;
  user_id: string;
  unit_name: string;
  created_at: string;
}

/**
 * Interface for the complete unit system including standard + custom units
 */
export interface UnitSystem {
  standard: string[];
  custom: string[];
  all: string[];
}

/**
 * Creates a unit system object from standard units and custom units
 * @param customUnits - Array of custom unit names
 * @returns UnitSystem object
 */
export function createUnitSystem(customUnits: string[] = []): UnitSystem {
  const standard = [...STANDARD_COOKING_UNITS];
  const custom = [...customUnits];
  const all = [...standard, ...custom];

  return { standard, custom, all };
}

