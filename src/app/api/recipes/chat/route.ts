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

CRITICAL RESPONSE GUIDELINES:
1. MANDATORY: ALWAYS provide helpful, conversational text responses alongside any function calls
2. NEVER make function calls without also providing conversational text - this is absolutely required
3. When making function calls (creating/updating recipes), you MUST ALSO provide detailed conversational text
4. If a user asks multiple questions (e.g., "create a pasta recipe and what wine pairs with it"), address EVERY part in your text response
5. Function calls are for data manipulation, text responses are for user communication - you need BOTH
6. Never rely on system-generated template messages - always craft your own contextual response
7. Be natural, helpful, and comprehensive in your text answers

FORM INTERACTION GUIDELINES:
8. When users want to CREATE or MODIFY recipes, use update_recipe_form function to populate form fields
9. When users provide URLs to recipe websites, use extract_recipe_from_url function to automatically extract and populate recipe data
10. When users paste recipe text (ingredients, instructions, etc.), analyze and extract the data using update_recipe_form to populate the form
11. CRITICAL: ALWAYS be proactive about form filling. Fill what you can infer or know, make reasonable assumptions, and create complete recipes that users can then edit
12. CRITICAL: When creating a new recipe, make ONE comprehensive function call with ALL required fields (title, ingredients, description, category, servings) rather than multiple partial calls
13. CRITICAL: Minimize back-and-forth interactions. Aim to create a complete, usable recipe in the first interaction that users can then customize
14. When you have limited information (like just a recipe title), use your culinary knowledge to create a realistic, complete recipe - don't ask questions first
15. You can ONLY populate form fields - users must click "Save" to actually save recipes
16. Always provide clear, helpful responses about recipes and cooking
17. When creating recipes, include realistic serving sizes (usually 2-8 servings)
18. Structure ingredients properly with amounts, units, and names. ALWAYS provide appropriate units for ingredients
19. CRITICAL: Write DETAILED, STEP-BY-STEP cooking instructions in the description field. Include prep times, cooking temperatures, specific techniques, and clear sequential steps. Make instructions comprehensive and easy to follow.
20. You are aware of the current form state - use this context in your responses
21. Remember: You are a form assistant - you help fill forms, users save recipes themselves
22. PROACTIVE APPROACH: If URL scraping fails but you get a recipe title, immediately create a complete recipe based on that title using your knowledge

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
CRITICAL: ONLY use these exact units: ${COOKING_UNITS.join(', ')}
NEVER use: stuk, el, tl, teen, units.stuk, pieces, or any other custom units.

UNIT SELECTION GUIDELINES:
- Liquids: ml (auto-converts to l when ≥1000ml)
- Dry ingredients (flour, sugar, rice): g (auto-converts to kg when ≥1000g)  
- Individual countable items: NO UNIT (e.g., "3" eggs, "2" onions, "1" quiche form, "2" cloves garlic)
- Small amounts of herbs/spices: tsp, tbsp (or leave amount empty with "to taste" as notes)
- Meat/fish: g (auto-converts to kg when ≥1000g)
- Cheese: g (auto-converts to kg when ≥1000g)

