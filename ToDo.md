# Meal Maestro: AI-Powered Recipe Manager

## Project Overview

An AI-powered recipe management system. The system provides natural language recipe management through OpenAI integration with a focus on delivering core functionality through an MVP approach.

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

#### Core Framework

- **Database**: Supabase (PostgreSQL)
- **AI/LLM**: OpenAI API (GPT-4/3.5 for conversation and function calling)

#### Frontend & UI

| Technology   | Website                                          | GitHub                                                                             |
| ------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| React        | [react.dev](https://react.dev)                   | [github.com/facebook/react](https://github.com/facebook/react)                     |
| Next.js      | [nextjs.org](https://nextjs.org)                 | [github.com/vercel/next.js](https://github.com/vercel/next.js)                     |
| Tailwind CSS | [tailwindcss.com](https://tailwindcss.com)       | [github.com/tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| shadcn/ui    | [ui.shadcn.com](https://ui.shadcn.com)           | [github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)                         |
| TypeScript   | [typescriptlang.org](https://typescriptlang.org) | [github.com/microsoft/TypeScript](https://github.com/microsoft/TypeScript)         |
| Lucide Icons | [lucide.dev](https://lucide.dev)                 | [github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide)           |

#### Development Tooling

| Technology  | Website                                                      | GitHub                                                                           |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| pnpm        | [pnpm.io](https://pnpm.io)                                   | [github.com/pnpm/pnpm](https://github.com/pnpm/pnpm)                             |
| ESLint      | [eslint.org](https://eslint.org)                             | [github.com/eslint/eslint](https://github.com/eslint/eslint)                     |
| Prettier    | [prettier.io](https://prettier.io)                           | [github.com/prettier/prettier](https://github.com/prettier/prettier)             |
| Husky       | [typicode.github.io/husky](https://typicode.github.io/husky) | [github.com/typicode/husky](https://github.com/typicode/husky)                   |
| lint-staged | N/A                                                          | [github.com/lint-staged/lint-staged](https://github.com/lint-staged/lint-staged) |
| dotenv      | N/A                                                          | [github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)                 |

#### Backend & Hosting

| Technology | Website                          | GitHub                                                       |
| ---------- | -------------------------------- | ------------------------------------------------------------ |
| Vercel     | [vercel.com](https://vercel.com) | [github.com/vercel/vercel](https://github.com/vercel/vercel) |

#### Testing

| Technology            | Website                                            | GitHub                                                                                                       |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Jest                  | [jestjs.io](https://jestjs.io)                     | [github.com/jestjs/jest](https://github.com/jestjs/jest)                                                     |
| React Testing Library | [testing-library.com](https://testing-library.com) | [github.com/testing-library/react-testing-library](https://github.com/testing-library/react-testing-library) |
| Playwright            | [playwright.dev](https://playwright.dev)           | [github.com/microsoft/playwright](https://github.com/microsoft/playwright)                                   |
| Mock Service Worker   | [mswjs.io](https://mswjs.io)                       | [github.com/mswjs/msw](https://github.com/mswjs/msw)                                                         |

### Core Features

- Natural language recipe management through API endpoints
- Recipe CRUD operations via conversational interface
- Action logging of all database operations
- Advanced search and filtering capabilities
- Cost tracking and usage monitoring

## Implementation Roadmap

### Phase 5: Post-MVP Enhancements

- [ ] Choose Framer Motion for page and shared element transitions.
- [ ] Consider modal/drawer for quick detail previews.
- [ ] **5.6** Favicon
- [ ] **5.7** Add ability for the AI to fetch a website and process it as a recipe
- [ ] **5.8** Implement edit functionality in the detail view for the user to edit the description or tags, or category and so on.
- [ ] **5.9** Implement languages Dutch and English
- [ ] **5.10** Enhanced search with semantic capabilities
- [ ] **5.11** Implement caching strategies
- [ ] **5.12** Add buy me a coffee functionality
- [ ] **5.13** Improve deployment pipeline with automatic testing and version bumping

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
- [ ] **7.6** Image upload and recipe photo management

### Phase 8: Analytics & Optimization

- [ ] **9.1** Usage analytics and metrics
- [ ] **9.2** Performance monitoring

## Technical Specifications

### MVP Database Schema

supabase/migrations

### MVP API Endpoints

- `GET /api/recipes` - List recipes with optional filtering
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/[id]` - Update existing recipe
- `DELETE /api/recipes/[id]` - Delete recipe
- `POST /api/recipes/chat` - Process natural language requests
- `GET /api/recipes/actions` - Get action log history
- `GET /api/recipes/usage` - Get API usage statistics

### OpenAI Function Definitions

/src/lib/services/recipeFunctions.ts

```

```
