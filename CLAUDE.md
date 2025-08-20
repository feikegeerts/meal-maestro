# Resources to load in the context for every prompt:

- @README.md for an overview of this project
- @ToDo.md for a todo list of things that need to be done

## Tech Stack

### Frontend

| Technology   | Website                                          | GitHub                                                                             |
| ------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| React        | [react.dev](https://react.dev)                   | [github.com/facebook/react](https://github.com/facebook/react)                     |
| Next.js      | [nextjs.org](https://nextjs.org)                 | [github.com/vercel/next.js](https://github.com/vercel/next.js)                     |
| Tailwind CSS | [tailwindcss.com](https://tailwindcss.com)       | [github.com/tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| shadcn/ui    | [ui.shadcn.com](https://ui.shadcn.com)           | [github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)                         |
| TypeScript   | [typescriptlang.org](https://typescriptlang.org) | [github.com/microsoft/TypeScript](https://github.com/microsoft/TypeScript)         |
| Lucide Icons | [lucide.dev](https://lucide.dev)                 | [github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide)           |

### Tooling

| Technology  | Website                                                      | GitHub                                                                           |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| pnpm        | [pnpm.io](https://pnpm.io)                                   | [github.com/pnpm/pnpm](https://github.com/pnpm/pnpm)                             |
| ESLint      | [eslint.org](https://eslint.org)                             | [github.com/eslint/eslint](https://github.com/eslint/eslint)                     |
| Prettier    | [prettier.io](https://prettier.io)                           | [github.com/prettier/prettier](https://github.com/prettier/prettier)             |
| Husky       | [typicode.github.io/husky](https://typicode.github.io/husky) | [github.com/typicode/husky](https://github.com/typicode/husky)                   |
| lint-staged | N/A                                                          | [github.com/lint-staged/lint-staged](https://github.com/lint-staged/lint-staged) |
| dotenv      | N/A                                                          | [github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)                 |

### Backend / Hosting

| Technology | Website                          | GitHub                                                       |
| ---------- | -------------------------------- | ------------------------------------------------------------ |
| Vercel     | [vercel.com](https://vercel.com) | [github.com/vercel/vercel](https://github.com/vercel/vercel) |

### Testing

| Technology            | Website                                            | GitHub                                                                                                       |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Jest                  | [jestjs.io](https://jestjs.io)                     | [github.com/jestjs/jest](https://github.com/jestjs/jest)                                                     |
| React Testing Library | [testing-library.com](https://testing-library.com) | [github.com/testing-library/react-testing-library](https://github.com/testing-library/react-testing-library) |
| Playwright            | [playwright.dev](https://playwright.dev)           | [github.com/microsoft/playwright](https://github.com/microsoft/playwright)                                   |
| Mock Service Worker   | [mswjs.io](https://mswjs.io)                       | [github.com/mswjs/msw](https://github.com/mswjs/msw)                                                         |

# Auth Notes

- Google OAuth PKCE: Use client-side callback page (`/auth/callback/page.tsx`), not server-side route. Supabase handles PKCE with `detectSessionInUrl: true`.

## Development Guidelines

- Let the user always test with pnpm dev manually - never run pnpm dev automatically
- Do not add comments when the code is self explanatory
- Use shadcn components when possible to avoid custom components

## Senior-Level Architecture Guidelines

### Service Layer Principles
- **Single Responsibility**: Each service class should have one clear purpose
- **Dependency Injection**: Services should accept dependencies in constructors
- **Leverage Existing Services**: Always use existing service infrastructure (e.g., `openai-service.ts`) rather than duplicating logic
- **Stateless Services**: Services should be stateless and reusable across contexts

### API Route Design
- **Thin Controllers**: API routes should be minimal (< 50 lines) and delegate to services
- **HTTP Concerns Only**: Routes handle auth, validation, and response formatting - nothing else
- **Error Boundaries**: Centralized error handling with proper HTTP status codes
- **Service Orchestration**: Use a main service class to coordinate multiple operations

### Code Organization Patterns
- **Extract Configuration**: Move constants, prompts, and validation rules to separate config files
- **Strategy Pattern**: Use strategy pattern for handling different function call types
- **Builder Pattern**: Use builders for complex object construction (e.g., conversation messages)
- **Formatter Pattern**: Separate response formatting logic into dedicated classes

### Complexity Management
- **Function Size Limit**: Keep functions under 30 lines when possible
- **Nested Conditionals**: Extract complex conditional logic into private methods
- **Magic Numbers**: Replace magic strings/numbers with named constants
- **DRY Principle**: Extract repeated patterns into reusable utilities

### TypeScript Best Practices
- **Interface Segregation**: Create focused interfaces rather than large ones
- **Type Guards**: Use type guards for runtime type checking
- **Generic Constraints**: Use generic constraints for flexible yet type-safe code
- **Composition over Inheritance**: Prefer composition patterns over class inheritance

## TypeScript Guidelines

- **NEVER use `any` type** - Always specify proper types or use generic types
- Use explicit interface definitions for data structures
- Prefer type-safe database queries with proper type definitions
- Use union types instead of `any` when multiple types are possible
- Always type function parameters and return values
- Use `unknown` instead of `any` when the type is truly unknown
- Leverage TypeScript's strict mode features for better type safety
