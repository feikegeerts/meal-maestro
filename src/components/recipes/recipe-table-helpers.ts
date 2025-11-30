import {
  CharacteristicType,
  CookingMethodType,
  CuisineType,
  DietType,
  DishType,
  OccasionType,
  ProteinType,
  Recipe,
} from "@/types/recipe";

export type TagTranslator = (
  type:
    | "cuisine"
    | "dietType"
    | "cookingMethod"
    | "dishType"
    | "protein"
    | "occasion"
    | "characteristic",
  value: string
) => string;

export function getTagLabels(
  recipe: Recipe,
  translateTag: TagTranslator
): string[] {
  const labels: string[] = [];
  if (recipe.cuisine) {
    labels.push(translateTag("cuisine", recipe.cuisine as CuisineType));
  }
  (recipe.diet_types || []).forEach((dietType) =>
    labels.push(translateTag("dietType", dietType as DietType))
  );
  (recipe.cooking_methods || []).forEach((method) =>
    labels.push(translateTag("cookingMethod", method as CookingMethodType))
  );
  (recipe.dish_types || []).forEach((dishType) =>
    labels.push(translateTag("dishType", dishType as DishType))
  );
  (recipe.proteins || []).forEach((protein) =>
    labels.push(translateTag("protein", protein as ProteinType))
  );
  (recipe.occasions || []).forEach((occasion) =>
    labels.push(translateTag("occasion", occasion as OccasionType))
  );
  (recipe.characteristics || []).forEach((characteristic) =>
    labels.push(translateTag("characteristic", characteristic as CharacteristicType))
  );
  return labels;
}
