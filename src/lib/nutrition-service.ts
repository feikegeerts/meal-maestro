import {
  createChatCompletion,
  type OpenAIUsageData,
} from "@/lib/openai-service";
import {
  RecipeInput,
  RecipeNutrition,
  RecipeNutritionValues,
  RecipeNutritionExtra,
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
  totals: Record<string, unknown>;
  perPortion: Record<string, unknown>;
  meta?: {
    confidence?: number;
    warnings?: string[];
    notes?: string;
    extras?: ChatGPTNutritionExtras;
  };
}

type ChatGPTNutritionExtras = Array<{
  key: string;
  label?: string;
  unit: string;
  total: number;
  perPortion: number;
}>;

export const DEFAULT_CACHE = new NoopNutritionCache();

type NutritionNumericKey = Exclude<keyof RecipeNutritionValues, "extras">;

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
        "All human-readable text values (like extras.label, meta.warnings[], meta.notes) must be written in Dutch.",
        "The JSON keys themselves must remain exactly as specified in the schema.",
      ].join(" ");
    case "en":
    default:
      return [
        "All human-readable text values (like extras.label, meta.warnings[], meta.notes) must be written in English.",
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
    `Estimate nutrition for the following recipe with ${recipe.servings} servings.`,
    `Provide totals for the entire recipe and per portion (one serving).`,
    `Recipe title: ${recipe.title}`,
    `Ingredients:\n${ingredientsList}`,
    localeInstruction,
    `Output requirements:`,
    `- Respond with a single JSON object.`,
    `- Schema:`,
    `  {`,
    `    "totals": { ${REQUIRED_FIELDS.join(": number, ")}: number, "cholesterol": number?, "extras": [{ "key": string, "label": string?, "unit": string, "value": number }]? },`,
    `    "perPortion": { same fields as totals },`,
    `    "meta": {`,
    `      "confidence": number (0-1)?,`,
    `      "warnings": string[]?,`,
    `      "notes": string?,`,
    `      "extras": [{ "key": string, "label": string?, "unit": string, "total": number, "perPortion": number }]?`,
    `    }`,
    `  }`,
    `- Use kilocalories for calories and grams for macronutrients.`,
    `- Include sodium in milligrams and cholesterol (if provided) in milligrams.`,
    `- Per portion values should align with totals / servings.`,
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

function mapExtras(
  extras: ChatGPTNutritionExtras | undefined,
  target: "totals" | "perPortion"
): RecipeNutritionExtra[] | undefined {
  if (!extras?.length) return undefined;

  const mapped: RecipeNutritionExtra[] = [];

  extras.forEach((extra) => {
    const value = target === "totals" ? extra.total : extra.perPortion;
    const normalizedValue = coerceNumber(value);
    if (!extra.key || normalizedValue === null || !extra.unit) {
      return;
    }
    mapped.push({
      key: extra.key,
      label: extra.label,
      unit: extra.unit,
      value: normalizedValue,
    });
  });

  return mapped.length ? mapped : undefined;
}

function buildNutritionValues(
  payload: Record<string, unknown>,
  extras?: RecipeNutritionExtra[]
): RecipeNutritionValues {
  const result: Partial<RecipeNutritionValues> = {};

  [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach((field) => {
    const value = coerceNumber(payload[field]);
    if (value !== null) {
      result[field] = value;
    }
  });

  if (extras?.length) {
    result.extras = extras;
  }

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

    if (!parsed.totals || !parsed.perPortion) {
      throw new Error("Nutrition response is missing totals or perPortion");
    }

    const totalsExtras = mapExtras(parsed.meta?.extras, "totals");
    const perPortionExtras = mapExtras(parsed.meta?.extras, "perPortion");

    const nutrition: RecipeNutrition = {
      totals: buildNutritionValues(parsed.totals, totalsExtras),
      perPortion: buildNutritionValues(parsed.perPortion, perPortionExtras),
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
      },
    };

    await this.cache.set(cacheKey, nutrition);

    return { nutrition, cacheHit: false, usage };
  }
}
