import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/services/auth.js';
import { createChatCompletion, validateOpenAIConfig, usageTracker } from '$lib/services/openaiService.js';
import { recipeTools, RecipeFunctionHandler, formatFunctionResult } from '$lib/services/recipeFunctions.js';
import { logApiUsage } from '$lib/services/actionLogger.js';
import type { OpenAI } from 'openai';


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

CRITICAL: FUNCTION CHAINING FOR OPERATIONS:
- You can call multiple functions in sequence to complete complex tasks
- When a user asks to delete, update, or mark a recipe as eaten BY NAME, you should:
  1. FIRST search for the recipe using search_recipes
  2. If found, SHOW the recipe details and ASK FOR CONFIRMATION before destructive actions
  3. ONLY proceed with delete/update after explicit user confirmation
- For example: "delete chocolate cake" → search_recipes → show found recipe → ask "Are you sure you want to delete this recipe?" → wait for confirmation → delete_recipe
- Do NOT ask the user for recipe IDs - search for them automatically
- ALWAYS confirm before deleting recipes - this is a destructive action that cannot be undone
- Only ask for clarification if multiple recipes match and you need to disambiguate

Remember to use the function tools to interact with the recipe database.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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

export const POST: RequestHandler = async (event) => {
  // Require authentication
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const { user, client: supabase } = authResult;
  
  try {
    // Validate OpenAI configuration
    const configValidation = validateOpenAIConfig();
    if (!configValidation.valid) {
      return json({ 
        error: 'OpenAI configuration error', 
        details: configValidation.error 
      }, { status: 500 });
    }

    const requestData = await event.request.json() as ChatRequest;
    const { message, conversation_history = [], context } = requestData;

    if (!message || typeof message !== 'string') {
      return json({ error: 'Message is required and must be a string' }, { status: 400 });
    }

    // Build the system prompt with context information
    let systemPromptWithContext = SYSTEM_PROMPT;
    
    if (context) {
      systemPromptWithContext += '\n\nCURRENT CONTEXT:';
      
      if (context.current_tab) {
        systemPromptWithContext += `\n- User is currently on the "${context.current_tab}" tab`;
      }
      
      if (context.selected_recipe) {
        const recipe = context.selected_recipe;
        systemPromptWithContext += `\n- User is looking at the recipe: "${recipe.title}"`;
        systemPromptWithContext += `\n  - Category: ${recipe.category}`;
        if (recipe.season) systemPromptWithContext += `\n  - Season: ${recipe.season}`;
        systemPromptWithContext += `\n  - Tags: ${recipe.tags.join(', ')}`;
        systemPromptWithContext += `\n  - Ingredients: ${recipe.ingredients.slice(0, 5).join(', ')}${recipe.ingredients.length > 5 ? '...' : ''}`;
        systemPromptWithContext += `\n  - This means when they refer to "this recipe", "it", or ask about cooking instructions, they are likely referring to "${recipe.title}"`;
      }
    }

    // Build the conversation messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPromptWithContext },
      ...conversation_history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Initialize the recipe function handler with user context
    const functionHandler = new RecipeFunctionHandler(supabase, user.id);

    // Create the initial chat completion
    const { completion, usage } = await createChatCompletion(messages, recipeTools);

    const choice = completion.choices[0];
    if (!choice) {
      return json({ error: 'No response generated' }, { status: 500 });
    }

    let finalResponse = '';
    let functionResults: any[] = [];
    let updatedMessages = [...messages];

    // Handle function calls iteratively
    let currentCompletion = completion;
    let currentChoice = choice;
    
    // Continue processing function calls until no more are needed
    while (currentChoice.message.tool_calls) {
      // Add the assistant's message with function calls
      updatedMessages.push(currentChoice.message);

      // Process each function call
      for (const toolCall of currentChoice.message.tool_calls) {
        if (toolCall.type === 'function') {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
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

      // Get next response after function calls
      const { completion: nextCompletion, usage: nextUsage } = await createChatCompletion(
        updatedMessages,
        recipeTools
      );

      currentCompletion = nextCompletion;
      currentChoice = nextCompletion.choices[0];
      
      // Combine usage statistics
      usage.tokens.prompt_tokens += nextUsage.tokens.prompt_tokens;
      usage.tokens.completion_tokens += nextUsage.tokens.completion_tokens;
      usage.tokens.total_tokens += nextUsage.tokens.total_tokens;
      usage.cost_usd += nextUsage.cost_usd;
      
      // Safety check to prevent infinite loops
      if (functionResults.length > 20) {
        console.warn('Function call limit reached to prevent infinite loops');
        break;
      }
    }

    // Get final response
    finalResponse = currentChoice?.message?.content || 'I apologize, but I encountered an issue processing your request.';

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
      if (error.message.toLowerCase().includes('rate limit')) {
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