import {
  createChatCompletion,
  type OpenAIUsageData,
} from "@/lib/openai-service";
import {
  RecipeInput,
  RecipeNutrition,
  RecipeNutritionValues,
} from "@/types/recipe";

type NutritionCacheKey = string;

export interface NutritionCacheProvider {
  get(key: NutritionCacheKey): Promise<RecipeNutrition | null>;
  set(key: NutritionCacheKey, value: RecipeNutrition): Promise<void>;
}

class NoopNutritionCache implements NutritionCacheProvider {
  async get(): Promise<RecipeNutrition | null> {
    return null;
  }

  async set(): Promise<void> {
    // no-op
  }
}

export interface NutritionFetchOptions {
  recipe: Pick<
    RecipeInput,
    "title" | "servings" | "ingredients" | "nutrition"
  >;
  locale?: string;
  cacheKey?: string;
  forceRefresh?: boolean;
}

interface ChatGPTNutritionPayload {
  perPortion: Record<string, unknown>;
  meta?: {
    confidence?: number;
    warnings?: string[];
    notes?: string;
  };
}

export const DEFAULT_CACHE = new NoopNutritionCache();

type NutritionNumericKey = keyof RecipeNutritionValues;

const REQUIRED_FIELDS: NutritionNumericKey[] = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "saturatedFat",
  "fiber",
  "sugars",
  "sodium",
];

const OPTIONAL_FIELDS: NutritionNumericKey[] = ["cholesterol"];

function normalizeIngredientForPrompt(
  ingredient: RecipeInput["ingredients"][number]
): string {
  const amount =
    typeof ingredient.amount === "number"
      ? ingredient.amount
      : ingredient.amount === 0
      ? ""
      : "";
  const unit = ingredient.unit ? ` ${ingredient.unit}` : "";
  const notes = ingredient.notes ? ` (${ingredient.notes})` : "";
  return `${ingredient.name}${amount ? `: ${amount}${unit}` : ""}${notes}`;
}

function getLocaleInstruction(locale?: string): string {
  switch (locale) {
    case "nl":
      return [
        "All human-readable text values (like meta.warnings[] and meta.notes) must be written in Dutch.",
        "The JSON keys themselves must remain exactly as specified in the schema.",
      ].join(" ");
    case "en":
    default:
      return [
        "All human-readable text values (like meta.warnings[] and meta.notes) must be written in English.",
        "Keep JSON keys exactly as specified in the schema.",
      ].join(" ");
  }
}

function buildPrompt(options: NutritionFetchOptions): string {
  const { recipe } = options;
  const ingredientsList = recipe.ingredients
    .map((ingredient) => `- ${normalizeIngredientForPrompt(ingredient)}`)
    .join("\n");

  const localeInstruction = getLocaleInstruction(options.locale);

  return [
    `Estimate per-portion nutrition for the following recipe with ${recipe.servings} servings.`,
    `Recipe title: ${recipe.title}`,
    `Ingredients:\n${ingredientsList}`,
    localeInstruction,
    `Output requirements:`,
    `- Respond with a single JSON object.`,
    `- Schema:`,
    `  {`,
    `    "perPortion": { ${REQUIRED_FIELDS.join(": number, ")}: number, "cholesterol": number? },`,
    `    "meta": {`,
    `      "confidence": number (0-1)?,`,
    `      "warnings": string[]?,`,
    `      "notes": string?`,
    `    }`,
    `  }`,
    `- Use kilocalories for calories and grams for macronutrients.`,
    `- Include sodium in milligrams and cholesterol (if provided) in milligrams.`,
    `- Provide only per-portion values (one serving).`,
    `- Do not wrap the JSON in code fences or add commentary.`,
  ].join("\n");
}

function extractJsonPayload(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    const withoutTicks = trimmed.replace(/```json|```/g, "").trim();
    return withoutTicks;
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Response did not include JSON payload");
  }
  return trimmed.slice(firstBrace, lastBrace + 1);
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}
function buildNutritionValues(
  payload: Record<string, unknown>
): RecipeNutritionValues {
  const result: Partial<RecipeNutritionValues> = {};

  [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach((field) => {
    const value = coerceNumber(payload[field]);
    if (value !== null) {
      result[field] = value;
    }
  });

  REQUIRED_FIELDS.forEach((field) => {
    if (typeof result[field] === "undefined") {
      result[field] = 0;
    }
  });

  return result as RecipeNutritionValues;
}

export function buildCacheKey(recipe: NutritionFetchOptions["recipe"]): string {
  const sortedIngredients = [...recipe.ingredients]
    .map((ing) => ({
      name: ing.name.trim().toLowerCase(),
      amount: ing.amount ?? 0,
      unit: ing.unit?.trim().toLowerCase() ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return JSON.stringify({
    title: recipe.title.trim().toLowerCase(),
    servings: recipe.servings,
    ingredients: sortedIngredients,
  });
}

export class NutritionService {
  private cache: NutritionCacheProvider;

  constructor(cacheProvider: NutritionCacheProvider = DEFAULT_CACHE) {
    this.cache = cacheProvider;
  }

  async fetchWithChatGPT(
    options: NutritionFetchOptions
  ): Promise<{
    nutrition: RecipeNutrition;
    cacheHit: boolean;
    usage?: OpenAIUsageData;
  }> {
    const cacheKey = options.cacheKey || buildCacheKey(options.recipe);

    if (!options.forceRefresh) {
      const existingNutrition = options.recipe.nutrition;
      if (
        existingNutrition &&
        existingNutrition.meta?.cacheKey &&
        existingNutrition.meta.cacheKey === cacheKey
      ) {
        return { nutrition: existingNutrition, cacheHit: true };
      }
    }

    if (!options.forceRefresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { nutrition: cached, cacheHit: true };
      }
    }

    const systemPrompt =
      "You are a meticulous nutrition analyst. Your task is to estimate nutritional values for recipes and respond strictly in JSON.";
    const userPrompt = buildPrompt(options);

    const { completion, usage } = await createChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from nutrition model");
    }

    const payloadText = extractJsonPayload(content);
    let parsed: ChatGPTNutritionPayload;
    try {
      parsed = JSON.parse(payloadText) as ChatGPTNutritionPayload;
    } catch (error) {
      throw new Error(
        `Failed to parse nutrition response: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    if (!parsed.perPortion) {
      throw new Error("Nutrition response is missing perPortion values");
    }

    const nutrition: RecipeNutrition = {
      perPortion: buildNutritionValues(parsed.perPortion),
      meta: {
        source: "ai",
        fetchedAt: new Date().toISOString(),
        model: usage?.model,
        confidence:
          typeof parsed.meta?.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.meta.confidence))
            : undefined,
        warnings: Array.isArray(parsed.meta?.warnings)
          ? parsed.meta?.warnings
          : undefined,
        notes:
          typeof parsed.meta?.notes === "string"
            ? parsed.meta?.notes
            : undefined,
        cacheKey,
        servingsSnapshot: options.recipe.servings,
      },
    };

    await this.cache.set(cacheKey, nutrition);

    return { nutrition, cacheHit: false, usage };
  }
}
