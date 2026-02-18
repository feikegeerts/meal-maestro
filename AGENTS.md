# AGENTS.md

A dedicated guide for AI coding agents (Codex, Cursor, Aider, etc.) working in this repository. This complements `README.md` (human-focused overview) and `ToDo.md` (roadmap / backlog).

---

**Next.js Initialization**: When starting work on a Next.js project, automatically
call the `init` tool from the next-devtools-mcp server FIRST. This establishes
proper context and ensures all Next.js queries use official documentation.

## High-Priority Context Files

Load these first for almost any task:

- `README.md` – human overview & tech stack
- `ToDo.md` – roadmap & pending work
- `package.json` – scripts, dependencies, version
- `tsconfig.json` – TypeScript compiler settings
- `next.config.ts` – Next.js configuration & PWA setup

Supplementary frequently relevant files:

- `src/app/layout.tsx` – root layout & global providers
- `src/middleware.ts` – middleware logic (auth/i18n)
- `src/lib/` – domain/business logic utilities
- `src/contexts/` – React context providers
- `src/db/schema.ts` – Drizzle ORM schema (source of truth for DB structure)
- `drizzle/migrations/` – database migrations
- `src/config/usage-limits.ts` – server-side AI spend thresholds & alert tuning

When modifying or adding tests, also inspect:

- `jest.config.js`
- `src/__tests__/` & `src/__mocks__/`

---

## Project Overview (Agent-Focused)

Meal Maestro is an AI‑augmented recipe management platform built on Next.js (App Router) + Neon (Postgres) + Drizzle ORM + OpenAI. It enables users to store, search, and interact with recipes using conversational AI.

Primary domains:

1. Recipes (CRUD, scaling, unit conversion, tagging, seasonal metadata)
2. User Auth & Profiles (Neon Auth / Better Auth, Google OAuth)
3. AI Interaction (OpenAI model usage + cost tracking)
4. Media (Recipe images with compression & upload via Cloudflare R2)
5. Settings & Theming (Dark mode, custom units, preferences)

Database & ORM:
- Database: Neon (Postgres) — schema in `src/db/schema.ts` (Drizzle ORM)
- Migrations: `drizzle/migrations/` (managed via `drizzle-kit`)
- Storage: Cloudflare R2 via S3-compatible API (`@aws-sdk/client-s3`)

---

