import { ChatMessage } from "./conversation-builder";
import { FunctionCallResult } from "./function-call-processor";

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
    const translations = (await import(`@/messages/${this.locale}.json`)).default;
    
    // Ensure we always have response content
    const finalResponseContent = responseContent || translations.chat.processingError;
    
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