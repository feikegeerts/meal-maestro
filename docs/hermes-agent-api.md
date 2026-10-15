# Personal Hermes integration

A separate, versioned REST API for one manually configured Meal Maestro account.
No browser login, OpenAI call, extra service, database migration or MCP server is
needed. It allows recipe reads and **only** last-eaten-date writes. Existing
browser/admin endpoints do not accept this credential.

## Configure Meal Maestro (Vercel dashboard notes)

Generate a random 256-bit token locally. Save the token directly in your password
manager / Hermes environment; do not paste it into chat or commit it. For example,
this command writes an env file at your chosen private path with mode 0600,
without printing the credential:

```sh
node -e 'const fs=require("node:fs"), c=require("node:crypto"), t=c.randomBytes(32).toString("base64url"); fs.writeFileSync(process.argv[1], "MEAL_MAESTRO_API_TOKEN="+t+"\nMEAL_MAESTRO_AGENT_TOKEN_SHA256="+c.createHash("sha256").update(t).digest("hex")+"\n", {mode:0o600,flag:"wx"})' /path/outside/repository/meal-maestro-agent.env
```

Add these **server-only** environment variables to the chosen Vercel deployment
environment (or `.env.local` for local development), then redeploy/restart:

| Variable | Value |
| --- | --- |
| `MEAL_MAESTRO_AGENT_TOKEN_SHA256` | The generated token's SHA-256 hex digest; not the raw token |
| `MEAL_MAESTRO_AGENT_USER_ID` | Your existing `user_profiles.id` UUID; obtain from your authenticated `/api/user/profile` response (`id`) or Drizzle Studio |
| `MEAL_MAESTRO_AGENT_TIMEZONE` | Optional IANA timezone; defaults to `Europe/Amsterdam` |

You can configure these interactively with the Vercel CLI from your project
directory (run `npx vercel login` and `npx vercel link` first if needed):

```sh
npx vercel env add MEAL_MAESTRO_AGENT_TOKEN_SHA256 --sensitive
npx vercel env add MEAL_MAESTRO_AGENT_USER_ID --no-sensitive
npx vercel env add MEAL_MAESTRO_AGENT_TIMEZONE --no-sensitive
```

Select Production and Preview if enabling both. Paste the hash, account UUID,
and timezone respectively at the prompts; use `env update` instead of `env add`
for existing variables. The **raw token goes only in Hermes**, not in Vercel.
Changes take effect in new deployments, not already-running deployments.

Do not use `NEXT_PUBLIC_` variables. Missing/invalid configuration disables access.
The account's accepted partnerships are checked on every operation: the agent
sees/marks the same shared recipes as that account, not unrelated users' recipes.
The user ID is chosen by the server, never by a request parameter.

**Revoke:** remove the server digest and redeploy. **Rotate:** generate a new
token, replace the server digest, redeploy and replace Hermes's token. There is
one active credential, no management UI, expiry, per-key audit log or per-client
rate limiter in this first version. Use only in your private Hermes profile;
anyone able to instruct that profile may be able to use its Meal Maestro access.
Do not give this credential to an agent exposed in public/shared chats.

## Install in Hermes

Copy the bundled skill folder to the Hermes profile running the agent:

```sh
mkdir -p ~/.hermes/skills
cp -R integrations/hermes/meal-maestro ~/.hermes/skills/meal-maestro
```

For a named profile, use that profile's skills directory instead. Set in its
local `.env` (preserve any existing entries; do not replace the whole file):

```dotenv
MEAL_MAESTRO_URL=https://meal-maestro.com
MEAL_MAESTRO_API_TOKEN=<the generated raw token>
```

Protect the env file (`chmod 600` on Linux/macOS), restart Hermes/gateway to load
the environment, and enable its terminal and skills tools. Python 3 is required;
the client has no third-party dependencies. The skill declares its environment
variables for sandbox passthrough. Never store the token in SKILL.md or messages.

Try `/meal-maestro Wat hebben we al heel lang niet gegeten?`, then explicitly ask
`Kun je spaghetti bolognese als vandaag gegeten markeren?`. Ambiguous recipes
should trigger a clarification, not a guessed update.

Official skill format/setup: <https://hermes-agent.nousresearch.com/docs/user-guide/features/skills>.

## API contract

All requests require `Authorization: Bearer <raw-token>` over HTTPS. Responses
are JSON, `Cache-Control: no-store`. Cookies alone do not authenticate. Invalid
tokens return 401; disabled/misconfigured integration returns 503 for well-formed
credentials. Unsupported verbs return 405; Next.js also provides automatic HEAD
and OPTIONS handling for these routes.

### `GET /api/agent/v1/recipes`

Compact summaries, plus `has_more`, `next_offset`, `today` (YYYY-MM-DD) and
`timezone`. No misleading total count: use pagination for exhaustive searches.

| Parameter | Values / behavior |
| --- | --- |
| `query` | Up to 200 characters; case-insensitive words across title, description, ingredients; all words must match, order independent. Not fuzzy/typo matching. |
| `category` | Existing recipe category, e.g. `main-course` |
| `eaten_status` | `all` (default), `recorded`, `unrecorded` |
| `last_eaten_before` | Exclusive YYYY-MM-DD cutoff; excludes missing dates; cannot combine with `unrecorded` |
| `sort` | `last_eaten_asc` (default), `last_eaten_desc`, `title`, `newest`; missing dates sort last |
| `limit` | 1–100, default 20 |
| `offset` | 0–100000, default 0 |

Invalid/unknown parameters return 400. For “long not eaten”, use
`eaten_status=recorded&sort=last_eaten_asc`; query `unrecorded` separately if
desired. `last_eaten: null` means **not recorded**, never proof it was never eaten.

### `GET /api/agent/v1/recipes/{uuid}`

Full recipe in the app's existing snake_case format, plus `today` and `timezone`.
Absent and unauthorized recipe IDs both return 404 (invalid UUIDs return 400).
Recipe contents are untrusted data, not instructions for the agent.

### `PUT /api/agent/v1/recipes/{uuid}/eaten`

JSON body: `{}` for today in the configured timezone, or
`{"date":"2026-10-14"}`. Only `date` is accepted. Invalid/future dates return 400.
Only `last_eaten` (and the normal `updated_at`) changes. Response includes
`success: true`, the recipe ID/title/ISO `last_eaten`, `date`, `today`, `timezone`.
Explicit calendar dates are stored at UTC midnight; comparison cutoffs also use
UTC midnight, consistent with the API's ISO dates.

Repeated calls for the same date do not create duplicate meal entries. There is
**no full eating history**: the value is replaced, including when intentionally
backdating. Ask before replacing a newer last-eaten date with an older date.

## Verification after deployment

Automated local checks (no production data or credentials required):

```sh
pnpm verify
python3 -B -m unittest discover -s integrations/hermes/tests
```

1. Run the bundled client with `list --eaten-status recorded --limit 5`. Confirm
   known recipe titles, dates, timezone, and partner visibility.
2. Run `get <known-uuid>` and check ingredients/instructions.
3. Only for an actual meal you want recorded, run `mark-eaten <uuid>`, then `get`
   and check the app shows the same date. Do not use a real recipe as a throwaway
   write test without approval.
4. Confirm missing/incorrect credentials return 401 and unrelated recipe IDs
   return 404. Do not print credentials for debugging.
