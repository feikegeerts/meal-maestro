# Meal Maestro

> AI-powered recipe management — organize, discover, and chat with your recipes.

**Version**: 3.1.0 &nbsp;|&nbsp; **Stack**: Next.js 16 · Neon · OpenAI · TypeScript

---

## Overview

Meal Maestro is an AI-augmented recipe management platform. Users can store and browse recipes, chat with an AI assistant to create, scale, or modify recipes via natural language, scrape recipes from URLs, and get on-demand nutrition estimates. The app is multilingual (Dutch/English), installable as a PWA, and mobile-first.

---

## Features

- **AI recipe chat** — OpenAI function calling drives create, update, scale, and search operations via conversation
- **Recipe CRUD** — full lifecycle management with categories, seasons, cuisines, diet types, and tags
- **Recipe web scraping** — import recipes directly from a URL
- **Nutrition estimates** — on-demand AI-generated nutrition summaries per recipe
- **Multilingual** — Dutch (default) and English via next-intl
- **Progressive Web App** — installable, offline-capable (next-pwa / Workbox)
- **Image management** — Cloudflare R2 storage with client-side and server-side compression
- **Per-user AI cost tracking & rate limiting** — monthly caps with automated admin email alerts
- **Admin dashboard** — usage monitoring and feedback moderation
- **Dark mode** — system-aware theming with manual override
- **Responsive / mobile-first** design throughout

---

## Tech Stack

### Frontend

| Technology | Version |
|---|---|
| React | 19 |
| Next.js (App Router) | 16 |
| TypeScript | 5 |
| Tailwind CSS | v4 |
| shadcn/ui + Radix UI | — |
| Lucide Icons | — |
| TanStack Table | 8 |
| Recharts | 3 |
| dnd-kit | — |
| Zod | 4 |
| date-fns | 4 |
| sonner | — |

### Backend & Database

| Technology | Notes |
|---|---|
| Neon (PostgreSQL) | Hosted serverless Postgres |
| Drizzle ORM | Schema in `src/db/schema.ts` |
| Next.js Route Handlers | Thin API layer |

### Auth & AI

| Technology | Notes |
|---|---|
| Neon Auth (Better Auth) | Google OAuth via Neon Console |
| OpenAI | GPT models — function calling for AI chat |

### Media & Email

| Technology | Notes |
|---|---|
| Cloudflare R2 | S3-compatible media storage (`@aws-sdk/client-s3`) |
| Sharp | Server-side image processing |
| Resend | Transactional email (admin alerts) |

### Other

| Technology | Notes |
|---|---|
| next-intl | i18n — `nl` default, `en` |
| next-pwa | PWA / Workbox |
| Vercel Analytics + Speed Insights | — |

### Dev Tools

| Tool | Notes |
|---|---|
| Vitest | Unit & integration test runner |
| React Testing Library | Component tests |
| MSW | HTTP mocking in tests |
| ESLint + Prettier | Linting & formatting |
| drizzle-kit | Migration generation & application |
| pnpm | Package manager |

### External Services

| Service | Purpose |
|---|---|
| Vercel | Hosting & deployment |
| GitHub | Code repository |
| Neon | Database + auth |
| Cloudflare R2 | Media storage |
| Cloudflare DNS | Domain & email routing |
| TransIP | Domain registrar |
| Resend | Email |
| OpenAI | AI API |

---

## Getting Started

### Prerequisites

- Node.js >= 24
- pnpm

### Installation

