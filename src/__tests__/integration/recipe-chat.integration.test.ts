import { NextRequest } from "next/server";
import { POST as chatPost } from "@/app/api/recipes/chat/route";
import { RecipeChatService } from "@/lib/recipe-chat-service";
import { MonthlySpendLimitError, usageLimitService } from "@/lib/usage-limit-service";
import { ChatResponseFormatter } from "@/lib/chat-response-formatter";

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";

jest.mock("@/lib/auth-server", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/recipe-chat-service", () => {
  const detectLocale = jest.fn(() => "en");
  const RecipeChatServiceMock = jest.fn().mockImplementation(() => ({
    processMessage: jest.fn().mockResolvedValue({ reply: "ok" }),
  }));
  (RecipeChatServiceMock as unknown as { detectLocale?: typeof detectLocale }).detectLocale = detectLocale;
  return { RecipeChatService: RecipeChatServiceMock };
});

jest.mock("@/lib/openai-service", () => {
  class OpenAITimeoutError extends Error {
    code = "TIMEOUT_ERROR";
    service = "OpenAI";
    operation = "createChatCompletion";
    isRetryable = true;
    constructor(message?: string) {
      super(message ?? "timeout");
    }
  }
  return { OpenAITimeoutError };
});

jest.mock("@/lib/usage-limit-service", () => ({
  usageLimitService: {
    recordRateLimitViolation: jest.fn(),
  },
  MonthlySpendLimitError: class MonthlySpendLimitError extends Error {
    code = "MONTHLY_SPEND_LIMIT_REACHED";
    constructor(...args: unknown[]) {
      super("limit");
      void args;
    }
  },
}));

const requireAuth = jest.requireMock("@/lib/auth-server").requireAuth as jest.Mock;
const { OpenAITimeoutError } = jest.requireMock("@/lib/openai-service") as {
  OpenAITimeoutError: new (message?: string) => Error & { code: string; isRetryable: boolean };
};

const buildRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/recipes/chat", {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

describe("POST /api/recipes/chat (integration)", () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    requireAuth.mockResolvedValue({
      user: { id: "user-1" },
      client: {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it("returns 401 when unauthenticated", async () => {
    requireAuth.mockResolvedValue(new Response("unauthorized", { status: 401 }));

    const response = await chatPost(buildRequest({ message: "Hi" }));
    expect(response.status).toBe(401);
  });

  it("rejects empty message and images", async () => {
    const response = await chatPost(buildRequest({ message: "  " }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Message or image is required" });
  });

  it("validates images and limits to 5", async () => {
    const response = await chatPost(
      buildRequest({
        message: "ignored",
        images: Array(6).fill("data:image/png;base64,abc"),
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Maximum 5 images allowed per message" });
  });

  it("processes chat message successfully", async () => {
    const detectLocale = jest
      .spyOn(RecipeChatService as unknown as { detectLocale: jest.Mock }, "detectLocale")
      .mockReturnValue("en");
    const processMessage = jest.fn().mockResolvedValue({ reply: "ok" });
    (RecipeChatService as unknown as jest.Mock).mockImplementation(() => ({
      processMessage,
    }));

    const response = await chatPost(
      buildRequest({
        message: "Hello",
        conversation_history: [],
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reply: "ok" });
    expect(detectLocale).toHaveBeenCalled();
    expect(processMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Hello", locale: "en" })
    );
  });

  it("returns 422 on OpenAI timeout with retry hint", async () => {
    (RecipeChatService as unknown as jest.Mock).mockImplementation(() => ({
      processMessage: jest.fn().mockRejectedValue(new OpenAITimeoutError("timeout")),
    }));

    const response = await chatPost(buildRequest({ message: "Hello" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe("TIMEOUT_ERROR");
    expect(body.isRetryable).toBe(true);
  });

  it("returns 402 on monthly spend limit reached", async () => {
    (RecipeChatService as unknown as jest.Mock).mockImplementation(() => ({
      processMessage: jest.fn().mockRejectedValue(new MonthlySpendLimitError(100, 120)),
    }));

    const response = await chatPost(buildRequest({ message: "Hello", locale: "nl" }));
    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.code).toBe("MONTHLY_SPEND_LIMIT_REACHED");
  });

  it("records rate limit violation when formatter returns 429", async () => {
    const formatErrorResponse = jest
      .spyOn(ChatResponseFormatter.prototype, "formatErrorResponse")
      .mockResolvedValue({ error: "Too many requests", status: 429 });
    (RecipeChatService as unknown as jest.Mock).mockImplementation(() => ({
      processMessage: jest.fn().mockRejectedValue(new Error("rate limit")),
    }));

    const response = await chatPost(buildRequest({ message: "Hello" }));
    expect(response.status).toBe(429);
    expect(formatErrorResponse).toHaveBeenCalled();
    expect(usageLimitService.recordRateLimitViolation).toHaveBeenCalledWith(
      "user-1",
      "/api/recipes/chat"
    );
  });
});
