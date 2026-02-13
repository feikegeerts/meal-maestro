// ---------------------------------------------------------------------------
// Mock @/db — must be self-contained (jest.mock is hoisted before const)
// ---------------------------------------------------------------------------
jest.mock("@/db", () => {
  // Each query chain stores its own resolved value
  const profileChain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  };

  const customUnitsChain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue([]),
  };

  // select() returns a builder whose from() switches on the table reference
  const selectFn = jest.fn().mockImplementation(() => {
    // Return a proxy that delegates to the right chain via from()
    const proxy = {
      from: jest.fn().mockImplementation((table: unknown) => {
        // Store which table was requested for assertion purposes
        (proxy as Record<string, unknown>).__lastTable = table;
        // The schema objects are imported by the production code. We match by
        // checking the table's symbol property injected by drizzle — but since
        // we are in a mock context we just use call order.  The first select()
        // is for profiles, the second for custom units.
        // However, since we need robust matching, we'll use a flag.
        const callIdx = selectFn.mock.calls.length; // already incremented
        if (callIdx <= 1) {
          // First call: profile
          profileChain.where.mockReturnValue(profileChain);
          return profileChain;
        }
        // Second call: custom units
        customUnitsChain.where.mockReturnValue(customUnitsChain);
        return customUnitsChain;
      }),
    };
    return proxy;
  });

  return {
    db: {
      select: selectFn,
      __profileChain: profileChain,
      __customUnitsChain: customUnitsChain,
    },
  };
});

// ---------------------------------------------------------------------------
// Other module mocks (unchanged from original, except supabase removed)
// ---------------------------------------------------------------------------

const buildMessagesMock = jest.fn();
const updateConversationHistoryMock = jest.fn();
const processFunctionCallMock = jest.fn();
const formatResponseMock = jest.fn();
const logUsageMock = jest.fn();
const assertWithinMonthlyLimitMock = jest.fn();
const getAvailableFunctionsMock = jest.fn();
const createChatCompletionMock = jest.fn();

jest.mock("../conversation-builder", () => {
  const actual = jest.requireActual("../conversation-builder");
  return {
    ...actual,
    ConversationBuilder: jest.fn(),
  };
});

jest.mock("../function-call-processor", () => {
  const actual = jest.requireActual("../function-call-processor");
  const mockClass = jest.fn();
  Object.defineProperty(mockClass, "getAvailableFunctions", {
    value: jest.fn(),
    writable: true,
  });
  return {
    ...actual,
    FunctionCallProcessor: mockClass,
  };
});

jest.mock("../chat-response-formatter", () => {
  const actual = jest.requireActual("../chat-response-formatter");
  return {
    ...actual,
    ChatResponseFormatter: jest.fn(),
  };
});

jest.mock("../usage-tracking-service", () => ({
  usageTrackingService: {
    logUsage: jest.fn(),
  },
}));

jest.mock("@/lib/email/services/email-delivery-service", () => ({
  EmailDeliveryService: jest.fn(() => ({
    sendEmail: jest.fn(),
  })),
}));

jest.mock("../usage-limit-service", () => {
  const actual = jest.requireActual("../usage-limit-service");
  return {
    ...actual,
    usageLimitService: {
      assertWithinMonthlyLimit: jest.fn(),
    },
  };
});

