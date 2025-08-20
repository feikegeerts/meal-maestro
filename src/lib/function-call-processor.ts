import { OpenAI } from "openai";
import { updateRecipeForm, extractRecipeFromUrl, recipeFormFunction, extractRecipeFromUrlFunction } from "./recipe-functions";
import { createChatCompletion } from "./openai-service";
import { getAIProcessingPrompt, getRecipeRecoveryPrompt } from "./chat-prompts";
import { FormUpdate } from "./conversation-builder";

export interface FunctionCallResult {
  function: string;
  result?: unknown;
  error?: string;
}

export interface URLExtractionResult {
  formUpdate: FormUpdate;
  success: boolean;
  error?: string;
  suggestions?: string[];
  source?: string;
}

export class FunctionCallProcessor {
  private locale: string;
  
  constructor(locale: string) {
    this.locale = locale;
  }
  
  static getAvailableFunctions(): OpenAI.Chat.Completions.ChatCompletionCreateParams["tools"] {
    return [recipeFormFunction, extractRecipeFromUrlFunction];
  }
  
  async processFunctionCall(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
    chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    originalResponseContent?: string | null,
    userMessage?: string
  ): Promise<{ functionResult: FunctionCallResult; responseContent: string | null }> {
    if (toolCall.type !== "function") {
      throw new Error("Invalid tool call type");
    }
    
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);
    
    switch (functionName) {
      case "update_recipe_form":
        return this.handleRecipeFormUpdate(functionArgs, originalResponseContent, userMessage);
        
      case "extract_recipe_from_url":
        return this.handleUrlExtraction(functionArgs, chatMessages);
        
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }
  
