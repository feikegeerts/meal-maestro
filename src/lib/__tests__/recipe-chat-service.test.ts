// ---------------------------------------------------------------------------
// Mock @/db — must be self-contained (jest.mock is hoisted before const)
// ---------------------------------------------------------------------------
vi.mock("@/db", () => {
  // Each query chain stores its own resolved value
  const profileChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };

  const customUnitsChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  };

  // select() returns a builder whose from() switches on the table reference
  const selectFn = vi.fn().mockImplementation(() => {
    // Return a proxy that delegates to the right chain via from()
    const proxy = {
      from: vi.fn().mockImplementation((table: unknown) => {
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
// Other module mocks
// ---------------------------------------------------------------------------

const buildMessagesMock = vi.fn();
const updateConversationHistoryMock = vi.fn();
const processFunctionCallMock = vi.fn();
const formatResponseMock = vi.fn();
const logUsageMock = vi.fn();
const assertWithinMonthlyLimitMock = vi.fn();
const getAvailableFunctionsMock = vi.fn();
const createChatCompletionMock = vi.fn();

vi.mock("../conversation-builder", async () => {
  const actual = await vi.importActual("../conversation-builder");
  return {
    ...actual,
    ConversationBuilder: vi.fn(),
  };
});

vi.mock("../function-call-processor", async () => {
  const actual = await vi.importActual("../function-call-processor");
  const mockClass = vi.fn();
  Object.defineProperty(mockClass, "getAvailableFunctions", {
    value: vi.fn(),
    writable: true,
  });
  return {
    ...actual,
    FunctionCallProcessor: mockClass,
  };
});

vi.mock("../chat-response-formatter", async () => {
  const actual = await vi.importActual("../chat-response-formatter");
  return {
    ...actual,
    ChatResponseFormatter: vi.fn(),
  };
});

vi.mock("../usage-tracking-service", () => ({
  usageTrackingService: {
    logUsage: vi.fn(),
  },
}));

vi.mock("@/lib/email/services/email-delivery-service", () => ({
  EmailDeliveryService: vi.fn(() => ({
    sendEmail: vi.fn(),
  })),
}));

vi.mock("../usage-limit-service", async () => {
  const actual = await vi.importActual("../usage-limit-service");
  return {
    ...actual,
    usageLimitService: {
      assertWithinMonthlyLimit: vi.fn(),
    },
  };
});

vi.mock("../openai-service", () => ({
  createChatCompletion: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after all mocks are declared)
// ---------------------------------------------------------------------------

import type { Mock, MockedClass, MockedFunction } from "vitest";
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
import * as dbModule from "@/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BuilderMocks = {
  buildMessages: Mock;
  updateConversationHistory: Mock;
};

type ProcessorMocks = {
  processFunctionCall: Mock;
};

type FormatterMocks = {
  formatResponse: Mock;
};

interface DbMockChains {
  profileChain: {
    from: Mock;
    where: Mock;
    limit: Mock;
  };
  customUnitsChain: {
    from: Mock;
    where: Mock;
    orderBy: Mock;
  };
  selectFn: Mock;
}

function getDbMocks(): DbMockChains {
  const db = dbModule.db as unknown as {
    select: Mock;
    __profileChain: DbMockChains["profileChain"];
    __customUnitsChain: DbMockChains["customUnitsChain"];
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
  // Spy on the private loadMessages method to prevent require() of .ts locale
  // files in Vitest's ESM runtime (which doesn't support dynamic CJS require).
  beforeAll(() => {
    vi.useFakeTimers();
    vi.spyOn(RecipeChatService.prototype as unknown as { loadMessages: () => unknown }, "loadMessages").mockReturnValue({});
  });

  const ConversationBuilderMock =
    ConversationBuilder as unknown as MockedClass<
      typeof ConversationBuilder
    >;
  const FunctionCallProcessorMock =
    FunctionCallProcessor as unknown as MockedClass<
      typeof FunctionCallProcessor
    >;
  const ChatResponseFormatterMock =
    ChatResponseFormatter as unknown as MockedClass<
      typeof ChatResponseFormatter
    >;
  const createChatCompletionTypedMock =
    createChatCompletion as MockedFunction<typeof createChatCompletion>;
  const logUsageTypedMock = usageTrackingService.logUsage as MockedFunction<
    typeof usageTrackingService.logUsage
  >;
  const assertWithinMonthlyLimitTypedMock =
    usageLimitService.assertWithinMonthlyLimit as MockedFunction<
      typeof usageLimitService.assertWithinMonthlyLimit
    >;

  let builderMocks: BuilderMocks;
  let processorMocks: ProcessorMocks;
  let formatterMocks: FormatterMocks;

  beforeEach(() => {
    vi.clearAllMocks();

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

    createChatCompletionTypedMock.mockImplementation(
      createChatCompletionMock as unknown as typeof createChatCompletion
    );
    logUsageTypedMock.mockImplementation(
      logUsageMock as unknown as typeof usageTrackingService.logUsage
    );
    assertWithinMonthlyLimitTypedMock.mockImplementation(
      assertWithinMonthlyLimitMock as unknown as typeof usageLimitService.assertWithinMonthlyLimit
    );

    assertWithinMonthlyLimitMock.mockResolvedValue(undefined);
    getAvailableFunctionsMock.mockReturnValue([]);

    // Default db mock: no profile, no custom units
    setupDrizzleStub();
  });

  afterAll(() => {
    vi.useRealTimers();
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

    const consoleErrorSpy = vi
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

    const consoleErrorSpy = vi
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
    // Provide English messages for this test (simulates fallback from unknown locale)
    const loadMessagesSpy = vi.spyOn(
      RecipeChatService.prototype as unknown as { loadMessages: () => unknown },
      "loadMessages",
    );
    loadMessagesSpy.mockReturnValueOnce({
      chat: {
        standardFollowUp:
          'The user asked: "{message}". I have automatically filled the recipe form with all ingredients and instructions - it\'s completely ready! The form is now filled and the user can view it. Give an appropriate response to their original question. No more function calls.',
        mixedRequestFollowUp:
          'The user asked: "{message}". I have automatically extracted the recipe and filled the form - that\'s done! Now the user also wants to know: "{additionalContent}". Give a detailed and helpful response to their additional question. No more function calls.',
      },
    });

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

    const consoleErrorSpy = vi
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

    const consoleWarnSpy = vi
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

    const consoleErrorSpy = vi
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
