export enum RecipeCategory {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  DESSERT = 'dessert',
  SNACK = 'snack',
  APPETIZER = 'appetizer',
  BEVERAGE = 'beverage'
}

export enum RecipeSeason {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter',
  YEAR_ROUND = 'year-round'
}

export enum RecipeTag {
  // Dietary Restrictions
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  DAIRY_FREE = 'dairy-free',
  NUT_FREE = 'nut-free',
  KETO = 'keto',
  PALEO = 'paleo',
  LOW_CARB = 'low-carb',
  LOW_FAT = 'low-fat',
  SUGAR_FREE = 'sugar-free',
  LOW_SODIUM = 'low-sodium',
  HIGH_PROTEIN = 'high-protein',
  
  // Cuisine Types
  ITALIAN = 'italian',
  MEXICAN = 'mexican',
  CHINESE = 'chinese',
  INDIAN = 'indian',
  THAI = 'thai',
  FRENCH = 'french',
  MEDITERRANEAN = 'mediterranean',
  AMERICAN = 'american',
  JAPANESE = 'japanese',
  KOREAN = 'korean',
  GREEK = 'greek',
  SPANISH = 'spanish',
  MIDDLE_EASTERN = 'middle-eastern',
  CAJUN = 'cajun',
  SOUTHERN = 'southern',
  
  // Cooking Methods
  BAKING = 'baking',
  GRILLING = 'grilling',
  FRYING = 'frying',
  ROASTING = 'roasting',
  STEAMING = 'steaming',
  SLOW_COOKING = 'slow-cooking',
  AIR_FRYER = 'air-fryer',
  INSTANT_POT = 'instant-pot',
  NO_COOK = 'no-cook',
  ONE_POT = 'one-pot',
  STIR_FRY = 'stir-fry',
  BRAISING = 'braising',
  SMOKING = 'smoking',
  PRESSURE_COOKER = 'pressure-cooker',
  
  // Meal Characteristics
  QUICK = 'quick',
  EASY = 'easy',
  HEALTHY = 'healthy',
  COMFORT_FOOD = 'comfort-food',
  SPICY = 'spicy',
  MILD = 'mild',
  SWEET = 'sweet',
  SAVORY = 'savory',
  CRISPY = 'crispy',
  CREAMY = 'creamy',
  FRESH = 'fresh',
  HEARTY = 'hearty',
  LIGHT = 'light',
  RICH = 'rich',
  
  // Occasions
  PARTY = 'party',
  HOLIDAY = 'holiday',
  WEEKNIGHT = 'weeknight',
  MEAL_PREP = 'meal-prep',
  KID_FRIENDLY = 'kid-friendly',
  DATE_NIGHT = 'date-night',
  POTLUCK = 'potluck',
  PICNIC = 'picnic',
  BRUNCH = 'brunch',
  ENTERTAINING = 'entertaining',
  BUDGET_FRIENDLY = 'budget-friendly',
  LEFTOVER_FRIENDLY = 'leftover-friendly',
  
  // Protein Types
  CHICKEN = 'chicken',
  BEEF = 'beef',
  PORK = 'pork',
  FISH = 'fish',
  SEAFOOD = 'seafood',
  TOFU = 'tofu',
  BEANS = 'beans',
  EGGS = 'eggs',
  TURKEY = 'turkey',
  LAMB = 'lamb',
  DUCK = 'duck',
  PLANT_BASED = 'plant-based',
  
  // Additional Categories
  SOUP = 'soup',
  SALAD = 'salad',
  SANDWICH = 'sandwich',
  PASTA = 'pasta',
  PIZZA = 'pizza',
  BREAD = 'bread',
  COOKIES = 'cookies',
  CAKE = 'cake',
  PIE = 'pie',
  SMOOTHIE = 'smoothie',
  COCKTAIL = 'cocktail',
  SAUCE = 'sauce',
  DIP = 'dip',
  MARINADE = 'marinade',
  DRESSING = 'dressing'
}

export const RECIPE_CATEGORIES = Object.values(RecipeCategory);
export const RECIPE_SEASONS = Object.values(RecipeSeason);
export const RECIPE_TAGS = Object.values(RecipeTag);

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
  tags: RecipeTag[];
  season?: RecipeSeason;
  last_eaten?: string;
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
  tags: string[];
  season?: string;
  last_eaten?: string;
}

export interface RecipeSearchParams {
  query?: string;
  category?: string;
  tags?: string[];
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

export function isValidTag(tag: string): tag is RecipeTag {
  return RECIPE_TAGS.includes(tag as RecipeTag);
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
      if (ingredient.amount !== null && (isNaN(ingredient.amount) || ingredient.amount <= 0)) {
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
  
  const invalidTags = input.tags.filter(tag => !isValidTag(tag));
  if (invalidTags.length > 0) {
    errors.push(`Invalid tags: ${invalidTags.join(', ')}. Available tags: ${RECIPE_TAGS.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// Utility functions for ingredient scaling
function formatFraction(num: number): string {
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

function pluralizeUnit(unit: string | null, amount: number): string | null {
  if (!unit) return null;
  
  const singularToPlural: Record<string, string> = {
    'cup': 'cups',
    'tablespoon': 'tablespoons',
    'tbsp': 'tbsp',
    'teaspoon': 'teaspoons',
    'tsp': 'tsp',
    'pound': 'pounds',
    'lb': 'lbs',
    'ounce': 'ounces',
    'oz': 'oz',
    'gram': 'grams',
    'g': 'g',
    'kilogram': 'kilograms',
    'kg': 'kg',
    'liter': 'liters',
    'l': 'l',
    'milliliter': 'milliliters',
    'ml': 'ml',
    'piece': 'pieces',
    'slice': 'slices',
    'clove': 'cloves',
    'can': 'cans',
    'package': 'packages',
    'bag': 'bags'
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
  const scaledUnit = pluralizeUnit(ingredient.unit, scaledAmount);
  
  return {
    ...ingredient,
    amount: scaledAmount,
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
  
  const amount = formatFraction(ingredient.amount);
  const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
  const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
  
  return `${amount}${unit} ${ingredient.name}${notes}`;
}

// Common cooking units for dropdown
export const COOKING_UNITS = [
  'cup', 'cups',
  'tablespoon', 'tablespoons', 'tbsp',
  'teaspoon', 'teaspoons', 'tsp',
  'pound', 'pounds', 'lb', 'lbs',
  'ounce', 'ounces', 'oz',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',
  'liter', 'liters', 'l',
  'milliliter', 'milliliters', 'ml',
  'piece', 'pieces',
  'slice', 'slices',
  'clove', 'cloves',
  'can', 'cans',
  'package', 'packages',
  'bag', 'bags',
  'large', 'medium', 'small',
  'whole', 'half'
];

