# Migration Plan: Supabase → Neon + Neon Auth + Cloudflare R2

## Context

Meal Maestro runs on Supabase's free tier, which auto-pauses after ~7 days of inactivity. Since you don't visit weekly, the site goes down regularly. This migration replaces Supabase with free-tier services that don't auto-pause: **Neon** (database + auth), and **Cloudflare R2** (image storage).

**Architectural decisions made:**

- **Neon Auth** for authentication (managed service built on Better Auth, stores users in Postgres)
- **Drizzle ORM** for type-safe database queries (replaces Supabase query builder)
- **Application-layer authorization** (drop RLS policies, enforce in code)
- **Preserve existing UUIDs** (match returning users by email, assign their existing UUID)
- **Public read access** for images (matches current behavior, enables future sharing)

---

## Progress Tracker

| Phase                               | Status         | Summary                                                                                                                                                                                                                                                                  |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase 1** — Neon + Drizzle Schema | ✅ Done        | Neon project created, Drizzle schema defined (`src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`), migrations generated and applied. **Data not yet migrated** — schema only.                                                                                    |
| **Phase 2** — Neon Auth Integration | ✅ Done        | `auth-server.ts` rewritten (`requireAuth` returns `{ user }`, no Supabase client), `auth-context.tsx` rewritten with Neon Auth client, `createAuthenticatedClient()` removed, auth callback/pages updated                                                                |
| **Phase 3** — API Routes → Drizzle  | ✅ Done        | All 14 API routes + 6 services migrated. See details below                                                                                                                                                                                                               |
| **Phase 4** — Storage (→ R2)        | ✅ Done        | `image-service.ts` rewritten: `@supabase/supabase-js` → `@aws-sdk/client-s3` (S3Client, PutObjectCommand, DeleteObjectCommand). `getStorageStats()` dropped (unused). `extractFilePathFromUrl` handles R2 URLs only (Supabase URL support removed after Phase 5.3). |
| **Phase 4b** — Test Rewrites        | ✅ Done        | All 6 failing test suites rewritten for Drizzle/Neon Auth mocks. `pnpm verify` passes (260 unit + 22 integration tests). See `docs/drizzle-test-mock-patterns.md`.                                                                                                       |
| **Phase 5** — Data Migration        | ✅ Done        | Relational data (Supabase → Neon), images (Supabase Storage → R2). Phase 5.3 (URL rewrite + R2 re-keying) completed via `scripts/migrate-image-urls.ts`. Supabase URL references removed from `image-service.ts` and `next.config.ts`. |
| **Phase 5.5** — Add keys to Vercel  | ✅ Done        | Neon/R2 env vars configured on Vercel. Old Supabase env vars can be removed from dashboard.                                                                                                                                                                              |
| **Phase 6** — Cleanup               | ✅ Done        | Removed `@supabase/supabase-js`, `supabase`, `standardwebhooks` packages. Deleted dead files, `supabase/` directory, outdated docs. Cleaned up email service config, test mocks, stale comments. Updated `AGENTS.md`, `email-system.md`, `features.md`.                  |

### Phase 3 — Detailed File Tracker

