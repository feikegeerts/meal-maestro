import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { createChatCompletion } from "@/lib/services/openai-service";
import {
  updateRecipeForm,
  recipeFormFunction,
} from "@/lib/services/recipe-functions";
import { 
  RECIPE_CATEGORIES, 
  RECIPE_SEASONS, 
  RECIPE_TAGS,
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
- Provide cooking advice and recipe suggestions

IMPORTANT GUIDELINES:
1. Be helpful and conversational about cooking and recipes
2. When users want to CREATE or MODIFY recipes, use update_recipe_form function to populate form fields
3. CRITICAL: When creating a new recipe, make ONE comprehensive function call with ALL required fields (title, ingredients, description, category, servings) rather than multiple partial calls
4. You can ONLY populate form fields - users must click "Save" to actually save recipes
5. Always provide clear, helpful responses about recipes and cooking
6. Ask clarifying questions when needed for better recipe details
7. When creating recipes, include realistic serving sizes (usually 2-8 servings)
8. Structure ingredients properly with amounts, units, and names. ALWAYS provide appropriate units for ingredients
9. CRITICAL: Write DETAILED, STEP-BY-STEP cooking instructions in the description field. Include prep times, cooking temperatures, specific techniques, and clear sequential steps. Make instructions comprehensive and easy to follow.
10. You are aware of the current form state - use this context in your responses
11. Remember: You are a form assistant - you help fill forms, users save recipes themselves

VALID TAGS (CHOOSE ONLY FROM THESE):
${RECIPE_TAGS.join(', ')}

RECIPE CATEGORIES:
Choose from: ${RECIPE_CATEGORIES.join(', ')}

SEASONS:
Choose from: ${RECIPE_SEASONS.join(', ')}

UNITS FOR INGREDIENTS:
ALWAYS provide appropriate units for ingredients. Available units: ${COOKING_UNITS.join(', ')}

UNIT SELECTION GUIDELINES:
- Liquids: cups, tablespoons, teaspoons, ml, l
- Dry ingredients (flour, sugar, rice): cups, tablespoons, teaspoons, g, kg
- Individual items: pieces, whole, large/medium/small
- Garlic: cloves
- Herbs/spices: teaspoons, tablespoons (or "to taste" with no amount/unit)
- Meat/fish: grams, kg, pounds, ounces (prefer weight over pieces as that's how they're sold)
- Cheese: cups (grated), ounces, g

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

  const { } = authResult;

  try {
    const body: ChatRequest = await request.json();
    const { message, conversation_history = [], context } = body;
    

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
        messages.push({ role: "system", content: contextMessage });
      }
    }

    // Add selected recipe context if provided
    if (context?.selected_recipe) {
      const recipe = context.selected_recipe;
      const contextMessage = `The user is currently looking at the recipe: "${recipe.title}" (${recipe.category})`;
      messages.push({ role: "system", content: contextMessage });
    }

    // Add conversation history
    conversation_history.forEach((msg) => {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    });

    // Add current user message
    messages.push({ role: "user", content: message });

    
    // Create completion with optional function calling
    const completion = await createChatCompletion(
      messages,
      [recipeFormFunction]
    );
    

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
      }
    }

    // Generate appropriate response content
    let responseContent = completion.choices[0].message.content;
    
    // If OpenAI didn't provide response text but made a successful function call, generate a helpful response
    if (!responseContent && functionResult && !functionResult.error) {
      if (functionResult.function === 'update_recipe_form') {
        const formUpdate = functionResult.result?.formUpdate as FormUpdate;
        if (formUpdate?.title) {
          responseContent = `Perfect! I've created a complete recipe for "${formUpdate.title}" with detailed cooking instructions. You can review all the details in the form above and make any adjustments before saving.`;
        } else {
          responseContent = `Great! I've updated the recipe form with your requested changes. Please review the details above and save when ready.`;
        }
      } else {
        responseContent = `I've successfully processed your request. Please check the form above for the updates.`;
      }
    } else if (!responseContent) {
      responseContent = "I apologize, but I encountered an issue processing your request.";
    }

    // Build updated conversation history
    updatedHistory.push({ role: "user", content: message });
    updatedHistory.push({
      role: "assistant",
      content: responseContent,
    });

    const response = {
      response: responseContent,
      conversation_history: updatedHistory,
      function_call: functionResult,
    };
    

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Error) {
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