import type { RecipeNutrition } from "@/types/recipe";
import { NutritionService, buildCacheKey } from "@/lib/nutrition-service";

jest.mock("@/lib/openai-service", () => ({
  createChatCompletion: jest.fn(),
}));

const mockCreateChatCompletion = jest.requireMock("@/lib/openai-service")
  .createChatCompletion as jest.Mock;

const baseRecipe = {
  title: "Test Recipe",
  servings: 4,
  ingredients: [
    { id: "1", name: "Ingredient A", amount: 200, unit: "g" },
    { id: "2", name: "Ingredient B", amount: 100, unit: "ml" },
  ],
};

describe("NutritionService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("parses AI nutrition response into RecipeNutrition structure", async () => {
    const payload = {
      totals: {
        calories: 1600,
        protein: 80,
        carbohydrates: 120,
        fat: 60,
        saturatedFat: 20,
        fiber: 15,
        sugars: 30,
        sodium: 1200,
        cholesterol: 50,
      },
      perPortion: {
        calories: 400,
        protein: 20,
        carbohydrates: 30,
        fat: 15,
        saturatedFat: 5,
        fiber: 3.75,
        sugars: 7.5,
        sodium: 300,
      },
      meta: {
        confidence: 0.82,
        warnings: ["Estimated values based on similar dishes"],
        notes: "Sodium assumes salted broth.",
        extras: [
          {
            key: "vitaminC",
            label: "Vitamin C",
            unit: "mg",
            total: 40,
            perPortion: 10,
          },
        ],
      },
    };

    mockCreateChatCompletion.mockResolvedValue({
      completion: {
        choices: [{ message: { content: JSON.stringify(payload) } }],
      },
      usage: {
        model: "gpt-4.1-mini",
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
    });

    const service = new NutritionService();
    const result = await service.fetchWithChatGPT({ recipe: baseRecipe });
    const nutrition = result.nutrition;

    expect(nutrition.meta.source).toBe("ai");
    expect(nutrition.meta.model).toBe("gpt-4.1-mini");
    expect(nutrition.meta.confidence).toBeCloseTo(0.82);
    expect(typeof nutrition.meta.cacheKey).toBe("string");
    expect(nutrition.meta.cacheKey?.length ?? 0).toBeGreaterThan(0);
    expect(nutrition.totals.calories).toBe(1600);
    expect(nutrition.perPortion.calories).toBe(400);
    expect(nutrition.totals.cholesterol).toBe(50);
    expect(nutrition.totals.extras).toEqual([
      { key: "vitaminC", label: "Vitamin C", unit: "mg", value: 40 },
    ]);
    expect(nutrition.perPortion.extras).toEqual([
      { key: "vitaminC", label: "Vitamin C", unit: "mg", value: 10 },
    ]);
  });

  it("returns cached nutrition data when available", async () => {
    const cacheStore = new Map<string, RecipeNutrition>();
    const cache = {
      async get(key: string) {
        return cacheStore.get(key) ?? null;
      },
      async set(key: string, value: RecipeNutrition) {
        cacheStore.set(key, value);
      },
    };

    const payload = {
      totals: {
        calories: 800,
        protein: 40,
        carbohydrates: 60,
        fat: 30,
        saturatedFat: 10,
        fiber: 8,
        sugars: 15,
        sodium: 600,
      },
      perPortion: {
        calories: 200,
        protein: 10,
        carbohydrates: 15,
        fat: 7.5,
        saturatedFat: 2.5,
        fiber: 2,
        sugars: 3.75,
        sodium: 150,
      },
      meta: {},
    };

    mockCreateChatCompletion.mockResolvedValue({
      completion: {
        choices: [{ message: { content: JSON.stringify(payload) } }],
      },
      usage: {
        model: "gpt-4.1-mini",
        promptTokens: 50,
        completionTokens: 150,
        totalTokens: 200,
      },
    });

    const service = new NutritionService(cache);

    const firstCall = await service.fetchWithChatGPT({ recipe: baseRecipe });
    expect(mockCreateChatCompletion).toHaveBeenCalledTimes(1);
    expect(cacheStore.size).toBe(1);
    expect(firstCall.cacheHit).toBe(false);
    expect(firstCall.nutrition.meta.cacheKey).toBeDefined();

    mockCreateChatCompletion.mockClear();
    const secondCall = await service.fetchWithChatGPT({ recipe: baseRecipe });
    expect(mockCreateChatCompletion).not.toHaveBeenCalled();
    expect(secondCall.cacheHit).toBe(true);
    expect(secondCall.nutrition).toEqual(firstCall.nutrition);
  });

  it("reuses recipe nutrition when cache key matches and forceRefresh is false", async () => {
    const cacheKey = buildCacheKey({ ...baseRecipe, nutrition: null });
    const existingNutrition: RecipeNutrition = {
      totals: {
        calories: 800,
        protein: 40,
        carbohydrates: 120,
        fat: 25,
        saturatedFat: 9,
        fiber: 12,
        sugars: 20,
        sodium: 700,
      },
      perPortion: {
        calories: 200,
        protein: 10,
        carbohydrates: 30,
        fat: 6.25,
        saturatedFat: 2.25,
        fiber: 3,
        sugars: 5,
        sodium: 175,
      },
      meta: {
        source: "ai",
        fetchedAt: new Date().toISOString(),
        cacheKey,
      },
    };

    const service = new NutritionService();
    const result = await service.fetchWithChatGPT({
      recipe: {
        ...baseRecipe,
        nutrition: existingNutrition,
      },
    });

    expect(mockCreateChatCompletion).not.toHaveBeenCalled();
    expect(result.cacheHit).toBe(true);
    expect(result.nutrition).toBe(existingNutrition);
    expect(result.usage).toBeUndefined();
  });
});
