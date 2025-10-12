import { OpenAI } from "openai";
import {
  SYSTEM_PROMPT,
  getLanguageInstruction,
  getUnitPreferenceInstruction,
} from "./chat-prompts";
import enMessages from "../messages/en";
import nlMessages from "../messages/nl";

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
}

export interface FormUpdate {
  title?: string;
  ingredients?: Array<{
    id: string;
    name: string;
    amount?: number | null;
    unit?: string | null;
    notes?: string;
  }>;
  servings?: number;
  description?: string;
  category?: string;
  tags?: string[];
  season?: string;
}

export interface ChatContext {
  current_form_state?: FormUpdate;
  selected_recipe?: {
    id: string;
    title: string;
    category: string;
    season?: string;
    tags: string[];
    ingredients: string[];
    description: string;
  };
}

export class ConversationBuilder {
  private locale: string;
  private unitPreference?: string;
  private customUnits?: string[];
  private messages: Record<string, unknown>;

  constructor(locale: string, unitPreference?: string, customUnits?: string[]) {
    this.locale = locale;
    this.unitPreference = unitPreference;
    this.customUnits = customUnits;
    this.messages = this.loadMessages(locale);
  }

  private loadMessages(locale: string): Record<string, unknown> {
    const messageMap: Record<string, Record<string, unknown>> = {
      en: enMessages,
      nl: nlMessages,
    };

    const messages = messageMap[locale] || messageMap.en;
    const safeMessages = Object.create(null);
    for (const key in messages) {
      if (Object.prototype.hasOwnProperty.call(messages, key)) {
        safeMessages[key] = messages[key];
      }
    }
    return safeMessages;
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
        return key; // Return key if translation not found
      }
    }

    return typeof value === "string" ? value : key;
  }

  buildMessages(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    context?: ChatContext,
    images?: string[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // Add system prompt with language and unit preference instructions
    let systemPrompt = SYSTEM_PROMPT;
    if (this.unitPreference) {
      systemPrompt += getUnitPreferenceInstruction(this.unitPreference);
    }
    if (this.customUnits && this.customUnits.length > 0) {
      // Keep prompt concise; truncate to first 25 (same limit as schema) if longer
      const limited = this.customUnits.slice(0, 25);
      systemPrompt += `\nUser-defined ingredient units available: ${limited.join(
        ", "
      )}. Use these units when they are appropriate for the ingredient (e.g., "pak" for packaged items, "jar" for jarred goods).`;
    }
    systemPrompt += getLanguageInstruction(this.t.bind(this));
    messages.push({ role: "system", content: systemPrompt });

    // Add form state context if provided
    if (context?.current_form_state) {
      // Skip defaults if this is the first message (no conversation history)
      // This prevents AI bias from default values on initial recipe creation
      const isInitialMessage = conversationHistory.length === 0;
      const formContextMessage = this.buildFormContextMessage(
        context.current_form_state,
        isInitialMessage
      );
      if (formContextMessage) {
        messages.push({ role: "system", content: formContextMessage });
      }
    }

    // Add selected recipe context if provided
    if (context?.selected_recipe) {
      const recipeContextMessage = this.buildRecipeContextMessage(
        context.selected_recipe
      );
      messages.push({ role: "system", content: recipeContextMessage });
    }

    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    });

    // Add current user message with optional images
    if (images && images.length > 0) {
      // Create multimodal message with text and images
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

      // Add text content if present
      if (userMessage.trim()) {
        content.push({ type: "text", text: userMessage });
      }

      // Add images
      images.forEach((imageData) => {
        content.push({
          type: "image_url",
          image_url: {
            url: imageData,
            detail: "auto", // Let OpenAI choose optimal detail level for cost efficiency
          },
        });
      });

      messages.push({ role: "user", content });
    } else {
      // Text-only message
      messages.push({ role: "user", content: userMessage });
    }

    return messages;
  }

  private buildFormContextMessage(
    formState: FormUpdate,
    skipDefaults: boolean = false
  ): string | null {
    const formContextParts: string[] = [];

    if (formState.title) formContextParts.push(`Title: "${formState.title}"`);

    // Skip default values on initial AI context to prevent bias
    if (
      formState.category &&
      (!skipDefaults || formState.category !== "main-course")
    ) {
      formContextParts.push(`Category: ${formState.category}`);
    }

    if (formState.servings && (!skipDefaults || formState.servings !== 4)) {
      formContextParts.push(`Servings: ${formState.servings}`);
    }

    if (formState.ingredients && formState.ingredients.length > 0) {
      // Skip empty default ingredient
      const nonEmptyIngredients = formState.ingredients.filter((ing) =>
        ing.name?.trim()
      );
      if (nonEmptyIngredients.length > 0) {
        const ingredientList = nonEmptyIngredients
          .map((ing) =>
            `${ing.amount || ""} ${ing.unit || ""} ${ing.name}`.trim()
          )
          .join(", ");
        formContextParts.push(`Ingredients: ${ingredientList}`);
      }
    }

    if (formState.description) {
      const truncatedDescription =
        formState.description.length > 100
          ? `${formState.description.slice(0, 100)}...`
          : formState.description;
      formContextParts.push(`Instructions: ${truncatedDescription}`);
    }

    if (formState.tags && formState.tags.length > 0) {
      formContextParts.push(`Tags: ${formState.tags.join(", ")}`);
    }

    if (
      formState.season &&
      (!skipDefaults || formState.season !== "year-round")
    ) {
      formContextParts.push(`Season: ${formState.season}`);
    }

    return formContextParts.length > 0
      ? `Current form state: ${formContextParts.join("; ")}`
      : null;
  }

  private buildRecipeContextMessage(
    recipe: ChatContext["selected_recipe"]
  ): string {
    if (!recipe) return "";
    return `The user is currently looking at the recipe: "${recipe.title}" (${recipe.category})`;
  }

  updateConversationHistory(
    conversationHistory: ChatMessage[],
    userMessage: string,
    assistantResponse: string
  ): ChatMessage[] {
    const updatedHistory = [...conversationHistory];
    updatedHistory.push({ role: "user", content: userMessage });
    updatedHistory.push({ role: "assistant", content: assistantResponse });
    return updatedHistory;
  }
}
