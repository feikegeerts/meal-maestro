# Architecture Review — Meal Maestro

> Reviewed: 2026-02-18
> Reviewer: Claude (senior engineering analysis)
> Branch: `preview`

---

## Overview & Stack

Meal Maestro is a Next.js 16 + React 19 application using the App Router, deployed on Vercel. The core stack:

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5.9.3 (strict mode) |
| Database | Neon (Postgres) via Drizzle ORM 0.45.1 |
| Auth | Neon Auth / Better Auth 0.2.0-beta.1 |
| AI | OpenAI API 6.0.0 (gpt-4.1-mini + gpt-4o) |
| Storage | Cloudflare R2 via AWS SDK S3 |
| Email | Resend |
| Styling | Tailwind CSS v4 + shadcn/ui |
| i18n | next-intl 4.8.2 (en / nl) |

---

## What's Well-Engineered

### Service Layer Architecture

The backend service layer is the strongest part of the codebase. Services follow single responsibility and dependency injection correctly:

```
API Route
  └─ RecipeChatService (orchestrator)
       ├─ ConversationBuilder    — assembles OpenAI messages
       ├─ FunctionCallProcessor  — handles tool_call responses
       ├─ ChatResponseFormatter  — formats responses for the client
       ├─ OpenAIService          — API wrapper with timeout handling
       ├─ UsageTrackingService   — logs token usage and cost
       └─ UsageLimitService      — enforces monthly spend caps
```

Each service is stateless by design (except for controlled, intentional caches). Constructor injection makes testing straightforward.

### Database Design

The Drizzle schema (`src/db/schema.ts`) is well thought out:

- **Native PostgreSQL enums** for all categorical values (category, season, cuisine, diet types, etc.)
- **GIN indexes** on array columns (`dietTypes`, `cookingMethods`, `proteins`, etc.) to support `arrayOverlaps` queries efficiently
- **Composite indexes** on common lookup patterns (`idx_api_usage_timestamp_user`, `idx_rate_limit_user_lookup`)
- **Check constraints** at the DB level — `servings BETWEEN 1 AND 100`, `prepTime >= 0`, etc. Data integrity isn't left to application code alone
- **JSONB** for schema-flexible fields (`ingredients`, `nutrition`, `imageMetadata`) with GIN index coverage
- **Cascading deletes** on `user_profiles` deletion for referential integrity
- **Drizzle `$inferSelect` pattern** for type-safe query results without manual interface duplication

### Authentication Pattern

The `requireAuth() → Response | AuthResult` discriminated union is clean and consistent:

```typescript
// src/lib/auth-server.ts
export async function requireAuth(req: NextRequest): Promise<Response | AuthResult>

// Usage in every route:
const authResult = await requireAuth(request);
if (authResult instanceof Response) return authResult; // 401 early exit
const { user } = authResult;
```

Profile auto-provisioning uses `onConflictDoNothing` to handle concurrent first requests without introducing a race condition.

### ImageService

`src/lib/image-service.ts` is notably the best-written service in the codebase. It uses a `ServiceResult<T>` pattern for typed error handling, validates S3 configuration before making calls, checks user ownership before deletion, and handles best-effort cleanup without propagating cleanup failures to callers. This is the model for how other services should be structured.

### AGENTS.md

The convention documentation is exceptional. The explicit camelCase/snake_case mapping rules, auth setup, and Drizzle conventions prevent an entire class of subtle bugs that typically go undocumented in growing codebases. This pattern should be maintained.

---

## Significant Concerns

### 1. Fat Routes — Validation Logic Doesn't Belong in Route Files

`src/app/api/recipes/route.ts` is 637 lines. The POST handler alone is ~180 lines of validation with zero HTTP concerns. Helper functions like `normalizeTimeField()` and `normalizeIngredient()` are duplicated between this file and `src/app/api/recipes/[id]/route.ts`.

Routes should be thin wrappers: validate → delegate to service → format response. A `RecipeValidator` class would centralize this logic and make it testable in isolation.

**Impact:** High. Duplication creates divergence risk; fat routes are hard to test and maintain.

### 2. No Runtime Request Validation

There is no Zod, Valibot, or TypeBox anywhere. Requests are parsed and cast manually:

```typescript
// Current pattern in routes
const body = await request.json();
const title = body.title as string; // no runtime guarantee
```

TypeScript provides compile-time safety, but `as string` at runtime is just a lie — malformed requests aren't caught until they hit the database or service layer. Given that strict TypeScript is already enforced, adding Zod schemas is a natural extension: define once, get both runtime validation and inferred types.

**Impact:** High. This is a correctness and security surface area issue.

### 3. In-Memory State in a Serverless Context

Two problems:

**`SimpleRateLimiter`** in `src/lib/openai-service.ts` tracks 60 req/min in-memory. Vercel scales horizontally — each function instance has its own counter. In practice this rate limit does nothing meaningful under load.

**`CustomUnitsCacheManager`** uses module-level mutable state and `setInterval` for TTL cleanup. In serverless, functions are short-lived — `setInterval` will rarely fire, and the cache is cold on most requests. The module-level `globalCustomUnits` is also a memory leak risk in long-running processes (e.g. local dev server).