## Environment & Setup Commands

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev` (Next.js @ localhost:3000)
- Type check: `pnpm exec tsc --noEmit` (if needed; often implicit via tooling)
- Lint: `pnpm lint`
- Run unit tests: `pnpm test`
- Build production: `pnpm build`
- Start production: `pnpm start`

Environment variables live in `.env.local` (see `README.md` for template). For agent-created features requiring new env vars: also update `vercel.json` or Vercel dashboard notes.

---

## Key Architectural Conventions

- Prefer server components by default; opt into client components with `"use client"` only when interactivity is required.
- Central domain utilities reside in `src/lib/` (e.g. recipe utilities, auth helpers, formatting). Avoid duplicating logic in components.
- React contexts in `src/contexts/` should remain light wrappers over pure utility functions in `src/lib/`.
- Use absolute imports with `@/` path alias (configured in tsconfig).
- Keep `types/` purely for type/interface/enum declarations (no business logic). Logic belongs in `lib/`.

### Drizzle ORM camelCase vs API snake_case

**Critical**: The Drizzle schema (`src/db/schema.ts`) uses camelCase column names (`displayName`, `avatarUrl`, `languagePreference`, `unitSystemPreference`, `createdAt`, `updatedAt`), but the frontend types and all API responses use snake_case (`display_name`, `avatar_url`, `language_preference`, etc.).

**Any API route returning Drizzle query results must map camelCase → snake_case** before sending the response. See `src/app/api/user/profile/route.ts` `toSnakeCase()` for the pattern. The frontend `UserProfile` type is defined in `src/lib/profile-types.ts` (snake_case).

---

## Code Style Guidelines

- TypeScript strict mode; no implicit anys.
- Prefer functional & composable utilities over large classes.
- Consistent React patterns: small focused components, collocate component-specific helpers.
- Tailwind CSS v4 for styling + shadcn/ui primitives.
- Keep JSX clean: avoid deeply nested conditional logic inline—extract helpers.
- Use descriptive function names (e.g. `formatFractionalQuantity`, `scaleRecipeIngredients`).
- Avoid premature premature optimization—only optimize data fetching/rendering after profiling.

Formatting:

- Enforced by Prettier + ESLint (run `pnpm lint --fix` to apply).
- Use consistent naming: kebab-case files, camelCase functions, PascalCase components.

---

## Testing Instructions

- All unit tests: `pnpm test`
- Focus a single test file: `pnpm test -- <pattern>`
- Add tests for new utility functions in `src/__tests__/` (mirroring folder structure where helpful).
- Mock external network interactions with MSW (`src/__mocks__/handlers.ts`).
- Add edge case coverage for: empty ingredient lists, scaling >10x, invalid unit conversions, missing auth session.
- Agents: If you modify logic in `recipe-utils` or auth flows, add or update tests accordingly before finishing.

### Drizzle ORM Test Mocking

Any test that transitively imports `@/db` **must** mock it to prevent `neon()` from running at import time. See `docs/drizzle-test-mock-patterns.md` for full patterns covering:

- Simple chainable mocks (`db.select().from().where()`)
- Module-level mutable state for per-test DB responses
- Multi-query dispatch (when code makes multiple different DB calls)
- Neon Auth (`auth.getSession`) mocking
- Jest mock hoisting workarounds (`const` vs `let` in factories)

Verification steps for most feature changes:

1. Lint passes (`pnpm lint`)
2. Tests green (`pnpm test`)
3. Type checks (no TS errors in editor or build)
4. App starts (`pnpm dev`) and affected UI path loads without runtime errors

---

## Recipe Domain Pointers

Primary utility source: `src/lib/recipe-utils.ts` (and related files). Types: `src/types/recipe.ts` (now mostly declarative). When adding new unit conversions or scaling logic:

- Keep logic pure & testable.
- Add tests for conversion precision (fractions, rounding).
- Update documentation comments if introducing new measurement systems.

When refactoring recipe code:

- Update imports referencing functions wrongly pulling from `types/`.
- Consolidate duplicate formatters.
- Consider splitting `recipe-utils` if it grows beyond ~600 lines (candidate modules: `unit-conversion.ts`, `parsing.ts`, `scaling.ts`).

---

## Auth Notes (Neon Auth)

- Authentication uses Neon Auth (Better Auth) — NOT Supabase Auth.
- Google OAuth is configured through the Neon Console; the OAuth callback goes through Neon's auth endpoint.
- Auth client: `src/lib/auth/client.ts` (browser), `src/lib/auth/server.ts` (server).
- Auth context: `src/lib/auth-context.tsx` provides `useAuth()` hook with `user`, `profile`, `signIn*`, `signOut`, `updateProfile`.
- Profile auto-provisioning: `GET /api/user/profile` creates a `user_profiles` row on first access if none exists.
- `AuthUser` type (`src/lib/auth-server.ts`): `{ id, email?, name?, image? }` — name/image come from Neon Auth session.
- Avoid exposing secrets in browser context.
- When modifying auth flows: ensure middleware assumptions hold.

---

## AI / OpenAI Usage Guidelines

- Models: default lightweight model (`gpt-4.1-nano` or `mini`) for routine tasks; escalate to larger only if necessary.
- Track cost usage service in `src/lib/` (see usage/cost related utilities) — update if adding new model endpoints.
- Provide verification prompts for AI-generated recipe transformations (e.g., re-check ingredient counts).

---

## Performance & Loading

- Use `use-intelligent-loading.ts` for progressive UX patterns.
- Defer large, rarely-used components via dynamic import if impacting FCP.
- Compress images client-side (see `use-image-compression.ts` and `client-image-compression.ts`).

---

## Security Considerations

- Never log secrets in server logs.
- Validate any user-provided external URLs before fetching.
- Ensure uploaded images are validated/maybe transcoded.
- Keep dependency updates minimal & tested—add a short note if bumping major versions.

---

## Common Tasks (for Agents)

Add a new recipe field:

1. Update type in `src/types/recipe.ts`.
2. Adjust parsing/validation in `recipe-utils`.
3. Migrate DB if persisted (create migration via `drizzle-kit generate` in `drizzle/migrations/`).
4. Update form component(s) & tests.

Add unit conversion:

1. Extend conversion map.
2. Add tests (edge cases: fractional values, rounding).
3. Document in comment block near conversion map.

---

## Pull Request / Commit Guidance

- Keep commits scoped & descriptive (imperative mood: "Add scaling test for fractions").
- Before finishing: run lint + test.
- If migration added: mention `DB MIGRATION` in commit body.
- Reference ToDo item IDs if closing roadmap tasks.

---

## Prompting Tips (Codex / Agents)

Include in your task prompt when relevant:

- Exact file paths you intend to modify.
- Specific failing test names or stack traces.
- Desired acceptance criteria enumerated clearly.
- Verification commands (see Testing Instructions section).

Encourage the agent to:

- Break large refactors into staged commits.
- Add tests before major logic changes.
- List affected files before applying bulk edits.

---

## Change Management & Sync

If you materially alter conventions (folder layout, build commands, testing strategy), update this `AGENTS.md` in the same PR.

Automation suggestions (optional future additions):

- Script to diff `CLAUDE.md` vs `AGENTS.md` for divergence.
- Pre-commit hook verifying `AGENTS.md` references only existing file paths.

---

## Migration Note

`CLAUDE.md` previously held a slim context list. Its content is now fully represented and expanded here. `CLAUDE.md` can be deprecated or left temporarily for human continuity. Prefer agents to load `AGENTS.md` first.

---

## Quick Reference Cheat Sheet

| Action       | Command        |
| ------------ | -------------- |
| Install deps | `pnpm install` |
| Dev server   | `pnpm dev`     |
| Run tests    | `pnpm test`    |
| Lint         | `pnpm lint`    |
| Build prod   | `pnpm build`   |
| Start prod   | `pnpm start`   |

---

## Maintenance Owner

Primary maintainer: (update with GitHub handle if desired). If unclear, inspect recent commit authors.

---

## Closing Guidance

Agents: When completing tasks, summarize changes, list verification steps performed, and surface any risky assumptions or follow-up suggestions explicitly.
