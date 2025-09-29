import { load } from "cheerio";
import { ScrapedRecipeData, ExtractionResult } from "@/lib/scraper/types";
import { safeJsonParse, sanitizeText } from "@/lib/scraper/sanitize";

interface RecipeJsonLd {
  name?: unknown;
  recipeIngredient?: unknown;
  recipeInstructions?: unknown;
  recipeYield?: unknown;
  recipeCuisine?: unknown;
  recipeCategory?: unknown;
  prepTime?: unknown;
  cookTime?: unknown;
  totalTime?: unknown;
  image?: unknown;
  [key: string]: unknown;
}

// Internal traversal helpers replicated from original class (pure versions)
function findRecipeInJsonLd(data: unknown): unknown {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;
  if (
    obj["@type"] === "Recipe" ||
    (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe"))
  ) {
    return obj;
  }
  for (const value of Object.values(obj)) {
    const recipe = findRecipeInJsonLd(value);
    if (recipe) return recipe;
  }
  return null;
}

function normalizeJsonLdRecipe(recipe: RecipeJsonLd): ScrapedRecipeData {
  const result: ScrapedRecipeData = {};
  if (typeof recipe.name === "string") {
    result.title = sanitizeText(recipe.name);
  }
  if (Array.isArray(recipe.recipeIngredient)) {
    result.ingredients = (recipe.recipeIngredient as unknown[])
      .filter((ing: unknown): ing is string => typeof ing === "string")
      .map((ing: string) => sanitizeText(ing))
      .filter((ing: string) => ing.length > 0);
  }
  if (Array.isArray(recipe.recipeInstructions)) {
    const instructions = (recipe.recipeInstructions as unknown[])
      .map((instruction: unknown) => {
        if (typeof instruction === "string") return sanitizeText(instruction);
        if (
          typeof instruction === "object" &&
          instruction &&
          "text" in instruction
        ) {
          const instructionObj = instruction as { text?: unknown };
          return typeof instructionObj.text === "string"
            ? sanitizeText(instructionObj.text)
            : "";
        }
        return "";
      })
      .filter((inst: string) => inst.length > 0);
    if (instructions.length > 0) result.description = instructions.join("\n\n");
  } else if (typeof recipe.recipeInstructions === "string") {
    result.description = sanitizeText(recipe.recipeInstructions as string);
  }
  if (typeof recipe.recipeYield === "string") {
    const servings = parseInt(recipe.recipeYield as string);
    if (!isNaN(servings) && servings > 0) result.servings = servings;
  } else if (typeof recipe.recipeYield === "number") {
    result.servings = recipe.recipeYield as number;
  }
  if (typeof recipe.recipeCuisine === "string") {
    result.cuisine = (recipe.recipeCuisine as string).trim().toLowerCase();
  } else if (Array.isArray(recipe.recipeCuisine) && recipe.recipeCuisine[0]) {
    result.cuisine = String((recipe.recipeCuisine as unknown[])[0])
      .trim()
      .toLowerCase();
  }
  if (typeof recipe.recipeCategory === "string") {
    result.category = (recipe.recipeCategory as string).trim().toLowerCase();
  } else if (Array.isArray(recipe.recipeCategory) && recipe.recipeCategory[0]) {
    result.category = String((recipe.recipeCategory as unknown[])[0])
      .trim()
      .toLowerCase();
  }
  if (typeof recipe.prepTime === "string")
    result.prepTime = recipe.prepTime as string;
  if (typeof recipe.cookTime === "string")
    result.cookTime = recipe.cookTime as string;
  if (typeof recipe.totalTime === "string")
    result.totalTime = recipe.totalTime as string;
  if (typeof recipe.image === "string") {
    result.image = recipe.image as string;
  } else if (Array.isArray(recipe.image) && (recipe.image as unknown[])[0]) {
    result.image = String((recipe.image as unknown[])[0]);
  } else if (
    typeof recipe.image === "object" &&
    recipe.image &&
    "url" in (recipe.image as Record<string, unknown>)
  ) {
    const imageObj = recipe.image as { url?: unknown };
    if (typeof imageObj.url === "string") result.image = imageObj.url;
  }
  return result;
}

export function extractFromJsonLd(html: string): ExtractionResult {
  try {
    const $ = load(html);
    const jsonLdScripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;
      try {
        const data = safeJsonParse(scriptContent);
        const recipe = findRecipeInJsonLd(data);
        if (recipe) {
          const normalized = normalizeJsonLdRecipe(
            recipe as Record<string, unknown>
          );
          return { success: true, data: normalized };
        }
      } catch {
        continue; // skip invalid script
      }
    }
    return { success: false, error: "No valid JSON-LD recipe data found" };
  } catch (error) {
    return {
      success: false,
      error: `JSON-LD extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
