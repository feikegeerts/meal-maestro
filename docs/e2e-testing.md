# End-to-end testing

Meal Maestro uses Playwright Test for browser-level regression tests. Vitest
remains the tool for unit and integration tests.

## Local setup

Install the Chromium browser once:

```bash
pnpm exec playwright install chromium
```

Authenticated tests must use a non-production Neon database and Neon Auth
environment. A dedicated E2E project is best isolated; this repo is currently
configured for the Preview Neon project, which is separate from Production but
shared with Vercel Preview deployments. Use a dedicated test account there and
expect its seeded recipes to be visible to Preview deployments. Store its
credentials and environment values in the ignored `.env.e2e.local` file:

```dotenv
E2E_DATABASE_URL=postgresql://...
E2E_NEON_AUTH_BASE_URL=https://...
E2E_NEON_AUTH_COOKIE_SECRET=...
TEST_USER_EMAIL=...
TEST_USER_PASSWORD=...
```

The test runner passes the `E2E_*` database and auth values to its local Next.js
server, overriding any copied `.env.local` values. Do not point these variables
at production. The auth setup logs into the pre-created account and saves a
browser session under the ignored `playwright/.auth/` directory. The recipe
lifecycle test idempotently seeds three example recipes (appeltaart,
tomatensoep, and pannenkoeken), then creates a unique recipe, edits it, deletes
it, and makes a best-effort API cleanup if the UI flow fails partway through.

Configure the Preview Neon Auth environment to allow the app origin used by the
runner (`http://127.0.0.1:3001` with the E2E database, locally and in CI).
Public-only local runs use port 3000. If testing a deployed Preview app, allow
that deployment's origin and its password-reset callback URL as well.

The authenticated browser flows cover recipe form validation and create/edit/
delete, recipe search and category filtering, and shopping-list add/check/
uncheck/delete. The shopping-list test creates a unique item and only cleans up
that item, leaving other list data intact. The signed-out redirect and setup
project exercise the Preview Neon Auth session flow, unauthenticated and
authenticated respectively.

With a local server and an E2E database configured, R2 is inert by default.
Only image-upload E2E tests should configure `E2E_R2_ENDPOINT`,
`E2E_R2_ACCESS_KEY_ID`, `E2E_R2_SECRET_ACCESS_KEY`, `E2E_R2_BUCKET_NAME`, and
`E2E_R2_PUBLIC_URL`, and those must point to a disposable test bucket.

Run all E2E projects with:

```bash
pnpm test:e2e
```

Without the five E2E environment variables, the public smoke tests still run
and authenticated tests are reported as skipped. When E2E is enabled in CI,
missing variables fail the setup project instead of silently skipping it.

To enable the CI E2E step, set the GitHub Actions variable `E2E_ENABLED=true`
and configure the five values above as Actions secrets with the same names.
The test account must already exist in the selected non-production Neon Auth
environment. GitHub Actions does not inherit Vercel environment variables.

Set `PLAYWRIGHT_BASE_URL` to test an already-running E2E deployment instead of
starting a local Next.js server. That deployment must use the same non-production
E2E database and Neon Auth environment. When a local E2E database is configured,
Playwright uses a separate port and does not reuse a running developer server.

## Orca worktree environment setup

The repository helper `scripts/orca-worktree-setup.sh` copies `.env.local` and
`.env.e2e.local` from the canonical checkout into a new Git worktree, only when
each destination file does not already exist. It creates copies with mode `600`
and never prints or overwrites credentials.

Configure Orca **Settings → Repository → Hooks → Setup** to run:

```bash
bash scripts/orca-worktree-setup.sh
```

Orca currently has setup hooks enabled by default for this repository, but its
setup command is empty. `orca worktree create --setup run` forces the configured
setup hook for a new worktree. The copied `.env.local` is for local development
only; it is not an E2E-safe database configuration. Use `.env.e2e.local` for
authenticated E2E tests.
