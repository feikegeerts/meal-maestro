# Manual Smoke-Test Guide: Dependency Updates

This is a checklist for a human tester, not a test report. No manual checks are marked as passed. It covers the combined dependency-update working tree, including the TanStack Table v9 and React Day Picker v10 migrations, the Serwist service worker, and updated chat/usage and chart integrations.

## Setup and access

- Use Node.js 24 or newer and pnpm 12.6.0 (`package.json` pins the package manager).
- Install dependencies and run the app from the repository. For normal UI checks, use `pnpm dev`; the default local URL is `http://localhost:3000`.
- Use an existing test account and seeded recipes. If authentication or AI checks require environment configuration, obtain it through the team's secure local setup (for example, the existing `.env.local`); do not copy credentials into this guide, chat, or source control. Use `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` only from the secure local environment. Use a separate disposable account for destructive recipe actions.
- For access from another tailnet device, use only the Tailscale Serve URL/route that the operator has already configured to reach port 3000. Do not change Serve/Funnel routes or assume a public/live URL; if no route exists, use localhost or ask the operator.

## Human-run checks

1. **Sign-in and app shell**
   - Open `/nl/`, sign in with the test account, then open the recipe list and a recipe detail. Sign out and sign back in.
   - Expected: locale-prefixed pages load, protected data appears only after sign-in, and signing out returns to the signed-out state without leaving the prior user's recipe content visible. If Google OAuth is enabled in the test environment, verify its existing sign-in path too; do not change provider configuration for this check.

2. **Recipe table and grid (TanStack Table v9)**
   - Open `/nl/recipes` with more than one seeded recipe. Search by a title and a value in a recipe's ingredients or tags; clear the search. Apply category and season filters, then clear them. Change the sort order. With more than 30 results, move forward and back a page and change rows per page.
   - In list view, open View Options, hide a visible column, then restore it. Switch to grid and back; select a recipe and confirm the selection remains. Verify selected-count and bulk-action controls appear. Open a recipe from each view and use a row action menu.
   - Expected: search/filter results and counts update, sorting and pagination show the correct recipes, hidden columns are restored when re-enabled, and grid/list share row selection. For bulk delete, use disposable seeded data and cancel once to confirm cancellation leaves the recipe intact. For bulk mark-as-eaten, continue with the date-dialog check below.

3. **Date picker (React Day Picker v10)**
   - From a recipe detail, use the mark-as-eaten date control; also open a row-action date picker and the bulk date dialog. Change month/year using the dropdowns, choose a past date, and confirm. Reopen and cancel another selection.
   - Expected: the popover offers years from 2020 through the current year, future days are disabled, and a confirmed date updates the recipe's last-eaten value/toast. Cancel closes without applying the tentative date. In the bulk dialog, choose a date and confirm the selected recipes update; its calendar permits past dates back to 1900 and disables future dates. Check the displayed date in the current locale.

4. **PWA / Serwist (production-mode check)**
   - Development deliberately disables service-worker registration. Build and run production locally instead: `pnpm run build`, then `pnpm run start` (default port 3000). In browser DevTools > Application, inspect the existing web app manifest and confirm `/sw.js` installs and activates. If an old Workbox worker is present, unregister it and clear old site data/cache before testing the new worker.
   - Expected: manifest name/icons and standalone display are valid; the active worker controls the app after reload; repeat visits and navigation/static assets load normally. If the browser offers installation, install and launch the app and confirm it opens in its standalone window. With the network disabled, revisit a page/assets already loaded while online and verify cached shell/static content is available; live API-backed recipe/chat data is not expected to work offline. Restore network and confirm the app recovers and refreshes.

5. **Chat, usage limits, and account usage**
   - With an authorized test account and the configured AI service, send one short, low-cost recipe-chat prompt and verify a normal response. Visit `/nl/about` and check that the account usage/cost summary loads. If testing nutrition estimates, request one for a test recipe only.
   - Expected: chat response renders, usage appears in the account summary without an error, and the monthly-limit message is understandable if a preconfigured test account is already at its limit. Do not deliberately exhaust a production spend cap or repeat AI requests unnecessarily; the limit/timeout response branches are also covered by automated tests.

6. **Admin charts, toasts, and icons**
   - With an admin test account, open `/nl/admin`, load the usage dashboard, change the date range and time grouping, refresh, and inspect chart legends/tooltips. Also trigger a normal recipe action that produces a toast (for example, marking a recipe as eaten).
   - Expected: cost/user charts and model usage data render without layout or console errors; controls refresh the selected range; success/error toast text and adjacent icons remain legible. Skip this check if no admin account/data is available.

## Automated checks (separate from the manual checks above)

- Run `pnpm run verify` for type-check, lint, unit, and integration tests, then `pnpm run build`.
- Run `pnpm run test:e2e` when the app is available. The repository's current Playwright suite has a homepage-load smoke test; it does not exercise recipe-table, picker, PWA-install, chat, or admin-chart interactions. Keep those as human checks unless dedicated E2E coverage is added.
