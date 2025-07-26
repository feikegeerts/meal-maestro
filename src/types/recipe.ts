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

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
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
  ingredients: string[];
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