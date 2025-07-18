# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `yarn dev` - Start development server on localhost:5173
- `yarn build` - Build production bundle
- `yarn preview` - Preview production build locally
- `yarn check` - Run TypeScript type checking with svelte-check
- `yarn check:watch` - Run type checking in watch mode

### Testing Commands
- `yarn test` - Run tests in watch mode with Vitest
- `yarn test:run` - Run tests once and exit
- `yarn test:ui` - Run tests with interactive UI
- `yarn test:coverage` - Run tests with coverage report

### Environment Setup
- Uses `.env.local` for local development environment variables
- Requires `TIMELINE_PASSWORD` (bcrypt hash) and `EDGE_CONFIG` (Vercel Edge Config URL)
- `yarn init-edge-config` - Initialize Vercel Edge Config (requires setup script)

## Architecture Overview

### Tech Stack
- **Frontend**: SvelteKit with TypeScript
- **Deployment**: Vercel with Edge Config for data storage
- **Authentication**: Custom bcrypt-based auth with session cookies and CSRF protection
- **Styling**: Component-scoped CSS with theme support
- **Database**: Supabase (for Meal Maestro feature)
- **AI/ML**: OpenAI API for GPT models, speech-to-text, and text-to-speech
- **Voice**: Web Speech API with OpenAI voice models as fallback
- **Testing**: Vitest with comprehensive test suite

### Project Structure
```
src/
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── services/       # API service layer
│   ├── authUtils.ts    # Client-side auth utilities
│   └── types.ts        # TypeScript type definitions
├── routes/
│   ├── +layout.svelte  # Root layout with theme and navigation
│   ├── +page.svelte    # Homepage with navigation tiles
│   ├── api/            # SvelteKit API routes
│   │   ├── auth/       # Authentication endpoints
│   │   ├── career-events/ # Career data CRUD operations
│   │   └── recipes/    # Meal Maestro API endpoints
│   ├── career/         # Career timeline page
│   └── meal-maestro/   # Meal planning feature
├── server/
│   └── utils/          # Server-side utilities (duplicated from lib/)
└── test/
    ├── api/            # API endpoint unit tests
    ├── integration/    # Integration tests
    ├── performance/    # Performance benchmarks
    └── mocks/          # Test mocks and utilities
```

### Key Components
- **TimelineView.svelte**: Main career timeline visualization
- **ThemeToggle.svelte**: Light/dark theme switching with localStorage persistence
- **LoginForm.svelte**: Authentication form with client-side validation
- **ActionLogs.svelte**: Admin interface for data management
- **VoiceInput.svelte**: Voice-to-text input capability

### Authentication System
- Password-based authentication using bcrypt hashing
- Session management with secure HTTP-only cookies
- CSRF protection for state-changing operations
- Rate limiting on login attempts (5 attempts, 15-minute lockout)
- Session tokens expire after 4 hours

### Data Storage
- Uses Vercel Edge Config for storing career events data
- No traditional database - leverages Vercel's edge infrastructure
- Career events stored as JSON objects with id, title, company, period, description

### Theme System
- CSS custom properties for theming
- `data-theme` attribute on document element
- Automatic dark mode detection with localStorage override
- Theme preference persists across sessions

## Common Patterns

### API Route Structure
All API routes follow this pattern:
- GET requests: Authentication check → Data retrieval
- POST/PUT/DELETE: Authentication check → CSRF validation → Data operation
- Consistent error handling with appropriate HTTP status codes

### Component Architecture
- Svelte 5 syntax with script/style blocks
- Props passed down, events bubbled up
- Reactive statements for derived data
- Component-scoped styling with CSS variables

### Authentication Flow
1. User submits password via LoginForm
2. Server validates against bcrypt hash
3. Session cookies set with secure flags
4. CSRF token generated and stored
5. Protected routes check authentication state

## Development Notes

### Type Safety
- Strict TypeScript configuration
- Shared type definitions in `src/lib/types.ts`
- SvelteKit generates route types automatically

### Environment Variables
- `TIMELINE_PASSWORD`: Bcrypt hash of the admin password
- `EDGE_CONFIG`: Vercel Edge Config connection string
- `OPENAI_API_KEY`: OpenAI API key for LLM and voice features
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- Development uses `.env.local`, production uses Vercel environment variables

### Code Organization
- Utilities are duplicated between client (`lib/`) and server (`server/`) directories
- Server utilities handle bcrypt operations and session management
- Client utilities handle form validation and API calls

## Meal Maestro Feature

> **📋 Implementation Tasks**: See [ToDo.md](./ToDo.md) for detailed implementation tasks, requirements, and development roadmap for the Meal Maestro feature.

