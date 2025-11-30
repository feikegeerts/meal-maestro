// Recipe business logic & utilities extracted from types/recipe.ts
// This separation keeps `types/recipe.ts` focused on enums/interfaces/constants.
// TODO: After a transition period, update imports in components to use this file directly.

import {
  Recipe,
  RecipeIngredient,
  RecipeInput,
  RecipeNutrition,
  RecipeNutritionValues,
  RecipeSection,
  RecipeCategory,
  RecipeSeason,
  CuisineType,
  DietType,
  CookingMethodType,
  DishType,
  ProteinType,
  OccasionType,
  CharacteristicType,
  RECIPE_CATEGORIES,
  RECIPE_SEASONS,
  CUISINE_TYPES,
  DIET_TYPES,
  COOKING_METHOD_TYPES,
  DISH_TYPES,
  PROTEIN_TYPES,
  OCCASION_TYPES,
  CHARACTERISTIC_TYPES,
} from "@/types/recipe";

// ---- Type guards / validation helpers ----
function isStringIn<T extends string>(
  arr: readonly T[],
  value: string
): value is T {
  return (arr as readonly string[]).includes(value);
}

export function isValidCategory(category: string): category is RecipeCategory {
  return isStringIn(RECIPE_CATEGORIES, category);
}
export function isValidSeason(season: string): season is RecipeSeason {
  return isStringIn(RECIPE_SEASONS, season);
}
export function isValidCuisine(cuisine: string): cuisine is CuisineType {
  return isStringIn(CUISINE_TYPES, cuisine);
}
export function isValidDietType(dietType: string): dietType is DietType {
  return isStringIn(DIET_TYPES, dietType);
}
export function isValidCookingMethod(
  cookingMethod: string
): cookingMethod is CookingMethodType {
  return isStringIn(COOKING_METHOD_TYPES, cookingMethod);
}
export function isValidDishType(dishType: string): dishType is DishType {
  return isStringIn(DISH_TYPES, dishType);
}
export function isValidProteinType(
  proteinType: string
): proteinType is ProteinType {
  return isStringIn(PROTEIN_TYPES, proteinType);
}
export function isValidOccasionType(
  occasionType: string
): occasionType is OccasionType {
  return isStringIn(OCCASION_TYPES, occasionType);
}
export function isValidCharacteristicType(
  characteristicType: string
): characteristicType is CharacteristicType {
  return isStringIn(CHARACTERISTIC_TYPES, characteristicType);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validateIngredientsList(
  ingredients: RecipeIngredient[] | undefined | null,
  errors: string[],
  contextLabel: string
) {
  if (!ingredients || ingredients.length === 0) {
    errors.push(`${contextLabel} must include at least one ingredient`);
    return;
  }

  ingredients.forEach((ingredient, index) => {
    const ingredientLabel =
      contextLabel === "Ingredient"
        ? "Ingredient"
        : `${contextLabel} ingredient`;
    if (!ingredient.name || ingredient.name.trim().length === 0) {
      errors.push(`${ingredientLabel} ${index + 1} name is required`);
    }
    const normalizedAmount = ingredient.amount === 0 ? null : ingredient.amount;
    if (
      normalizedAmount !== null &&
      (isNaN(normalizedAmount) || normalizedAmount <= 0)
    ) {
      errors.push(
        `${ingredientLabel} ${
          index + 1
        } amount must be a positive number or empty for "to taste"`
      );
    }
  });
}

function validateSections(sections: RecipeSection[], errors: string[]) {
  sections.forEach((section, index) => {
    const sectionLabel = `Section ${index + 1}`;
    if (!section.title || section.title.trim().length === 0) {
      errors.push(`${sectionLabel} title is required`);
    }

    validateIngredientsList(
      section.ingredients,
      errors,
      `${sectionLabel} ingredients`
    );

    if (!section.instructions || section.instructions.trim().length === 0) {
      errors.push(`${sectionLabel} instructions are required`);
    }
  });
}

function validateNutritionValues(
  values: RecipeNutritionValues,
  path: string,
  errors: string[]
) {
  const requiredNumericFields: Array<keyof RecipeNutritionValues> = [
    "calories",
    "protein",
    "carbohydrates",
    "fat",
    "saturatedFat",
    "fiber",
    "sugars",
    "sodium",
  ];

  requiredNumericFields.forEach((field) => {
    if (!isNonNegativeNumber(values[field])) {
      errors.push(
        `Nutrition ${path}.${field} must be a non-negative number when nutrition is provided`
      );
    }
  });

  if (
    typeof values.cholesterol !== "undefined" &&
    !isNonNegativeNumber(values.cholesterol)
  ) {
    errors.push(
      `Nutrition ${path}.cholesterol must be a non-negative number when provided`
    );
  }
}

function validateRecipeNutrition(
  nutrition: RecipeNutrition,
  errors: string[]
) {
  if (!nutrition.perPortion) {
    errors.push(
      "Nutrition perPortion is required when nutrition is provided"
    );
  } else {
    validateNutritionValues(nutrition.perPortion, "perPortion", errors);
  }

  if (!nutrition.meta) {
    errors.push("Nutrition meta information is required when nutrition is provided");
  } else {
    if (!nutrition.meta.source) {
      errors.push("Nutrition meta.source is required when nutrition is provided");
    }
    if (!nutrition.meta.fetchedAt) {
      errors.push(
        "Nutrition meta.fetchedAt is required when nutrition is provided"
      );
    }
    if (
      nutrition.meta.source === "ai" &&
      (!nutrition.meta.cacheKey || nutrition.meta.cacheKey.trim().length === 0)
    ) {
      errors.push(
        "Nutrition meta.cacheKey is required when nutrition is provided by AI"
      );
    }
    if (
      typeof nutrition.meta.confidence !== "undefined" &&
      (typeof nutrition.meta.confidence !== "number" ||
        nutrition.meta.confidence < 0 ||
        nutrition.meta.confidence > 1)
    ) {
      errors.push(
        "Nutrition meta.confidence must be a number between 0 and 1 when provided"
      );
    }
    if (
      typeof nutrition.meta.servingsSnapshot !== "undefined" &&
      (!Number.isFinite(nutrition.meta.servingsSnapshot) ||
        nutrition.meta.servingsSnapshot <= 0)
    ) {
      errors.push(
        "Nutrition meta.servingsSnapshot must be a positive number when provided"
      );
    }
  }
}

export function validateRecipeInput(input: RecipeInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.title || input.title.trim().length === 0)
    errors.push("Recipe title is required");
  const hasSections =
    Array.isArray(input.sections) && input.sections.length > 0;
  if (!input.description || input.description.trim().length === 0) {
    if (!hasSections) errors.push("Recipe description is required");
  }

  if (!input.ingredients || input.ingredients.length === 0) {
    if (!hasSections) errors.push("At least one ingredient is required");
  } else {
    validateIngredientsList(input.ingredients, errors, "Ingredient");
  }

  if (hasSections && input.sections) {
    validateSections(input.sections, errors);
  }
  if (!input.servings || input.servings <= 0 || input.servings > 100)
    errors.push("Servings must be between 1 and 100");
  if (!isValidCategory(input.category)) {
    errors.push(
      `Invalid category "${
        input.category
      }". Must be one of: ${RECIPE_CATEGORIES.join(", ")}`
    );
  }
  if (input.season && !isValidSeason(input.season)) {
    errors.push(
      `Invalid season "${input.season}". Must be one of: ${RECIPE_SEASONS.join(
        ", "
      )}`
    );
  }
  if (input.cuisine && !isValidCuisine(input.cuisine)) {
    errors.push(
      `Invalid cuisine "${input.cuisine}". Must be one of: ${CUISINE_TYPES.join(
        ", "
      )}`
    );
  }
  if (input.diet_types) {
    const invalid = input.diet_types.filter((d) => !isValidDietType(d));
    if (invalid.length)
      errors.push(
        `Invalid diet types: ${invalid.join(
          ", "
        )}. Available diet types: ${DIET_TYPES.join(", ")}`
      );
  }
  if (input.cooking_methods) {
    const invalid = input.cooking_methods.filter(
      (m) => !isValidCookingMethod(m)
    );
    if (invalid.length)
      errors.push(
        `Invalid cooking methods: ${invalid.join(
          ", "
        )}. Available cooking methods: ${COOKING_METHOD_TYPES.join(", ")}`
      );
  }
  if (input.dish_types) {
    const invalid = input.dish_types.filter((d) => !isValidDishType(d));
    if (invalid.length)
      errors.push(
        `Invalid dish types: ${invalid.join(
          ", "
        )}. Available dish types: ${DISH_TYPES.join(", ")}`
      );
  }
  if (input.proteins) {
    const invalid = input.proteins.filter((p) => !isValidProteinType(p));
    if (invalid.length)
      errors.push(
        `Invalid proteins: ${invalid.join(
          ", "
        )}. Available proteins: ${PROTEIN_TYPES.join(", ")}`
      );
  }
  if (input.occasions) {
    const invalid = input.occasions.filter((o) => !isValidOccasionType(o));
    if (invalid.length)
      errors.push(
        `Invalid occasions: ${invalid.join(
          ", "
        )}. Available occasions: ${OCCASION_TYPES.join(", ")}`
      );
  }
  if (input.characteristics) {
    const invalid = input.characteristics.filter(
      (c) => !isValidCharacteristicType(c)
    );
    if (invalid.length)
      errors.push(
        `Invalid characteristics: ${invalid.join(
          ", "
        )}. Available characteristics: ${CHARACTERISTIC_TYPES.join(", ")}`
      );
  }

  if (input.nutrition) {
    try {
      validateRecipeNutrition(input.nutrition, errors);
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `Nutrition validation failed: ${error.message}`
          : "Nutrition validation failed"
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---- Unit conversion & formatting ----
interface SmartUnitResult {
  amount: number;
  unit: string;
}

export const STANDARD_COOKING_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tbsp",
  "tsp",
  "clove",
  "cup",
  "fl oz",
  "oz",
  "lb",
];
export const COOKING_UNITS = STANDARD_COOKING_UNITS; // legacy alias

const UNIT_STEP_CONFIG: Record<string, number> = {
  ml: 25,
  l: 0.25,
  g: 25,
  kg: 0.25,
  tbsp: 0.5,
  tsp: 0.25,
  clove: 1,
  cup: 0.25,
  "fl oz": 0.5,
  oz: 0.25,
  lb: 0.25,
};

export function getStepSizeForUnit(unit: string | null): number {
  return unit ? UNIT_STEP_CONFIG[unit] || 1 : 1;
}
export function isStandardUnit(unit: string | null): boolean {
  return !!unit && STANDARD_COOKING_UNITS.includes(unit);
}

export function smartWeightConversion(
  amount: number,
  unit: string
): SmartUnitResult {
  if (unit === "g" && amount >= 1000)
    return { amount: amount / 1000, unit: "kg" };
  if (unit === "kg" && amount < 1) return { amount: amount * 1000, unit: "g" };
  return { amount, unit };
}
export function smartVolumeConversion(
  amount: number,
  unit: string
): SmartUnitResult {
  if (unit === "ml" && amount >= 1000)
    return { amount: amount / 1000, unit: "l" };
  if (unit === "l" && amount < 1) return { amount: amount * 1000, unit: "ml" };
  return { amount, unit };
}
export function smartImperialWeightConversion(
  amount: number,
  unit: string
): SmartUnitResult {
  if (unit === "oz" && amount >= 16) return { amount: amount / 16, unit: "lb" };
  if (unit === "lb" && amount < 1) return { amount: amount * 16, unit: "oz" };
  return { amount, unit };
}
export function smartImperialVolumeConversion(
  amount: number,
  unit: string
): SmartUnitResult {
  if (unit === "fl oz" && amount >= 8)
    return { amount: amount / 8, unit: "cup" };
  if (unit === "cup" && amount < 1)
    return { amount: amount * 8, unit: "fl oz" };
  return { amount, unit };
}

export function normalizeIngredientUnit(
  amount: number | null,
  unit: string | null
): SmartUnitResult | null {
  if (amount === null || unit === null) return null;
  if (!isStandardUnit(unit)) return { amount, unit };
  if (unit === "g" || unit === "kg") return smartWeightConversion(amount, unit);
  if (unit === "ml" || unit === "l") return smartVolumeConversion(amount, unit);
  if (unit === "oz" || unit === "lb")
    return smartImperialWeightConversion(amount, unit);
  if (unit === "fl oz" || unit === "cup")
    return smartImperialVolumeConversion(amount, unit);
  return { amount, unit };
}

export function formatFraction(num: number): string {
  const tolerance = 1e-6;
  const commonFractions: [number, string][] = [
    [1 / 4, "¼"],
    [1 / 3, "⅓"],
    [1 / 2, "½"],
    [2 / 3, "⅔"],
    [3 / 4, "¾"],
    [1 / 8, "⅛"],
    [3 / 8, "⅜"],
    [5 / 8, "⅝"],
    [7 / 8, "⅞"],
  ];
  const wholePart = Math.floor(num);
  const fractionalPart = num - wholePart;
  if (fractionalPart < tolerance) return wholePart.toString();
  for (const [decimal, fraction] of commonFractions) {
    if (Math.abs(fractionalPart - decimal) < tolerance)
      return wholePart > 0 ? `${wholePart} ${fraction}` : fraction;
  }
  return num.toFixed(2).replace(/\.?0+$/, "");
}

export function pluralizeUnit(
  unit: string | null,
  amount: number
): string | null {
  if (!unit) return null;
  const singularToPlural: Record<string, string> = {
    tbsp: "tbsp",
    tsp: "tsp",
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    clove: "cloves",
    cup: "cups",
    "fl oz": "fl oz",
    oz: "oz",
    lb: "lbs",
  };
  if (amount === 1) {
    const singularForm = Object.keys(singularToPlural).find(
      (key) => singularToPlural[key] === unit
    );
    return singularForm || unit;
  }
  return singularToPlural[unit] || unit;
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  ratio: number
): RecipeIngredient {
  if (ingredient.amount === null) return { ...ingredient };
  const scaledAmount = ingredient.amount * ratio;
  const smartResult = normalizeIngredientUnit(scaledAmount, ingredient.unit);
  const finalAmount = smartResult ? smartResult.amount : scaledAmount;
  const finalUnit = smartResult ? smartResult.unit : ingredient.unit;
  const scaledUnit = pluralizeUnit(finalUnit, finalAmount);
  return { ...ingredient, amount: finalAmount, unit: scaledUnit };
}

export function scaleRecipe(recipe: Recipe, newServings: number): Recipe {
  const ratio = newServings / recipe.servings;
  const scaledIngredients = recipe.ingredients.map((ing) =>
    scaleIngredient(ing, ratio)
  );
  const scaledSections = recipe.sections?.map((section) => ({
    ...section,
    ingredients: section.ingredients.map((ingredient) =>
      scaleIngredient(ingredient, ratio)
    ),
  }));
  const scaledNutrition = recipe.nutrition
    ? {
        perPortion: { ...recipe.nutrition.perPortion },
        meta: {
          ...recipe.nutrition.meta,
          servingsSnapshot: newServings,
        },
      }
    : recipe.nutrition;
  return {
    ...recipe,
    ingredients: scaledIngredients,
    sections: scaledSections ?? recipe.sections,
    servings: newServings,
    nutrition: scaledNutrition,
  };
}

export function formatIngredientDisplay(ingredient: RecipeIngredient): string {
  if (ingredient.amount === null) {
    const notes = ingredient.notes ? ` (${ingredient.notes})` : "";
    return `${ingredient.name}${notes}`;
  }
  if (isNaN(ingredient.amount) || !isFinite(ingredient.amount)) {
    const notes = ingredient.notes ? ` (${ingredient.notes})` : "";
    return `${ingredient.name}${notes}`;
  }
  const smartResult = normalizeIngredientUnit(
    ingredient.amount,
    ingredient.unit
  );
  const amount = smartResult
    ? formatFraction(smartResult.amount)
    : formatFraction(ingredient.amount);
  const unit = smartResult
    ? ` ${smartResult.unit}`
    : ingredient.unit
    ? ` ${ingredient.unit}`
    : "";
  const notes = ingredient.notes ? ` (${ingredient.notes})` : "";
  return `${amount}${unit} ${ingredient.name}${notes}`;
}

// ---- Custom unit system ----
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
export function createUnitSystem(customUnits: string[] = []): UnitSystem {
  const standard = [...STANDARD_COOKING_UNITS];
  const custom = [...customUnits];
  const all = [...standard, ...custom];
  return { standard, custom, all };
}

// Backwards compatibility re-exports for existing imports from types/recipe
// (Consider removing after updating all call sites)
export const __deprecated = {
  note: "Functions moved from types/recipe.ts to lib/recipe-utils.ts",
};
