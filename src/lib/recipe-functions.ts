import { OpenAI } from "openai";
import {
  RecipeCategory,
  RecipeSeason,
  CuisineType,
  DietType,
  CookingMethodType,
  DishType,
  ProteinType,
  OccasionType,
  CharacteristicType,
  isValidCuisine,
  isValidDietType,
  isValidCookingMethod,
  isValidDishType,
  isValidProteinType,
  isValidOccasionType,
  isValidCharacteristicType,
  COOKING_UNITS,
} from "@/types/recipe";
import { RecipeScraper } from "@/lib/recipe-scraper";
import { UrlDetector } from "@/lib/url-detector";

// Unit preference mappings (constrained to database-supported units)
const UNIT_PREFERENCE_MAPPINGS = {
  "precise-metric": ["g", "kg", "ml", "l", "clove"],
  "traditional-metric": ["g", "kg", "ml", "l", "tsp", "tbsp", "clove"],
  "us-traditional": ["tbsp", "tsp", "clove"], // Only US units that exist in database
  mixed: COOKING_UNITS,
} as const;

// Get allowed units based on preference
export function getAllowedUnits(unitPreference?: string): string[] {
  if (
    !unitPreference ||
    !UNIT_PREFERENCE_MAPPINGS[
      unitPreference as keyof typeof UNIT_PREFERENCE_MAPPINGS
    ]
  ) {
    return COOKING_UNITS;
  }
  return [
    ...UNIT_PREFERENCE_MAPPINGS[
      unitPreference as keyof typeof UNIT_PREFERENCE_MAPPINGS
    ],
  ];
}

// Get unit description based on preference
function getUnitDescription(unitPreference?: string): string {
  switch (unitPreference) {
    case "precise-metric":
      return "Unit selection: Liquids → ml, Powders/granules → g, Whole items (2 zucchinis, 3 eggs) → null. Convert tbsp/tsp measurements.";
    case "traditional-metric":
      return "Unit of measurement - Use metric units: g, kg, ml, l preferred. Small amounts can use tsp/tbsp.";
    case "us-traditional":
      return "Unit of measurement - Use US volume units: tbsp, tsp preferred. Note: cups, oz, lb not supported - use tablespoons/teaspoons.";
    case "mixed":
    default:
      return "Unit of measurement - Choose appropriate unit based on ingredient type and source.";
  }
}

// Get ingredient description based on preference
function getIngredientDescription(unitPreference?: string): string {
  switch (unitPreference) {
    case "precise-metric":
      return 'List of structured ingredients with precise metric measurements. MANDATORY: Convert ALL tbsp/tsp amounts - liquids to ml (1 tbsp = 15ml), solids to g using density. NEVER leave amounts as "1" when converting from original recipe.';
    case "traditional-metric":
      return "List of structured ingredients with metric units preferred. Use g, kg, ml, l for most ingredients. Small amounts can use tsp/tbsp.";
    case "us-traditional":
      return "List of structured ingredients with US volume measurements. Use tbsp, tsp as appropriate. Note: cups, oz, lb not supported.";
    case "mixed":
    default:
      return "List of structured ingredients with proper amounts and units. Choose appropriate units based on ingredient type.";
  }
}

// Get amount description based on preference
function getAmountDescription(unitPreference?: string): string {
  switch (unitPreference) {
    case "precise-metric":
      return 'Amount - CRITICAL: Calculate actual converted amount, never leave as "1". Example: if original was "1 tbsp oil", use 15 not 1.';
    default:
      return 'Amount (can be null for "to taste")';
  }
}

