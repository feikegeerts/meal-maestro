# Meal Maestro: AI-Powered Recipe Manager

## Project Overview

An AI-powered recipe management system integrated into the Career Timeline application. The system provides natural language recipe management through OpenAI integration with a focus on delivering core functionality through an MVP approach.

## MVP Definition

**Goal**: Deliver core recipe management functionality through API endpoints with OpenAI integration, without voice capabilities or user interface.

**MVP Scope**:

- Basic recipe CRUD operations via API
- OpenAI integration for natural language processing
- Simple action logging system
- Text-based interaction only (no voice)
- Global recipe storage (no user-specific data)
- API testing via tools like Postman/cURL

## Core Requirements

### Recipe Data Model

- `id`: UUID primary key
- `title`: Recipe name (required)
- `ingredients`: Array of ingredient strings (required)
- `description`: Cooking instructions (required)
- `category`: Recipe category (e.g., "dinner", "dessert", "breakfast")
- `tags`: Array of searchable tags
- `season`: Seasonal relevance (e.g., "summer", "winter", "year-round")
- `last_eaten`: Timestamp of when recipe was last prepared
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

### Technology Stack

- **Database**: Supabase (PostgreSQL)
- **AI/LLM**: OpenAI API (GPT-4/3.5 for conversation and function calling)
- **Backend**: SvelteKit API routes
- **Authentication**: None for MVP (global access)

### Core Features

- Natural language recipe management through API endpoints
- Recipe CRUD operations via conversational interface
- Action logging of all database operations
- Advanced search and filtering capabilities
- Cost tracking and usage monitoring

## Implementation Roadmap

### Phase 0: Setup & Planning

- [x] **0.1** Set up development environment and dependencies
- [x] **0.2** Create feature branch strategy
- [x] **0.3** Define MVP acceptance criteria and testing approach
- [x] **0.4** Set up cost estimation and budget planning for OpenAI usage

### Phase 1: MVP Backend Setup

- [x] **1.1** Create Supabase project and configure connection
- [x] **1.2** Design and create `recipes` table with proper schema (no user relationship)
- [x] **1.3** Create database indexes for performance
- [x] **1.4** Set up basic API routes in `src/routes/api/recipes/`
  - [x] `GET /api/recipes` - List/search recipes
  - [x] `POST /api/recipes` - Add new recipe
  - [x] `PUT /api/recipes/[id]` - Update recipe
  - [x] `DELETE /api/recipes/[id]` - Delete recipe
- [x] **1.5** Implement basic action logging system
  - [x] Create `action_logs` table
  - [x] Add logging middleware for all recipe operations
- [x] **1.6** Set up database backup and recovery

### Phase 2: OpenAI Integration (MVP)

- [ ] **2.1** Set up OpenAI API client configuration
- [ ] **2.2** Implement usage tracking and rate limiting
- [ ] **2.3** Add prompt injection protection
- [ ] **2.4** Create OpenAI API error handling and retry logic
- [ ] **2.5** Implement GPT conversation handler
- [ ] **2.6** Design function calling schema for recipe operations
- [ ] **2.7** Create natural language to database operation mapping
- [ ] **2.8** Create conversation context management
- [ ] **2.9** Add `/api/recipes/chat` endpoint for natural language processing

### Phase 3: MVP Testing & Validation

- [ ] **3.1** Write unit tests for API endpoints
- [ ] **3.2** Create integration tests for OpenAI functions
- [ ] **3.3** Test natural language processing accuracy
- [ ] **3.4** Validate action logging completeness
- [ ] **3.5** Performance testing and optimization
- [ ] **3.6** Set up environment variables in Vercel
- [ ] **3.7** Deploy MVP to production environment
- [ ] **3.8** Monitor and fix any deployment issues

### Phase 4: Post-MVP Enhancements

- [ ] **4.1** Add user authentication integration
- [ ] **4.2** Implement user-specific recipe storage
- [ ] **4.3** Add recipe sharing capabilities
- [ ] **4.4** Enhanced search with semantic capabilities
- [ ] **4.5** Cost optimization for OpenAI API usage
- [ ] **4.6** Implement caching strategies

### Phase 5: Frontend Development

- [ ] **5.1** Create base Meal Maestro page at `/meal-maestro`
- [ ] **5.2** Implement core components:
  - [ ] `RecipeChat.svelte` - Main conversation interface
  - [ ] `ActionLogs.svelte` - Real-time action display
  - [ ] `RecipeList.svelte` - Recipe browsing/management
  - [ ] `RecipeCard.svelte` - Individual recipe display
