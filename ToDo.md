# Bugs

1. [ ] Shouldn't we only deploy on tag creation. right now every push to main is deployed, and the release please tag creation is just there for the sake of the tag, not sure why it's useful in the current setup.
1. [ ] Account partner block is not mobile friendly because the button goes outside of the screen on the right but should be going on a new line

# Post-MVP Development Roadmap

1. [ ] Record videos for the homepage

## Neon Auth Migration Follow-ups

1. [ ] Implement localized magic link emails via Neon Auth / Better Auth custom email sending hook (currently `locale` is passed through but unused — see `auth-context.tsx` TODO)

## Quality & Compliance

1. [ ] Add integration test to test the usage limit emails that need to be send when the limit is almost reached.
1. [ ] Add more integration tests (run via `pnpm verify` in CI; keep them fast and focused on auth flows, recipe sharing/import, and key edit paths). Maintain ≥65% coverage for libs/api/components.
1. [ ] Set up Playwright for e2e regression testing — cover core flows (login, add recipe, edit recipe) so regressions are caught automatically in CI.


### Low Priority

1. [ ] Define an explicit client/server component boundary strategy — nearly everything is a client component because the locale layout wraps all children in `ThemeProvider → NextIntlClientProvider → AuthProvider → RecipeProvider`; isolating the provider boundary would unlock server-side rendering for pages
1. [ ] Replace `CustomUnitsCacheManager` module-level in-memory cache with a DB query or Vercel KV — the `setInterval` cleanup never fires in short-lived serverless invocations, and the cache is cold on most requests anyway

---

## V2.0 feature requests

1. [ ] Groccery shopping list
1. [ ] Menu creator functionality that combines multiple recipes, different options, week menu with 7 days, evenening menu with 3 courses
1. [ ] Tiktok import

---