| File                                  | Status | Notes                                                                                               |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `api/custom-units/route.ts`           | ✅     | GET/POST → Drizzle                                                                                  |
| `api/custom-units/[id]/route.ts`      | ✅     | DELETE → Drizzle                                                                                    |
| `api/user/usage-cost/route.ts`        | ✅     | Aggregate queries with `sum()`, `count()`                                                           |
| `api/recipes/route.ts`                | ✅     | GET/POST/DELETE/PATCH — `arrayOverlaps`, `ilike`, `sql` for enums                                   |
| `api/recipes/[id]/route.ts`           | ✅     | GET/PUT/DELETE — ImageService without client                                                        |
| `api/recipes/[id]/nutrition/route.ts` | ✅     | Partial select + update with returning                                                              |
| `api/recipes/[id]/image/route.ts`     | ✅     | DB queries only; ImageService still uses Supabase Storage                                           |
| `api/feedback/route.ts`               | ✅     | Rate limiting with `BigInt` timestamps                                                              |
| `api/scrape-recipe/route.ts`          | ✅     | Rate limiting with `BigInt` timestamps                                                              |
| `lib/usage-tracking-service.ts`       | ✅     | `api_usage` insert via Drizzle                                                                      |
| `lib/usage-limit-service.ts`          | ✅     | RPC replaced with `onConflictDoUpdate` upsert                                                       |
| `lib/admin-usage-service.ts`          | ✅     | Service role client removed, uses `db` directly                                                     |
| `lib/profile-secure-service.ts`       | ✅     | RPC replaced with direct Drizzle query                                                              |
| `api/user/delete-account/route.ts`    | ✅     | `createAuthenticatedClient` → `requireAuth` + Drizzle. TODO: Neon Auth user deletion via admin API  |
| `api/recipes/chat/route.ts`           | ✅     | Removed `client` from `authResult`; `RecipeChatService` constructor no longer takes Supabase client |
| `lib/recipe-chat-service.ts`          | ✅     | Supabase client replaced with Drizzle queries for unit preferences + custom units                   |
| `lib/rate-limit-utils.ts`             | ✅     | Removed `AuthError` import from `@supabase/supabase-js`; param widened to `{ message: string }`     |

### Type check pass

`tsc --noEmit` passes clean after Phase 3. Additional fixes applied:

- `account/page.tsx` — `app_metadata` replaced with `user.image` check for provider detection
- `page-client.tsx`, `main-nav.tsx` — `signOut()` return type aligned (void, use try/catch)
- `recipes/route.ts` — `arrayOverlaps` values cast to typed enum arrays

### Known Follow-ups

