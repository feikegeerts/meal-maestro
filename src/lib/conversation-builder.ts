import { OpenAI } from "openai";
import { SYSTEM_PROMPT, getLanguageInstruction } from "./chat-prompts";

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
  
  constructor(locale: string) {
    this.locale = locale;
  }
  
  buildMessages(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    context?: ChatContext
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    
    // Add system prompt with language instruction
    const systemPrompt = SYSTEM_PROMPT + getLanguageInstruction(this.locale);
    messages.push({ role: "system", content: systemPrompt });
    
    // Add form state context if provided
    if (context?.current_form_state) {
      const formContextMessage = this.buildFormContextMessage(context.current_form_state);
      if (formContextMessage) {
        messages.push({ role: "system", content: formContextMessage });
      }
    }
    
    // Add selected recipe context if provided
    if (context?.selected_recipe) {
      const recipeContextMessage = this.buildRecipeContextMessage(context.selected_recipe);
      messages.push({ role: "system", content: recipeContextMessage });
    }
    
    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    });
    
    // Add current user message
    messages.push({ role: "user", content: userMessage });
    
    return messages;
  }
  
  private buildFormContextMessage(formState: FormUpdate): string | null {
    const formContextParts: string[] = [];
    
    if (formState.title) formContextParts.push(`Title: "${formState.title}"`);
    if (formState.category) formContextParts.push(`Category: ${formState.category}`);
    if (formState.servings) formContextParts.push(`Servings: ${formState.servings}`);
    
    if (formState.ingredients && formState.ingredients.length > 0) {
      const ingredientList = formState.ingredients.map(ing => 
        `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()
      ).join(', ');
      formContextParts.push(`Ingredients: ${ingredientList}`);
    }
    
    if (formState.description) {
      const truncatedDescription = formState.description.length > 100 
        ? `${formState.description.slice(0, 100)}...`
        : formState.description;
      formContextParts.push(`Instructions: ${truncatedDescription}`);
    }
    
    if (formState.tags && formState.tags.length > 0) {
      formContextParts.push(`Tags: ${formState.tags.join(', ')}`);
    }
    
    if (formState.season) formContextParts.push(`Season: ${formState.season}`);
    
    return formContextParts.length > 0 
      ? `Current form state: ${formContextParts.join('; ')}`
      : null;
  }
  
  private buildRecipeContextMessage(recipe: ChatContext['selected_recipe']): string {
    if (!recipe) return '';
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