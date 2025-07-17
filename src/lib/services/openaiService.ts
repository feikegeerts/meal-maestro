import { OpenAI } from 'openai';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';

if (dev) {
  dotenv.config({ path: '.env.local' });
}

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10);
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable. Please set it in your .env.local file.');
}

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Usage tracking interface
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIUsage {
  tokens: TokenUsage;
  model: string;
  cost_usd: number;
}

// Cost calculation (approximations based on OpenAI pricing)
const MODEL_COSTS = {
  'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
} as const;

export function calculateCost(model: string, tokens: TokenUsage): number {
  const modelKey = model.includes('gpt-4-turbo') ? 'gpt-4-turbo' : 
                   model.includes('gpt-4') ? 'gpt-4' : 
                   'gpt-3.5-turbo';
  
  const costs = MODEL_COSTS[modelKey];
  const inputCost = (tokens.prompt_tokens / 1000) * costs.input;
  const outputCost = (tokens.completion_tokens / 1000) * costs.output;
  
  return inputCost + outputCost;
}

// Rate limiting and usage tracking
class UsageTracker {
  private requests: number = 0;
  private lastReset: number = Date.now();
  private readonly maxRequestsPerMinute: number = 60;
  private readonly maxDailyCost: number = parseFloat(process.env.OPENAI_DAILY_BUDGET || '10.00');
  
  private dailyCost: number = 0;
  private lastDailyCostReset: number = Date.now();

  isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset counters if needed
    if (now - this.lastReset > 60000) { // 1 minute
      this.requests = 0;
      this.lastReset = now;
    }
    
    // Check daily cost limit
    if (now - this.lastDailyCostReset > 24 * 60 * 60 * 1000) { // 24 hours
      this.dailyCost = 0;
      this.lastDailyCostReset = now;
    }
    
    return this.requests >= this.maxRequestsPerMinute || this.dailyCost >= this.maxDailyCost;
  }

  addRequest(cost: number): void {
    this.requests++;
    this.dailyCost += cost;
  }

  getUsageStats(): { requests: number; dailyCost: number; maxDailyCost: number } {
    return {
      requests: this.requests,
      dailyCost: this.dailyCost,
      maxDailyCost: this.maxDailyCost
    };
  }
}

export const usageTracker = new UsageTracker();

// OpenAI API wrapper with error handling and retry logic
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: OpenAI.Chat.Completions.ChatCompletionCreateParams['tools'],
  retries: number = 3
): Promise<{ completion: OpenAI.Chat.Completions.ChatCompletion; usage: OpenAIUsage }> {
  
  // Check rate limits
  if (usageTracker.isRateLimited()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        tools,
        tool_choice: tools ? 'auto' : undefined,
        max_tokens: OPENAI_MAX_TOKENS,
        temperature: OPENAI_TEMPERATURE,
      });

      // Calculate usage and cost
      const tokens = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const cost = calculateCost(completion.model, tokens);
      
      // Track usage
      usageTracker.addRequest(cost);

      const usage: OpenAIUsage = {
        tokens,
        model: completion.model,
        cost_usd: cost
      };

      return { completion, usage };
    } catch (error) {
      console.error(`OpenAI API attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || 
            error.message.includes('quota') || 
            error.message.includes('billing')) {
          throw error;
        }
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw new Error('OpenAI API failed after maximum retries');
}

// Helper function to validate OpenAI configuration
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  if (!OPENAI_API_KEY) {
    return { valid: false, error: 'Missing OPENAI_API_KEY environment variable' };
  }
  
  if (!OPENAI_MODEL) {
    return { valid: false, error: 'Missing OPENAI_MODEL environment variable' };
  }
  
  return { valid: true };
}

// Test OpenAI connection
export async function testOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { completion } = await createChatCompletion([
      { role: 'user', content: 'Hello, this is a test. Please respond with "Connection successful".' }
    ]);
    
    const response = completion.choices[0]?.message?.content;
    
    if (response && response.includes('Connection successful')) {
      return { success: true };
    } else {
      return { success: false, error: 'Unexpected response from OpenAI' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}