// Dynamic function generator based on unit preference
export function createRecipeFormFunction(
  unitPreference?: string
): OpenAI.Chat.Completions.ChatCompletionTool {
  const allowedUnits = getAllowedUnits(unitPreference);
  const unitDescription = getUnitDescription(unitPreference);
  const ingredientDescription = getIngredientDescription(unitPreference);
  const amountDescription = getAmountDescription(unitPreference);

  return {
    type: "function",
    function: {
      name: "update_recipe_form",
      description:
        "Update the current recipe form with complete recipe data. When creating a new recipe, provide ALL fields including title, ingredients, detailed cooking instructions, category, servings, and tags in a SINGLE function call.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Recipe title or name",
          },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Ingredient name" },
                amount: { type: "number", description: amountDescription },
                unit: {
                  type: "string",
                  enum: allowedUnits,
                  description: unitDescription,
                },
                notes: {
                  type: "string",
                  description: "Additional notes (optional)",
                },
              },
              required: ["name"],
            },
            description: ingredientDescription,
          },
          servings: {
            type: "number",
            description: "Number of servings this recipe makes",
            minimum: 1,
            maximum: 100,
          },
          description: {
            type: "string",
            description:
              "REQUIRED: Detailed step-by-step cooking instructions with times, temperatures, and specific techniques. Must be comprehensive cooking directions, not just a brief summary.",
          },
          category: {
            type: "string",
            description: "Recipe category",
            enum: Object.values(RecipeCategory),
          },
          cuisine: {
            type: "string",
            enum: Object.values(CuisineType),
            description:
              "Optional cuisine type - single value describing the primary culinary tradition",
          },
          diet_types: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(DietType),
            },
            description:
              "Optional dietary requirements/restrictions - multiple values allowed",
          },
          cooking_methods: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(CookingMethodType),
            },
            description:
              "Optional cooking methods used - multiple values allowed",
          },
          dish_types: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(DishType),
            },
            description: "Optional dish/meal types - multiple values allowed",
          },
          proteins: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(ProteinType),
            },
            description:
              "Optional protein sources in the recipe - multiple values allowed",
          },
          occasions: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(OccasionType),
            },
            description:
              "Optional occasions suitable for this recipe - multiple values allowed",
          },
          characteristics: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(CharacteristicType),
            },
            description:
              "Optional recipe characteristics like easy, quick, budget, etc. - multiple values allowed",
          },
          season: {
            type: "string",
            description: "Optional seasonal relevance",
            enum: Object.values(RecipeSeason),
          },
        },
      },
    },
  };
}

// OpenAI function definition for URL recipe extraction
export const extractRecipeFromUrlFunction: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "extract_recipe_from_url",
      description:
        "Extract recipe data from a provided URL and populate the recipe form. Use this when the user provides a URL to a recipe website.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "The URL to extract recipe data from. Must be a valid HTTP/HTTPS URL.",
          },
        },
        required: ["url"],
      },
    },
  };

export const extractRecipeFromImageFunction: OpenAI.Chat.Completions.ChatCompletionTool =
  {
    type: "function",
    function: {
      name: "extract_recipe_from_image",
      description:
        "Extract recipe data from image(s) provided by the user and populate the recipe form. Use this when the user uploads images containing recipes, recipe cards, cookbooks, or food photos with visible text.",
      parameters: {
        type: "object",
        properties: {
          analysis_focus: {
            type: "string",
            enum: [
              "recipe_text",
              "ingredients_list",
              "cooking_steps",
              "complete_recipe",
            ],
            description:
              "What to focus on when analyzing the image: recipe_text for recipe cards/books, ingredients_list for ingredient photos, cooking_steps for step-by-step images, complete_recipe for comprehensive analysis",
          },
          confidence_threshold: {
            type: "string",
            enum: ["low", "medium", "high"],
            description:
              "Confidence threshold for extraction - use low for unclear images, medium for typical photos, high for clear text",
          },
        },
        required: ["analysis_focus"],
      },
    },
  };

