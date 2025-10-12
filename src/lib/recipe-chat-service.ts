import { createChatCompletion } from "./openai-service";
import { usageTrackingService } from "./usage-tracking-service";
import { usageLimitService, MonthlySpendLimitError } from "./usage-limit-service";
import { MONTHLY_SPEND_CAP_USD } from "@/config/usage-limits";
import {
  ConversationBuilder,
  ChatMessage,
  ChatContext,
} from "./conversation-builder";
import {
  FunctionCallProcessor,
  FunctionCallResult,
} from "./function-call-processor";
import { ChatResponseFormatter, ChatResponse } from "./chat-response-formatter";
import type { SupabaseClient } from "@supabase/supabase-js";

// Custom units cache to avoid per-request DB queries
interface CustomUnitsCache {
  units: string[];
  timestamp: number;
}

class CustomUnitsCacheManager {
  private cache = new Map<string, CustomUnitsCache>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  get(userId: string): string[] | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.TTL_MS) {
      this.cache.delete(userId);
      return null;
    }

    return cached.units;
  }

  set(userId: string, units: string[]): void {
    this.cache.set(userId, {
      units: [...units], // Create a copy to avoid mutations
      timestamp: Date.now(),
    });
  }

  clear(userId: string): void {
    this.cache.delete(userId);
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [userId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.TTL_MS) {
        this.cache.delete(userId);
      }
    }
  }
}

const customUnitsCache = new CustomUnitsCacheManager();

// Run cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  customUnitsCache.cleanup();
}, 10 * 60 * 1000);

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  images?: string[]; // Base64 encoded images
  locale?: string;
  context?: ChatContext;
}

export class RecipeChatService {
  // Static method to clear custom units cache (for when units are updated)
  static clearCustomUnitsCache(userId: string): void {
    customUnitsCache.clear(userId);
  }
  private userId: string;
  private locale: string;
  private supabaseClient?: SupabaseClient;
  private conversationBuilder?: ConversationBuilder;
  private functionCallProcessor?: FunctionCallProcessor;
  private responseFormatter: ChatResponseFormatter;
  private messages: Record<string, unknown>;
  private unitPreference?: string;
  private customUnits: string[] = [];

  constructor(
    userId: string,
    locale: string = "en",
    supabaseClient?: SupabaseClient
  ) {
    this.userId = userId;
    this.locale = locale;
    this.supabaseClient = supabaseClient;
    this.responseFormatter = new ChatResponseFormatter(locale);
    this.messages = this.loadMessages(locale);
  }

  private async initializeConversationBuilder(): Promise<void> {
    if (this.conversationBuilder) {
      return; // Already initialized
    }

    let unitPreference = "traditional-metric"; // Default
    let customUnits: string[] = [];

    // Fetch user's unit preference using authenticated client if available
    if (this.supabaseClient) {
      try {
        const { data: profile, error } = await this.supabaseClient
          .from("user_profiles")
          .select("unit_system_preference")
          .eq("id", this.userId)
          .maybeSingle();

        if (!error && profile) {
          unitPreference =
            profile.unit_system_preference || "traditional-metric";
        }

        // Fetch custom units for user (with caching to avoid per-request DB hits)
        const cachedCustomUnits = customUnitsCache.get(this.userId);
        if (cachedCustomUnits !== null) {
          customUnits = cachedCustomUnits;
        } else {
          try {
            const { data: unitsData, error: unitsError } =
              await this.supabaseClient
                .from("custom_units")
                .select("unit_name")
                .eq("user_id", this.userId)
                .order("unit_name", { ascending: true });
            if (!unitsError && Array.isArray(unitsData)) {
              customUnits = unitsData
                .map((u) => u.unit_name?.trim())
                .filter(Boolean)
                .filter((u) => u.length > 0 && u.length <= 20) // Reasonable length limits
                .filter((u) => /^[a-zA-Z0-9\s\-.]+$/.test(u)) // Allow only safe characters
                .slice(0, 25); // Match schema limit directly

              // Cache the result for future requests
              customUnitsCache.set(this.userId, customUnits);
            }
          } catch (cuErr) {
            console.error(
              "[RecipeChatService] Failed to fetch custom units:",
              cuErr instanceof Error ? cuErr.message : cuErr
            );
            // Continue with empty custom units array - this is non-critical
            customUnits = [];
            // Cache empty result to avoid retrying failed requests immediately
            customUnitsCache.set(this.userId, customUnits);
          }
        }
      } catch (profileErr) {
        console.error(
          "[RecipeChatService] Failed to fetch user profile:",
          profileErr instanceof Error ? profileErr.message : profileErr
        );
        // Continue with default unit preference - non-critical for core functionality
      }
    }

    this.unitPreference = unitPreference;
    this.customUnits = customUnits;
    this.conversationBuilder = new ConversationBuilder(
      this.locale,
      unitPreference,
      customUnits
    );
    this.functionCallProcessor = new FunctionCallProcessor(
      this.locale,
      unitPreference,
      customUnits,
      () => usageLimitService.assertWithinMonthlyLimit(this.userId)
    );
  }

