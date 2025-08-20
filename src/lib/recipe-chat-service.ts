import { createChatCompletion } from "./openai-service";
import { usageTrackingService } from "./usage-tracking-service";
import { ConversationBuilder, ChatMessage, ChatContext } from "./conversation-builder";
import { FunctionCallProcessor, FunctionCallResult } from "./function-call-processor";
import { ChatResponseFormatter, ChatResponse } from "./chat-response-formatter";

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  locale?: string;
  context?: ChatContext;
}

export class RecipeChatService {
  private userId: string;
  private locale: string;
  private conversationBuilder: ConversationBuilder;
  private functionCallProcessor: FunctionCallProcessor;
  private responseFormatter: ChatResponseFormatter;
  
  constructor(userId: string, locale: string = 'en') {
    this.userId = userId;
    this.locale = locale;
    this.conversationBuilder = new ConversationBuilder(locale);
    this.functionCallProcessor = new FunctionCallProcessor(locale);
    this.responseFormatter = new ChatResponseFormatter(locale);
  }
  
  static detectLocale(request: Request, bodyLocale?: string): string {
    const acceptLanguage = request.headers.get('accept-language') || '';
    const isNl = bodyLocale === 'nl' || acceptLanguage.includes('nl') || request.url.includes('/nl/');
    return isNl ? 'nl' : 'en';
  }
  
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversation_history = [], context } = request;
    
    if (!message || message.trim().length === 0) {
      throw new Error("Message is required");
    }
    
    // Build conversation messages
    const chatMessages = this.conversationBuilder.buildMessages(
      message,
      conversation_history,
      context
    );
    
    // Create completion with function calling and usage tracking
    const { completion, usage } = await createChatCompletion(
      chatMessages,
      FunctionCallProcessor.getAvailableFunctions()
    );
    
    // Log usage for cost tracking and outlier detection
    const usageLog = await usageTrackingService.logUsage(
      this.userId,
      '/api/recipes/chat',
      usage
    );
    
    if (!usageLog.success) {
      console.warn('🟡 [RecipeChatService] Failed to log usage:', usageLog.error);
    }
    
    let functionResult: FunctionCallResult | null = null;
    let responseContent = completion.choices[0].message.content;
    
    // Handle function call if present
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      
      // TWO-CALL PATTERN: If OpenAI returned null content with function call, make second call immediately
      if (!responseContent) {
        
        try {
          const followUpPrompt = this.locale === 'nl' 
            ? `De gebruiker vroeg: "${message}". Ik heb zojuist automatisch het recept formulier ingevuld met alle ingrediënten en bereidingswijze - het is al compleet klaar! Het formulier is nu gevuld en de gebruiker kan het bekijken. Geef een gepaste reactie op hun oorspronkelijke vraag. Geen functie-aanroepen meer.`
            : `The user asked: "${message}". I have automatically filled the recipe form with all ingredients and instructions - it's completely ready! The form is now filled and the user can view it. Give an appropriate response to their original question. No more function calls.`;
          
          const followUpMessages = [...chatMessages, {
            role: "user" as const,
            content: followUpPrompt
          }];
          
          const { completion: secondCompletion } = await createChatCompletion(
            followUpMessages,
            [],
            'none'
          );
          
          responseContent = secondCompletion.choices[0].message.content;
          
        } catch (error) {
          console.error('🔴 [RecipeChatService] Second API call failed:', error);
          responseContent = null;
        }
      }
      
      const functionCallResult = await this.functionCallProcessor.processFunctionCall(
        toolCall,
        chatMessages,
        responseContent,
        message
      );
      
      functionResult = functionCallResult.functionResult;
      
      // Use function call response content if provided (this will be from two-call or fallback)
      if (functionCallResult.responseContent !== null) {
        responseContent = functionCallResult.responseContent;
      }
    }
    
    // Update conversation history
    const updatedHistory = this.conversationBuilder.updateConversationHistory(
      conversation_history,
      message,
      responseContent || ''
    );
    
    // Format and return response
    const finalResponse = await this.responseFormatter.formatResponse(
      responseContent,
      updatedHistory,
      functionResult
    );
    
    return finalResponse;
  }
}