- [ ] **5.3** Design responsive layout for mobile/desktop
- [ ] **5.4** Add loading states and error handling
- [ ] **5.5** Implement conversation history
- [ ] **5.6** Add keyboard shortcuts and accessibility features
- [ ] **5.7** Implement dark/light theme support

### Phase 6: Voice Integration

- [ ] **6.1** Browser compatibility testing for Web Speech API
- [ ] **6.2** OpenAI Whisper fallback implementation
- [ ] **6.3** Audio quality optimization and noise handling
- [ ] **6.4** Set up speech-to-text integration
- [ ] **6.5** Set up text-to-speech integration
- [ ] **6.6** Implement voice interaction UI
  - [ ] Microphone permission handling
  - [ ] Visual feedback for recording state
  - [ ] Audio playback controls
  - [ ] Voice/text mode toggle

### Phase 7: Advanced Features

- [ ] **7.1** Semantic search using vector embeddings
- [ ] **7.2** Recipe recommendations based on preferences
- [ ] **7.3** Meal planning and calendar integration
- [ ] **7.4** Shopping list generation
- [ ] **7.5** Nutritional information integration
- [ ] **7.6** Image upload and recipe photo management
- [ ] **7.7** Recipe sharing and community features

### Phase 8: Analytics & Optimization

- [ ] **9.1** Usage analytics and metrics
- [ ] **9.2** Performance monitoring
- [ ] **9.3** A/B testing for UX improvements
- [ ] **9.4** Advanced cost optimization
- [ ] **9.5** Caching strategies for improved performance

## Technical Specifications

### MVP Database Schema

```sql
-- Recipes table (no user relationship for MVP)
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  ingredients TEXT[] NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  season TEXT,
  last_eaten TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Action logs table
CREATE TABLE action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'search'
  recipe_id UUID REFERENCES recipes(id),
  description TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_last_eaten ON recipes(last_eaten);
CREATE INDEX idx_action_logs_timestamp ON action_logs(timestamp);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
```

### MVP API Endpoints

- `GET /api/recipes` - List recipes with optional filtering
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/[id]` - Update existing recipe
- `DELETE /api/recipes/[id]` - Delete recipe
- `POST /api/recipes/chat` - Process natural language requests
- `GET /api/recipes/actions` - Get action log history
- `GET /api/recipes/usage` - Get API usage statistics

### OpenAI Function Definitions

```javascript
const functions = [
  {
    name: 'search_recipes',
    description: 'Search for recipes based on various criteria',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Recipe category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to filter by' },
        season: { type: 'string', description: 'Seasonal filter' },
      },
    },
  },
  {
    name: 'add_recipe',
    description: 'Add a new recipe to the database',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Recipe title' },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of ingredients',
        },
        description: { type: 'string', description: 'Cooking instructions' },
        category: { type: 'string', description: 'Recipe category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Recipe tags' },
        season: { type: 'string', description: 'Seasonal relevance' },
      },
      required: ['title', 'ingredients', 'description', 'category'],
    },
  },
  {
    name: 'update_recipe',
    description: 'Update an existing recipe',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Recipe ID' },
        title: { type: 'string', description: 'Recipe title' },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of ingredients',
        },
        description: { type: 'string', description: 'Cooking instructions' },
        category: { type: 'string', description: 'Recipe category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Recipe tags' },
        season: { type: 'string', description: 'Seasonal relevance' },
      },
      required: ['id'],
    },
  },
  {
    name: 'mark_recipe_eaten',
    description: 'Update the last_eaten timestamp for a recipe',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Recipe ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_recipe',
    description: 'Delete a recipe from the database',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Recipe ID' },
      },
      required: ['id'],
    },
  },
];
```

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Cost Management
OPENAI_DAILY_BUDGET=10.00
USAGE_ALERT_THRESHOLD=0.80
```

## MVP Testing Strategy

### Unit Tests

- API endpoint functionality
- Database operations and queries
- OpenAI function calling logic
- Error handling and edge cases

### Integration Tests

- End-to-end conversation flows
- Database transaction integrity
- OpenAI API integration
- Cost tracking accuracy

### API Testing

- Postman/cURL testing for all endpoints
- Natural language processing accuracy
- Action logging completeness
- Performance under load

## MVP Success Metrics

- All API endpoints functional with <2s response time
- Natural language processing accuracy >85%
- Zero data loss in action logging
- Daily OpenAI costs under budget
- 99% uptime for API endpoints

## Post-MVP Roadmap

1. **User Authentication** - Add user-specific recipe storage
2. **Frontend Interface** - Build conversational UI
3. **Voice Integration** - Add speech-to-text and text-to-speech
4. **Advanced Features** - Semantic search, recommendations, etc.
5. **Mobile & PWA** - Mobile-optimized experience
6. **Analytics** - Usage monitoring and optimization
