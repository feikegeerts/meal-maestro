import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import {
  createChatCompletion,
  usageTracker,
} from "@/lib/services/openai-service";
import {
  RecipeFunctionHandler,
  recipeFunctions,
  formatFunctionResult,
} from "@/lib/services/recipe-functions";
import { OpenAI } from "openai";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
}

interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  context?: {
    current_tab?: string;
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

const SYSTEM_PROMPT = `You are Meal Maestro, an AI-powered recipe assistant. You help users manage their recipe collection through natural language conversations.

AVAILABLE FUNCTIONS:
- Search for recipes by various criteria (title, ingredients, category, tags, season)
- Add new recipes to the database (only when explicitly creating new recipes)
- Update recipe form with new data (use this to modify the current form fields)
- Get detailed information about specific recipes

IMPORTANT GUIDELINES:
1. Be helpful and conversational
2. When users ask for recipes, use appropriate search criteria
3. When users want to create NEW recipes, use add_recipe function
4. When users want to MODIFY the current recipe form, use update_recipe_form function
5. Always provide clear, formatted responses about recipes
6. Ask clarifying questions when needed
7. When creating recipes, make sure to include realistic serving sizes (usually 2-8 servings)
8. Structure ingredients properly with amounts, units, and names
9. IMPORTANT: Write detailed, step-by-step cooking instructions

VALID TAGS (CHOOSE ONLY FROM THESE):
Dietary: vegetarian, vegan, gluten-free, dairy-free, nut-free, keto, paleo, low-carb, low-fat, sugar-free, low-sodium, high-protein
Cuisine: italian, mexican, chinese, indian, thai, french, mediterranean, american, japanese, korean, greek, spanish, middle-eastern, cajun, southern
Cooking Methods: baking, grilling, frying, roasting, steaming, slow-cooking, air-fryer, instant-pot, no-cook, one-pot, stir-fry, braising, smoking, pressure-cooker
Characteristics: quick, easy, healthy, comfort-food, spicy, mild, sweet, savory, crispy, creamy, fresh, hearty, light, rich
Occasions: party, holiday, weeknight, meal-prep, kid-friendly, date-night, potluck, picnic, brunch, entertaining, budget-friendly, leftover-friendly
Proteins: chicken, beef, pork, fish, seafood, tofu, beans, eggs, turkey, lamb, duck, plant-based
Dish Types: soup, salad, sandwich, pasta, pizza, bread, cookies, cake, pie, smoothie, cocktail, sauce, dip, marinade, dressing

RECIPE CATEGORIES:
Choose from: breakfast, lunch, dinner, dessert, snack, appetizer, beverage

SEASONS:
Choose from: spring, summer, fall, winter, year-round

Remember to use the function tools to interact with the recipe database.`;

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;

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

    // Add context if provided
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

    // Initialize function handler
    const functionHandler = new RecipeFunctionHandler(supabase, user.id);
    const functionResults: { function: string; result: unknown }[] = [];

    // Create initial completion with function calling
    let currentCompletion = await createChatCompletion(
      messages,
      recipeFunctions
    );
    const totalUsage = { ...currentCompletion.usage };

    // Process function calls iteratively
    while (currentCompletion.completion.choices[0].message.tool_calls) {
      // Add assistant message with function calls
      messages.push(currentCompletion.completion.choices[0].message);

      // Process each function call
      for (const toolCall of currentCompletion.completion.choices[0].message
        .tool_calls) {
        if (toolCall.type === "function") {
          try {
            const result = await functionHandler.handleFunctionCall(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments)
            );

            functionResults.push({
              function: toolCall.function.name,
              result,
            });

            // Add function result to conversation
            messages.push({
              role: "tool",
              content: formatFunctionResult(toolCall.function.name, result),
              tool_call_id: toolCall.id,
            });
          } catch (error) {
            console.error(
              `Function call error for ${toolCall.function.name}:`,
              error
            );

            // Add error result to conversation
            messages.push({
              role: "tool",
              content: JSON.stringify({
                function: toolCall.function.name,
                error: error instanceof Error ? error.message : "Unknown error",
              }),
              tool_call_id: toolCall.id,
            });
          }
        }
      }

      // Get next response
      const nextCompletion = await createChatCompletion(
        messages,
        recipeFunctions
      );
      currentCompletion = nextCompletion;

      // Accumulate usage
      totalUsage.tokens.prompt_tokens +=
        nextCompletion.usage.tokens.prompt_tokens;
      totalUsage.tokens.completion_tokens +=
        nextCompletion.usage.tokens.completion_tokens;
      totalUsage.tokens.total_tokens +=
        nextCompletion.usage.tokens.total_tokens;
      totalUsage.cost_usd += nextCompletion.usage.cost_usd;

      // Safety check to prevent infinite loops
      if (functionResults.length > 10) {
        console.warn("Function call limit reached");
        break;
      }
    }

    // Build updated conversation history
    const updatedHistory: ChatMessage[] = [
      ...conversation_history,
      { role: "user", content: message },
      {
        role: "assistant",
        content:
          currentCompletion.completion.choices[0].message.content ||
          "I apologize, but I encountered an issue processing your request.",
      },
    ];

    const response = {
      response: currentCompletion.completion.choices[0].message.content,
      conversation_history: updatedHistory,
      function_calls: functionResults,
      usage: totalUsage,
      system_stats: usageTracker.getUsageStats(),
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