// Simple function handler for form updates only
export async function updateRecipeForm(
  args: Record<string, unknown>
): Promise<{ formUpdate: unknown; success: boolean }> {
  const {
    title,
    ingredients,
    servings,
    description,
    category,
    cuisine,
    diet_types,
    cooking_methods,
    dish_types,
    proteins,
    occasions,
    characteristics,
    season,
  } = args as {
    title?: string;
    ingredients?: Array<{
      name: string;
      amount?: number | null;
      unit?: string | null;
      notes?: string;
    }>;
    servings?: number;
    description?: string;
    category?: string;
    cuisine?: string;
    diet_types?: string[];
    cooking_methods?: string[];
    dish_types?: string[];
    proteins?: string[];
    occasions?: string[];
    characteristics?: string[];
    season?: string;
  };

  try {
    // Process ingredients - ensure they have all required fields
    const processedIngredients = ingredients
      ?.filter((ing) => ing.name?.trim())
      .map((ingredient, index) => {
        // Clean up amount - handle invalid values
        let cleanAmount: number | null = ingredient.amount ?? null;
        if (typeof cleanAmount === "string") {
          // Handle string amounts like "," or other invalid strings
          const trimmedAmount = (cleanAmount as string).trim();
          if (
            trimmedAmount === "" ||
            trimmedAmount === "," ||
            isNaN(Number(trimmedAmount))
          ) {
            cleanAmount = null;
          } else {
            cleanAmount = Number(trimmedAmount);
          }
        }

        // Clean up unit - handle empty strings
        let cleanUnit = ingredient.unit;
        if (typeof cleanUnit === "string" && cleanUnit.trim() === "") {
          cleanUnit = null;
        }

        return {
          id: `ingredient-${Date.now()}-${index}`,
          name: ingredient.name.trim(),
          amount: cleanAmount ?? null,
          unit: cleanUnit ?? null,
          notes: ingredient.notes ?? "",
        };
      });

    // Validate categorized tags if provided
    let validCuisine = cuisine;
    if (cuisine && !isValidCuisine(cuisine)) {
      console.warn(`Invalid cuisine filtered out: ${cuisine}`);
      validCuisine = undefined;
    }

    let validDietTypes = diet_types;
    if (diet_types) {
      const invalidDietTypes = diet_types.filter(
        (dietType) => !isValidDietType(dietType)
      );
      if (invalidDietTypes.length > 0) {
        console.warn(
          `Invalid diet types filtered out: ${invalidDietTypes.join(", ")}`
        );
      }
      validDietTypes = diet_types.filter((dietType) =>
        isValidDietType(dietType)
      );
    }

    let validCookingMethods = cooking_methods;
    if (cooking_methods) {
      const invalidCookingMethods = cooking_methods.filter(
        (method) => !isValidCookingMethod(method)
      );
      if (invalidCookingMethods.length > 0) {
        console.warn(
          `Invalid cooking methods filtered out: ${invalidCookingMethods.join(
            ", "
          )}`
        );
      }
      validCookingMethods = cooking_methods.filter((method) =>
        isValidCookingMethod(method)
      );
    }

    let validDishTypes = dish_types;
    if (dish_types) {
      const invalidDishTypes = dish_types.filter(
        (dishType) => !isValidDishType(dishType)
      );
      if (invalidDishTypes.length > 0) {
        console.warn(
          `Invalid dish types filtered out: ${invalidDishTypes.join(", ")}`
        );
      }
      validDishTypes = dish_types.filter((dishType) =>
        isValidDishType(dishType)
      );
    }

    let validProteins = proteins;
    if (proteins) {
      const invalidProteins = proteins.filter(
        (protein) => !isValidProteinType(protein)
      );
      if (invalidProteins.length > 0) {
        console.warn(
          `Invalid proteins filtered out: ${invalidProteins.join(", ")}`
        );
      }
      validProteins = proteins.filter((protein) => isValidProteinType(protein));
    }

    let validOccasions = occasions;
    if (occasions) {
      const invalidOccasions = occasions.filter(
        (occasion) => !isValidOccasionType(occasion)
      );
      if (invalidOccasions.length > 0) {
        console.warn(
          `Invalid occasions filtered out: ${invalidOccasions.join(", ")}`
        );
      }
      validOccasions = occasions.filter((occasion) =>
        isValidOccasionType(occasion)
      );
    }

    let validCharacteristics = characteristics;
    if (characteristics) {
      const invalidCharacteristics = characteristics.filter(
        (characteristic) => !isValidCharacteristicType(characteristic)
      );
      if (invalidCharacteristics.length > 0) {
        console.warn(
          `Invalid characteristics filtered out: ${invalidCharacteristics.join(
            ", "
          )}`
        );
      }
      validCharacteristics = characteristics.filter((characteristic) =>
        isValidCharacteristicType(characteristic)
      );
    }

    const formUpdate = {
      title,
      ingredients: processedIngredients,
      servings,
      description,
      category,
      cuisine: validCuisine,
      diet_types: validDietTypes,
      cooking_methods: validCookingMethods,
      dish_types: validDishTypes,
      proteins: validProteins,
      occasions: validOccasions,
      characteristics: validCharacteristics,
      season,
    };

    return {
      formUpdate,
      success: true,
    };
  } catch (error) {
    console.error("Error in updateRecipeForm:", error);
    throw new Error(
      `Failed to update recipe form: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Function handler for URL recipe extraction
export async function extractRecipeFromUrl(
  args: Record<string, unknown>
): Promise<{
  formUpdate: unknown;
  success: boolean;
  error?: string;
  suggestions?: string[];
  source?: string;
}> {
  const { url } = args as { url?: string };

  console.log("🔗 [Recipe Functions] extractRecipeFromUrl called", { args });

  if (!url || typeof url !== "string") {
    console.log("❌ [Recipe Functions] Invalid URL provided", { url });
    throw new Error("URL is required and must be a string");
  }

  try {
    // Validate URL format first
    const trimmedUrl = url.trim();
    console.log("🔍 [Recipe Functions] Validating URL", {
      original: url,
      trimmed: trimmedUrl,
    });

    if (!UrlDetector.isValidUrl(trimmedUrl)) {
      console.log("❌ [Recipe Functions] URL validation failed", {
        trimmedUrl,
      });
      return {
        formUpdate: null,
        success: false,
        error: "Invalid URL format",
      };
    }

    // Normalize URL to remove tracking parameters
    const normalizedUrl = UrlDetector.normalizeUrl(trimmedUrl);
    console.log("🔧 [Recipe Functions] URL normalized", {
      trimmed: trimmedUrl,
      normalized: normalizedUrl,
    });

    // Call the scraper directly (no HTTP request needed)
    console.log("🕷️ [Recipe Functions] Calling RecipeScraper.scrapeRecipe...");
    const scrapeResult = await RecipeScraper.scrapeRecipe(normalizedUrl);
    console.log("📊 [Recipe Functions] Scrape result received", {
      success: scrapeResult.success,
      source: scrapeResult.source,
      hasData: !!scrapeResult.data,
      error: scrapeResult.error,
      suggestions: scrapeResult.suggestions,
    });

    if (!scrapeResult.success) {
      console.log(
        "❌ [Recipe Functions] Scrape failed, checking for partial data",
        {
          hasPartialData: !!scrapeResult.data?.title,
          partialData: scrapeResult.data,
        }
      );

      // Check if we have partial data (like URL title) even on failure
      if (scrapeResult.data?.title) {
        const formUpdate = {
          title: scrapeResult.data.title,
          url: scrapeResult.data.url,
        };

        console.log("⚠️ [Recipe Functions] Returning partial data", {
          formUpdate,
        });

        return {
          formUpdate,
          success: false, // Still failed to scrape full recipe
          error: scrapeResult.error || "Failed to extract recipe from URL",
          suggestions: scrapeResult.suggestions,
          source: scrapeResult.source,
        };
      }

      console.log("❌ [Recipe Functions] No data extracted, returning error");

      return {
        formUpdate: null,
        success: false,
        error: scrapeResult.error || "Failed to extract recipe from URL",
        suggestions: scrapeResult.suggestions,
        source: scrapeResult.source,
      };
    }

    const scrapedData = scrapeResult.data;
    console.log("📝 [Recipe Functions] Scraped data details", {
      scrapedData,
      hasTitle: !!scrapedData?.title,
      hasIngredients: !!scrapedData?.ingredients,
      ingredientsCount: scrapedData?.ingredients?.length || 0,
      hasDescription: !!scrapedData?.description,
      descriptionLength: scrapedData?.description?.length || 0,
      servings: scrapedData?.servings,
      category: scrapedData?.category,
      cuisine: scrapedData?.cuisine,
    });

    if (!scrapedData) {
      console.log("❌ [Recipe Functions] No scraped data available");
      return {
        formUpdate: null,
        success: false,
        error: "No recipe data extracted from URL",
      };
    }

    // Convert scraped data to recipe form format
    console.log(
      "🔄 [Recipe Functions] Converting scraped data to form format..."
    );

    // Process ingredients with detailed logging
    // Using the RecipeIngredient shape but without enforcing all required fields from the full recipe domain
    interface ScrapedIngredientPartial {
      id: string;
      name: string;
      amount: number | null;
      unit: string | null;
      notes: string;
    }

    let processedIngredients: ScrapedIngredientPartial[] = [];
    if (scrapedData.ingredients) {
      console.log("🥕 [Recipe Functions] Processing ingredients", {
        rawIngredients: scrapedData.ingredients,
        count: scrapedData.ingredients.length,
      });

      processedIngredients = scrapedData.ingredients.map(
        (ingredient: string, index: number) => {
          console.log(
            `🔍 [Recipe Functions] Processing ingredient ${
              index + 1
            }: "${ingredient}"`
          );

          // Simple parsing - try to extract amount, unit, and name
          const match = ingredient
            .trim()
            .match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);

          if (match) {
            const [, amountStr, unit, name] = match;
            console.log(
              `✅ [Recipe Functions] Ingredient ${index + 1} matched pattern`,
              { amountStr, unit, name }
            );

            let amount: number | null = null;

            // Parse fraction or decimal
            if (amountStr.includes("/")) {
              const [numerator, denominator] = amountStr.split("/");
              amount = parseFloat(numerator) / parseFloat(denominator);
              console.log(
                `🔢 [Recipe Functions] Parsed fraction ${amountStr} = ${amount}`
              );
            } else {
              amount = parseFloat(amountStr);
              console.log(
                `🔢 [Recipe Functions] Parsed decimal ${amountStr} = ${amount}`
              );
            }

            const processed = {
              id: `ingredient-scraped-${Date.now()}-${index}`,
              name: name.trim(),
              amount: isNaN(amount) ? null : amount,
              unit: unit && unit.length > 0 ? unit.toLowerCase() : null,
              notes: "",
            };

            console.log(
              `📝 [Recipe Functions] Ingredient ${index + 1} processed:`,
              processed
            );
            return processed;
          }

          console.log(
            `⚠️ [Recipe Functions] Ingredient ${
              index + 1
            } no pattern match, using as name only`
          );

          // If no pattern matches, treat entire string as ingredient name
          const processed = {
            id: `ingredient-scraped-${Date.now()}-${index}`,
            name: ingredient.trim(),
            amount: null,
            unit: null,
            notes: "",
          };

          console.log(
            `📝 [Recipe Functions] Ingredient ${
              index + 1
            } processed (name only):`,
            processed
          );
          return processed;
        }
      );

      console.log("✅ [Recipe Functions] All ingredients processed", {
        originalCount: scrapedData.ingredients.length,
        processedCount: processedIngredients.length,
        processedIngredients,
      });
    } else {
      console.log("⚠️ [Recipe Functions] No ingredients found in scraped data");
    }

    const formUpdate = {
      title: scrapedData.title,
      description: scrapedData.description,
      servings: scrapedData.servings || 4,
      category: scrapedData.category,
      cuisine: scrapedData.cuisine,
      ingredients: processedIngredients,
    };

    console.log("📋 [Recipe Functions] Final form update created", {
      formUpdate,
    });

    console.log("✅ [Recipe Functions] Successfully extracted recipe from URL");

    return {
      formUpdate,
      success: true,
    };
  } catch (error) {
    console.error(
      "🔴 [Recipe Functions] Error in extractRecipeFromUrl:",
      error
    );
    console.error("🔴 [Recipe Functions] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      url,
    });

    return {
      formUpdate: null,
      success: false,
      error: `Failed to extract recipe from URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Helper function to format function results for OpenAI
export function formatFunctionResult(
  functionName: string,
  result: unknown
): string {
  if (functionName === "update_recipe_form") {
    const formResult = result as { formUpdate: unknown; success: boolean };
    return JSON.stringify({
      function: "update_recipe_form",
      result: formResult,
    });
  }

  if (functionName === "extract_recipe_from_url") {
    const urlResult = result as {
      formUpdate: unknown;
      success: boolean;
      error?: string;
    };
    return JSON.stringify({
      function: "extract_recipe_from_url",
      result: urlResult,
    });
  }

  if (functionName === "extract_recipe_from_image") {
    const imageResult = result as {
      formUpdate: unknown;
      success: boolean;
      error?: string;
    };
    return JSON.stringify({
      function: "extract_recipe_from_image",
      result: imageResult,
    });
  }

  return JSON.stringify({ function: functionName, result });
}

// Extract recipe data from images using OpenAI Vision API
export async function extractRecipeFromImage(
  args: Record<string, unknown>
): Promise<{ formUpdate: unknown; success: boolean; error?: string }> {
  try {
    const {
      analysis_focus = "complete_recipe",
      confidence_threshold = "medium",
    } = args;

    console.log(
      "🖼️ [Recipe Functions] Extracting recipe from image with focus:",
      analysis_focus,
      "confidence:",
      confidence_threshold
    );

    // Note: The actual image processing happens in the conversation builder
    // where images are included in the OpenAI API call. This function mainly
    // serves as a signal to the AI about what type of analysis to perform.

    // Since images are processed by OpenAI Vision in the main chat completion,
    // we return a success indicator that tells the function processor
    // to expect recipe data in the AI's response
    return {
      formUpdate: null, // Will be populated by AI response
      success: true,
      processing: true, // Special flag indicating this is an image processing request
    } as { formUpdate: unknown; success: boolean; error?: string };
  } catch (error) {
    console.error("Error in extractRecipeFromImage:", error);
    return {
      formUpdate: null,
      success: false,
      error: `Failed to process image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
