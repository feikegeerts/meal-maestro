import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createChatCompletion, validateOpenAIConfig, usageTracker } from '$lib/services/openaiService.js';
import { recipeTools, RecipeFunctionHandler, formatFunctionResult } from '$lib/services/recipeFunctions.js';
import { logApiUsage } from '$lib/services/actionLogger.js';
import type { OpenAI } from 'openai';

if (dev) {
  dotenv.config({ path: '.env.local' });
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. Please set them in your .env.local file.');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are Meal Maestro, an AI-powered recipe assistant. You help users manage their recipe collection through natural language conversations.

You have access to functions that allow you to:
- Search for recipes by various criteria (title, ingredients, category, tags, season)
- Add new recipes to the database
- Update existing recipes
- Mark recipes as eaten (update last_eaten timestamp)
- Delete recipes
- Get detailed information about specific recipes

IMPORTANT GUIDELINES:
1. Be helpful and conversational
2. When users ask for recipes, use appropriate search criteria
3. When adding recipes, make sure to extract all necessary information
4. When updating recipes, only modify the fields that were mentioned
5. Always confirm destructive actions like deleting recipes
6. Provide clear, formatted responses about recipes
7. If you need more information to complete a task, ask clarifying questions

CRITICAL: SINGLE RECIPE DISPLAY RULE:
- The user interface can only display ONE recipe at a time
- When a search returns multiple recipes, you MUST ask clarifying questions to help the user narrow down to exactly one recipe
- Provide a brief overview of the found recipes (title, category) and ask the user to specify which one they want to see
- Only use get_recipe_details when the user has clearly indicated which specific recipe they want to view
- For example: "I found 3 dinner recipes: 1) Chicken Pasta (dinner), 2) Beef Stir Fry (dinner), 3) Salmon Teriyaki (dinner). Which one would you like to see the full details for?"

Remember to use the function tools to interact with the recipe database. All actions are logged automatically.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Validate OpenAI configuration
    const configValidation = validateOpenAIConfig();
    if (!configValidation.valid) {
      return json({ 
        error: 'OpenAI configuration error', 
        details: configValidation.error 
      }, { status: 500 });
    }

    const requestData = await request.json() as ChatRequest;
    const { message, conversation_history = [] } = requestData;

    if (!message || typeof message !== 'string') {
      return json({ error: 'Message is required and must be a string' }, { status: 400 });
    }

    // Build the conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation_history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Initialize the recipe function handler
    const functionHandler = new RecipeFunctionHandler(supabase);

    // Create the initial chat completion
    const { completion, usage } = await createChatCompletion(messages, recipeTools);

    const choice = completion.choices[0];
    if (!choice) {
      return json({ error: 'No response generated' }, { status: 500 });
    }

    let finalResponse = '';
    let functionResults: any[] = [];
    let updatedMessages = [...messages];

    // Handle function calls
    if (choice.message.tool_calls) {
      // Add the assistant's message with function calls
      updatedMessages.push(choice.message);

      // Process each function call
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === 'function') {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            console.log(`Executing function: ${functionName}`, functionArgs);
            
            // Execute the function
            const result = await functionHandler.handleFunctionCall(functionName, functionArgs);
            functionResults.push({ function: functionName, result });
            
            // Add function result to conversation
            updatedMessages.push({
              role: 'tool',
              content: formatFunctionResult(functionName, result),
              tool_call_id: toolCall.id
            });
          } catch (error) {
            console.error(`Function execution error for ${toolCall.function.name}:`, error);
            
            // Add error message to conversation
            updatedMessages.push({
              role: 'tool',
              content: `Error executing function: ${error instanceof Error ? error.message : 'Unknown error'}`,
              tool_call_id: toolCall.id
            });
          }
        }
      }

      // Get final response after function calls
      const { completion: finalCompletion, usage: finalUsage } = await createChatCompletion(
        updatedMessages,
        recipeTools
      );

      finalResponse = finalCompletion.choices[0]?.message?.content || 'I apologize, but I encountered an issue processing your request.';
      
      // Combine usage statistics
      usage.tokens.prompt_tokens += finalUsage.tokens.prompt_tokens;
      usage.tokens.completion_tokens += finalUsage.tokens.completion_tokens;
      usage.tokens.total_tokens += finalUsage.tokens.total_tokens;
      usage.cost_usd += finalUsage.cost_usd;
    } else {
      // No function calls, use the direct response
      finalResponse = choice.message.content || 'I apologize, but I encountered an issue processing your request.';
    }

    // Log API usage to database
    await logApiUsage(supabase, 'chat', usage.tokens.total_tokens, usage.cost_usd);

    // Get current usage statistics
    const usageStats = usageTracker.getUsageStats();

    return json({
      response: finalResponse,
      conversation_history: [
        ...conversation_history,
        { role: 'user', content: message },
        { role: 'assistant', content: finalResponse }
      ],
      function_calls: functionResults,
      usage: {
        tokens: usage.tokens,
        cost_usd: usage.cost_usd,
        model: usage.model
      },
      system_stats: {
        requests_this_minute: usageStats.requests,
        daily_cost: usageStats.dailyCost,
        daily_budget: usageStats.maxDailyCost
      }
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return json({ 
          error: 'Rate limit exceeded', 
          details: 'Please wait a moment before making another request' 
        }, { status: 429 });
      }
      
      if (error.message.includes('quota') || error.message.includes('billing')) {
        return json({ 
          error: 'OpenAI API quota exceeded', 
          details: 'Please check your OpenAI account billing' 
        }, { status: 402 });
      }
    }
    
    return json({ 
      error: 'An error occurred while processing your request', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};

// GET endpoint for testing and status
export const GET: RequestHandler = async () => {
  try {
    const configValidation = validateOpenAIConfig();
    const usageStats = usageTracker.getUsageStats();
    
    return json({
      status: 'Chat endpoint is ready',
      openai_config: configValidation.valid ? 'Valid' : configValidation.error,
      usage_stats: {
        requests_this_minute: usageStats.requests,
        daily_cost: usageStats.dailyCost,
        daily_budget: usageStats.maxDailyCost
      },
      available_functions: recipeTools?.map(tool => tool.function?.name) || []
    });
  } catch (error) {
    return json({ 
      error: 'Status check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};