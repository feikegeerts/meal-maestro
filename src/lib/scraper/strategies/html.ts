import { load } from "cheerio";
import { ScrapedRecipeData, ExtractionResult } from "@/lib/scraper/types";
import { sanitizeText } from "@/lib/scraper/sanitize";

export function extractFromHtml(html: string): ExtractionResult {
  try {
    const $ = load(html);
    const result: ScrapedRecipeData = {};

    const h1Title = $("h1").first().text();
    const recipeTitle = $(".recipe-title").first().text();
    const entryTitle = $(".entry-title").first().text();
    result.title = h1Title || recipeTitle || entryTitle || undefined;
    if (result.title) result.title = sanitizeText(result.title);

    const ingredients: string[] = [];
    const ingredientSelectors = [
      ".recipe-ingredients li",
      ".ingredients li",
      ".recipe-ingredient",
      '[class*="ingredient"] li',
      '[class*="ingredi"] li',
      'ul:has(li:contains("gr")) li',
      'ul:has(li:contains("eetlepel")) li',
      'ul:has(li:contains("theelepel")) li',
      'ul:has(li:contains("ml")) li',
      'ul:has(li:contains("cup")) li',
      'ul:has(li:contains("tablespoon")) li',
      'ul:has(li:contains("teaspoon")) li',
      'ul li:contains("gr")',
      'ul li:contains("ml")',
      'ul li:contains("eetlepel")',
      'ul li:contains("theelepel")',
      'li:contains("gr")',
      'li:contains("ml")',
      'li:contains("eetlepel")',
    ];

    for (const selector of ingredientSelectors) {
      const found = $(selector);
      if (found.length >= 2) {
        const foundIngredients: string[] = [];
        found.each((_, el) => {
          const text = sanitizeText($(el).text());
          if (text && text.length > 2) foundIngredients.push(text);
        });
        if (foundIngredients.length >= 2) {
          ingredients.push(...foundIngredients);
          break;
        }
      }
    }

    if (ingredients.length === 0) {
      const bodyText = $("body").text();
      const lines = bodyText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      for (const line of lines) {
        if (
          /\d+\s*(gr|gram|ml|liter|eetlepel|theelepel|tbsp|tsp|cup|oz|pound|kg)\s+/i.test(
            line
          )
        ) {
          const cleanLine = sanitizeText(line);
          if (cleanLine.length > 5 && cleanLine.length < 200)
            ingredients.push(cleanLine);
        }
      }
    }

    if (ingredients.length > 0) result.ingredients = [...new Set(ingredients)];

    const instructionSelectors = [
      ".recipe-instructions",
      ".instructions",
      ".recipe-method",
      ".directions",
      '[class*="instruction"]',
      '[class*="method"]',
      '[class*="direction"]',
      '[class*="preparation"]',
      '[class*="bereiding"]',
      ".recipe-content",
      ".entry-content",
      ".content",
    ];

    let foundInstructions = false;
    for (const selector of instructionSelectors) {
      const instructionEl = $(selector).first();
      if (instructionEl.length) {
        const text = sanitizeText(instructionEl.text());
        if (text && text.length > 30) {
          result.description = text;
          foundInstructions = true;
          break;
        }
      }
    }

    if (!foundInstructions) {
      const textElements = $("p, div").filter((_, el) => {
        const text = $(el).text().trim();
        return text.length > 100 && text.length < 2000;
      });
      let bestText = "";
      textElements.each((_, el) => {
        const text = sanitizeText($(el).text());
        if (text.length > bestText.length) bestText = text;
      });
      if (bestText.length > 50) result.description = bestText;
    }

    const servingsText = $("body").text().toLowerCase();
    const servingsMatch = servingsText.match(
      /(\d+)\s*(?:serving|portion|people|personen|porties?)/
    );
    if (servingsMatch) {
      const servings = parseInt(servingsMatch[1]);
      if (!isNaN(servings) && servings > 0 && servings <= 50)
        result.servings = servings;
    }

    if (result.title || result.ingredients?.length || result.description) {
      return { success: true, data: result };
    }
    return { success: false, error: "No recipe content found in HTML" };
  } catch (error) {
    return {
      success: false,
      error: `HTML extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
