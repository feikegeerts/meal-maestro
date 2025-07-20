# Supabase Mocking for Vitest Integration Tests

When testing code that interacts with Supabase's client, you need to mock the chainable query builder methods so that your test code can call them in the same way as the real client. Supabase's API supports both callback and promise styles, but most code uses `await` on the final chain.

## Key Points for Mocking

- **Chainable Methods:** Each method (`select`, `order`, `eq`, `overlaps`, etc.) should return the mock object itself, allowing chains like `.select().order().limit()`.
- **Thenable Interface:** The mock object **must** implement a `.then()` method to work properly with `await`. This is the most critical part for preventing timeouts.
- **Final Return Value:** Some methods like `limit` can return the result directly, but having `.then()` as a fallback is essential.
- **Insert/Update/Delete:** For methods like `insert`, they should return a chainable mock that can be further chained with `.select()` etc.
- **Debugging:** You can add `console.log` statements to each mock method to trace which methods are called during the test.

## Example Mock Implementation

```typescript
function createActionLogsQueryMock(data = mockActionLogs, error = null) {
  const mock: any = {};
  mock.insert = actionLogsInsertSpy;
  mock.select = vi.fn(() => mock);
  mock.order = vi.fn(() => mock);
  mock.eq = vi.fn(() => mock);
  mock.overlaps = vi.fn(() => mock);
  mock.or = vi.fn(() => mock);

  // Final method can return result directly
  mock.limit = vi.fn(() => ({ data, error }));

  // CRITICAL: Implement .then() for await compatibility
  mock.then = vi.fn(resolve => {
    return Promise.resolve({ data, error }).then(resolve);
  });

  return mock;
}
```

## Why This Works

- The real Supabase client is thenable and resolves to `{ data, error }` when awaited.
- The `.then()` method is what makes the mock work with `await` - without it, tests will hang/timeout.
- Chainable methods return the mock object itself, preserving the fluent interface.
- The final resolution happens through either a direct return or the `.then()` method.

## Common Pitfalls & Solutions

- **Timeout Issues:** Usually caused by missing or incorrect `.then()` implementation. Ensure `.then()` properly resolves the promise.
- **Missing Chain Methods:** If code calls `.or()` or `.overlaps()` but mock doesn't implement them, you'll get "is not a function" errors.
- **Spy Tracking:** Use shared spy references for methods you need to verify calls on, not fresh spies each time.

## Error Client Mocks

For testing error scenarios, create mocks that resolve with errors:

```typescript
const errorClient = {
  from: vi.fn(() => {
    const mock: any = {};
    mock.select = vi.fn(() => mock);
    mock.order = vi.fn(() => mock);
    mock.limit = vi.fn(() => mock);
    mock.then = vi.fn(resolve => {
      return Promise.resolve({ data: null, error: new Error('Database error') }).then(resolve);
    });
    return mock;
  }),
};
```

## Debugging Tips

- Add `console.log` to each mock method to see the call order
- If tests timeout, check that `.then()` is implemented and properly resolves
- Use shared spy references for methods you need to verify calls on
- Ensure error mocks still implement the full thenable interface

---

This pattern can be adapted for any Supabase table or query chain. The key is ensuring the mock is thenable and matches the real client's interface exactly.

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

## Architecture Overview

### Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Deployment**: Vercel with Edge Config for data storage
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
│   ├── +layout.svelte  # Root layout with theme and navigation
│   ├── +page.svelte    # Homepage with navigation tiles
│   ├── api/            # SvelteKit API routes
│   └── utils/          # Server-side utilities (duplicated from lib/)
└── test/
    ├── api/            # API endpoint unit tests
```

### Key Components

- **TimelineView.svelte**: Main career timeline visualization
- **ThemeToggle.svelte**: Light/dark theme switching with localStorage persistence

- **ActionLogs.svelte**: Admin interface for data management
- **VoiceInput.svelte**: Voice-to-text input capability

### Theme System

- CSS custom properties for theming
- `data-theme` attribute on document element
- Automatic dark mode detection with localStorage override
- Theme preference persists across sessions

## Common Patterns

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
- **Error Handling**: Validation and error responses
- **Authentication**: Security and rate limiting

#### Integration Tests

- **OpenAI Functions**: All 6 recipe management functions
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
