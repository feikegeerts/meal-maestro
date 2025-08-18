import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { createChatCompletion } from "@/lib/openai-service";
import { usageTrackingService } from "@/lib/usage-tracking-service";
import {
  updateRecipeForm,
  recipeFormFunction,
  extractRecipeFromUrl,
  extractRecipeFromUrlFunction,
} from "@/lib/recipe-functions";
import { 
  RECIPE_CATEGORIES, 
  RECIPE_SEASONS, 
  CUISINE_TYPES,
  DIET_TYPES,
  COOKING_METHOD_TYPES,
  DISH_TYPES,
  PROTEIN_TYPES,
  OCCASION_TYPES,
  CHARACTERISTIC_TYPES,
  COOKING_UNITS 
} from "@/types/recipe";
import { OpenAI } from "openai";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
}

interface FormUpdate {
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

interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  locale?: string;
  context?: {
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
  };
}

const SYSTEM_PROMPT = `You are Meal Maestro, an AI-powered recipe form assistant. You help users create and edit recipes by filling out recipe forms through natural conversation.

YOUR PRIMARY FUNCTION:
- Help users populate recipe form fields through conversation
- Use the update_recipe_form function to fill form fields based on user requests
- Use the extract_recipe_from_url function when users provide recipe URLs
- Provide cooking advice and recipe suggestions

IMPORTANT GUIDELINES:
1. Be helpful and conversational about cooking and recipes
2. When users want to CREATE or MODIFY recipes, use update_recipe_form function to populate form fields
3. When users provide URLs to recipe websites, use extract_recipe_from_url function to automatically extract and populate recipe data
4. When users paste recipe text (ingredients, instructions, etc.), analyze and extract the data using update_recipe_form to populate the form
5. CRITICAL: ALWAYS be proactive about form filling. Fill what you can infer or know, make reasonable assumptions, and create complete recipes that users can then edit
6. CRITICAL: When creating a new recipe, make ONE comprehensive function call with ALL required fields (title, ingredients, description, category, servings) rather than multiple partial calls
7. CRITICAL: Minimize back-and-forth interactions. Aim to create a complete, usable recipe in the first interaction that users can then customize
8. When you have limited information (like just a recipe title), use your culinary knowledge to create a realistic, complete recipe - don't ask questions first
9. You can ONLY populate form fields - users must click "Save" to actually save recipes
10. Always provide clear, helpful responses about recipes and cooking
11. When creating recipes, include realistic serving sizes (usually 2-8 servings)
12. Structure ingredients properly with amounts, units, and names. ALWAYS provide appropriate units for ingredients
13. CRITICAL: Write DETAILED, STEP-BY-STEP cooking instructions in the description field. Include prep times, cooking temperatures, specific techniques, and clear sequential steps. Make instructions comprehensive and easy to follow.
14. You are aware of the current form state - use this context in your responses
15. Remember: You are a form assistant - you help fill forms, users save recipes themselves
16. PROACTIVE APPROACH: If URL scraping fails but you get a recipe title, immediately create a complete recipe based on that title using your knowledge

VALID CATEGORIZED TAGS (CHOOSE ONLY FROM THESE):

CUISINES (choose one): ${CUISINE_TYPES.join(', ')}
DIET TYPES (multiple allowed): ${DIET_TYPES.join(', ')}
COOKING METHODS (multiple allowed): ${COOKING_METHOD_TYPES.join(', ')}
DISH TYPES (multiple allowed): ${DISH_TYPES.join(', ')}
PROTEIN TYPES (multiple allowed): ${PROTEIN_TYPES.join(', ')}
OCCASIONS (multiple allowed): ${OCCASION_TYPES.join(', ')}
CHARACTERISTICS (multiple allowed): ${CHARACTERISTIC_TYPES.join(', ')}

RECIPE CATEGORIES:
Choose from: ${RECIPE_CATEGORIES.join(', ')}

SEASONS:
Choose from: ${RECIPE_SEASONS.join(', ')}

UNITS FOR INGREDIENTS:
ALWAYS provide appropriate units for ingredients. Available units: ${COOKING_UNITS.join(', ')}

UNIT SELECTION GUIDELINES:
- Liquids: ml (auto-converts to l when ≥1000ml)
- Dry ingredients (flour, sugar, rice): g (auto-converts to kg when ≥1000g)
- Individual items: no unit needed (e.g., "3 eggs", "2 onions")
- Herbs/spices: tsp, tbsp (or "to taste" with no amount/unit)
- Meat/fish: g (auto-converts to kg when ≥1000g)
- Cheese: g (auto-converts to kg when ≥1000g)

SMART CONVERSIONS:
- 1000g automatically becomes 1 kg
- 1500g automatically becomes 1.5 kg  
- 1000ml automatically becomes 1 l
- 1500ml automatically becomes 1.5 l

DESCRIPTION FIELD REQUIREMENTS:
- Must be detailed cooking instructions, not just a brief description
- Include step-by-step process with clear numbering
- Each numbered step MUST be on a separate line for better readability
- Mention cooking times, temperatures, and techniques
- Provide prep and cooking instructions separately when relevant
- Make it comprehensive enough for someone to follow successfully
- Example format:
"1. Preheat oven to 350°F.
2. In a large bowl, mix ingredients until well combined.
3. Bake for 25-30 minutes until golden brown."`;

