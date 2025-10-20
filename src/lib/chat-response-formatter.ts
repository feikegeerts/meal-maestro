import { ChatMessage } from "./conversation-builder";
import { FunctionCallResult } from "./function-call-processor";
import { MonthlySpendLimitError } from "./usage-limit-service";

export interface ChatResponse {
  response: string;
  conversation_history: ChatMessage[];
  function_call: FunctionCallResult | null;
}

export class ChatResponseFormatter {
  private locale: string;
  
  constructor(locale: string) {
    this.locale = locale;
  }
  
  async formatResponse(
    responseContent: string | null,
    conversationHistory: ChatMessage[],
    functionResult: FunctionCallResult | null
  ): Promise<ChatResponse> {
    const translations = (await import(`@/messages/${this.locale}`)).default;
    
    // Ensure we always have a meaningful response
    let finalResponseContent = responseContent?.trim() || "";
    if (!finalResponseContent) {
      // If we have a function call but no textual content from the model,
      // provide a friendly, context-aware fallback instead of an error.
      finalResponseContent = translations.chat.processingError;
    }
    
    return {
      response: finalResponseContent,
      conversation_history: conversationHistory,
      function_call: functionResult,
    };
  }
  
  async formatErrorResponse(
    error: Error
  ): Promise<{ error: string; status: number }> {
    if (error.message.includes("timeout")) {
      return {
        error: "Request timeout - please try again with a shorter message",
        status: 408
      };
    }
    
    if (error.message.includes("rate limit")) {
      return {
        error: "Rate limit exceeded. Please try again later.",
        status: 429
      };
    }
    
    if (error instanceof MonthlySpendLimitError) {
      const now = new Date();
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const locale = this.locale === 'nl' ? 'nl-NL' : this.locale;
      const resetLabel = resetDate.toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
      });

      if (this.locale === 'nl') {
        return {
          error:
            `Je hebt de AI-limiet voor deze maand bereikt. De limiet wordt op ${resetLabel} automatisch vernieuwd.`,
          status: 402,
        };
      }

      return {
        error: `You've reached this month's AI usage limit. It resets on ${resetLabel}.`,
        status: 402,
      };
    }

    if (error.message.includes("quota") || error.message.includes("billing")) {
      return {
        error: "OpenAI quota exceeded. Please check your billing.",
        status: 402
      };
    }
    
    return {
      error: "Internal server error while processing chat request",
      status: 500
    };
  }
}
