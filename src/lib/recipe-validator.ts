import { RecipeIngredient, RecipeSection } from "@/types/recipe";
import {
  MAX_NOTES_LENGTH,
  MAX_PAIRING_WINE_LENGTH,
  MAX_REFERENCE_LENGTH,
} from "@/lib/recipe-utils";

type OptionalNumber = number | null | undefined;

export interface NormalizedTimes {
  prepTime: OptionalNumber;
  cookTime: OptionalNumber;
  totalTime: OptionalNumber;
  prepProvided: boolean;
  cookProvided: boolean;
  totalProvided: boolean;
}

export class RecipeValidator {
  static hasKey(body: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(body, key);
  }

  static normalizeTimeField(
    value: unknown,
    label: string,
    errors: string[],
  ): OptionalNumber {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      errors.push(`${label} must be a number of minutes when provided`);
      return undefined;
    }
    if (!Number.isInteger(numeric)) {
      errors.push(`${label} must be a whole number of minutes`);
      return undefined;
    }
    if (numeric < 0) {
      errors.push(`${label} cannot be negative`);
      return undefined;
    }
    return numeric;
  }

  static normalizeTimes(
    body: Record<string, unknown>,
    errors: string[],
  ): NormalizedTimes {
    const totalProvided = RecipeValidator.hasKey(body, "total_time");
    const prepProvided = RecipeValidator.hasKey(body, "prep_time");
    const cookProvided = RecipeValidator.hasKey(body, "cook_time");

    const prepTime = RecipeValidator.normalizeTimeField(
      body.prep_time,
      "Prep time",
      errors,
    );
    const cookTime = RecipeValidator.normalizeTimeField(
      body.cook_time,
      "Cook time",
      errors,
    );
    let totalTime = RecipeValidator.normalizeTimeField(
      body.total_time,
      "Total time",
      errors,
    );

    if (!totalProvided && (prepProvided || cookProvided)) {
      if (typeof prepTime === "number" || typeof cookTime === "number") {
        const prepValue = typeof prepTime === "number" ? prepTime : 0;
        const cookValue = typeof cookTime === "number" ? cookTime : 0;
        totalTime = prepValue + cookValue;
      }
    }

    return { prepTime, cookTime, totalTime, prepProvided, cookProvided, totalProvided };
  }

  static normalizeIngredient(ingredient: RecipeIngredient): RecipeIngredient {
    let normalizedUnit = ingredient.unit;

    if (typeof normalizedUnit === "string") {
      switch (normalizedUnit.toLowerCase()) {
        case "el":
        case "eetlepel":
          normalizedUnit = "tbsp";
          break;
        case "tl":
        case "theelepel":
          normalizedUnit = "tsp";
          break;
        case "teen":
        case "teentje":
        case "teentjes":
          normalizedUnit = "clove";
          break;
        case "stuk":
        case "stuks":
        case "units.stuk":
        case "pieces":
          normalizedUnit = null;
          break;
        default: {
          const validUnits = ["g", "kg", "ml", "l", "tbsp", "tsp", "clove"];
          if (
            !validUnits.includes(normalizedUnit) &&
            normalizedUnit !== "naar smaak" &&
            normalizedUnit !== "to taste"
          ) {
            normalizedUnit = null;
          }
          break;
        }
      }
    }

    return {
      ...ingredient,
      amount:
        ingredient.amount === 0 || typeof ingredient.amount === "undefined"
          ? null
          : ingredient.amount,
      unit: normalizedUnit,
    };
  }

  /**
   * Validates a flat list of ingredients. Returns the first error message
   * found, or null if all ingredients are valid.
   */
  static validateIngredients(ingredients: RecipeIngredient[]): string | null {
    for (const ingredient of ingredients) {
      if (!ingredient.id || !ingredient.name) {
        return "Each ingredient must have an id and name";
      }
      const normalizedAmount = ingredient.amount === 0 ? null : ingredient.amount;
      if (
        normalizedAmount !== null &&
        (typeof normalizedAmount !== "number" || normalizedAmount <= 0)
      ) {
        return "Ingredient amounts must be positive numbers or null";
      }
    }
    return null;
  }

  static validateAndNormalizeSections(
    sections: RecipeSection[],
    errors: string[],
  ): RecipeSection[] {
    return sections.map((section, index) => {
      if (!section.id) {
        errors.push(`Section ${index + 1} is missing an id`);
      }
      if (!section.title || !section.title.trim()) {
        errors.push(`Section ${index + 1} title is required`);
      }
      if (!section.instructions || !section.instructions.trim()) {
        errors.push(`Section ${index + 1} instructions are required`);
      }
      if (
        !Array.isArray(section.ingredients) ||
        section.ingredients.length === 0
      ) {
        errors.push(`Section ${index + 1} must include at least one ingredient`);
      } else {
        section.ingredients.forEach(
          (ingredient: RecipeIngredient, ingredientIndex: number) => {
            if (!ingredient.id || !ingredient.name) {
              errors.push(
                `Section ${index + 1} ingredient ${ingredientIndex + 1} must have an id and name`,
              );
            }
            const normalizedAmount =
              ingredient.amount === 0 ? null : ingredient.amount;
            if (
              normalizedAmount !== null &&
              (typeof normalizedAmount !== "number" || normalizedAmount <= 0)
            ) {
              errors.push(
                `Section ${index + 1} ingredient ${ingredientIndex + 1} amounts must be positive numbers or null`,
              );
            }
          },
        );
      }

      return {
        ...section,
        title: section.title?.trim?.() ?? section.title,
        instructions: section.instructions,
        ingredients: Array.isArray(section.ingredients)
          ? section.ingredients.map(RecipeValidator.normalizeIngredient)
          : [],
      };
    });
  }

  static normalizeReference(reference: unknown, errors: string[]): string | null {
    const normalized = typeof reference === "string" ? reference.trim() : null;
    if (normalized && normalized.length > MAX_REFERENCE_LENGTH) {
      errors.push(`Reference must be ${MAX_REFERENCE_LENGTH} characters or fewer`);
    }
    return normalized;
  }

  static normalizePairingWine(pairingWine: unknown, errors: string[]): string | null {
    const normalized =
      typeof pairingWine === "string" ? pairingWine.trim() : null;
    if (normalized && normalized.length > MAX_PAIRING_WINE_LENGTH) {
      errors.push(
        `Wine pairing must be ${MAX_PAIRING_WINE_LENGTH} characters or fewer`,
      );
    }
    return normalized;
  }

  static normalizeNotes(notes: unknown, errors: string[]): string | null {
    const normalized = typeof notes === "string" ? notes : null;
    if (normalized && normalized.length > MAX_NOTES_LENGTH) {
      errors.push(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer`);
    }
    return normalized;
  }
}
