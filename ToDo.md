# Meal Maestro: AI-Powered Recipe Manager

## Project Overview
An AI-powered recipe management system integrated into the Career Timeline application. Users can manage recipes through natural language conversations with voice input/output capabilities and real-time action logging.

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
- **AI/LLM**: OpenAI API (GPT-4/3.5 for conversation, Whisper for STT, TTS for voice output)
- **Voice**: OpenAI voice models + Web Speech API fallback
- **Frontend**: SvelteKit integration within existing app structure
- **Authentication**: Leverage existing bcrypt-based auth system

### Core Features
- Natural language recipe management through conversation
- Bidirectional voice interaction (speech-to-text and text-to-speech)
- Real-time action logging of all database operations
- Recipe CRUD operations via conversational interface
- Advanced search and filtering capabilities

## Implementation Roadmap

### Phase 1: Database & Backend Setup
- [ ] **1.1** Create Supabase project and configure connection
- [ ] **1.2** Design and create `recipes` table with proper schema
- [ ] **1.3** Set up Row Level Security (RLS) policies
- [ ] **1.4** Create database indexes for performance
- [ ] **1.5** Set up API routes in `src/routes/api/recipes/`
  - [ ] `GET /api/recipes` - List/search recipes
  - [ ] `POST /api/recipes` - Add new recipe
  - [ ] `PUT /api/recipes/[id]` - Update recipe
  - [ ] `DELETE /api/recipes/[id]` - Delete recipe
- [ ] **1.6** Implement action logging system
  - [ ] Create `action_logs` table
  - [ ] Add logging middleware for all recipe operations

### Phase 2: OpenAI Integration
- [ ] **2.1** Set up OpenAI API client configuration
- [ ] **2.2** Implement GPT conversation handler
- [ ] **2.3** Design function calling schema for recipe operations
- [ ] **2.4** Create natural language to database operation mapping
- [ ] **2.5** Set up speech-to-text (Whisper) integration
- [ ] **2.6** Set up text-to-speech integration
- [ ] **2.7** Create conversation context management
- [ ] **2.8** Implement error handling and fallbacks

### Phase 3: Frontend Components
- [ ] **3.1** Create base Meal Maestro page at `/meal-maestro`
- [ ] **3.2** Implement core components:
  - [ ] `RecipeChat.svelte` - Main conversation interface
  - [ ] `VoiceInput.svelte` - Speech-to-text input with visual feedback
  - [ ] `VoiceOutput.svelte` - Text-to-speech with controls
  - [ ] `ActionLogs.svelte` - Real-time action display
  - [ ] `RecipeList.svelte` - Recipe browsing/management
  - [ ] `RecipeCard.svelte` - Individual recipe display
- [ ] **3.3** Implement voice interaction UI
  - [ ] Microphone permission handling
  - [ ] Visual feedback for recording state
  - [ ] Audio playback controls
  - [ ] Voice/text mode toggle

### Phase 4: User Experience & Polish
- [ ] **4.1** Design responsive layout for mobile/desktop
- [ ] **4.2** Add loading states and error handling
- [ ] **4.3** Implement conversation history
- [ ] **4.4** Add recipe sharing capabilities
- [ ] **4.5** Create onboarding/help system
- [ ] **4.6** Add keyboard shortcuts and accessibility features
- [ ] **4.7** Implement dark/light theme support
- [ ] **4.8** Add search and filter functionality

### Phase 5: Testing & Deployment
- [ ] **5.1** Write unit tests for API endpoints
- [ ] **5.2** Create integration tests for OpenAI functions
- [ ] **5.3** Test voice functionality across browsers
- [ ] **5.4** Performance testing and optimization
- [ ] **5.5** Set up environment variables in Vercel
- [ ] **5.6** Deploy and test in production environment
- [ ] **5.7** Monitor and fix any deployment issues

## Technical Specifications

### Database Schema
```sql
-- Recipes table
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

-- Indexes for performance
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_last_eaten ON recipes(last_eaten);
CREATE INDEX idx_action_logs_timestamp ON action_logs(timestamp);
```

### API Endpoints
- `GET /api/recipes` - List recipes with optional filtering
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/[id]` - Update existing recipe
- `DELETE /api/recipes/[id]` - Delete recipe
- `POST /api/recipes/chat` - Process natural language requests
- `POST /api/recipes/voice` - Handle voice input processing
- `GET /api/recipes/actions` - Get action log history

### OpenAI Function Definitions
```javascript
const functions = [
  {
    name: "search_recipes",
    description: "Search for recipes based on various criteria",
    parameters: { /* ... */ }
  },
  {
    name: "add_recipe",
    description: "Add a new recipe to the database",
    parameters: { /* ... */ }
  },
  {
    name: "update_recipe",
    description: "Update an existing recipe",
    parameters: { /* ... */ }
  },
  {
    name: "mark_recipe_eaten",
    description: "Update the last_eaten timestamp for a recipe",
    parameters: { /* ... */ }
  }
];
```

### Environment Variables
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_VOICE_MODEL=tts-1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

## Advanced Features (Future Enhancements)

### Phase 6: Advanced Features
- [ ] **6.1** Semantic search using vector embeddings
- [ ] **6.2** Recipe recommendations based on preferences
- [ ] **6.3** Meal planning and calendar integration
- [ ] **6.4** Shopping list generation
- [ ] **6.5** Nutritional information integration
- [ ] **6.6** Image upload and recipe photo management
- [ ] **6.7** Recipe sharing and community features

### Phase 7: Mobile & PWA
- [ ] **7.1** Progressive Web App (PWA) implementation
- [ ] **7.2** Offline functionality with service workers
- [ ] **7.3** Push notifications for meal reminders
- [ ] **7.4** Mobile-optimized voice interface
- [ ] **7.5** Camera integration for recipe photos

### Phase 8: Analytics & Optimization
- [ ] **8.1** Usage analytics and metrics
- [ ] **8.2** Performance monitoring
- [ ] **8.3** A/B testing for UX improvements
- [ ] **8.4** Cost optimization for OpenAI API usage
- [ ] **8.5** Caching strategies for improved performance

## Testing Strategy

### Unit Tests
- API endpoint functionality
- Database operations and queries
- OpenAI function calling logic
- Voice processing utilities

### Integration Tests
- End-to-end conversation flows
- Voice input/output pipeline
- Database transaction integrity
- OpenAI API integration

### User Acceptance Tests
- Voice recognition accuracy
- Conversation flow naturalness
- Action logging completeness
- Mobile responsiveness

## Success Metrics
- Voice recognition accuracy > 90%
- Average response time < 2 seconds
- User conversation completion rate > 80%
- Zero data loss in action logging
- 99.9% uptime for voice features