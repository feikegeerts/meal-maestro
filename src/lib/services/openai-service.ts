import { OpenAI } from "openai";

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || "2000", 10);
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || "0.9");

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
  console.log("🔵 [OpenAI] Starting chat completion request");
  console.log("🔵 [OpenAI] Model:", OPENAI_MODEL);
  console.log("🔵 [OpenAI] Max tokens:", OPENAI_MAX_TOKENS);
  console.log("🔵 [OpenAI] Temperature:", OPENAI_TEMPERATURE);
  console.log("🔵 [OpenAI] Tools available:", tools ? tools.length : 0);
  console.log("🔵 [OpenAI] Message count:", messages.length);
  
  // Log the last user message for context
  const lastUserMessage = messages.findLast(m => m.role === 'user');
  if (lastUserMessage) {
    console.log("🔵 [OpenAI] Last user message:", lastUserMessage.content?.toString().slice(0, 200) + '...');
  }

  // Check rate limit
  if (rateLimiter.isRateLimited()) {
    console.log("🔴 [OpenAI] Rate limit exceeded");
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  try {
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools,
      tool_choice: tools ? "auto" : undefined,
      max_tokens: OPENAI_MAX_TOKENS,
      temperature: OPENAI_TEMPERATURE,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Track the request
    rateLimiter.addRequest();

    console.log("🟢 [OpenAI] Completion successful in", duration, "ms");
    console.log("🟢 [OpenAI] Response content length:", completion.choices[0]?.message?.content?.length || 0);
    console.log("🟢 [OpenAI] Tool calls:", completion.choices[0]?.message?.tool_calls?.length || 0);
    
    // Log tool calls if present
    if (completion.choices[0]?.message?.tool_calls) {
      completion.choices[0].message.tool_calls.forEach((toolCall, index) => {
        if (toolCall.type === 'function') {
          console.log(`🟢 [OpenAI] Tool call ${index + 1}:`, toolCall.function.name);
          console.log(`🟢 [OpenAI] Tool arguments:`, toolCall.function.arguments);
        }
      });
    }
    
    // Log response content (truncated)
    if (completion.choices[0]?.message?.content) {
      const content = completion.choices[0].message.content;
      console.log("🟢 [OpenAI] Response content:", content.slice(0, 300) + (content.length > 300 ? '...' : ''));
    }

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

// Test OpenAI connection
export async function testOpenAIConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const completion = await createChatCompletion([
      {
        role: "user",
        content:
          'Hello, this is a test. Please respond with "Connection successful".',
      },
    ]);

    const response = completion.choices[0]?.message?.content;

    if (response && response.includes("Connection successful")) {
      return { success: true };
    } else {
      return { success: false, error: "Unexpected response from OpenAI" };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
