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

- [x] datum notatie localization
- [x] optimize translations
- [x] categorieen aanpassen naar die AH.nl ook gebruikt.
- [x] every key press in the ingredient edit is blurring the input field making it impossible to properly type or edit
- [x] The unit list in the ingredient dropdown is too large needs to be optimized

- [x] the avatar doesn;t have a hover state so it's not clear it's a clickable item.
- [x] add cookie consent message to login?
- [x] use typescript types everywhere instead of hardcoded lists of tags categories and seasons.
- [x] login using magic link from supabase
- [x] **5.9** Implement languages Dutch and English
- [ ] The ai should as much as possible prefil the form even when asking more questions. Currently the AI either fills in the form and gives a generic response, or asks questions. We want to make number of chat interactions as low as possible and currently it's impossible to get a recipe after 1 chat because the AI always asks follow ups.
- [ ] Header met back button is niet heel mooi, misschien beter breadcrumb op tweede lijn
- [ ] ah.nl layouts overnemen zowel desktop als mobile voor recepten weergeven en toevoegen
- [ ] custom smtp server for magic link emails
- [ ] **5.11** Implement caching strategies
- [ ] **5.12** Add buy me a coffee functionality
- [ ] **5.13** Improve deployment pipeline with automatic version bumping
- [ ] About page with version and release notes
- [ ] Google app for google login customize with meal meastro logo and text, might require approval from google

### Phase 5.5 URL fetching and processing.

- [x] **5.5.1** Create webscraper component with multi-layer extraction (JSON-LD → Meta tags → HTML parsing)
- [x] **5.5.2** Integrate URL detection and extraction into AI chat system
- [x] **5.5.3** Add security measures (rate limiting, URL validation, timeout protection)
- [x] **5.5.4** Enhance error messaging with domain-specific suggestions for blocked sites
- [x] **5.5.5** Create streamlined copy-paste recipe processing functionality (AI handles via update_recipe_form)
- [ ] **5.5.6** Add support for pasting screenshots into chat for AI recipe extraction
- [x] **5.5.7** Create AI function to parse manually pasted recipe text (removed - AI handles naturally)
- [x] **5.5.8** Improve AI chat responses for blocked/failed scraping with actionable suggestions

### Phase 6: Voice Integration

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

/src/lib/recipe-functions.ts

```

```