  private loadMessages(locale: string): Record<string, unknown> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const messagesModule = require(`../messages/${locale}`) as {
        default: Record<string, unknown>;
      };
      const messages = messagesModule.default;
      const safeMessages = Object.create(null);
      for (const key in messages) {
        if (Object.prototype.hasOwnProperty.call(messages, key)) {
          safeMessages[key] = messages[key];
        }
      }
      return safeMessages;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const messagesModule = require(`../messages/en`) as {
        default: Record<string, unknown>;
      };
      const messages = messagesModule.default;
      const safeMessages = Object.create(null);
      for (const key in messages) {
        if (Object.prototype.hasOwnProperty.call(messages, key)) {
          safeMessages[key] = messages[key];
        }
      }
      return safeMessages;
    }
  }

  private t(key: string): string {
    const keys = key.split(".");
    let value: unknown = this.messages;

    for (const k of keys) {
      // Skip dangerous keys that could lead to prototype pollution
      if (k === "__proto__" || k === "constructor" || k === "prototype") {
        continue;
      }

      if (
        value &&
        typeof value === "object" &&
        value !== null &&
        Object.hasOwn(value, k)
      ) {
        // Use a safe property access that avoids prototype pollution
        const safeValue = value as Record<string, unknown>;
        const descriptor = Object.getOwnPropertyDescriptor(safeValue, k);
        if (descriptor && descriptor.value !== undefined) {
          value = descriptor.value;
        } else {
          return key;
        }
      } else {
        return key;
      }
    }

    return typeof value === "string" ? value : key;
  }

  static detectLocale(request: Request, bodyLocale?: string): string {
    const acceptLanguage = request.headers.get("accept-language") || "";
    const isNl =
      bodyLocale === "nl" ||
      acceptLanguage.includes("nl") ||
      request.url.includes("/nl/");
    return isNl ? "nl" : "en";
  }

  static detectMixedRequest(message: string): {
    hasUrl: boolean;
    hasAdditionalContent: boolean;
    additionalContent: string;
  } {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = message.match(urlRegex) || [];
    const hasUrl = urls.length > 0;

    if (!hasUrl) {
      return {
        hasUrl: false,
        hasAdditionalContent: false,
        additionalContent: "",
      };
    }

    // Remove URLs from message to get additional content
    let additionalContent = message;
    urls.forEach((url) => {
      additionalContent = additionalContent.replace(url, "");
    });

    // Clean up additional content (remove extra spaces, common connectors)
    additionalContent = additionalContent
      .replace(/\s+/g, " ") // normalize whitespace
      .replace(/^[,;.!?\s]+|[,;.!?\s]+$/g, "") // trim punctuation and spaces
      .trim();

    // Check if there's meaningful additional content (more than just connectors)
    const meaningfulContentRegex = /\w{3,}/; // At least one word with 3+ characters
    const hasAdditionalContent =
      additionalContent.length > 0 &&
      meaningfulContentRegex.test(additionalContent);

    return { hasUrl, hasAdditionalContent, additionalContent };
  }

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversation_history = [], images, context } = request;

    // Initialize conversation builder with user preferences
    await this.initializeConversationBuilder();

    // Require either a message or images
    if (
      (!message || message.trim().length === 0) &&
      (!images || images.length === 0)
    ) {
      throw new Error("Message or images are required");
    }

    // Build conversation messages with optional images
    if (!this.conversationBuilder) {
      throw new Error("Failed to initialize conversation builder");
    }

    const chatMessages = this.conversationBuilder.buildMessages(
      message,
      conversation_history,
      context,
      images
    );

    // Create completion with function calling and usage tracking
    await usageLimitService.assertWithinMonthlyLimit(this.userId);

    const { completion, usage } = await createChatCompletion(
      chatMessages,
      FunctionCallProcessor.getAvailableFunctions(
        this.unitPreference,
        this.customUnits
      )
    );

    // Log usage for cost tracking and outlier detection
    const usageLog = await usageTrackingService.logUsage(
      this.userId,
      "/api/recipes/chat",
      usage
    );

    if (!usageLog.success) {
      console.warn(
        "🟡 [RecipeChatService] Failed to log usage:",
        usageLog.error
      );
    } else if (usageLog.limitReached) {
      throw new MonthlySpendLimitError(
        MONTHLY_SPEND_CAP_USD,
        usageLog.summary?.totalCost ?? usageLog.cost ?? MONTHLY_SPEND_CAP_USD
      );
    }

    let functionResult: FunctionCallResult | null = null;
    let responseContent = completion.choices[0].message.content;

    // Handle function call if present
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];

      // TWO-CALL PATTERN: If OpenAI returned null content with function call, make second call immediately
      if (!responseContent) {
        try {
          const followUpPrompt = this.t("chat.standardFollowUp").replace(
            "{message}",
            message
          );

          const followUpMessages = [
            ...chatMessages,
            {
              role: "user" as const,
              content: followUpPrompt,
            },
          ];

          await usageLimitService.assertWithinMonthlyLimit(this.userId);

          const { completion: secondCompletion } = await createChatCompletion(
            followUpMessages,
            [],
            "none"
          );

          responseContent = secondCompletion.choices[0].message.content;
        } catch (error) {
          console.error(
            "🔴 [RecipeChatService] Second API call failed:",
            error
          );
          responseContent = null;
        }
      }

      if (!this.functionCallProcessor) {
        throw new Error("Function call processor not initialized");
      }

      const functionCallResult =
        await this.functionCallProcessor.processFunctionCall(
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
          const followUpPrompt = this.t("chat.mixedRequestFollowUp")
            .replace("{message}", message)
            .replace("{additionalContent}", mixedRequest.additionalContent);

          const followUpMessages = [
            ...chatMessages,
            {
              role: "user" as const,
              content: followUpPrompt,
            },
          ];

          await usageLimitService.assertWithinMonthlyLimit(this.userId);

          const { completion: secondCompletion } = await createChatCompletion(
            followUpMessages,
            [],
            "none"
          );

          // Combine the function result response with the follow-up response
          const followUpContent = secondCompletion.choices[0].message.content;
          if (followUpContent) {
            responseContent = `${responseContent}\n\n${followUpContent}`;
          }
        } catch (error) {
          console.error(
            "🔴 [RecipeChatService] Mixed request follow-up failed:",
            error
          );
        }
      }
    }

    // Update conversation history
    const updatedHistory = this.conversationBuilder.updateConversationHistory(
      conversation_history,
      message,
      responseContent || ""
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