  private async handleRecipeFormUpdate(
    args: unknown, 
    originalResponseContent?: string | null,
    userMessage?: string
  ): Promise<{ functionResult: FunctionCallResult; responseContent: string | null }> {
    try {
      const result = await updateRecipeForm(args as Record<string, unknown>);
      
      // Use the original AI response content if it exists (from two-call pattern or initial response)
      // Only provide minimal fallback if absolutely necessary
      let finalResponseContent = originalResponseContent;
      
      if (!originalResponseContent) {
        // Simple template for basic recipe requests
        const parsedArgs = args as Record<string, unknown>;
        const recipeTitle = parsedArgs.title as string || 'recept';
        
        finalResponseContent = this.locale === 'nl' 
          ? `Perfect! Ik heb het ${recipeTitle} recept voor je gemaakt. Je kunt de ingrediënten en bereidingswijze nu bekijken en aanpassen naar wens.`
          : `Perfect! I've created the ${recipeTitle} recipe for you. You can now review and adjust the ingredients and instructions as needed.`;
      }
      
      return {
        functionResult: {
          function: "update_recipe_form",
          result,
        },
        responseContent: finalResponseContent || null
      };
    } catch (error) {
      console.error("🔴 [FunctionCallProcessor] Recipe form update error:", error);
      const finalResponseContent = originalResponseContent || (this.locale === 'nl' 
        ? 'Er is een fout opgetreden bij het verwerken van het recept.'
        : 'There was an error processing the recipe.');
      
      return {
        functionResult: {
          function: "update_recipe_form",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        responseContent: finalResponseContent
      };
    }
  }
  
  private async handleUrlExtraction(
    args: unknown,
    chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<{ functionResult: FunctionCallResult; responseContent: string | null }> {
    try {
      const result = await extractRecipeFromUrl(args as Record<string, unknown>) as URLExtractionResult;
      
      if (result.success && result.formUpdate) {
        return this.processSuccessfulExtraction(result, chatMessages);
      } else {
        return this.handleExtractionFailure(result, chatMessages);
      }
    } catch (error) {
      console.error("🔴 [FunctionCallProcessor] URL extraction error:", error);
      return {
        functionResult: {
          function: "extract_recipe_from_url",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        responseContent: null
      };
    }
  }
  
  private async processSuccessfulExtraction(
    urlResult: URLExtractionResult,
    chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<{ functionResult: FunctionCallResult; responseContent: string | null }> {
    const scrapedData = urlResult.formUpdate as {
      title?: string;
      description?: string;
      ingredients?: string[];
      servings?: number;
      category?: string;
    };
    
    const aiProcessingPrompt = getAIProcessingPrompt(this.locale, scrapedData);
    
    const processingMessages = [...chatMessages, {
      role: "user" as const,
      content: aiProcessingPrompt
    }];
    
    const { completion } = await createChatCompletion(
      processingMessages,
      FunctionCallProcessor.getAvailableFunctions()
    );
    
    if (completion.choices[0].message.tool_calls) {
      const processingTool = completion.choices[0].message.tool_calls[0];
      if (processingTool.type === "function" && processingTool.function.name === "update_recipe_form") {
        const processingResult = await updateRecipeForm(
          JSON.parse(processingTool.function.arguments)
        );
        
        const responseContent = completion.choices[0].message.content ||
          (this.locale === 'nl' ? 'Recept succesvol verwerkt!' : 'Recipe processed successfully!');
        
        return {
          functionResult: {
            function: processingTool.function.name,
            result: processingResult,
          },
          responseContent
        };
      }
    }
    
    // Fallback if AI doesn't make function call
    const translations = (await import(`@/messages/${this.locale}.json`)).default;
    return {
      functionResult: {
        function: "extract_recipe_from_url",
        result: urlResult,
      },
      responseContent: completion.choices[0].message.content || translations.chat.extractionProcessingError
    };
  }
  
  private async handleExtractionFailure(
    urlResult: URLExtractionResult,
    chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<{ functionResult: FunctionCallResult; responseContent: string | null }> {
    // Smart error recovery: if we have a title, generate a recipe with AI
    if (urlResult.formUpdate?.title) {
      try {
        const aiRecipePrompt = getRecipeRecoveryPrompt(this.locale, urlResult.formUpdate.title);
        
        const followUpMessages = [...chatMessages, {
          role: "user" as const,
          content: aiRecipePrompt
        }];
        
        const { completion } = await createChatCompletion(
          followUpMessages,
          FunctionCallProcessor.getAvailableFunctions()
        );
        
        if (completion.choices[0].message.tool_calls) {
          const recipeTool = completion.choices[0].message.tool_calls[0];
          if (recipeTool.type === "function" && recipeTool.function.name === "update_recipe_form") {
            const recipeResult = await updateRecipeForm(
              JSON.parse(recipeTool.function.arguments)
            );
            
            const translations = (await import(`@/messages/${this.locale}.json`)).default;
            const responseContent = completion.choices[0].message.content ||
              translations.chat.recipeCreatedFromTitle.replace('{title}', urlResult.formUpdate.title || '');
            
            return {
              functionResult: {
                function: recipeTool.function.name,
                result: recipeResult,
              },
              responseContent
            };
          }
        }
        
        throw new Error('AI did not generate recipe as expected');
      } catch (error) {
        console.error('🔴 [FunctionCallProcessor] Smart error recovery failed:', error);
        
        const translations = (await import(`@/messages/${this.locale}.json`)).default;
        return {
          functionResult: {
            function: "extract_recipe_from_url",
            result: urlResult,
          },
          responseContent: translations.chat.titleExtractedOnly.replace('{title}', urlResult.formUpdate.title || '')
        };
      }
    }
    
    // Fallback for when we couldn't extract anything useful
    const translations = (await import(`@/messages/${this.locale}.json`)).default;
    const baseError = urlResult.source === 'blocked'
      ? translations.chat.websiteBlocked
      : translations.chat.noRecipeFound;
    
    return {
      functionResult: {
        function: "extract_recipe_from_url",
        result: urlResult,
      },
      responseContent: `${baseError}. ${translations.chat.tryManualCopy}`
    };
  }
}