FORBIDDEN UNITS:
Never use: stuk, el, tl, units.stuk, pieces, stuks, or other non-standard abbreviations
Note: For garlic, use "clove" (not "teen") as the standard unit

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

    // Debug logging for initial AI response
    const firstToolCall = completion.choices[0].message.tool_calls?.[0];
    console.log('🔍 [DEBUG] Initial AI Response:', {
      hasContent: !!completion.choices[0].message.content,
      contentLength: completion.choices[0].message.content?.length || 0,
      contentPreview: completion.choices[0].message.content?.substring(0, 100),
      hasToolCalls: !!completion.choices[0].message.tool_calls,
      toolCallName: firstToolCall?.type === 'function' ? firstToolCall.function.name : undefined
    });

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
    
    // Handle URL extraction results - process regardless of whether AI provided initial response
    if (functionResult && !functionResult.error) {
      if (functionResult.function === 'extract_recipe_from_url') {
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
          
          console.log('🔍 [DEBUG] URL Extraction Success:', {
            title: scrapedData.title,
            hasDescription: !!scrapedData.description,
            descriptionLength: scrapedData.description?.length || 0,
            ingredientsCount: scrapedData.ingredients?.length || 0,
            servings: scrapedData.servings
          });
          
          const aiProcessingPrompt = userLocale === 'nl'
            ? `BELANGRIJK: Je moet zowel een functie-aanroep maken als een tekstuele reactie geven!\n\nIk heb de website succesvol gescraped! Hier zijn de ruwe gegevens die ik vond:\n\nTitel: ${scrapedData.title || 'Niet gevonden'}\nInstructies: ${scrapedData.description || 'Niet gevonden'}\nIngrediënten: ${scrapedData.ingredients?.join(', ') || 'Niet gevonden'}\nPorties: ${scrapedData.servings || 'Niet gevonden'}\n\nMaak hiervan nu een compleet recept (via update_recipe_form functie) EN geef een vriendelijke tekstuele reactie over het recept - wat maakt het bijzonder, tips voor bereiding, of andere nuttige informatie.`
            : `IMPORTANT: You must both make a function call AND provide a text response!\n\nI successfully scraped the website! Here's the raw data I found:\n\nTitle: ${scrapedData.title || 'Not found'}\nInstructions: ${scrapedData.description || 'Not found'}\nIngredients: ${scrapedData.ingredients?.join(', ') || 'Not found'}\nServings: ${scrapedData.servings || 'Not found'}\n\nNow turn this into a complete recipe (using update_recipe_form function) AND provide a friendly text response about the recipe - what makes it special, cooking tips, or other helpful information.`;
          
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
          
          // Debug logging for AI response
          console.log('🔍 [DEBUG] URL Processing AI Response:', {
            hasContent: !!processingCompletion.choices[0].message.content,
            contentLength: processingCompletion.choices[0].message.content?.length || 0,
            contentPreview: processingCompletion.choices[0].message.content?.substring(0, 100),
            hasToolCalls: !!processingCompletion.choices[0].message.tool_calls,
            toolCallsCount: processingCompletion.choices[0].message.tool_calls?.length || 0,
          });
          
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
              
              // Use AI's natural response - enhance existing response if we have one
              const aiResponse = processingCompletion.choices[0].message.content;
              console.log('🔍 [DEBUG] AI Response for URL processing:', {
                response: aiResponse,
                hasInitialResponse: !!responseContent,
                usingFallback: !aiResponse && !responseContent
              });
              
              // If we have both initial response and processing response, use the processing one (more detailed)
              // If we only have initial response, keep it
              // If we have neither, use fallback
              if (aiResponse) {
                responseContent = aiResponse;
              } else if (!responseContent) {
                responseContent = userLocale === 'nl' ? 'Recept succesvol verwerkt!' : 'Recipe processed successfully!';
              }
            }
          } else {
            // Fallback if AI doesn't make function call
            responseContent = processingCompletion.choices[0].message.content || translations.chat.extractionProcessingError;
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
                  
                  // Prefer AI's response, fallback to template only if needed
                  responseContent = recipeCompletion.choices[0].message.content || translations.chat.recipeCreatedFromTitle.replace('{title}', urlResult.formUpdate.title || '');
                } else {
                  throw new Error('AI did not generate recipe as expected');
                }
              } else {
                throw new Error('AI did not make function call for recipe generation');
              }
            } catch (error) {
              console.error('🔴 [Chat] Smart error recovery failed:', error);
              // Fallback to simple response with extracted title
              responseContent = translations.chat.titleExtractedOnly.replace('{title}', urlResult.formUpdate.title || '');
            }
          } else {
            // Fallback for when we couldn't extract anything useful
            const baseError = urlResult.source === 'blocked' 
              ? translations.chat.websiteBlocked
              : translations.chat.noRecipeFound;
              
            responseContent = `${baseError}. ${translations.chat.tryManualCopy}`;
          }
        }
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