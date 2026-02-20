# Post-MVP Development Roadmap

1. [ ] Record videos for the homepage

## Neon Auth Migration Follow-ups

1. [ ] Implement feature branches on NEON as well and have 1 database per env.
1. [ ] Implement localized magic link emails via Neon Auth / Better Auth custom email sending hook (currently `locale` is passed through but unused — see `auth-context.tsx` TODO)

## Quality & Compliance

1. [ ] Add integration test to test the usage limit emails that need to be send when the limit is almost reached.
1. [ ] Add more integration tests (run via `pnpm verify` in CI; keep them fast and focused on auth flows, recipe sharing/import, and key edit paths). Maintain ≥65% coverage for libs/api/components.
1. [ ] Set up Playwright for e2e regression testing — cover core flows (login, add recipe, edit recipe) so regressions are caught automatically in CI.

## Refactoring

1. [ ] Setup a proper CI/CD pipeline instead of using husky

### High Priority

1. [x] Extract recipe validation logic out of route files into a `RecipeValidator` service class — `normalizeTimeField()`, `normalizeIngredient()` and the bulk of POST validation in `src/app/api/recipes/route.ts` and `src/app/api/recipes/[id]/route.ts` are duplicated and belong in the service layer
1. [ ] Add Zod schemas for runtime request validation on API routes — TypeScript provides compile-time safety but requests are currently parsed and cast manually with no runtime guarantees
1. [ ] Replace in-memory `SimpleRateLimiter` in `src/lib/openai-service.ts` with a DB-backed or Vercel KV solution — the current implementation breaks in multi-instance deployments since each instance maintains its own counter

### Medium Priority

1. [ ] Introduce TanStack Query (React Query) for frontend data fetching — replace the manual `fetch()` + `useState` + cancellation token pattern used throughout (e.g. `auth-context.tsx`, recipe context, `use-user-costs.ts`) with a proper caching and refetch layer
1. [ ] Wrap account deletion flow in a Drizzle transaction — the current sequential deletes in `src/app/api/user/delete-account/route.ts` leave orphaned data if the process fails midway
1. [ ] Fix `bigint` comparison in usage tracking — `totalTokens` is typed as `bigint` but is compared as a string in several places in `src/lib/usage-tracking-service.ts` and `src/lib/usage-limit-service.ts`

### Low Priority

1. [ ] Define an explicit client/server component boundary strategy — nearly everything is a client component because the locale layout wraps all children in `ThemeProvider → NextIntlClientProvider → AuthProvider → RecipeProvider`; isolating the provider boundary would unlock server-side rendering for pages
1. [ ] Replace `CustomUnitsCacheManager` module-level in-memory cache with a DB query or Vercel KV — the `setInterval` cleanup never fires in short-lived serverless invocations, and the cache is cold on most requests anyway

---

## V2.0 feature requests

1. [ ] Groccery shopping list
1. [ ] Menu creator functionality that combines multiple recipes, different options, week menu with 7 days, evenening menu with 3 courses
1. [ ] Patch notes, just use the the latest commit message and put it somewhere with a husky precommit hook. the site can then show the latest few version updates. Husky can automatically update when there is a new version an grab the latest commit messages that belong to that version
1. [ ] Create an integration that allows other AI agents to use meal-maestro functionality as well. Basically enabling a user of chatgpt to store recipes in meal-maestro without ever leaving the chatgpt interface.
1. [ ] Tiktok import

---