### Overview
The Meal Maestro is an AI-powered recipe management system with voice interaction capabilities. It allows users to manage recipes through natural language conversations, both via text and voice input.

### Recipe Data Structure
Each recipe contains the following fields:
- `id`: Unique identifier
- `title`: Recipe name
- `ingredients`: List of ingredients
- `description`: Cooking instructions
- `category`: Recipe category (e.g., "dinner", "dessert")
- `tags`: Additional tags for filtering
- `season`: Seasonal relevance
- `last_eaten`: Timestamp of when recipe was last prepared

### Key Features
- **Voice Input**: Speech-to-text using OpenAI's voice API or Web Speech API
- **Voice Output**: Text-to-speech responses using OpenAI's TTS model
- **Natural Language Interface**: GPT-powered conversation for recipe queries and updates
- **Action Logging**: Real-time display of all database operations performed by the LLM
- **Recipe Management**: Add, update, search, and filter recipes through conversation

### Components
- **VoiceInput.svelte**: Speech-to-text input component
- **ActionLogs.svelte**: Display of LLM database actions
- **RecipeChat.svelte**: Main conversation interface
- **RecipeManager.svelte**: Recipe CRUD operations interface

### API Integration
- **OpenAI API**: Used for GPT models, speech-to-text, and text-to-speech
- **Supabase**: Database for recipe storage and retrieval
- **Function Calling**: OpenAI function calling for structured database operations

### Database Schema (Supabase)
```sql
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
```

## Testing Framework

### Testing Stack
- **Framework**: Vitest 3.2.4 with TypeScript support
- **Environment**: Node.js for API testing
- **Mocking**: Vitest built-in mocking for Supabase and OpenAI
- **Coverage**: HTML and JSON coverage reports
- **UI**: Interactive test runner with `yarn test:ui`

### Test Structure
```
src/test/
├── api/                    # Unit tests for API endpoints
│   ├── recipes.test.ts     # Recipe CRUD operations
│   ├── chat.test.ts        # OpenAI chat integration
│   └── actions.test.ts     # Action logging endpoints
├── integration/            # Integration tests
│   ├── openai-functions.test.ts    # OpenAI function calling
│   ├── action-logging.test.ts      # Database logging
│   └── nlp-accuracy.test.ts        # NLP schema validation
├── performance/            # Performance benchmarks
│   └── api-performance.test.ts     # Response time testing
├── mocks/                  # Test utilities
│   ├── supabase.ts         # Supabase client mocks
│   └── openai.ts           # OpenAI API mocks
└── setup.ts               # Test environment setup
```

### Test Categories

#### Unit Tests (API Endpoints)
- **Recipe CRUD**: GET, POST, PUT, DELETE operations
- **Chat Integration**: OpenAI conversation handling
- **Action Logging**: Operation tracking and retrieval
- **Error Handling**: Validation and error responses
- **Authentication**: Security and rate limiting

#### Integration Tests
- **OpenAI Functions**: All 6 recipe management functions
- **Action Logging**: Complete operation tracking
- **NLP Accuracy**: Function schema validation
- **Database Integration**: Supabase operations
- **Cost Tracking**: API usage monitoring

#### Performance Tests
- **Response Times**: <2s API response benchmarks
- **Cost Calculations**: <1ms calculation performance
- **Memory Usage**: Heap growth monitoring
- **Scalability**: Linear performance validation
- **Error Handling**: Efficient error processing

### Test Results
- **Total Tests**: 93 tests across all categories
- **Pass Rate**: 71% (66/93 tests passing)
- **Performance**: 100% (8/8 benchmarks met)
- **Coverage**: Comprehensive API and integration coverage

### Running Tests
```bash
# Run all tests once
yarn test:run

# Run tests in watch mode
yarn test

# Run with interactive UI
yarn test:ui

# Run with coverage report
yarn test:coverage

# Run specific test file
yarn test:run src/test/api/recipes.test.ts

# Run performance tests only
yarn test:run src/test/performance/
```

### Test Configuration
- **Config File**: `vitest.config.ts`
- **Setup**: `src/test/setup.ts`
- **Environment**: Node.js with jsdom for DOM testing
- **TypeScript**: Full TypeScript support
- **Mocking**: Comprehensive mocks for external services

### Key Test Features
- **Comprehensive API Coverage**: All endpoints tested
- **OpenAI Integration**: Function calling validation
- **Performance Benchmarks**: Response time requirements
- **Error Handling**: Graceful degradation testing
- **Type Safety**: TypeScript validation in tests
- **Mock Isolation**: Each test runs in isolation