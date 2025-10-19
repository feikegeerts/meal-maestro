import { AdviceChatService } from "../advice-chat-service";
import { createChatCompletion } from "../openai-service";
import { usageTrackingService } from "../usage-tracking-service";
import { usageLimitService } from "../usage-limit-service";

jest.mock("../openai-service", () => ({
  createChatCompletion: jest.fn(),
}));

jest.mock("../usage-tracking-service", () => ({
  usageTrackingService: {
    logUsage: jest.fn(),
  },
}));

jest.mock("../usage-limit-service", () => ({
  usageLimitService: {
    assertWithinMonthlyLimit: jest.fn(),
  },
  MonthlySpendLimitError: class MockMonthlySpendLimitError extends Error {},
}));

jest.mock("../chat-response-formatter", () => ({
  ChatResponseFormatter: jest.fn().mockImplementation(() => ({
    formatResponse: jest.fn(async (responseContent: string | null) => ({
      response: responseContent ?? "",
      conversation_history: [],
      function_call: null,
    })),
    formatErrorResponse: jest.fn(async () => ({
      error: "",
      status: 500,
    })),
  })),
}));

describe("AdviceChatService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usageLimitService.assertWithinMonthlyLimit as jest.Mock).mockResolvedValue(undefined);
    (usageTrackingService.logUsage as jest.Mock).mockResolvedValue({
      success: true,
      limitReached: false,
    });
    (createChatCompletion as jest.Mock).mockResolvedValue({
      completion: {
        choices: [
          {
            message: {
              content: "Here is a suggestion",
            },
          },
        ],
      },
      usage: { total_tokens: 10, prompt_tokens: 6, completion_tokens: 4 },
    });
  });

  it("injects comprehensive recipe guardrails when drafting new recipes", async () => {
    const service = new AdviceChatService("user-1", "en");
    await service.processMessage({
      message: "Invent something new",
      context: {
        season: "spring",
        candidates: [
          {
            id: "recipe-1",
            title: "Spring Pasta",
            category: "main-course",
            cuisine: "italian",
            season: "spring",
            diet_types: ["vegetarian"],
            dish_types: ["pasta"],
            proteins: [],
            characteristics: [],
            last_eaten: null,
          },
        ],
      },
    });

    expect(createChatCompletion).toHaveBeenCalledTimes(1);
    const callArgs = (createChatCompletion as jest.Mock).mock.calls[0];
    expect(callArgs).toBeDefined();

    const [messages] = callArgs;
    expect(Array.isArray(messages)).toBe(true);
    const systemMessage = messages[0];
    expect(systemMessage.role).toBe("system");
    const content = String(systemMessage.content);

    expect(content).toContain("create_new_recipe_suggestion");
  	expect(content).toContain("IMPORTANT INGREDIENT ORDERING");
  	expect(content).toContain("DESCRIPTION: Write detailed step-by-step cooking instructions");
    expect(content).toContain("User prefers traditional metric units");
  });

  it("incorporates user unit preferences and custom units when available", async () => {
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { unit_system_preference: "us-traditional" }, error: null }),
    };

    const customUnitsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest
        .fn()
        .mockResolvedValue({
          data: [{ unit_name: "pak" }, { unit_name: "jar" }, { unit_name: null }],
          error: null,
        }),
    };

    const supabaseStub = {
      from: jest.fn((table: string) => {
        if (table === "user_profiles") return profileChain;
        if (table === "custom_units") return customUnitsChain;
        throw new Error(`Unexpected table requested: ${table}`);
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const service = new AdviceChatService("user-1", "en", supabaseStub);
    await service.processMessage({ message: "Suggest something new" });

    expect(createChatCompletion).toHaveBeenCalledTimes(1);
    const [messages] = (createChatCompletion as jest.Mock).mock.calls[0];
    const systemMessage = messages[0];
    const content = String(systemMessage.content);

    expect(content).toContain("User prefers US traditional units");
    expect(content).toContain("User-defined ingredient units available: pak, jar");
  });
});
