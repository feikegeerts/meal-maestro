import type { recipes } from "@/db/schema";
import type { Recipe } from "@/types/recipe";

type DrizzleRecipe = typeof recipes.$inferSelect;

/**
 * Maps a Drizzle recipe row (camelCase) to the frontend Recipe type (snake_case).
 * Must be applied to all recipe API responses.
 */
export function toRecipeResponse(row: DrizzleRecipe): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: row.ingredients as Recipe["ingredients"],
    sections: row.sections as Recipe["sections"],
    servings: row.servings,
    description: row.description,
    category: row.category as Recipe["category"],
    season: (row.season as Recipe["season"]) ?? undefined,
    cuisine: (row.cuisine as Recipe["cuisine"]) ?? undefined,
    diet_types: (row.dietTypes as Recipe["diet_types"]) ?? undefined,
    cooking_methods:
      (row.cookingMethods as Recipe["cooking_methods"]) ?? undefined,
    dish_types: (row.dishTypes as Recipe["dish_types"]) ?? undefined,
    proteins: (row.proteins as Recipe["proteins"]) ?? undefined,
    occasions: (row.occasions as Recipe["occasions"]) ?? undefined,
    characteristics:
      (row.characteristics as Recipe["characteristics"]) ?? undefined,
    last_eaten: row.lastEaten?.toISOString() ?? undefined,
    image_url: row.imageUrl ?? undefined,
    image_metadata:
      (row.imageMetadata as Recipe["image_metadata"]) ?? undefined,
    nutrition: (row.nutrition as Recipe["nutrition"]) ?? undefined,
    reference: row.reference ?? undefined,
    prep_time: row.prepTime ?? undefined,
    cook_time: row.cookTime ?? undefined,
    total_time: row.totalTime ?? undefined,
    pairing_wine: row.pairingWine ?? undefined,
    notes: row.notes ?? undefined,
    utensils: row.utensils ?? undefined,
    created_at: row.createdAt?.toISOString() ?? undefined,
    updated_at: row.updatedAt?.toISOString() ?? undefined,
    user_id: row.userId,
  };
}