**Impact:** High for rate limiter (correctness in production). Medium for cache (performance regression, not correctness).

### 4. Inconsistent Error Handling

A well-designed `ErrorCode` enum and `ApplicationError` class exist in `src/lib/error-types.ts`, but aren't used consistently. Error handling ranges from correct:

```typescript
// Good — in chat route
if (err instanceof OpenAITimeoutError) { ... }
if (err instanceof MonthlySpendLimitError) { ... }
```

...to fragile string matching:

```typescript
// Brittle — in other routes
if (error.message.includes('timeout')) { ... }
```

...to bare catch blocks with no type narrowing. The chat route pattern is the right one and should be standardized.

**Impact:** Medium. Current error handling doesn't fail unsafely but creates inconsistent client-facing errors and makes debugging harder.

### 5. Frontend: No Data Fetching Library

~~The frontend uses manual `fetch()` + `useState` + manual cancellation throughout.~~

**Resolved.** TanStack Query v5 was introduced as the data fetching layer. `RecipeContext` was eliminated (replaced by TQ cache), `auth-context.tsx` profile fetch uses `useQuery`/`useMutation`, `use-user-costs.ts` uses `useQuery` with `staleTime`/`refetchInterval`, and `custom-units-context.tsx` is TQ-backed with the global variable deduplication hack removed. Query keys are documented in `src/lib/hooks/use-recipes-query.ts`.

### 6. Undefined Client/Server Component Strategy

Nearly the entire application renders as client components because the locale layout wraps all children in a provider chain:

```tsx
// src/app/[locale]/layout.tsx
<ThemeProvider>
  <NextIntlClientProvider>
    <QueryProvider>           // "use client"
      <AuthProvider>          // "use client"
        <CustomUnitsProvider> // "use client"
          {children}          // everything is now client-only
```

`RecipeProvider` was removed as part of the TanStack Query migration, eliminating one unnecessary client boundary.

This prevents Next.js from rendering any pages on the server, losing the performance and SEO benefits of the App Router. A proper strategy would isolate the client boundary to a dedicated `Providers` component while keeping layouts and pages as server components by default.

**Impact:** Low-medium. Not a correctness issue, but limits performance headroom as the app scales.

---

## Smaller Issues

### JSON.stringify for Change Detection

`src/components/recipe-edit/hooks/use-auto-save.ts` serializes entire form state via `JSON.stringify()` on every render cycle to detect changes:

```typescript
JSON.stringify(formData.ingredients) !== JSON.stringify(originalRecipe.ingredients)
```

This is O(n) string allocation for every keystroke in the form. Field-level dirty tracking or a structural comparison would be more appropriate.

### Account Deletion Lacks a Transaction

`src/app/api/user/delete-account/route.ts` manually sequences deletions: delete images → delete recipe data → delete profile → delete auth user. If any step fails midway, the remaining data is orphaned with no recovery path. This should be a Drizzle transaction.

### Admin Stats is O(n)

The admin endpoint aggregates all user data on every request with no pagination, caching, or materialized view. This will degrade linearly as the user base grows.

### `bigint` Handling in Usage Tracking

`totalTokens` is typed as `bigint` in the database schema and Drizzle type, but comparisons and arithmetic in `usage-tracking-service.ts` and `usage-limit-service.ts` treat it as a string in several places. This is a latent type bug.

---

## Priority Table

| Priority | Issue | Effort | File(s) |
|----------|-------|--------|---------|
| High | Extract validation → `RecipeValidator` | Medium | `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts` |
| High | Add Zod request schemas | Medium | All API route files |
| High | Replace `SimpleRateLimiter` with DB/KV | Low | `src/lib/openai-service.ts` |
| ~~Medium~~ | ~~Introduce TanStack Query~~ | ~~High~~ | ~~`src/lib/auth-context.tsx`, `src/contexts/`, `src/app/[locale]/recipes/`~~ | **Done** |
| Medium | Wrap account deletion in transaction | Low | `src/app/api/user/delete-account/route.ts` |
| Medium | Fix `bigint` comparisons | Low | `src/lib/usage-tracking-service.ts`, `src/lib/usage-limit-service.ts` |
| Low | Define client/server component strategy | Medium | `src/app/[locale]/layout.tsx` |
| Low | Replace `CustomUnitsCacheManager` | Medium | `src/lib/recipe-chat-service.ts` |

---

## Overall Assessment

The codebase is in a **solid but uneven state**. The backend service layer, database design, and auth patterns are genuinely well-engineered. The frontend data fetching has been modernized with TanStack Query; the remaining technical debt is concentrated in route validation logic and server-side caching.

The biggest correctness risk is the combination of no runtime validation + fat routes + no transactions — these create a surface area for subtle data integrity bugs that TypeScript's compile-time safety won't catch.

The bones are good. The main remaining work is pushing validation out of routes and standardizing error handling throughout.

**Architecture score: 8/10** — Production-ready, maintainable, with clear paths to improvement.