```bash
# 1. Clone
git clone https://github.com/your-username/meal-maestro.git
cd meal-maestro

# 2. Install dependencies
pnpm install

# 3. Pull environment variables (recommended — requires Vercel access)
npx vercel env pull .env.local

# 4. Apply database migrations
pnpm db:migrate

# 5. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

The easiest way to get all required variables is:

```bash
npx vercel env pull .env.local
```

Key variable groups: Neon database URL & auth credentials, Cloudflare R2 bucket/keys, OpenAI API key, Resend API key, and app URL. See the Vercel dashboard or ask the maintainer for details.

---

## Project Structure

```
src/
├── app/
│   ├── [locale]/              # i18n routes (nl / en)
│   │   ├── recipes/           # Recipe CRUD UI
│   │   ├── account/           # User profile & settings
│   │   └── admin/             # Admin dashboard
│   ├── api/                   # Route handlers
│   └── i18n/                  # i18n config & routing
├── components/                # React components
├── contexts/                  # React context providers
├── db/
│   └── schema.ts              # Drizzle ORM schema (source of truth)
├── lib/                       # Business logic & utilities
│   ├── auth/                  # Auth client & server helpers
│   ├── recipe-*.ts            # Recipe domain services & utils
│   ├── openai-service.ts      # OpenAI client & function calling
│   ├── usage-*.ts             # Cost tracking & rate limiting
│   └── image-service.ts       # Image upload & compression
├── types/                     # TypeScript type declarations
└── __tests__/                 # Unit & integration tests
drizzle/                       # Database migrations
messages/                      # i18n translation files (nl.json, en.json)
public/                        # Static assets & PWA manifest
```

---

## Database

- **Provider**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM
- **Schema**: `src/db/schema.ts` — single source of truth
- **Migrations**: `drizzle/` directory, managed with drizzle-kit
- **Key tables**: `user_profiles`, `recipes`, `api_usage`, `monthly_usage_summary`, `feedback`, rate limit tables

> **Important**: The Drizzle schema uses camelCase column names (`displayName`, `avatarUrl`, etc.), but all API responses map these to snake_case (`display_name`, `avatar_url`, etc.) before returning. Any new API route returning DB data must apply this mapping — see `toSnakeCase()` in `src/app/api/user/profile/route.ts`.

---

## Scripts

```bash
pnpm dev                  # Start dev server
pnpm build                # Build for production
pnpm start                # Start production server
pnpm lint                 # Run ESLint
pnpm lint:fix             # Run ESLint with auto-fix
pnpm type-check           # TypeScript type checking
pnpm test                 # Run unit tests (Vitest)
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage report
pnpm test:ci              # Run tests in CI mode (verbose)
pnpm test:integration     # Run integration tests
pnpm verify               # Full check: type-check + lint + tests
pnpm db:generate          # Generate Drizzle migration
pnpm db:migrate           # Apply migrations (local)
pnpm db:migrate:prod      # Apply migrations (production env)
pnpm db:studio            # Open Drizzle Studio
```

---

## Testing

- **Framework**: Vitest
- **Unit tests**: `src/__tests__/` and `src/lib/__tests__/`
- **Integration tests**: `src/__tests__/integration/`
- **HTTP mocking**: MSW (Mock Service Worker) — handlers in `src/__mocks__/`
- **DOM testing**: React Testing Library + `@testing-library/jest-dom`
- **Coverage threshold**: 65% (branches, functions, lines, statements)

Run all checks before opening a PR:

```bash
pnpm verify
```

Any test that transitively imports `@/db` must mock it to prevent Neon from connecting at import time. See [`docs/drizzle-test-mock-patterns.md`](docs/drizzle-test-mock-patterns.md) for the full mocking guide.

---

## Deployment

- **Platform**: Vercel
- **AI chat route** has a 60s max duration (configured in `vercel.json`)
- **Branch strategy**:
  - `preview` → auto-deploys to Vercel preview environment on push
  - `main` → production (rebase `preview` onto `main` when releasing)
- **DB migrations**: run separately via `pnpm db:migrate` or `pnpm db:migrate:prod`

---

## Architecture Notes

- **Server components by default** — use `"use client"` only where interactivity requires it
- **Thin API routes** — route handlers stay under ~50 lines and delegate to services in `src/lib/`
- **camelCase → snake_case** — all Drizzle query results must be mapped before returning from API routes
- **Cost tracking** — AI usage is tracked per-user per-month; automated email alerts fire when thresholds are exceeded (see `src/config/usage-limits.ts`)
- **i18n routing** — all user-facing pages live under `[locale]`; middleware handles locale detection and redirection

---

## Contributing

1. Work in the `preview` branch
2. Keep commits scoped and in imperative mood (`Add scaling test for fractions`)
3. Run `pnpm verify` before finishing
4. If you add a DB migration, note `DB MIGRATION` in the commit body
5. For agent-specific conventions and deep architectural context, see [`AGENTS.md`](AGENTS.md)