jest.mock("../openai-service", () => ({
  createChatCompletion: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after all mocks are declared)
// ---------------------------------------------------------------------------

import type { ChatMessage } from "../conversation-builder";
import type { ChatResponse } from "../chat-response-formatter";
import { RecipeChatService } from "../recipe-chat-service";
import { ConversationBuilder } from "../conversation-builder";
import { FunctionCallProcessor } from "../function-call-processor";
import { ChatResponseFormatter } from "../chat-response-formatter";
import { usageTrackingService } from "../usage-tracking-service";
import {
  usageLimitService,
  MonthlySpendLimitError,
} from "../usage-limit-service";
import { createChatCompletion } from "../openai-service";

jest.useFakeTimers();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BuilderMocks = {
  buildMessages: jest.Mock;
  updateConversationHistory: jest.Mock;
};

type ProcessorMocks = {
  processFunctionCall: jest.Mock;
};

type FormatterMocks = {
  formatResponse: jest.Mock;
};

interface DbMockChains {
  profileChain: {
    from: jest.Mock;
    where: jest.Mock;
    limit: jest.Mock;
  };
  customUnitsChain: {
    from: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
  };
  selectFn: jest.Mock;
}

function getDbMocks(): DbMockChains {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("@/db") as {
    db: {
      select: jest.Mock;
      __profileChain: DbMockChains["profileChain"];
      __customUnitsChain: DbMockChains["customUnitsChain"];
    };
  };
  return {
    profileChain: db.__profileChain,
    customUnitsChain: db.__customUnitsChain,
    selectFn: db.select,
  };
}

interface DrizzleStubOptions {
  unitSystemPreference?: string | null;
  profileError?: Error | null;
  customUnits?: Array<{ unitName: string | null }>;
  customUnitsError?: Error | null;
}

function setupDrizzleStub(options: DrizzleStubOptions = {}) {
  const { profileChain, customUnitsChain, selectFn } = getDbMocks();

  // Reset call count so from() call-order logic works
  selectFn.mockClear();

  // Profile query
  if (options.profileError) {
    profileChain.limit.mockRejectedValue(options.profileError);
  } else {
    const profile = options.unitSystemPreference
      ? [{ unitSystemPreference: options.unitSystemPreference }]
      : [];
    profileChain.limit.mockResolvedValue(profile);
  }

  // Custom units query
  if (options.customUnitsError) {
    customUnitsChain.orderBy.mockRejectedValue(options.customUnitsError);
  } else {
    const units = options.customUnits ?? [];
    customUnitsChain.orderBy.mockResolvedValue(units);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecipeChatService", () => {
  const ConversationBuilderMock =
    ConversationBuilder as unknown as jest.MockedClass<
      typeof ConversationBuilder
    >;
  const FunctionCallProcessorMock =
    FunctionCallProcessor as unknown as jest.MockedClass<
      typeof FunctionCallProcessor
    >;
  const ChatResponseFormatterMock =
    ChatResponseFormatter as unknown as jest.MockedClass<
      typeof ChatResponseFormatter
    >;
  const createChatCompletionTypedMock =
    createChatCompletion as jest.MockedFunction<typeof createChatCompletion>;
  const logUsageTypedMock = usageTrackingService.logUsage as jest.MockedFunction<
    typeof usageTrackingService.logUsage
  >;
  const assertWithinMonthlyLimitTypedMock =
    usageLimitService.assertWithinMonthlyLimit as jest.MockedFunction<
      typeof usageLimitService.assertWithinMonthlyLimit
    >;

  let builderMocks: BuilderMocks;
  let processorMocks: ProcessorMocks;
  let formatterMocks: FormatterMocks;

  beforeEach(() => {
    jest.clearAllMocks();

    buildMessagesMock.mockReset();
    updateConversationHistoryMock.mockReset();
    processFunctionCallMock.mockReset();
    formatResponseMock.mockReset();
    logUsageMock.mockReset();
    assertWithinMonthlyLimitMock.mockReset();
    getAvailableFunctionsMock.mockReset();
    createChatCompletionMock.mockReset();

    builderMocks = {
      buildMessages: buildMessagesMock,
      updateConversationHistory: updateConversationHistoryMock,
    };
    ConversationBuilderMock.mockImplementation(
      () => builderMocks as unknown as ConversationBuilder
    );

    processorMocks = {
      processFunctionCall: processFunctionCallMock,
    };
    FunctionCallProcessorMock.mockImplementation(
      () => processorMocks as unknown as FunctionCallProcessor
    );
    FunctionCallProcessorMock.getAvailableFunctions = getAvailableFunctionsMock;

    formatterMocks = {
      formatResponse: formatResponseMock,
    };
    ChatResponseFormatterMock.mockImplementation(
      () => formatterMocks as unknown as ChatResponseFormatter
    );

    createChatCompletionTypedMock.mockImplementation((...args) =>
      createChatCompletionMock(...args)
    );
    logUsageTypedMock.mockImplementation((...args) => logUsageMock(...args));
    assertWithinMonthlyLimitTypedMock.mockImplementation((...args) =>
      assertWithinMonthlyLimitMock(...args)
    );

    assertWithinMonthlyLimitMock.mockResolvedValue(undefined);
    getAvailableFunctionsMock.mockReturnValue([]);

    // Default db mock: no profile, no custom units
    setupDrizzleStub();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("processes a standard chat message and returns formatted response", async () => {
    const chatMessages = [
      { role: "user", content: "Hello" },
    ] as ChatMessage[];
    const updatedHistory = [
      { role: "assistant", content: "History" },
    ] as ChatMessage[];

    builderMocks.buildMessages.mockReturnValue(chatMessages);
    builderMocks.updateConversationHistory.mockReturnValue(updatedHistory);

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: "Assistant reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });

    logUsageMock.mockResolvedValueOnce({ success: true, limitReached: false });

    const formattedResponse: ChatResponse = {
      response: "Formatted response",
      conversation_history: updatedHistory,
      function_call: null,
    };
    formatterMocks.formatResponse.mockResolvedValueOnce(formattedResponse);

    const service = new RecipeChatService("user-123", "en");

    const result = await service.processMessage({ message: "Hello there" });

    expect(ConversationBuilder).toHaveBeenCalledWith(
      "en",
      "traditional-metric",
      []
    );
    expect(FunctionCallProcessor).toHaveBeenCalledWith(
      "en",
      "traditional-metric",
      [],
      expect.any(Function)
    );
    expect(getAvailableFunctionsMock).toHaveBeenCalledWith(
      "traditional-metric",
      []
    );
    expect(createChatCompletionMock).toHaveBeenCalledTimes(1);
    expect(logUsageMock).toHaveBeenCalledWith("user-123", "/api/recipes/chat", {
      model: "gpt-test",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
    expect(formatterMocks.formatResponse).toHaveBeenCalledWith(
      "Assistant reply",
      updatedHistory,
      null
    );
    expect(result).toEqual(formattedResponse);
  });

  it("throws when neither message nor images are provided", async () => {
    const service = new RecipeChatService("user-123");

    await expect(service.processMessage({ message: "   " })).rejects.toThrow(
      "Message or images are required"
    );

    expect(builderMocks.buildMessages).not.toHaveBeenCalled();
    expect(createChatCompletionMock).not.toHaveBeenCalled();
  });

  it("performs a follow-up completion when initial response only returns a function call", async () => {
    const chatMessages = [
      { role: "user", content: "Scrape recipe" },
    ] as ChatMessage[];
    const updatedHistory = [
      { role: "assistant", content: "History" },
    ] as ChatMessage[];

    builderMocks.buildMessages.mockReturnValue(chatMessages);
    builderMocks.updateConversationHistory.mockReturnValue(updatedHistory);
    getAvailableFunctionsMock.mockReturnValue(["tool"]);

    const toolCall = {
      id: "tool-1",
      type: "function",
      function: { name: "update_recipe_form", arguments: "{}" },
    };

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: null, tool_calls: [toolCall] } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
      },
    });

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: "Follow-up reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
    });

    logUsageMock.mockResolvedValueOnce({ success: true, limitReached: false });

    processorMocks.processFunctionCall.mockResolvedValueOnce({
      functionResult: {
        function: "update_recipe_form",
        result: { title: "Filled" },
      },
      responseContent: "Function result response",
    });

    const formattedResponse: ChatResponse = {
      response: "Function result response",
      conversation_history: updatedHistory,
      function_call: {
        function: "update_recipe_form",
        result: { title: "Filled" },
      },
    };
    formatterMocks.formatResponse.mockResolvedValueOnce(formattedResponse);

    const service = new RecipeChatService("user-123");

    const result = await service.processMessage({
      message: "Scrape this recipe please",
    });

    expect(assertWithinMonthlyLimitMock).toHaveBeenCalledTimes(2);
    expect(createChatCompletionMock).toHaveBeenCalledTimes(2);
    expect(createChatCompletionMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      [],
      "none"
    );
    expect(processFunctionCallMock).toHaveBeenCalledWith(
      toolCall,
      chatMessages,
      "Follow-up reply",
      "Scrape this recipe please"
    );
    expect(formatterMocks.formatResponse).toHaveBeenCalledWith(
      "Function result response",
      updatedHistory,
      { function: "update_recipe_form", result: { title: "Filled" } }
    );
    expect(result).toEqual(formattedResponse);
  });

  it("appends follow-up answer for mixed URL requests", async () => {
    const chatMessages = [
      { role: "user", content: "Check url" },
    ] as ChatMessage[];
    const updatedHistory = [
      { role: "assistant", content: "History" },
    ] as ChatMessage[];

    builderMocks.buildMessages.mockReturnValue(chatMessages);
    builderMocks.updateConversationHistory.mockReturnValue(updatedHistory);
    getAvailableFunctionsMock.mockReturnValue(["tool"]);

    const toolCall = {
      id: "tool-2",
      type: "function",
      function: {
        name: "extract_recipe_from_url",
        arguments: '{"url":"https://example.com"}',
      },
    };

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [
          {
            message: {
              content: "Initial tool response",
              tool_calls: [toolCall],
            },
          },
        ],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
      },
    });

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: "Follow-up insight" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
    });

    logUsageMock.mockResolvedValueOnce({ success: true, limitReached: false });

    processorMocks.processFunctionCall.mockResolvedValueOnce({
      functionResult: {
        function: "extract_recipe_from_url",
        result: { title: "Parsed" },
      },
      responseContent: "Function handled response",
    });

    const formattedResponse: ChatResponse = {
      response: "Function handled response\n\nFollow-up insight",
      conversation_history: updatedHistory,
      function_call: {
        function: "extract_recipe_from_url",
        result: { title: "Parsed" },
      },
    };
    formatterMocks.formatResponse.mockResolvedValueOnce(formattedResponse);

    const service = new RecipeChatService("user-456");

    const message =
      "https://example.com Can you also list the macros?";
    const result = await service.processMessage({ message });

    expect(assertWithinMonthlyLimitMock).toHaveBeenCalledTimes(2);
    expect(createChatCompletionMock).toHaveBeenCalledTimes(2);
    expect(createChatCompletionMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Array),
      [],
      "none"
    );
    expect(formatterMocks.formatResponse).toHaveBeenCalledWith(
      "Function handled response\n\nFollow-up insight",
      updatedHistory,
      { function: "extract_recipe_from_url", result: { title: "Parsed" } }
    );
    expect(result).toEqual(formattedResponse);
  });

  it("throws a MonthlySpendLimitError when usage tracking signals the limit is reached", async () => {
    const chatMessages = [
      { role: "user", content: "Hello" },
    ] as ChatMessage[];
    const updatedHistory = [
      { role: "assistant", content: "History" },
    ] as ChatMessage[];

    builderMocks.buildMessages.mockReturnValue(chatMessages);
    builderMocks.updateConversationHistory.mockReturnValue(updatedHistory);

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: "Assistant reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });

    logUsageMock.mockResolvedValueOnce({
      success: true,
      limitReached: true,
      summary: { totalCost: 99 },
    });

    const service = new RecipeChatService("user-123");

    await expect(
      service.processMessage({ message: "Hello there" })
    ).rejects.toBeInstanceOf(MonthlySpendLimitError);

    expect(formatterMocks.formatResponse).not.toHaveBeenCalled();
  });

  it("loads user preference and sanitized custom units from database", async () => {
    RecipeChatService.clearCustomUnitsCache("user-pref");

    setupDrizzleStub({
      unitSystemPreference: "imperial",
      customUnits: [
        { unitName: " Jar " },
        { unitName: "Box" },
        { unitName: "Bad!" },
        { unitName: null },
        { unitName: "way-too-long-custom-unit-name-for-test" },
      ],
    });

    builderMocks.buildMessages.mockReturnValue([
      { role: "user", content: "Hello" },
    ]);
    builderMocks.updateConversationHistory.mockReturnValue([
      { role: "assistant", content: "Hi" },
    ]);

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: "Assistant reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });

    logUsageMock.mockResolvedValueOnce({ success: true, limitReached: false });

    const formattedResponse: ChatResponse = {
      response: "Formatted",
      conversation_history: [{ role: "assistant", content: "Hi" }],
      function_call: null,
    };
    formatterMocks.formatResponse.mockResolvedValueOnce(formattedResponse);

    const service = new RecipeChatService("user-pref", "nl");
    const result = await service.processMessage({ message: "hello there" });

    expect(ConversationBuilder).toHaveBeenLastCalledWith(
      "nl",
      "imperial",
      ["Jar", "Box"]
    );
    expect(FunctionCallProcessor).toHaveBeenLastCalledWith(
      "nl",
      "imperial",
      ["Jar", "Box"],
      expect.any(Function)
    );
    expect(result).toEqual(formattedResponse);
  });

  it("continues with defaults when profile query fails", async () => {
    RecipeChatService.clearCustomUnitsCache("user-profile-fail");

    setupDrizzleStub({
      profileError: new Error("profile fail"),
    });

    builderMocks.buildMessages.mockReturnValue([
      { role: "user", content: "Hello" },
    ]);
    builderMocks.updateConversationHistory.mockReturnValue([
      { role: "assistant", content: "Hi" },
    ]);

    createChatCompletionMock.mockResolvedValue({
      completion: {
        choices: [{ message: { content: "Assistant reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 3,
        completionTokens: 4,
        totalTokens: 7,
      },
    });

    logUsageMock.mockResolvedValue({ success: true, limitReached: false });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const service = new RecipeChatService("user-profile-fail", "en");
    await service.processMessage({ message: "handle failure" });

    expect(ConversationBuilder).toHaveBeenLastCalledWith(
      "en",
      "traditional-metric",
      []
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[RecipeChatService] Failed to fetch user profile:",
      "profile fail"
    );

    consoleErrorSpy.mockRestore();
  });

  it("continues with empty custom units when unit query fails", async () => {
    RecipeChatService.clearCustomUnitsCache("user-units-fail");

    setupDrizzleStub({
      unitSystemPreference: "mixed",
      customUnitsError: new Error("units fail"),
    });

    builderMocks.buildMessages.mockReturnValue([
      { role: "user", content: "Hello" },
    ]);
    builderMocks.updateConversationHistory.mockReturnValue([
      { role: "assistant", content: "Hi" },
    ]);

    createChatCompletionMock.mockResolvedValue({
      completion: {
        choices: [{ message: { content: "Assistant reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 3,
        completionTokens: 4,
        totalTokens: 7,
      },
    });

    logUsageMock.mockResolvedValue({ success: true, limitReached: false });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const service = new RecipeChatService("user-units-fail", "en");
    await service.processMessage({ message: "handle unit failure" });

    expect(FunctionCallProcessor).toHaveBeenLastCalledWith(
      "en",
      "mixed",
      [],
      expect.any(Function)
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[RecipeChatService] Failed to fetch custom units:",
      "units fail"
    );

    consoleErrorSpy.mockRestore();
  });

  it("falls back to English messages when locale file is missing", () => {
    const service = new RecipeChatService("user-fallback", "xx");
    const translator = service as unknown as {
      t: (key: string) => string;
    };

    expect(translator.t("chat.standardFollowUp")).toContain("The user asked");
    expect(translator.t("missing.translation.key")).toBe(
      "missing.translation.key"
    );
  });

  it("detectLocale chooses nl when indicated", () => {
    const request = new Request("https://example.com/nl/dashboard", {
      headers: {
        "accept-language": "en-US,en;q=0.9,nl;q=0.8",
      },
    });

    expect(RecipeChatService.detectLocale(request)).toBe("nl");

    const fallbackRequest = new Request("https://example.com/app", {
      headers: {
        "accept-language": "en-US,en;q=0.9",
      },
    });

    expect(RecipeChatService.detectLocale(fallbackRequest, "en")).toBe("en");
  });

  it("detectMixedRequest identifies URLs and additional content correctly", () => {
    const noUrl = RecipeChatService.detectMixedRequest("No url here");
    expect(noUrl).toEqual({
      hasUrl: false,
      hasAdditionalContent: false,
      additionalContent: "",
    });

    const onlyUrl = RecipeChatService.detectMixedRequest(
      "https://example.com"
    );
    expect(onlyUrl.hasUrl).toBe(true);
    expect(onlyUrl.hasAdditionalContent).toBe(false);
    expect(onlyUrl.additionalContent).toBe("");

    const mixed = RecipeChatService.detectMixedRequest(
      "https://example.com Also could you list the macros?"
    );
    expect(mixed.hasUrl).toBe(true);
    expect(mixed.hasAdditionalContent).toBe(true);
    expect(mixed.additionalContent).toBe("Also could you list the macros");
  });

  it("logs error when second completion fails during two-call pattern", async () => {
    RecipeChatService.clearCustomUnitsCache("two-call-fail");

    builderMocks.buildMessages.mockReturnValue([
      { role: "user", content: "Hello" },
    ]);
    builderMocks.updateConversationHistory.mockReturnValue([
      { role: "assistant", content: "Hi" },
    ]);

    const toolCall = {
      id: "tool-1",
      type: "function",
      function: { name: "update_recipe_form", arguments: "{}" },
    };

    createChatCompletionMock
      .mockResolvedValueOnce({
        completion: {
          choices: [
            { message: { content: null, tool_calls: [toolCall] } },
          ],
        },
        usage: {
          model: "gpt-test",
          promptTokens: 2,
          completionTokens: 3,
          totalTokens: 5,
        },
      })
      .mockRejectedValueOnce(new Error("second fail"));

    logUsageMock.mockResolvedValueOnce({ success: true, limitReached: false });

    processorMocks.processFunctionCall.mockResolvedValueOnce({
      functionResult: {
        function: "update_recipe_form",
        result: { title: "Saved" },
      },
      responseContent: "Recovered content",
    });

    formatterMocks.formatResponse.mockResolvedValueOnce({
      response: "Recovered content",
      conversation_history: [{ role: "assistant", content: "Hi" }],
      function_call: {
        function: "update_recipe_form",
        result: { title: "Saved" },
      },
    });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const service = new RecipeChatService("two-call-fail", "en");
    const result = await service.processMessage({
      message: "trigger second call",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "🔴 [RecipeChatService] Second API call failed:",
      expect.any(Error)
    );
    expect(result.response).toBe("Recovered content");

    consoleErrorSpy.mockRestore();
  });

  it("warns when usage tracking logging fails", async () => {
    RecipeChatService.clearCustomUnitsCache("usage-warn");

    builderMocks.buildMessages.mockReturnValue([
      { role: "user", content: "Hello" },
    ]);
    builderMocks.updateConversationHistory.mockReturnValue([
      { role: "assistant", content: "Hi" },
    ]);

    createChatCompletionMock.mockResolvedValueOnce({
      completion: {
        choices: [{ message: { content: "Assistant reply" } }],
      },
      usage: {
        model: "gpt-test",
        promptTokens: 3,
        completionTokens: 4,
        totalTokens: 7,
      },
    });

    logUsageMock.mockResolvedValueOnce({ success: false, error: "db down" });

    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    formatterMocks.formatResponse.mockResolvedValueOnce({
      response: "Assistant reply",
      conversation_history: [{ role: "assistant", content: "Hi" }],
      function_call: null,
    });

    const service = new RecipeChatService("usage-warn", "en");
    await service.processMessage({ message: "hello" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "🟡 [RecipeChatService] Failed to log usage:",
      "db down"
    );

    consoleWarnSpy.mockRestore();
  });

  it("logs error when mixed request follow-up fails but continues with function response", async () => {
    RecipeChatService.clearCustomUnitsCache("mixed-fail");

    builderMocks.buildMessages.mockReturnValue([
      { role: "user", content: "Hello" },
    ]);
    builderMocks.updateConversationHistory.mockReturnValue([
      { role: "assistant", content: "Hi" },
    ]);

    const toolCall = {
      id: "tool-2",
      type: "function",
      function: {
        name: "extract_recipe_from_url",
        arguments: '{"url":"https://example.com"}',
      },
    };

    createChatCompletionMock
      .mockResolvedValueOnce({
        completion: {
          choices: [
            {
              message: {
                content: "Initial function response",
                tool_calls: [toolCall],
              },
            },
          ],
        },
        usage: {
          model: "gpt-test",
          promptTokens: 5,
          completionTokens: 5,
          totalTokens: 10,
        },
      })
      .mockRejectedValueOnce(new Error("follow-up fail"));

    logUsageMock.mockResolvedValueOnce({ success: true, limitReached: false });

    processorMocks.processFunctionCall.mockResolvedValueOnce({
      functionResult: {
        function: "extract_recipe_from_url",
        result: { title: "Parsed" },
      },
      responseContent: "Initial function response",
    });

    formatterMocks.formatResponse.mockResolvedValueOnce({
      response: "Initial function response",
      conversation_history: [{ role: "assistant", content: "Hi" }],
      function_call: {
        function: "extract_recipe_from_url",
        result: { title: "Parsed" },
      },
    });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const service = new RecipeChatService("mixed-fail", "en");
    const result = await service.processMessage({
      message: "https://example.com Can you also list the macros?",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "🔴 [RecipeChatService] Mixed request follow-up failed:",
      expect.any(Error)
    );
    expect(result.response).toBe("Initial function response");

    consoleErrorSpy.mockRestore();
  });
});
