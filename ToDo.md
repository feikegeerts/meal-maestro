# Post-MVP Development Roadmap

1. [ ] Record videos for the homepage

## Neon Auth Migration Follow-ups

1. [ ] Implement localized magic link emails via Neon Auth / Better Auth custom email sending hook (currently `locale` is passed through but unused — see `auth-context.tsx` TODO)
1. [ ] Keep PWA authentication sessions alive for returning users — investigate session expiry and target at least 30 days of inactivity
1. [ ] Fix post-login routing so users reliably land on the locale-aware `/recipes` page instead of being sent back to the homepage

## AI & Operations

1. [x] Switch the AI assistant to `gpt-5.6-luna` for text and image requests
1. [ ] Replace the release-please preview → main → approval loop with a simpler release workflow for solo development

## Quality & Compliance

1. [ ] Add integration test to test the usage limit emails that need to be send when the limit is almost reached.
1. [ ] Add more integration tests (run via `pnpm verify` in CI; keep them fast and focused on auth flows, recipe sharing/import, and key edit paths). Maintain ≥65% coverage for libs/api/components.
1. [ ] Set up Playwright for e2e regression testing — cover core flows (login, add recipe, edit recipe) so regressions are caught automatically in CI.


### Low Priority

1. [ ] Define an explicit client/server component boundary strategy — nearly everything is a client component because the locale layout wraps all children in `ThemeProvider → NextIntlClientProvider → AuthProvider → RecipeProvider`; isolating the provider boundary would unlock server-side rendering for pages
1. [ ] Replace `CustomUnitsCacheManager` module-level in-memory cache with a DB query or Vercel KV — the `setInterval` cleanup never fires in short-lived serverless invocations, and the cache is cold on most requests anyway

---

## V2.0 feature requests

1. [x] Groccery shopping list
1. [ ] Menu creator functionality that combines multiple recipes, different options, week menu with 7 days, evenening menu with 3 courses
1. [ ] Tiktok import

---
