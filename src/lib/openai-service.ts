import { OpenAI } from "openai";

export interface OpenAIUsageData {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OpenAICompletionWithUsage {
  completion: OpenAI.Chat.Completions.ChatCompletion;
  usage: OpenAIUsageData;
}

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_TEXT_MODEL = "gpt-4.1-mini"; // For text-only conversations
const OPENAI_VISION_MODEL = "gpt-4o"; // For conversations with images
const OPENAI_MAX_TOKENS = parseInt("2000", 10);
const OPENAI_TEMPERATURE = parseFloat("0.9");

if (!OPENAI_API_KEY) {
  console.error(
    "Missing OPENAI_API_KEY environment variable. Please set it in your .env.local file."
  );
}

// Initialize OpenAI client with timeout
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
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

// Helper function to detect if the current request contains images
// Only checks the last user message to determine if vision model is needed
function hasImagesInCurrentRequest(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): boolean {
  // Find the last user message (which would be the current request)
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
  
  if (lastUserMessage && Array.isArray(lastUserMessage.content)) {
    return lastUserMessage.content.some(content => 
      typeof content === 'object' && 
      content !== null && 
      'type' in content && 
      content.type === 'image_url'
    );
  }
  return false;
}

// OpenAI API wrapper with usage tracking and automatic model selection
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.Completions.ChatCompletionCreateParams["tools"],
  toolChoice?: OpenAI.Chat.Completions.ChatCompletionCreateParams["tool_choice"]
): Promise<OpenAICompletionWithUsage> {
  // Check rate limit
  if (rateLimiter.isRateLimited()) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  try {
    // Automatically select model based on current request content only
    const useVisionModel = hasImagesInCurrentRequest(messages);
    const selectedModel = useVisionModel ? OPENAI_VISION_MODEL : OPENAI_TEXT_MODEL;
    
    console.log(`🤖 [OpenAI Service] Using model: ${selectedModel} (current request has images: ${useVisionModel})`);
    
    // Create a promise race with timeout
    const completionPromise = openai.chat.completions.create({
      model: selectedModel,
      messages,
      tools,
      tool_choice: toolChoice || (tools ? "auto" : undefined),
      max_tokens: OPENAI_MAX_TOKENS,
      temperature: OPENAI_TEMPERATURE,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OpenAI request timeout")), 55000); // 55 second timeout (5s buffer before Vercel 60s limit)
    });

    const completion = await Promise.race([completionPromise, timeoutPromise]) as OpenAI.Chat.Completions.ChatCompletion;

    // Track the request
    rateLimiter.addRequest();

    // Extract usage data from the response
    const usage: OpenAIUsageData = {
      model: selectedModel,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    };


    return {
      completion,
      usage
    };
  } catch (error) {
    console.error("🔴 [OpenAI] API error:", error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error("Request timeout - please try again with a shorter message");
    }
    
    throw error;
  }
}

// Legacy function for backward compatibility (returns only completion)
export async function createChatCompletionLegacy(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.Completions.ChatCompletionCreateParams["tools"]
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const { completion } = await createChatCompletion(messages, tools);
  return completion;
}

// Helper function to validate OpenAI configuration
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  if (!OPENAI_API_KEY) {
    return {
      valid: false,
      error: "Missing OPENAI_API_KEY environment variable",
    };
  }

  if (!OPENAI_TEXT_MODEL || !OPENAI_VISION_MODEL) {
    return { valid: false, error: "Missing OpenAI model configuration" };
  }

  return { valid: true };
}