export async function POST(request: NextRequest) {
  
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body: ChatRequest = await request.json();
    const { message, conversation_history = [], context, locale } = body;

    // Detect user language from request body, headers, or URL
    const acceptLanguage = request.headers.get('accept-language') || '';
    const isNl = locale === 'nl' || acceptLanguage.includes('nl') || request.url.includes('/nl/');
    const userLocale = isNl ? 'nl' : 'en';

    // Load translations for the detected locale
    const translations = (await import(`@/messages/${userLocale}.json`)).default;
    

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build conversation messages with language instruction
    const languageInstruction = userLocale === 'nl' 
      ? '\n\nCRITICAL INSTRUCTION: Always respond in Dutch (Nederlands). Use Dutch terminology for cooking terms, measurements, and all text. Never respond in English when the user locale is Dutch.'
      : '\n\nCRITICAL INSTRUCTION: Always respond in English.';
    
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT + languageInstruction },
    ];

    // Add form state context if provided
    if (context?.current_form_state) {
      const formState = context.current_form_state;
      const formContextParts = [];
      
      if (formState.title) formContextParts.push(`Title: "${formState.title}"`);
      if (formState.category) formContextParts.push(`Category: ${formState.category}`);
      if (formState.servings) formContextParts.push(`Servings: ${formState.servings}`);
      if (formState.ingredients && formState.ingredients.length > 0) {
        const ingredientList = formState.ingredients.map(ing => 
          `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()
        ).join(', ');
        formContextParts.push(`Ingredients: ${ingredientList}`);
      }
      if (formState.description) formContextParts.push(`Instructions: ${formState.description.slice(0, 100)}${formState.description.length > 100 ? '...' : ''}`);
      if (formState.tags && formState.tags.length > 0) formContextParts.push(`Tags: ${formState.tags.join(', ')}`);
      if (formState.season) formContextParts.push(`Season: ${formState.season}`);
      
      if (formContextParts.length > 0) {
        const contextMessage = `Current form state: ${formContextParts.join('; ')}`;
        chatMessages.push({ role: "system", content: contextMessage });
      }
    }

    // Add selected recipe context if provided
    if (context?.selected_recipe) {
      const recipe = context.selected_recipe;
      const contextMessage = `The user is currently looking at the recipe: "${recipe.title}" (${recipe.category})`;
      chatMessages.push({ role: "system", content: contextMessage });
    }

    // Add conversation history
    conversation_history.forEach((msg) => {
      chatMessages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    });

    // Add current user message
    chatMessages.push({ role: "user", content: message });

    
    // Create completion with optional function calling and usage tracking
    const { completion, usage } = await createChatCompletion(
      chatMessages,
      [recipeFormFunction, extractRecipeFromUrlFunction]
    );

    // Log usage for cost tracking and outlier detection
    const usageLog = await usageTrackingService.logUsage(
      user.id,
      '/api/recipes/chat',
      usage
    );

    if (!usageLog.success) {
      console.warn('🟡 [Chat] Failed to log usage:', usageLog.error);
    }
    

    let functionResult = null;
    const updatedHistory = [...conversation_history];

    // Handle function call if present
    if (completion.choices[0].message.tool_calls) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      if (toolCall.type === "function" && toolCall.function.name === "update_recipe_form") {
        
        try {
          const result = await updateRecipeForm(
            JSON.parse(toolCall.function.arguments)
          );
          
          functionResult = {
            function: toolCall.function.name,
            result,
          };
        } catch (error) {
          console.error("🔴 [Chat] Function call error:", error);
          functionResult = {
            function: toolCall.function.name,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      } else if (toolCall.type === "function" && toolCall.function.name === "extract_recipe_from_url") {
        
        try {
          const result = await extractRecipeFromUrl(
            JSON.parse(toolCall.function.arguments)
          );
          
          functionResult = {
            function: toolCall.function.name,
            result,
          };
        } catch (error) {
          console.error("🔴 [Chat] URL extraction error:", error);
          functionResult = {
            function: toolCall.function.name,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    }

    // Generate appropriate response content
    let responseContent = completion.choices[0].message.content;
    
    // If OpenAI didn't provide response text but made a successful function call, generate a helpful response
    if (!responseContent && functionResult && !functionResult.error) {
      if (functionResult.function === 'update_recipe_form') {
        const formUpdate = functionResult.result?.formUpdate as FormUpdate;
        if (formUpdate?.title) {
          responseContent = translations.chat.recipeCreatedWithTitle.replace('{title}', formUpdate.title);
        } else {
          responseContent = translations.chat.recipeFormUpdated;
        }
      } else if (functionResult.function === 'extract_recipe_from_url') {
        const urlResult = functionResult.result as { 
          formUpdate: FormUpdate; 
          success: boolean; 
          error?: string; 
          suggestions?: string[];
          source?: string;
        };
        
        if (urlResult.success && urlResult.formUpdate) {
          // Pass scraped data through AI for cleaning and structuring
          const scrapedData = urlResult.formUpdate as { title?: string; description?: string; ingredients?: string[]; servings?: number; category?: string };
          
          const aiProcessingPrompt = userLocale === 'nl'
            ? `Verwerk deze ruwe recept gegevens van een website tot een goed gestructureerd recept:\n\nTitel: ${scrapedData.title || 'Niet gevonden'}\nInstructies: ${scrapedData.description || 'Niet gevonden'}\nIngrediënten: ${scrapedData.ingredients?.join(', ') || 'Niet gevonden'}\nPorties: ${scrapedData.servings || 'Niet gevonden'}\n\nMaak hiervan een compleet recept met stap-voor-stap instructies.`
            : `Process this raw recipe data from a website into a well-structured recipe:\n\nTitle: ${scrapedData.title || 'Not found'}\nInstructions: ${scrapedData.description || 'Not found'}\nIngredients: ${scrapedData.ingredients?.join(', ') || 'Not found'}\nServings: ${scrapedData.servings || 'Not found'}\n\nMake this into a complete recipe with step-by-step instructions.`;
          
          // Add the AI processing message to conversation  
          const processingMessages = [...chatMessages, {
            role: "user" as const,
            content: aiProcessingPrompt
          }];
          
          // Generate new completion for recipe processing
          const { completion: processingCompletion } = await createChatCompletion(
            processingMessages,
            [recipeFormFunction, extractRecipeFromUrlFunction]
          );
          
          // Handle the recipe processing function call
          if (processingCompletion.choices[0].message.tool_calls) {
            const processingTool = processingCompletion.choices[0].message.tool_calls[0];
            if (processingTool.type === "function" && processingTool.function.name === "update_recipe_form") {
              const processingResult = await updateRecipeForm(
                JSON.parse(processingTool.function.arguments)
              );
              
              functionResult = {
                function: processingTool.function.name,
                result: processingResult,
              };
              
              responseContent = userLocale === 'nl'
                ? `Recept "${scrapedData.title}" is succesvol opgehaald van de URL en verwerkt! Ik heb de gegevens opgeschoond en ingevuld in het formulier.`
                : `Recipe "${scrapedData.title}" has been successfully extracted from the URL and processed! I've cleaned up the data and populated the form.`;
            }
          } else {
            // Fallback if AI doesn't make function call
            responseContent = processingCompletion.choices[0].message.content || (userLocale === 'nl' 
              ? 'Recept data is opgehaald maar er was een probleem met de verwerking.'
              : 'Recipe data was extracted but there was an issue with processing.');
          }
        } else {
          // Smart error recovery: if we have a title, generate a recipe with AI
          if (urlResult.formUpdate?.title) {
            try {
              // Create a follow-up prompt for AI to generate recipe based on extracted title
              const aiRecipePrompt = userLocale === 'nl'
                ? `Ik kon de website niet scrapen, maar heb de titel "${urlResult.formUpdate.title}" uit de URL gehaald. Maak nu een compleet recept gebaseerd op deze titel met realistische ingrediënten, gedetailleerde bereidingswijze, porties, en juiste categorie. Gebruik je culinaire kennis om een bruikbaar recept te maken dat de gebruiker kan aanpassen.`
                : `I couldn't scrape the website, but extracted the title "${urlResult.formUpdate.title}" from the URL. Now create a complete recipe based on this title with realistic ingredients, detailed instructions, servings, and appropriate category. Use your culinary knowledge to make a usable recipe that the user can customize.`;
              
              // Add the follow-up message to conversation
              const followUpMessages = [...chatMessages, {
                role: "user" as const,
                content: aiRecipePrompt
              }];
              
              // Generate new completion for recipe creation
              const { completion: recipeCompletion } = await createChatCompletion(
                followUpMessages,
                [recipeFormFunction, extractRecipeFromUrlFunction]
              );
              
              // Handle the recipe generation function call
              if (recipeCompletion.choices[0].message.tool_calls) {
                const recipeTool = recipeCompletion.choices[0].message.tool_calls[0];
                if (recipeTool.type === "function" && recipeTool.function.name === "update_recipe_form") {
                  const recipeResult = await updateRecipeForm(
                    JSON.parse(recipeTool.function.arguments)
                  );
                  
                  // Update function result for response
                  functionResult = {
                    function: recipeTool.function.name,
                    result: recipeResult,
                  };
                  
                  // Set success response
                  responseContent = userLocale === 'nl'
                    ? `Ik kon de website niet scrapen, maar heb een compleet recept voor "${urlResult.formUpdate.title}" gemaakt gebaseerd op de titel uit de URL. Je kunt het nu aanpassen naar wens!`
                    : `I couldn't scrape the website, but created a complete recipe for "${urlResult.formUpdate.title}" based on the title from the URL. You can now customize it as needed!`;
                } else {
                  throw new Error('AI did not generate recipe as expected');
                }
              } else {
                throw new Error('AI did not make function call for recipe generation');
              }
            } catch (error) {
              console.error('🔴 [Chat] Smart error recovery failed:', error);
              // Fallback to simple response with extracted title
              responseContent = userLocale === 'nl'
                ? `Ik kon de website niet scrapen, maar heb de titel "${urlResult.formUpdate.title}" uit de URL gehaald en ingevuld. Je kunt nu handmatig ingrediënten en bereidingswijze toevoegen.`
                : `I couldn't scrape the website, but extracted the title "${urlResult.formUpdate.title}" from the URL and filled it in. You can now manually add ingredients and instructions.`;
            }
          } else {
            // Fallback for when we couldn't extract anything useful
            const baseError = urlResult.source === 'blocked' 
              ? (userLocale === 'nl' ? 'Website blokkeert toegang' : 'Website blocks access')
              : (userLocale === 'nl' ? 'Kon geen recept vinden op de website' : 'Could not find recipe on website');
              
            responseContent = userLocale === 'nl'
              ? `${baseError}. Probeer de recept tekst handmatig te kopiëren en in de chat te plakken, dan kan ik je helpen met het verwerken.`
              : `${baseError}. Try copying the recipe text manually and pasting it in the chat, then I can help you process it.`;
          }
        }
      } else {
        responseContent = translations.chat.requestProcessed;
      }
    } else if (!responseContent) {
      responseContent = translations.chat.processingError;
    }

    // Ensure responseContent is never null
    const finalResponseContent = responseContent || translations.chat.processingError;

    // Build updated conversation history
    updatedHistory.push({ role: "user", content: message });
    updatedHistory.push({
      role: "assistant",
      content: finalResponseContent,
    });

    const response = {
      response: finalResponseContent,
      conversation_history: updatedHistory,
      function_call: functionResult,
    };
    

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timeout - please try again with a shorter message" },
          { status: 408 }
        );
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      if (
        error.message.includes("quota") ||
        error.message.includes("billing")
      ) {
        return NextResponse.json(
          { error: "OpenAI quota exceeded. Please check your billing." },
          { status: 402 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error while processing chat request" },
      { status: 500 }
    );
  }
}