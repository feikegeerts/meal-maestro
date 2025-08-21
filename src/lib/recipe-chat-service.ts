import { createChatCompletion } from "./openai-service";
import { usageTrackingService } from "./usage-tracking-service";
import { ConversationBuilder, ChatMessage, ChatContext } from "./conversation-builder";
import { FunctionCallProcessor, FunctionCallResult } from "./function-call-processor";
import { ChatResponseFormatter, ChatResponse } from "./chat-response-formatter";

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  images?: string[]; // Base64 encoded images
  locale?: string;
  context?: ChatContext;
}

export class RecipeChatService {
  private userId: string;
  private locale: string;
  private conversationBuilder: ConversationBuilder;
  private functionCallProcessor: FunctionCallProcessor;
  private responseFormatter: ChatResponseFormatter;
  private messages: Record<string, unknown>;
  
  constructor(userId: string, locale: string = 'en') {
    this.userId = userId;
    this.locale = locale;
    this.conversationBuilder = new ConversationBuilder(locale);
    this.functionCallProcessor = new FunctionCallProcessor(locale);
    this.responseFormatter = new ChatResponseFormatter(locale);
    this.messages = this.loadMessages(locale);
  }
  
  private loadMessages(locale: string): Record<string, unknown> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(`../messages/${locale}.json`) as Record<string, unknown>;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(`../messages/en.json`) as Record<string, unknown>;
    }
  }
  
  private t(key: string): string {
    const keys = key.split('.');
    let value: unknown = this.messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  }
  
  static detectLocale(request: Request, bodyLocale?: string): string {
    const acceptLanguage = request.headers.get('accept-language') || '';
    const isNl = bodyLocale === 'nl' || acceptLanguage.includes('nl') || request.url.includes('/nl/');
    return isNl ? 'nl' : 'en';
  }
  
  static detectMixedRequest(message: string): { hasUrl: boolean; hasAdditionalContent: boolean; additionalContent: string } {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = message.match(urlRegex) || [];
    const hasUrl = urls.length > 0;
    
    if (!hasUrl) {
      return { hasUrl: false, hasAdditionalContent: false, additionalContent: '' };
    }
    
    // Remove URLs from message to get additional content
    let additionalContent = message;
    urls.forEach(url => {
      additionalContent = additionalContent.replace(url, '');
    });
    
    // Clean up additional content (remove extra spaces, common connectors)
    additionalContent = additionalContent
      .replace(/\s+/g, ' ') // normalize whitespace
      .replace(/^[\s,;.!?]+|[\s,;.!?]+$/g, '') // trim punctuation and spaces
      .trim();
    
    // Check if there's meaningful additional content (more than just connectors)
    const meaningfulContentRegex = /\w{3,}/; // At least one word with 3+ characters
    const hasAdditionalContent = additionalContent.length > 0 && meaningfulContentRegex.test(additionalContent);
    
    return { hasUrl, hasAdditionalContent, additionalContent };
  }
  
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversation_history = [], images, context } = request;
    
    // Require either a message or images
    if ((!message || message.trim().length === 0) && (!images || images.length === 0)) {
      throw new Error("Message or images are required");
    }
    
    // Build conversation messages with optional images
    const chatMessages = this.conversationBuilder.buildMessages(
      message,
      conversation_history,
      context,
      images
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
          const followUpPrompt = this.t('chat.standardFollowUp')
            .replace('{message}', message);
          
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
      
      // MIXED REQUEST PATTERN: Check if this is a URL + question after function processing
      const mixedRequest = RecipeChatService.detectMixedRequest(message);
      if (mixedRequest.hasUrl && mixedRequest.hasAdditionalContent) {
        try {
          const followUpPrompt = this.t('chat.mixedRequestFollowUp')
            .replace('{message}', message)
            .replace('{additionalContent}', mixedRequest.additionalContent);
          
          const followUpMessages = [...chatMessages, {
            role: "user" as const,
            content: followUpPrompt
          }];
          
          const { completion: secondCompletion } = await createChatCompletion(
            followUpMessages,
            [],
            'none'
          );
          
          // Combine the function result response with the follow-up response
          const followUpContent = secondCompletion.choices[0].message.content;
          if (followUpContent) {
            responseContent = `${responseContent}\n\n${followUpContent}`;
          }
          
        } catch (error) {
          console.error('🔴 [RecipeChatService] Mixed request follow-up failed:', error);
        }
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