// Core recipe domain types & enums. Business logic lives in `lib/recipe-utils.ts`.
// After migration, update imports to pull utilities from `@/lib/recipe-utils` directly.

export enum RecipeCategory {
  BREAKFAST = "breakfast",
  BRUNCH = "brunch",
  LUNCH = "lunch",
  APPETIZER = "appetizer",
  MAIN_COURSE = "main-course",
  SIDE_DISH = "side-dish",
  DESSERT = "dessert",
  PASTRY = "pastry",
  SNACK = "snack",
}

export enum RecipeSeason {
  SPRING = "spring",
  SUMMER = "summer",
  FALL = "fall",
  WINTER = "winter",
  YEAR_ROUND = "year-round",
}

export enum CuisineType {
  DUTCH = "dutch",
  ITALIAN = "italian",
  ASIAN = "asian",
  CHINESE = "chinese",
  THAI = "thai",
  JAPANESE = "japanese",
  VIETNAMESE = "vietnamese",
  INDONESIAN = "indonesian",
  INDIAN = "indian",
  MEXICAN = "mexican",
  AMERICAN = "american",
  FRENCH = "french",
  GREEK = "greek",
  SPANISH = "spanish",
  TURKISH = "turkish",
  MOROCCAN = "moroccan",
  ARGENTINIAN = "argentinian",
  SOUTH_AMERICAN = "south-american",
  CENTRAL_AMERICAN = "central-american",
  MIDDLE_EASTERN = "middle-eastern",
  ENGLISH = "english",
  SURINAMESE = "surinamese",
  MEDITERRANEAN = "mediterranean",
  SCANDINAVIAN = "scandinavian",
}

export enum DietType {
  VEGETARIAN = "vegetarian",
  VEGAN = "vegan",
  GLUTEN_FREE = "gluten-free",
  LACTOSE_FREE = "lactose-free",
  HIGH_PROTEIN = "high-protein",
  KETO = "keto",
}

export enum CookingMethodType {
  BAKING = "baking",
  COOKING = "cooking",
  GRILLING = "grilling",
  BARBECUE = "barbecue",
  OVEN = "oven",
  AIR_FRYER = "air-fryer",
  DEEP_FRYING = "deep-frying",
  STIR_FRY = "stir-fry",
  STEWING = "stewing",
  STEAMING = "steaming",
  POACHING = "poaching",
}

export enum DishType {
  SOUP = "soup",
  SALAD = "salad",
  PASTA = "pasta",
  RICE = "rice",
  BREAD_SANDWICHES = "bread-sandwiches",
  STAMPPOT = "stamppot",
  QUICHE = "quiche",
  WRAP = "wrap",
  SAUCE_DRESSING = "sauce-dressing",
}

export enum ProteinType {
  MEAT = "meat",
  FISH = "fish",
  POULTRY = "poultry",
  SHELLFISH = "shellfish",
  MEAT_SUBSTITUTE = "meat-substitute",
}

export enum OccasionType {
  CHRISTMAS = "christmas",
  EASTER = "easter",
  NEW_YEAR = "new-year",
  BIRTHDAY = "birthday",
  MOTHERS_DAY = "mothers-day",
  PICNIC = "picnic",
  DRINKS = "drinks",
  PARTY_SNACK = "party-snack",
}

export enum CharacteristicType {
  EASY = "easy",
  QUICK = "quick",
  BUDGET = "budget",
  HEALTHY = "healthy",
  LIGHT = "light",
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

export interface RecipeNutritionValues {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  sugars: number;
  sodium: number;
  cholesterol?: number;
}

export interface RecipeNutritionMeta {
  source: "ai" | "database" | "mixed";
  fetchedAt: string;
  model?: string;
  confidence?: number;
  warnings?: string[];
  notes?: string;
  cacheKey?: string;
  servingsSnapshot?: number;
}

export interface RecipeNutrition {
  perPortion: RecipeNutritionValues;
  meta: RecipeNutritionMeta;
}

export interface RecipeSection {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
  instructions: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
  sections?: RecipeSection[] | null;
  servings: number;
  reference?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  total_time?: number | null;
  pairing_wine?: string | null;
  utensils?: string[] | null;
  notes?: string | null;
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
  nutrition?: RecipeNutrition | null;
}

export interface RecipeInput {
  id?: string;
  title: string;
  ingredients: RecipeIngredient[];
  sections?: RecipeSection[] | null;
  servings: number;
  reference?: string | null;
  prep_time?: number | null;
  cook_time?: number | null;
  total_time?: number | null;
  pairing_wine?: string | null;
  utensils?: string[] | null;
  notes?: string | null;
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
  nutrition?: RecipeNutrition | null;
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

export interface CustomUnit {
  id: string;
  user_id: string;
  unit_name: string;
  created_at: string;
}
export interface UnitSystem {
  standard: string[];
  custom: string[];
  all: string[];
}

// (Logic utilities now live exclusively in `@/lib/recipe-utils`.)
