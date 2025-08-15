import { OpenAI } from "openai";

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = "gpt-4.1-mini";
const OPENAI_MAX_TOKENS = parseInt("2000", 10);
const OPENAI_TEMPERATURE = parseFloat("0.9");

if (!OPENAI_API_KEY) {
  console.error(
    "Missing OPENAI_API_KEY environment variable. Please set it in your .env.local file."
  );
}

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Simple rate limiter
class SimpleRateLimiter {
  private requests: number = 0;
  private lastReset: number = Date.now();
  private readonly maxRequestsPerMinute: number = 60;

  isRateLimited(): boolean {
    const now = Date.now();

    // Reset counter if a minute has passed
    if (now - this.lastReset > 60000) {
      this.requests = 0;
      this.lastReset = now;
    }

    return this.requests >= this.maxRequestsPerMinute;
  }

  addRequest(): void {
    this.requests++;
  }

  getStats(): { requests: number; maxRequests: number } {
    return {
      requests: this.requests,
      maxRequests: this.maxRequestsPerMinute,
    };
  }
}

export const rateLimiter = new SimpleRateLimiter();

// Simple OpenAI API wrapper with basic error handling
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.Completions.ChatCompletionCreateParams["tools"]
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  // Check rate limit
  if (rateLimiter.isRateLimited()) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools,
      tool_choice: tools ? "auto" : undefined,
      max_tokens: OPENAI_MAX_TOKENS,
      temperature: OPENAI_TEMPERATURE,
    });

    // Track the request
    rateLimiter.addRequest();

    return completion;
  } catch (error) {
    console.error("🔴 [OpenAI] API error:", error);
    throw error;
  }
}

// Helper function to validate OpenAI configuration
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  if (!OPENAI_API_KEY) {
    return {
      valid: false,
      error: "Missing OPENAI_API_KEY environment variable",
    };
  }

  if (!OPENAI_MODEL) {
    return { valid: false, error: "Missing OPENAI_MODEL environment variable" };
  }

  return { valid: true };
}