- `profile-server-service.ts` — dead code (not imported anywhere), delete in Phase 6
- `profile-service.ts` — client-side, only used in tests, still imports from `./supabase`, delete in Phase 6
- `delete-account/route.ts` — TODO: implement Neon Auth user deletion via admin API
- `auth-context.tsx` — TODO: locale parameter for magic link email localization
- ~~`auth-context.test.tsx`, `auth-server.test.ts` — deleted (tested Supabase-era auth), need rewrite for Neon Auth~~ ✅ Auth integration test rewritten
- ~~`recipe-chat-service.test.ts` — 5 tests still reference old Supabase mocks, need Drizzle mocks~~ ✅ All test suites fixed (Phase 4b)
- User ID mapping on first post-migration sign-in — needs design (Phase 5.4)
- **Email service still uses Supabase env vars** — needs migrating to Drizzle/Neon before remaining Supabase env vars can be removed:
  - `configuration-service.ts` uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` for user language preference lookup (replace with Drizzle query)
  - `configuration-service.ts` uses `SUPABASE_WEBHOOK_SECRET` for webhook verification — but the webhook route (`send-email/route.ts`) was already deleted, so this is dead code. Remove `getWebhookConfig()` and the `SUPABASE_WEBHOOK_SECRET` env var
  - `email-service.ts` validates the Supabase env vars in its health check — update to remove
  - Test files (`__mocks__/handlers.ts`, `test-support/integration-env-setup.js`) still reference Supabase URLs — clean up
  - After this migration, remove `@supabase/supabase-js` from `package.json`

---

## Current Supabase Usage Summary

| Feature      | Usage                                                                 | Files Affected                  |
| ------------ | --------------------------------------------------------------------- | ------------------------------- |
| **Auth**     | Google OAuth (PKCE), Magic Link, session cookies, `auth.uid()` in RLS | ~8 files                        |
| **Database** | 10+ tables, 40 migrations, RLS, triggers, SECURITY DEFINER functions  | ~14 API routes, ~6 services     |
| **Storage**  | `recipe-images` bucket, WebP upload/delete/public URLs                | `image-service.ts`, 1 API route |

---

## Migration Phases

### Phase 1: Setup Neon + Neon Auth + Drizzle Schema

**Goal**: Get the database and auth running on Neon.

#### 1.1 Neon Project Setup

1. **Create Neon project** (free tier: 0.5 GB storage, 100 compute-hours/month, 60k MAU for auth)
2. **Enable Neon Auth** during project creation
3. **Configure OAuth providers** in Neon console: Google (reuse existing Google OAuth credentials from Supabase)
4. **Configure magic links**: Enable email verification with Resend as custom email provider

#### 1.2 Drizzle Schema

1. **Install dependencies**: `@neondatabase/serverless`, `@neondatabase/auth`, `drizzle-orm`, `drizzle-kit`
2. **Define Drizzle schema** in `src/db/schema.ts`:
   - All existing tables: `recipes`, `user_profiles`, `api_usage`, `custom_units`, `feedback`, `rate_limit_user`, `rate_limit_violations`, `monthly_usage_summary`, `deletion_requests`, `usage_alert_events`
   - Enums: `user_role`
   - No RLS policies (authorization moves to application layer)
   - No `auth.users`-dependent triggers or functions
   - Note: Neon Auth manages its own tables in the `neon_auth` schema automatically
3. **Create database client** in `src/db/index.ts`:
   ```typescript
   import { neon } from "@neondatabase/serverless";
   import { drizzle } from "drizzle-orm/neon-http";
   ```
4. **Generate and run migrations** with `drizzle-kit`

#### 1.3 Data Migration

**Moved to Phase 5** — data migration is a separate phase that runs after code migration is complete and before cleanup.

**Key files to create:**

- `src/db/schema.ts` — Drizzle table definitions
- `src/db/index.ts` — Database client singleton
- `drizzle.config.ts` — Drizzle Kit configuration

---

### Phase 2: Neon Auth Integration

**Goal**: Replace Supabase Auth with Neon Auth while preserving existing user UUIDs.

#### 2.1 Neon Auth Setup

**Create `src/lib/auth/server.ts`** — Server-side auth using `@neondatabase/auth/next/server`:

- Creates auth instance with `createNeonAuth()`
- Provides `auth.getSession()` for server components and API routes

**Create `src/lib/auth/client.ts`** — Client-side auth using `@neondatabase/auth`:

- Provides `authClient.signIn`, `authClient.signOut`, `authClient.useSession()`

**Create `src/app/api/auth/[...path]/route.ts`** — Auth API route handler (proxies to Neon Auth service)

**Create auth pages** using Neon Auth's pre-built UI components (`AuthView`, `UserButton`, etc.) or build custom UI.

#### 2.2 UUID Preservation Strategy

When existing users sign in for the first time after migration:

1. Neon Auth creates a new user record in `neon_auth.user`
2. In a post-sign-in hook/callback, look up `user_profiles` by email
3. If found, link the Neon Auth user ID to the existing profile (update `user_profiles.id` or create a mapping)
4. If not found, create a new `user_profiles` row

**Alternative (simpler)**: Pre-populate the Neon Auth user table with existing user emails during data migration, ensuring Neon Auth assigns consistent IDs. This needs investigation into whether Neon Auth supports user import.

#### 2.3 Rewrite Server-Side Auth

**Replace `src/lib/auth-server.ts`**:

- `getAuthenticatedUser()` → Uses Neon Auth `auth.getSession()` (no more cookie parsing)
- `requireAuth()` → Returns `{ user: { id, email } }` or 401 (no more `SupabaseClient` return)
- `requireAdmin()` → Checks `user_profiles.role` via Drizzle query
- `createAuthenticatedClient()` → **Removed entirely**. Database access via `db` import instead

**Pattern change in every API route:**

```typescript
// BEFORE: const { user, client: supabase } = authResult;
// AFTER:  const { user } = authResult;
//         Use db.select().from(recipes).where(eq(recipes.userId, user.id))
```

#### 2.4 Rewrite Client-Side Auth

**Replace `src/lib/supabase.ts`**:

- Remove global `supabase` client and `auth` object
- Client-side auth uses Neon Auth client SDK (`authClient.signIn.social()`, `authClient.signIn.magicLink()`, `authClient.signOut()`)

**Replace `src/lib/auth-context.tsx`** (currently 407 lines):

- Replace with Neon Auth's session management (or thin wrapper around `authClient.useSession()`)
- Remove all token sync, refresh locks, health check logic (Neon Auth handles this)
- Keep profile lazy-loading pattern but fetch via API route instead of direct Supabase query

#### 2.5 User Profile Creation

**Replace `handle_new_user()` Postgres trigger** with Neon Auth hook/callback:

- On first sign-in, create `user_profiles` row via Drizzle
- Neon Auth user data lives in `neon_auth` schema; app-specific profile data stays in `user_profiles`

#### 2.6 Account Deletion

**Replace `delete_current_user_auth_record()` RPC**:

- Delete from `neon_auth.user` via Neon Auth admin API or direct SQL
- Delete from app tables via Drizzle in `src/app/api/user/delete-account/route.ts`
- Same cascade order, GDPR audit trail preserved

#### 2.7 Magic Link Email Customization

Neon Auth (via Better Auth) supports custom email sending. Configure to use Resend:

- Reuse existing email templates from `src/lib/email/`
- Reuse locale detection logic for translated emails

#### 2.8 Files to Delete

- `src/app/api/auth/set-session/route.ts` — Token sync (Neon Auth manages cookies)
- `src/app/api/auth/sign-out/route.ts` — Sign-out (Neon Auth built-in)
- `src/app/api/auth/hooks/send-email/route.ts` — Supabase webhook (replaced by Neon Auth email config)

#### 2.9 Files to Heavily Modify

- `src/app/auth/callback/page.tsx` — Simplify or remove (Neon Auth handles callbacks)
- `src/lib/auth-redirect.ts` — Adapt to Neon Auth's redirect handling
- `src/lib/profile-service.ts` — Switch from direct Supabase queries to API fetch calls
- `src/lib/profile-server-service.ts` — Accept Drizzle `db` instead of Supabase client

---

### Phase 3: Migrate All API Routes to Drizzle

**Goal**: Replace every `supabase.from('table')` call with Drizzle queries.

**14 API route files + 6 service files** need query migration. The pattern is consistent:

| Supabase Pattern                                         | Drizzle Equivalent                                        |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `supabase.from('recipes').select('*').eq('user_id', id)` | `db.select().from(recipes).where(eq(recipes.userId, id))` |
| `supabase.from('recipes').insert(data)`                  | `db.insert(recipes).values(data).returning()`             |
| `supabase.from('recipes').update(data).eq('id', id)`     | `db.update(recipes).set(data).where(eq(recipes.id, id))`  |
| `supabase.from('recipes').delete().eq('id', id)`         | `db.delete(recipes).where(eq(recipes.id, id))`            |
| `supabase.rpc('function_name', params)`                  | Direct Drizzle query or `db.execute(sql\`...\`)`          |

**API routes to migrate:**

1. `src/app/api/recipes/route.ts` — Recipe list/create/bulk-delete/bulk-update (largest: ~635 lines)
2. `src/app/api/recipes/[id]/route.ts` — Single recipe CRUD
3. `src/app/api/recipes/[id]/image/route.ts` — Image upload/delete
4. `src/app/api/recipes/[id]/nutrition/route.ts` — Nutrition data
5. `src/app/api/recipes/chat/route.ts` — AI chat endpoint
6. `src/app/api/custom-units/route.ts` + `[id]/route.ts` — Custom units CRUD
7. `src/app/api/feedback/route.ts` — Feedback + rate limiting
8. `src/app/api/user/usage-cost/route.ts` — Usage stats
9. `src/app/api/user/delete-account/route.ts` — Account deletion
10. `src/app/api/admin/usage-stats/route.ts` — Admin dashboard
11. `src/app/api/scrape-recipe/route.ts` — Recipe scraping

**Services to migrate:**

1. `src/lib/recipe-chat-service.ts` — Core AI service (profile lookup, recipe CRUD)
2. `src/lib/usage-tracking-service.ts` — OpenAI cost logging
3. `src/lib/usage-limit-service.ts` — Monthly spend cap enforcement
4. `src/lib/admin-usage-service.ts` — Admin analytics
5. `src/lib/profile-server-service.ts` — Server-side profile operations
6. `src/lib/profile-secure-service.ts` — Secure profile lookups (replace RPC with Drizzle)

**New API route needed:**

- `src/app/api/user/profile/route.ts` — GET/PATCH for client-side profile operations (replaces direct Supabase client access in `profile-service.ts`)

---

### Phase 4: Storage Code Migration (Supabase Storage → Cloudflare R2)

**Goal**: Rewrite image service code to use R2 instead of Supabase Storage. Data migration handled in Phase 5.

1. **Create R2 bucket**: `meal-maestro-images` with **public read access** (matches current Supabase behavior — images accessible by URL but not discoverable; sets up well for potential recipe sharing later)
2. **Install**: `@aws-sdk/client-s3`
3. **Rewrite `src/lib/image-service.ts`**:
   - Replace `SupabaseClient` with `S3Client` from AWS SDK
   - `upload()` → `PutObjectCommand`
   - `remove()` → `DeleteObjectCommand`
   - `list()` → `ListObjectsV2Command`
   - `getPublicUrl()` → Construct URL from R2 public domain + path
   - `extractFilePathFromUrl()` → Update regex for R2 URL format (also handles legacy Supabase URLs)
   - Keep all existing error handling, compression, and metadata logic

**Note**: Actual image data migration and URL rewrite moved to Phase 5.2 and 5.3.

---

### Phase 5: Data Migration

**Goal**: Move all production data from Supabase to Neon + R2. Supabase must remain live and queryable throughout this phase.

#### 5.1 Relational Data (Supabase Postgres → Neon Postgres)

**Tables to migrate** (10 tables):

| Table                   | FK Dependencies                         | Notes                                                         |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `user_profiles`         | None (root)                             | Must be imported first — all other tables reference `user_id` |
| `recipes`               | `user_profiles.id`                      | Largest table. Contains `image_url` (rewritten in 5.3)        |
| `custom_units`          | `user_profiles.id`                      |                                                               |
| `api_usage`             | `user_profiles.id`                      | Historical data, may be large                                 |
| `monthly_usage_summary` | Composite PK (`user_id`, `month_start`) |                                                               |
| `usage_alert_events`    | None (no FK)                            |                                                               |
| `feedback`              | `user_profiles.id`                      |                                                               |
| `deletion_requests`     | None (no FK, user may be deleted)       |                                                               |
| `rate_limit_user`       | `user_profiles.id`                      | Ephemeral — can skip or truncate                              |
| `rate_limit_violations` | `user_profiles.id`                      | Ephemeral — can skip or truncate                              |

**Approach**:

1. **Export from Supabase**: `pg_dump --data-only --no-owner --no-privileges` for each table (or full DB)
2. **Import into Neon**: `psql $DATABASE_URL < dump.sql`
3. **Import order**: `user_profiles` first, then all dependent tables
4. **Skip ephemeral tables**: `rate_limit_user`, `rate_limit_ip`, `rate_limit_violations` can be skipped (transient data, auto-cleaned)

**Verification**:

- Compare row counts: `SELECT count(*) FROM <table>` on both databases
- Spot-check a few recipes by ID to verify JSON columns (`ingredients`, `sections`, `nutrition`) transferred correctly
- Verify enum values didn't get mangled (Supabase enums → Drizzle pgEnum)

#### 5.2 Image Data (Supabase Storage → Cloudflare R2)

1. **List all images** in the `recipe-images` Supabase bucket
2. **Download each image** from Supabase Storage public URL
3. **Upload to R2** using S3 SDK (`PutObjectCommand`) preserving the same path structure
4. **Verify**: Confirm each image is accessible via the R2 public URL

**Script approach** (Node.js or shell):

```bash
# Pseudocode
for each recipe with image_url:
  download from Supabase Storage URL
  upload to R2 with same key/path
  verify R2 public URL returns 200
```

**Considerations**:

- Preserve the same file paths/keys so the URL rewrite (5.3) is a simple domain swap
- If Supabase paths differ from R2 paths, build a mapping table
- Handle images referenced by deleted users gracefully (skip or archive)

#### 5.3 Image URL Rewrite (in Neon DB)

After all images are confirmed in R2, update the database:

```sql
UPDATE recipes
SET image_url = REPLACE(
  image_url,
  'https://<SUPABASE_PROJECT>.supabase.co/storage/v1/object/public/recipe-images/',
  '<R2_PUBLIC_URL>/'
)
WHERE image_url IS NOT NULL
  AND image_url LIKE '%supabase.co%';
```

**Verification**: Query for any remaining Supabase URLs: `SELECT id, image_url FROM recipes WHERE image_url LIKE '%supabase%'` — should return 0 rows.

#### 5.4 User Account Considerations

Neon Auth manages its own user table (`neon_auth.user`). Existing Supabase Auth users won't exist in Neon Auth until they sign in again.

**Strategy**: On first sign-in after migration, the app's profile auto-provisioning in `GET /api/user/profile` matches by email and links the new Neon Auth user ID to the existing `user_profiles` row.

**Risk**: If the user's Supabase `user_profiles.id` (UUID) differs from their new Neon Auth user ID, all FK references break. The profile endpoint needs to handle this ID mapping — update `user_profiles.id` to the new Neon Auth ID and cascade the change, or maintain a mapping.

**TODO**: Investigate whether Neon Auth supports user import (pre-populating users) to avoid the ID mismatch problem entirely.

---

### Phase 6: Cleanup

**Goal**: Remove all Supabase dependencies. Only proceed after Phase 5 is verified.

1. **Remove packages**: `@supabase/supabase-js`, `supabase`, `standardwebhooks`
2. **Delete dead files**:
   - `src/lib/supabase.ts` (if still present)
   - `src/lib/profile-server-service.ts` (dead code, not imported)
   - `src/lib/profile-service.ts` (client-side, imports from `./supabase`)
   - `src/app/api/auth/set-session/route.ts` (already deleted)
   - `src/app/api/auth/sign-out/route.ts` (already deleted)
   - `src/app/api/auth/hooks/send-email/route.ts` (already deleted)
   - `docs/supabase-storage-setup.md`
3. **Clean up stale references** (19 files still mention "supabase"):
   - `src/__mocks__/handlers.ts` — remove Supabase URL from MSW handlers
   - `src/test-support/integration-env-setup.js` — remove `NEXT_PUBLIC_SUPABASE_URL`
   - `src/lib/image-service.ts` — keep `extractFilePathFromUrl` legacy URL support (needed if any old URLs remain)
   - `src/messages/*.json`, privacy/about/terms pages — update user-facing text from "Supabase" to "Neon"
   - Test files — remove leftover Supabase comments
4. **Update environment variables** in Vercel dashboard:
   - Remove: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_AUTH_WEBHOOK_SECRET`
   - Add: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
5. **Delete `supabase/` directory** (migrations no longer needed — Drizzle manages schema)
6. **Final verification**: `grep -ri "supabase" src/` should return only the legacy URL handler in `image-service.ts` (if kept)

---

## Risk Areas

| Risk                                                                                                           | Severity | Mitigation                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| **User ID mismatch** — Neon Auth assigns new IDs instead of preserving Supabase UUIDs                          | High     | Email-based lookup on first sign-in; investigate Neon Auth user import API                  |
| **Neon Auth is beta** — API surface may change, limited community resources                                    | Medium   | Built on Better Auth which is stable; Neon is actively investing in this. Pin SDK versions. |
| **Magic link customization** — Need to integrate Resend + existing email templates with Neon Auth's email flow | Medium   | Better Auth supports custom email sending; verify with Neon Auth SDK                        |
| **Missing query translations** — Complex Supabase queries may not translate cleanly to Drizzle                 | Medium   | Migrate one route at a time, run tests after each                                           |
| **Image URL breakage** — Recipes reference old Supabase Storage URLs after migration                           | Medium   | Run URL update query; verify all images load in staging                                     |
| **Neon cold start latency** — First request after inactivity may be slower (~500ms)                            | Low      | Acceptable for hobby project; much better than full Supabase pause                          |

---

## Verification Plan

1. **After Phase 1**: Connect to Neon, verify all tables exist with correct schema, verify Neon Auth console shows auth config
2. **After Phase 2**: Sign in with Google, sign in with magic link, verify session persists
3. **After Phase 3**: Full recipe CRUD (create, view, edit, delete), AI chat creates recipe, admin dashboard loads, feedback submission works, usage tracking records costs
4. **After Phase 4**: Upload recipe image, verify it appears, delete image. `pnpm verify` passes (all tests green).
5. **After Phase 5**: Row counts match between Supabase and Neon for all migrated tables. All recipe images load from R2 URLs. No `%supabase%` URLs remain in `recipes.image_url`. Existing user can sign in and see their recipes.
6. **After Phase 6**: `pnpm build` succeeds, `pnpm verify` passes, `grep -ri "supabase" src/` returns only the legacy URL handler in `image-service.ts`. Supabase project can be decommissioned.

---

## Estimated Effort

| Phase                               | Status  | Days            | Notes                                                                 |
| ----------------------------------- | ------- | --------------- | --------------------------------------------------------------------- |
| Phase 1: Neon + Drizzle schema      | ✅ Done | 2               | Schema definition                                                     |
| Phase 2: Neon Auth                  | ✅ Done | 2-3             | Managed service with pre-built components                             |
| Phase 3: API route migration        | ✅ Done | 4-5             | 14 routes + 6 services                                                |
| Phase 4: R2 storage + test rewrites | ✅ Done | 1-2             | `image-service.ts` rewrite + 6 test suites                            |
| Phase 5: Data migration             | ✅ Done | 1-2             | `pg_dump`/`psql`, image transfer script, URL rewrite, user ID mapping |
| Phase 6: Cleanup                    | ✅ Done | 1               | Remove packages, dead files, stale references, env vars               |
| **Total**                           |         | **~11-15 days** | All phases complete. Migration finished.                              |

---

## Service Explainers

### Neon

Managed PostgreSQL database. Free tier scales-to-zero on inactivity (compute stops, wakes instantly on next request ~500ms). Unlike Supabase's pause, the database stays reachable. 0.5 GB storage, 100 compute-hours/month.

### Neon Auth

Managed authentication service built on Better Auth, running alongside your Neon database. Stores users and sessions in a `neon_auth` Postgres schema. Supports Google OAuth + magic links. Free up to 60,000 MAU. Pre-built UI components available. Currently in beta (AWS regions only).

### Cloudflare R2

S3-compatible object storage. Free tier: 10 GB storage, zero egress fees (no cost when users view images). Uses the standard AWS S3 SDK.

---

## Sources

- [Neon Auth Overview](https://neon.com/docs/auth/overview)
- [Neon Auth Next.js Quick Start](https://neon.com/docs/auth/quick-start/nextjs)
- [Neon Auth Blog Announcement](https://neon.com/blog/neon-auth-is-here-get-authentication-in-a-couple-of-clicks)
- [Better Auth Magic Link Plugin](https://www.better-auth.com/docs/plugins/magic-link)
- [Neon Auth Email Verification](https://neon.com/docs/auth/guides/email-verification)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Neon Pricing](https://neon.com/pricing)
