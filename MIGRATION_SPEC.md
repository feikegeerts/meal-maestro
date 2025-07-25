# Meal Maestro: Complete Migration Specification

## Executive Summary

**Meal Maestro** is a sophisticated AI-powered recipe management system built with NextJS, Supabase, and OpenAI. This document provides a complete, technology-agnostic specification for rebuilding the entire application in Next.js or any other modern web framework.

### Core Features

- **AI-Powered Recipe Management**: Natural language recipe operations via OpenAI GPT
- **User Authentication**: Google OAuth integration with Supabase Auth
- **Recipe CRUD Operations**: Full recipe lifecycle management
- **Advanced Search & Filtering**: Multi-criteria recipe discovery
- **Action Logging**: Comprehensive audit trail of all operations
- **Cost Tracking**: OpenAI API usage monitoring and budget management
- **Responsive Design**: Mobile-first UI with dark mode support

---

## Table of Contents

1. [Product Requirements](#1-product-requirements)
2. [Database Schema](#2-database-schema)
3. [API Specifications](#3-api-specifications)
4. [OpenAI Integration](#4-openai-integration)
5. [Authentication System](#5-authentication-system)
6. [UI/UX Specifications](#6-uiux-specifications)
7. [Testing Strategy](#7-testing-strategy)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Migration Guidelines](#9-migration-guidelines)

---

## 1. Product Requirements

### 1.1 User Stories

#### Core Recipe Management

- **As a user**, I want to add recipes through natural language conversation
- **As a user**, I want to search for recipes by ingredients, categories, tags, or season
- **As a user**, I want to update existing recipes through conversational interface
- **As a user**, I want to mark recipes as eaten to track my meal history
- **As a user**, I want to delete recipes I no longer need
- **As a user**, I want to view detailed recipe information including ingredients and instructions

#### AI-Powered Interactions

- **As a user**, I want to have natural conversations about my recipes
- **As a user**, I want the AI to suggest recipes based on my preferences
- **As a user**, I want to receive cooking advice and recipe modifications
- **As a user**, I want the AI to understand context from previous conversations

#### User Experience

- **As a user**, I want to sign in with my Google account for secure access
- **As a user**, I want my recipes to be private and only accessible to me
- **As a user**, I want the app to work seamlessly on both desktop and mobile
- **As a user**, I want to receive clear feedback when actions are completed

### 1.2 Functional Requirements

#### Recipe Management System

- Support for 7 recipe categories: breakfast, lunch, dinner, dessert, snack, appetizer, beverage
- 104 predefined tags across dietary restrictions, cuisines, cooking methods, etc.
- 5 seasonal classifications: spring, summer, fall, winter, year-round
- Last eaten timestamp tracking for meal planning
- Multi-criteria search and filtering capabilities

#### AI Integration Requirements

- OpenAI GPT-4 integration with function calling
- 6 core recipe functions: search, add, update, delete, get details, mark eaten
- Natural language processing for recipe extraction from conversations
- Context awareness and conversation memory
- Usage tracking and cost monitoring with daily budget limits

#### Authentication Requirements

- Google OAuth 2.0 integration via Supabase Auth
- PKCE flow for enhanced security
- User profile management with automatic creation
- Session management with automatic token refresh
- Row Level Security for data isolation

### 1.3 Non-Functional Requirements

#### Performance

- API response times under 2 seconds
- Database queries optimized with proper indexing
- Client-side caching for frequently accessed data
- Efficient pagination for large recipe collections

#### Security

- Row Level Security (RLS) on all database tables
- HTTP-only cookies for token storage
- CSRF protection with SameSite cookie settings
- Input validation and sanitization
- Secure environment variable management

#### Scalability

- Stateless API design for horizontal scaling
- Database connection pooling
- CDN integration for static asset delivery
- Edge function deployment capability

#### Usability

- Mobile-first responsive design
- Dark mode support
- Accessibility compliance (WCAG AA)
- Progressive Web App capabilities
- Offline fallback for core features

---

## 2. Database Schema

### 2.1 PostgreSQL Schema with Supabase Extensions

#### Custom Types (ENUMs)

```sql
-- Recipe Categories
CREATE TYPE recipe_category AS ENUM (
  'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'appetizer', 'beverage'
);

-- Recipe Seasons
CREATE TYPE recipe_season AS ENUM (
  'spring', 'summer', 'fall', 'winter', 'year-round'
);

-- Recipe Tags (104 comprehensive tags)
CREATE TYPE recipe_tag AS ENUM (
  -- Dietary Restrictions (12)
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'keto',
  'paleo', 'low-carb', 'low-fat', 'sugar-free', 'low-sodium', 'high-protein',

  -- Cuisine Types (15)
  'italian', 'mexican', 'chinese', 'indian', 'thai', 'french', 'mediterranean',
  'american', 'japanese', 'korean', 'greek', 'spanish', 'middle-eastern',
  'cajun', 'southern',

  -- Cooking Methods (14)
  'baking', 'grilling', 'frying', 'roasting', 'steaming', 'slow-cooking',
  'air-fryer', 'instant-pot', 'no-cook', 'one-pot', 'stir-fry', 'braising',
  'smoking', 'pressure-cooker',

  -- Characteristics (14)
  'quick', 'easy', 'healthy', 'comfort-food', 'spicy', 'mild', 'sweet',
  'savory', 'crispy', 'creamy', 'fresh', 'hearty', 'light', 'rich',

  -- Occasions (12)
  'party', 'holiday', 'weeknight', 'meal-prep', 'kid-friendly', 'date-night',
  'potluck', 'picnic', 'brunch', 'entertaining', 'budget-friendly',
  'leftover-friendly',

  -- Proteins (12)
  'chicken', 'beef', 'pork', 'fish', 'seafood', 'tofu', 'beans', 'eggs',
  'turkey', 'lamb', 'duck', 'plant-based',

  -- Dish Types (15)
  'soup', 'salad', 'sandwich', 'pasta', 'pizza', 'bread', 'cookies', 'cake',
  'pie', 'smoothie', 'cocktail', 'sauce', 'dip', 'marinade', 'dressing'
);
```

#### Core Tables

```sql
-- User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  ingredients TEXT[] NOT NULL,
  description TEXT NOT NULL,
  category recipe_category NOT NULL DEFAULT 'dinner',
  tags TEXT[] DEFAULT '{}',
  season recipe_season DEFAULT NULL,
  last_eaten TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Action Logs (audit trail)
CREATE TABLE action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- API Usage Tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  timestamp TIMESTAMP DEFAULT NOW()
);
```

#### Indexes for Performance

```sql
-- Recipe search optimization
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_season ON recipes(season);
CREATE INDEX idx_recipes_last_eaten ON recipes(last_eaten);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- Action logs query optimization
CREATE INDEX idx_action_logs_timestamp ON action_logs(timestamp);
CREATE INDEX idx_action_logs_action_type ON action_logs(action_type);
CREATE INDEX idx_action_logs_recipe_id ON action_logs(recipe_id);

-- API usage analytics
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
```

#### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Recipes: Users can only access their own recipes
CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Action Logs: Allow all operations (global logging)
CREATE POLICY "Allow all operations on action_logs" ON action_logs
  FOR ALL USING (true);

-- API Usage: Public read/insert for monitoring
CREATE POLICY "Public can read api_usage" ON api_usage
  FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert api_usage" ON api_usage
  FOR INSERT TO public WITH CHECK (true);
```

#### Database Functions and Triggers

```sql
-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

-- Apply to tables with updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatic user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name',
             new.raw_user_meta_data->>'full_name',
             split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 3. API Specifications

### 3.1 Authentication Endpoints

#### POST `/api/auth/set-session`

Sets HTTP-only cookies for server-side authentication.

**Request Body:**

```typescript
{
  access_token: string;    // Required
  refresh_token?: string;  // Optional
  expires_in?: number;     // Optional, defaults to 3600
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

**Error Codes:**

- `400`: Missing access token
- `500`: Failed to set session cookies

#### POST `/api/auth/sign-out`

Clears authentication cookies.

**Response:**

```typescript
{
  success: boolean;
}
```

### 3.2 Recipe Management Endpoints

#### GET `/api/recipes`

Retrieves user's recipes with optional filtering.

**Authentication:** Required

**Query Parameters:**

- `category`: Filter by recipe category
- `season`: Filter by season
- `tags`: Comma-separated tags
- `q`: General search query

**Response:**

```typescript
{
  recipes: Recipe[];
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  description: string;
  category: RecipeCategory;
  tags: RecipeTag[];
  season?: RecipeSeason;
  last_eaten?: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}
```

#### POST `/api/recipes`

Creates a new recipe.

**Authentication:** Required

**Request Body:**

```typescript
{
  title: string;           // Required
  ingredients: string[];   // Required
  description: string;     // Required
  category: string;        // Required, must be valid category
  tags?: string[];         // Optional, must be valid tags
  season?: string;         // Optional, must be valid season
}
```

**Response:**

```typescript
{
  recipe: Recipe;
  success: boolean;
}
```

#### PUT `/api/recipes` | PUT `/api/recipes/[id]`

Updates an existing recipe.

**Authentication:** Required

**Request Body:**

```typescript
{
  id?: string;             // Required for bulk endpoint
  title?: string;          // Optional
  ingredients?: string[];  // Optional
  description?: string;    // Optional
  category?: string;       // Optional, must be valid
  tags?: string[];         // Optional, must be valid
  season?: string;         // Optional, must be valid
  last_eaten?: string;     // Optional, ISO timestamp
}
```

#### DELETE `/api/recipes` | DELETE `/api/recipes/[id]`

Deletes a recipe.

**Authentication:** Required

**Request Body (bulk endpoint):**

```typescript
{
  id: string;
}
```

### 3.3 AI Chat Endpoint

#### POST `/api/recipes/chat`

Processes natural language requests for recipe management.

**Authentication:** Required

**Request Body:**

```typescript
{
  message: string;                    // Required user message
  conversation_history?: ChatMessage[]; // Optional conversation context
  context?: {                         // Optional UI context
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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

**Response:**

```typescript
{
  response: string;                   // AI assistant response
  conversation_history: ChatMessage[]; // Updated conversation
  function_calls: {                   // Executed functions
    function: string;
    result: any;
  }[];
  usage: {                           // OpenAI usage tracking
    tokens: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    cost_usd: number;
    model: string;
  };
  system_stats: {                    // System monitoring
    requests_this_minute: number;
    daily_cost: number;
    daily_budget: number;
  };
}
```

**AI Functions Available:**

1. `search_recipes`: Multi-criteria recipe search
2. `add_recipe`: Create new recipes from natural language
3. `update_recipe`: Modify existing recipes
4. `delete_recipe`: Remove recipes with confirmation
5. `get_recipe_details`: Retrieve specific recipe information
6. `mark_recipe_eaten`: Update last_eaten timestamp

### 3.4 Utility Endpoints

#### GET `/api/recipes/enums`

Returns all available enum values for dropdowns and validation.

**Response:**

```typescript
{
  categories: string[];               // 7 categories
  seasons: string[];                 // 5 seasons
  tags: string[];                    // 104 tags
  tags_by_category: {                // Organized tag groups
    dietary: string[];
    cuisine: string[];
    cooking_methods: string[];
    characteristics: string[];
    occasions: string[];
    proteins: string[];
    dish_types: string[];
  };
}
```

#### GET `/api/recipes/actions`

Retrieves action logs for debugging and monitoring.

**Query Parameters:**

- `recipe_id`: Filter by specific recipe
- `limit`: Maximum logs to return (1-1000, default 50)

### 3.5 Error Handling Standards

**Standard Error Response:**

```typescript
{
  error: string;           // Error message
  details?: string;        // Additional context
  code?: string;          // Error code for client handling
}
```

**HTTP Status Codes:**

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `402`: Payment Required (OpenAI quota exceeded)
- `404`: Not Found (recipe not found)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error (system errors)

---

## 4. OpenAI Integration

### 4.1 Configuration Management

#### Environment Variables

```typescript
OPENAI_API_KEY: string; // OpenAI API key
OPENAI_MODEL: string; // Model selection (default: 'gpt-4.1-nano')
OPENAI_MAX_TOKENS: number; // Max tokens per request (default: 2000)
OPENAI_TEMPERATURE: number; // Temperature (default: 0.9)
OPENAI_DAILY_BUDGET: number; // Daily spending limit (default: $1.00)
```

#### Model Pricing Configuration

```typescript
const MODEL_COSTS = {
  'gpt-4.1-nano': { input: 0.0001, output: 0.0004 },
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
};
```

### 4.2 Function Calling Schema

#### Recipe Search Function

```typescript
{
  name: 'search_recipes',
  description: 'Search for recipes based on various criteria',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'General search query for title, ingredients, or description'
      },
      category: {
        type: 'string',
        description: 'Recipe category filter (breakfast, lunch, dinner, etc.)'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags to filter by from predefined list'
      },
      season: {
        type: 'string',
        description: 'Seasonal filter (spring, summer, fall, winter, year-round)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of recipes to return (default 10)'
      }
    }
  }
}
```

#### Recipe Creation Function

```typescript
{
  name: 'add_recipe',
  description: 'Add a new recipe to the database',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Recipe title or name' },
      ingredients: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of ingredients needed'
      },
      description: {
        type: 'string',
        description: 'Detailed cooking instructions and steps'
      },
      category: {
        type: 'string',
        description: 'Recipe category from enum list'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional tags from predefined list'
      },
      season: {
        type: 'string',
        description: 'Optional seasonal relevance'
      }
    },
    required: ['title', 'ingredients', 'description', 'category']
  }
}
```

#### Additional Functions

- `update_recipe`: Modify existing recipes
- `delete_recipe`: Remove recipes with confirmation
- `get_recipe_details`: Retrieve specific recipe information
- `mark_recipe_eaten`: Update last_eaten timestamp

### 4.3 Prompt Engineering

#### System Prompt Template

```typescript
const SYSTEM_PROMPT = `You are Meal Maestro, an AI-powered recipe assistant. You help users manage their recipe collection through natural language conversations.

AVAILABLE FUNCTIONS:
- Search for recipes by various criteria
- Add new recipes to the database  
- Update existing recipes
- Mark recipes as eaten (update last_eaten timestamp)
- Delete recipes
- Get detailed information about specific recipes

IMPORTANT GUIDELINES:
1. Be helpful and conversational
2. When users ask for recipes, use appropriate search criteria
3. When adding recipes, extract all necessary information
4. When updating recipes, only modify mentioned fields
5. Always confirm destructive actions like deleting recipes
6. Provide clear, formatted responses about recipes
7. Ask clarifying questions when needed

TAG REQUIREMENTS:
Tags must be chosen only from the predefined list of 104 valid tags.

FUNCTION CHAINING FOR OPERATIONS:
- For delete/update/mark eaten BY NAME:
  1. FIRST search for the recipe
  2. SHOW recipe details and ASK FOR CONFIRMATION
  3. ONLY proceed after explicit user confirmation
- For adding recipes:
  1. FIRST search to check for existing recipes
  2. If no match found, proceed to add
  3. If match found, ask for user preference

Remember to use the function tools to interact with the recipe database.`;
```

#### Context Management

```typescript
// Dynamic context injection based on UI state
if (context?.selected_recipe) {
  systemPromptWithContext += `\n- User is looking at the recipe: "${recipe.title}"`;
  systemPromptWithContext += `\n  - When they refer to "this recipe" or "it", they mean "${recipe.title}"`;
}
```

### 4.4 Conversation Flow Management

#### Function Call Chain Processing

```typescript
// Iterative processing of function calls
let currentCompletion = completion;
let functionResults = [];

while (currentCompletion.choices[0].message.tool_calls) {
  // Add assistant message with function calls
  messages.push(currentCompletion.choices[0].message);

  // Process each function call
  for (const toolCall of currentCompletion.choices[0].message.tool_calls) {
    const result = await functionHandler.handleFunctionCall(
      toolCall.function.name,
      JSON.parse(toolCall.function.arguments)
    );

    functionResults.push({ function: toolCall.function.name, result });

    // Add function result to conversation
    messages.push({
      role: 'tool',
      content: formatFunctionResult(toolCall.function.name, result),
      tool_call_id: toolCall.id,
    });
  }

  // Get next response
  currentCompletion = await createChatCompletion(messages, recipeTools);

  // Safety check to prevent infinite loops
  if (functionResults.length > 20) {
    console.warn('Function call limit reached');
    break;
  }
}
```

### 4.5 Usage Tracking and Cost Management

#### Usage Tracker Implementation

```typescript
class UsageTracker {
  private requests: number = 0;
  private dailyCost: number = 0;
  private readonly maxRequestsPerMinute: number = 60;
  private readonly maxDailyCost: number = parseFloat(process.env.OPENAI_DAILY_BUDGET || '1.00');

  isRateLimited(): boolean {
    // Reset counters if needed
    // Check daily cost and request limits
    return this.requests >= this.maxRequestsPerMinute || this.dailyCost >= this.maxDailyCost;
  }

  addRequest(cost: number): void {
    this.requests++;
    this.dailyCost += cost;
  }
}
```

#### Cost Calculation

```typescript
function calculateCost(model: string, tokens: TokenUsage): number {
  const modelKey = detectModel(model);
  const costs = MODEL_COSTS[modelKey];

  const inputCost = (tokens.prompt_tokens / 1000) * costs.input;
  const outputCost = (tokens.completion_tokens / 1000) * costs.output;

  return inputCost + outputCost;
}
```

### 4.6 Error Handling and Retry Logic

#### Retry Strategy

```typescript
async function createChatCompletion(messages, tools, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await openai.chat.completions.create({
        model: CONFIG.model,
        messages,
        tools,
        max_tokens: CONFIG.max_tokens,
        temperature: CONFIG.temperature,
      });
    } catch (error) {
      // Don't retry rate limit or quota errors
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        throw error;
      }

      // Exponential backoff for other errors
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw new Error('OpenAI API failed after maximum retries');
}
```

---

## 5. Authentication System

### 5.1 Authentication Architecture

#### Flow Overview

```
[Client] → [Google OAuth] → [Supabase Auth] → [Session Tokens] → [HTTP Cookies] → [API Access]
```

#### Security Model

- **PKCE Flow**: Proof Key for Code Exchange for OAuth security
- **Dual Storage**: Client-side localStorage + server-side HTTP-only cookies
- **Automatic Refresh**: Token refresh handled transparently
- **Row Level Security**: Database-level user isolation

### 5.2 Supabase Configuration

#### Client Configuration

```typescript
export const supabaseBrowser = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true, // Automatic token refresh
    persistSession: true, // Persist in localStorage
    detectSessionInUrl: false, // Manual callback handling
    flowType: 'pkce', // PKCE flow for security
  },
});
```

#### Environment Variables

- `PUBLIC_SUPABASE_URL`: Supabase project URL (client-side)
- `PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (client-side)
- `SUPABASE_URL`: Supabase project URL (server-side)
- `SUPABASE_ANON_KEY`: Supabase anonymous key (server-side)

### 5.3 Google OAuth Integration

#### OAuth Configuration

```typescript
async signInWithGoogle() {
  const redirectTo = isDevelopment
    ? 'http://localhost:5173/auth/callback'
    : `${window.location.origin}/auth/callback`;

  const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });

  return { data, error };
}
```

#### Callback Handling

1. **Code Exchange**: Authorization code exchanged for session tokens
2. **Session Storage**: Tokens stored in client-side storage
3. **Cookie Sync**: Tokens sent to server for HTTP-only cookies
4. **Profile Creation**: User profile automatically created
5. **Redirect**: User redirected to intended destination

### 5.4 Session Management

#### HTTP-Only Cookie Configuration

```typescript
// Access Token Cookie
cookies.set('sb-access-token', access_token, {
  path: '/',
  maxAge: expires_in || 3600, // 1 hour default
  httpOnly: true, // Prevent XSS
  secure: isProduction, // HTTPS only in production
  sameSite: 'lax', // CSRF protection
});

// Refresh Token Cookie
cookies.set('sb-refresh-token', refresh_token, {
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  httpOnly: true, // Prevent XSS
  secure: isProduction, // HTTPS only in production
  sameSite: 'lax', // CSRF protection
});
```

#### Token Refresh Strategy

- **Client-side**: Automatic refresh via Supabase client
- **Server-side**: Manual refresh in authentication middleware
- **Cookie Sync**: Refreshed tokens update HTTP-only cookies
- **Cleanup**: Invalid cookies cleared on refresh failure

### 5.5 API Protection Middleware

#### Authentication Middleware

```typescript
export async function requireAuth(event: RequestEvent) {
  const authResult = await createAuthenticatedClient(event);

  if (!authResult) {
    return new Response(
      JSON.stringify({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return authResult; // { user, client }
}
```

#### Usage in API Endpoints

```typescript
export const GET: RequestHandler = async event => {
  const authResult = await requireAuth(event);
  if (authResult instanceof Response) {
    return authResult; // Return 401 error
  }

  const { user, client: supabase } = authResult;

  // Use authenticated client with automatic user filtering
  const { data } = await supabase.from('recipes').select('*').eq('user_id', user.id);

  return json({ data });
};
```

### 5.6 User Profile Management

#### Profile Schema

```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Automatic Profile Creation

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;
```

## 8. Deployment Architecture

### 8.1 Current Deployment Setup

#### Platform: Vercel

- **Runtime**: Node.js 20.x
- **Deployment**: Automatic on git push to main branch
- **Edge Functions**: API routes deployed as serverless functions
- **Static Assets**: Frontend served from Vercel CDN

#### Configuration Files

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install"
}
```

#### Environment Variables (Production)

```bash
# Database
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=eyJ...
PUBLIC_SUPABASE_URL=https://project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-nano
OPENAI_DAILY_BUDGET=1.00

# Application
NODE_ENV=production
```
