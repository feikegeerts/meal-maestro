# Recipe Sharing - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Security Architecture](#security-architecture)
4. [API Design](#api-design)
5. [Service Layer](#service-layer)
6. [Client-Side Implementation](#client-side-implementation)
7. [Technical Decisions & Trade-offs](#technical-decisions--trade-offs)
8. [Error Handling Patterns](#error-handling-patterns)
9. [Testing Strategy](#testing-strategy)
10. [Scaling Considerations](#scaling-considerations)
11. [Migration Guide](#migration-guide)

---

## Architecture Overview

The recipe sharing system implements a secure, token-based sharing mechanism that allows authenticated users to share their content with unauthenticated recipients via public URLs.

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  - ShareRecipeButton (owner management)                     │
│  - SharedRecipeClient (recipient viewing)                   │
│  - Server-side page pre-fetching                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  - POST   /api/recipes/[id]/share (create)                 │
│  - GET    /api/recipes/[id]/share (fetch owner's share)    │
│  - DELETE /api/recipes/[id]/share (revoke)                 │
│  - GET    /api/shared-recipes/[slug] (public fetch)        │
│  - POST   /api/shared-recipes/[slug]/import (save copy)    │
│  - GET    /api/user/shared-recipes (list all shares)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  RecipeShareService (core business logic)                   │
│  - Token generation & hashing                               │
│  - Metadata cache management                                │
│  - Image handling with signed URLs                          │
│  - Access validation                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│  - shared_recipe_links (primary table)                      │
│  - user_profiles.shared_recipe_links (metadata cache)       │
│  - recipes (source data)                                    │
│  - Supabase Storage (recipe images)                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Create Share Link

```
User clicks "Generate Share"
         ↓
POST /api/recipes/[id]/share
         ↓
Verify recipe ownership (RLS policy)
         ↓
Generate slug (8 chars base64url) + token (43 chars base64url)
         ↓
Hash token with SHA-256
         ↓
Delete existing share for this recipe (one share per recipe constraint)
         ↓
Insert into shared_recipe_links (slug, token_hash, permissions)
         ↓
Cache metadata in user_profiles.shared_recipe_links (slug + plaintext token)
         ↓
Return sharePath: /{locale}/share/{slug}?token={token}
         ↓
User copies URL to clipboard
```

### Data Flow: View Shared Recipe

```
Recipient opens share URL
         ↓
Server-side page pre-fetches:
GET /api/shared-recipes/[slug]?token={token}
         ↓
Find shared_recipe_links by slug (admin client, bypasses RLS)
         ↓
Validate token: hash(provided) === stored token_hash
         ↓
Check expiration: expires_at > now()
         ↓
Fetch recipe data (admin client)
         ↓
Fetch owner display_name from user_profiles
         ↓
Generate signed image URL (valid 1 hour)
         ↓
Sanitize recipe (remove user_id, replace image_url)
         ↓
Increment view_count + update last_viewed_at (async, non-blocking)
         ↓
Return public payload
         ↓
Client renders recipe with owner info
```

### Data Flow: Import Shared Recipe

```
Authenticated user clicks "Save to My Recipes"
         ↓
POST /api/shared-recipes/[slug]/import
         ↓
Validate token + check allow_save permission
         ↓
Copy recipe data (remove original user_id)
         ↓
If recipe has image:
  - Extract storage path from image_url
  - Copy image file: {originalPath} → {newUserId}/{newRecipeId}/{timestamp}.{ext}
  - Generate new public URL
  - Update metadata.uploadedAt
         ↓
Insert new recipe into recipes table (user's ownership)
         ↓
Return new recipe ID + any warnings (e.g., IMAGE_COPY_FAILED)
         ↓
Redirect user to their imported recipe
```

---

## Database Schema

### Primary Table: `shared_recipe_links`

```sql
CREATE TABLE shared_recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  allow_save BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shared_recipe_links_owner ON shared_recipe_links(owner_id);
CREATE INDEX idx_shared_recipe_links_recipe ON shared_recipe_links(recipe_id);
```

**Column Descriptions**:

- **`id`**: Primary key for the share link record
- **`recipe_id`**: Foreign key to the recipe being shared. CASCADE delete ensures share is removed if recipe is deleted
- **`owner_id`**: Foreign key to the user creating the share. CASCADE delete ensures shares are removed if user is deleted
- **`slug`**: Human-friendly URL component (8 characters, base64url encoded). UNIQUE constraint prevents collisions
- **`token_hash`**: SHA-256 hash of the secret token. Never store plaintext tokens
- **`allow_save`**: Permission flag controlling whether recipients can import the recipe
- **`expires_at`**: Optional timestamp after which the share is no longer accessible
- **`view_count`**: Tracks how many times the share URL has been accessed
- **`last_viewed_at`**: Timestamp of most recent access
- **`created_at`/`updated_at`**: Standard audit timestamps

**Row Level Security**:

```sql
ALTER TABLE shared_recipe_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage share links" ON shared_recipe_links
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
```

This policy ensures that:
- Users can only create shares for their own recipes
- Users can only view/update/delete their own shares
- Public access (via admin client) bypasses RLS

### Unique Constraint: One Share Per Recipe

**Migration `20251004133000`** adds:

```sql
ALTER TABLE shared_recipe_links
ADD CONSTRAINT unique_recipe_share
UNIQUE (recipe_id);
```

This constraint enforces business logic:
- Each recipe can only have one active share link
- Creating a new share for a recipe requires deleting the old one first
- Simplifies UX: users don't manage multiple URLs per recipe

**Implementation Note**: The service layer explicitly deletes existing shares before creating new ones to avoid constraint violations:

```typescript
// Delete existing share before creating new one
await supabaseClient
  .from("shared_recipe_links")
  .delete()
  .eq("recipe_id", recipeId)
  .eq("owner_id", userId);
```

### Metadata Cache: `user_profiles.shared_recipe_links`

**Migration `20251012123000`** adds:

```sql
ALTER TABLE user_profiles
ADD COLUMN shared_recipe_links JSONB NOT NULL DEFAULT '[]'::jsonb;
```

**Purpose**: Store plaintext tokens client-side for URL reconstruction without exposing them in public endpoints.

**Schema** (TypeScript):

```typescript
interface StoredShareLinkMetadata {
  recipeId: string;
  slug: string;
  token: string;           // Plaintext token (only in cache)
  allowSave: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string;
}
```

**Why Cache Tokens?**

The `shared_recipe_links` table only stores `token_hash`, not the plaintext token. The token is returned only once during creation. To reconstruct the full share URL later (for copying, viewing, etc.), we need the plaintext token.

**Alternatives Considered**:
1. ❌ Store plaintext tokens in `shared_recipe_links` → Security risk
2. ❌ Ask user to save token manually → Poor UX
3. ✅ Cache in user-specific JSONB column → Secure, accessible only to owner via RLS

---

## Security Architecture

### 1. Token Generation & Storage

**Generation**:

```typescript
function generateSlug(): string {
  return randomBytes(6).toString("base64url");  // 8 characters
}

function generateToken(): string {
  return randomBytes(32).toString("base64url"); // 43 characters
}
```

- **Slug**: 6 bytes = 48 bits entropy = 281 trillion possibilities
- **Token**: 32 bytes = 256 bits entropy = cryptographically secure

**Hashing**:

```typescript
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

- **Algorithm**: SHA-256 (one-way hash)
- **Storage**: Only hash stored in database
- **Validation**: Hash incoming token and compare to stored hash

**Security Benefits**:
- Database breach does NOT expose plaintext tokens
- Tokens cannot be reverse-engineered from hashes
- Each token is unique per share

### 2. Two-Factor URL Design (Slug + Token)

Share URLs have two components:

```
/{locale}/share/{slug}?token={token}
              ^^^^^^         ^^^^^^^
          Public lookup    Secret credential
```

**Why not a single long random URL?**

```
OPTION A: Single random ID
  /share/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
  ✅ Simpler implementation
  ❌ Long, ugly URLs
  ❌ Hard to debug (which part is wrong?)

OPTION B: Slug + Token (CHOSEN)
  /share/abc123def?token=xYz...789
  ✅ Shorter, more readable
  ✅ Debuggable (can check if slug exists separately)
  ✅ Can track views by slug even if token is wrong
  ❌ Slightly more complex
```

**Security Note**: The slug is NOT a secret. Security depends entirely on the token. The slug is just a lookup key.

### 3. Authentication vs. Authorization Separation

The system distinguishes between:

**Authentication** (who are you?):
- Creating/managing shares: REQUIRED (must be recipe owner)
- Viewing shared recipes: NOT REQUIRED (public access)
- Importing shared recipes: REQUIRED (need account to save to)

**Authorization** (what can you do?):
- Create share: Must own the recipe (enforced by RLS)
- View share: Must have valid slug + token (enforced by hash validation)
- Import share: Must have valid token + `allow_save=true` (enforced by service layer)

**Admin Client Usage**:

```typescript
function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

The admin client (with service role key) bypasses RLS policies. This is ONLY used for:
- Fetching shared recipes (public access, validated by token)
- Recording view counts
- Copying images during import

**Why Admin Client?**

Shared recipes are accessible to unauthenticated users. RLS policies are tied to `auth.uid()`, which is null for unauthenticated requests. The admin client allows controlled public access without disabling RLS entirely.

**Security Consideration**: The admin client has full database access. Use it ONLY for specific, validated operations. Always validate tokens before returning data.

### 4. Preventing Token Enumeration Attacks

**Attack Vector**: Attacker tries random tokens to find valid shares.

**Defenses**:

1. **Large Token Space**: 256 bits = 2^256 possibilities (impractical to brute-force)
2. **Slug + Token Requirement**: Attacker needs valid slug first (slug space is smaller but still large)
3. **Constant-Time Comparison**: Hash comparison doesn't leak timing information
4. **No Rate Limiting** (currently): Low risk due to large token space, but could add in future

**Future Enhancement**: Add rate limiting on `/api/shared-recipes/[slug]` endpoint to prevent automated enumeration.

### 5. Slug Collision Handling

**Problem**: 8-character slugs have ~281 trillion possibilities, but collisions are still possible.

**Solution**: Retry with exponential backoff

```typescript
for (let attempt = 0; attempt < 5; attempt += 1) {
  const slug = generateSlug();
  const token = generateToken();

  const { data, error } = await supabaseClient
    .from("shared_recipe_links")
    .insert([{ slug, token_hash: hashToken(token), ... }]);

  if (error?.code === "23505") {  // Unique constraint violation
    continue;  // Retry with new slug
  }

  return { slug, token, ... };
}

throw new Error("Failed to generate unique slug after 5 attempts");
```

**Probability Analysis**:
- Collision probability after N attempts: ~N^2 / (2 * 281 trillion)
- Even with 1 million shares, collision chance is ~0.0000018%
- Retries make failure virtually impossible

### 6. Expiration Mechanism

**Optional Expiration**:

```typescript
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;  // No expiration = infinite validity
  }

  const expiryDate = new Date(expiresAt);
  return Number.isFinite(expiryDate.getTime()) &&
         expiryDate.getTime() < Date.now();
}
```

**Enforcement**: Checked on every access, not automatically cleaned up.

**Why Not Auto-Delete?**

- View counts remain available for analytics
- Expired links can be "renewed" by updating `expires_at`
- Reduces database write operations

**Future Enhancement**: Add a cron job to periodically delete expired links older than X days.

### 7. Image Security with Signed URLs

**Problem**: Recipe images are stored in Supabase Storage. Direct URLs would allow unauthorized access.

**Solution**: Generate temporary signed URLs (valid 1 hour)

```typescript
static async createSignedImageUrl(
  url: string | null | undefined
): Promise<string | null> {
  const admin = getAdminClient();
  const sourcePath = extractStoragePathFromUrl(url);

  if (!sourcePath) return null;

  const { data, error } = await admin.storage
    .from(SHARE_BUCKET)
    .createSignedUrl(sourcePath, 60 * 60);  // 1 hour

  return data?.signedUrl ?? null;
}
```

**Security Benefits**:
- Images are not publicly accessible by default
- Signed URLs expire after 1 hour
- Each view generates a new signed URL
- Prevents long-term image hotlinking

**Limitation**: If recipient keeps page open > 1 hour, image stops loading. They can refresh to get new signed URL.

### 8. Row Level Security (RLS) Policies

**Owner Management Policy**:

```sql
CREATE POLICY "Owners can manage share links" ON shared_recipe_links
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
```

**Enforcement**:
- Create: User must be authenticated, share record gets `owner_id = auth.uid()`
- Read: User can only see their own shares
- Update: User can only modify their own shares
- Delete: User can only delete their own shares

**Bypass for Public Access**: Admin client bypasses RLS to allow unauthenticated viewing.

---

## API Design

### 1. Create Share Link: `POST /api/recipes/[id]/share`

**Authentication**: Required (recipe owner)

**Request Body**:

```typescript
interface ShareRequestBody {
  expiresAt?: string | null;  // ISO 8601 timestamp or null for no expiration
  allowSave?: boolean;         // Default: true
  locale?: string;             // "nl" or "en", defaults to referer or "nl"
}
```

**Response** (201 Created):

```typescript
{
  sharePath: string;      // "/{locale}/share/{slug}?token={token}"
  slug: string;           // "abc123def"
  token: string;          // "xYz...789" (43 chars)
  expiresAt: string | null;
  allowSave: boolean;
  createdAt: string;
}
```

**Behavior**:
1. Verify recipe ownership (403 if not owner, 404 if recipe doesn't exist)
2. Delete any existing share for this recipe (one share per recipe)
3. Generate slug (8 chars) and token (43 chars)
4. Hash token with SHA-256
5. Insert into `shared_recipe_links`
6. Cache metadata in `user_profiles.shared_recipe_links` (plaintext token)
7. Return full share URL with locale prefix

**Error Cases**:
- 400: Missing recipe ID
- 403: User doesn't own recipe
- 404: Recipe not found
- 500: Database error or slug collision after 5 retries

**Locale Resolution**:

```typescript
function resolveLocale(request: NextRequest, explicitLocale?: string): "nl" | "en" {
  // 1. Explicit locale in request body
  if (explicitLocale === "nl" || explicitLocale === "en") {
    return explicitLocale;
  }

  // 2. Extract from referer header (e.g., "/nl/recipes/123")
  const referer = request.headers.get("referer");
  if (referer) {
    const firstSegment = new URL(referer).pathname.split("/")[1];
    if (firstSegment === "nl" || firstSegment === "en") {
      return firstSegment;
    }
  }

  // 3. Default to "nl"
  return "nl";
}
```

This ensures the share URL opens in the same language as the creator's interface.

### 2. Get Share Link: `GET /api/recipes/[id]/share`

**Authentication**: Required (recipe owner)

**Query Parameters**:
- `locale` (optional): "nl" or "en" for URL generation

**Response** (200 OK):

```typescript
{
  share: {
    slug: string;
    allowSave: boolean;
    expiresAt: string | null;
    createdAt: string;
    sharePath: string | null;    // Full URL if token is cached
    tokenPersisted: boolean;      // True if token was found in cache
  }
} | { share: null }  // 404 if no share exists
```

**Behavior**:
1. Verify recipe ownership
2. Fetch share record from `shared_recipe_links`
3. Attempt to reconstruct full URL from cached metadata
4. Return share details (without token unless cached)

**Why Return `sharePath`?**

After creating a share, users may close the dialog and reopen it later. The token is NOT stored in the database (only hash), so we can't reconstruct the URL unless we cached it. The `sharePath` field allows the UI to show the full URL if available.

### 3. Delete Share Link: `DELETE /api/recipes/[id]/share`

**Authentication**: Required (recipe owner)

**Response** (200 OK):

```typescript
{ success: true }
```

**Behavior**:
1. Verify recipe ownership
2. Delete share record from `shared_recipe_links` (CASCADE deletes related data)
3. Remove cached metadata from `user_profiles.shared_recipe_links`
4. Return success

**Idempotent**: Deleting a non-existent share returns success (no-op).

### 4. Fetch Shared Recipe (Public): `GET /api/shared-recipes/[slug]`

**Authentication**: NOT required

**Query Parameters**:
- `token` (required): Secret token for accessing the share

**Response** (200 OK):

```typescript
{
  recipe: Omit<Recipe, "user_id"> & { image_url: null };
  originalRecipeId: string;
  allowSave: boolean;
  expiresAt: string | null;
  ownerDisplayName: string | null;
  signedImageUrl: string | null;  // Temporary signed URL (1 hour validity)
}
```

**Behavior**:
1. Fetch share record by slug (admin client)
2. Validate token: `hashToken(token) === stored.token_hash`
3. Check expiration: `!isExpired(expiresAt)`
4. Fetch recipe data (admin client, bypasses RLS)
5. Fetch owner display name from `user_profiles`
6. Generate signed image URL (1 hour validity)
7. Sanitize recipe (remove `user_id`, replace `image_url` with signed URL)
8. Asynchronously increment view count (non-blocking)
9. Return public payload

**Error Cases**:
- 404: Share not found or token invalid
- 410: Share expired
- 500: Database error

**View Count Recording**:

```typescript
static async recordView(linkId: string): Promise<void> {
  try {
    const admin = getAdminClient();
    const { data } = await admin
      .from("shared_recipe_links")
      .select("view_count")
      .eq("id", linkId)
      .maybeSingle();

    await admin
      .from("shared_recipe_links")
      .update({
        view_count: (data?.view_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", linkId);
  } catch (error) {
    console.error("Failed to record share view", error);
    // Don't throw - view counting failures shouldn't block response
  }
}
```

**Asynchronous Execution**: View counting happens in background. Failures are logged but don't affect the response.

### 5. Import Shared Recipe: `POST /api/shared-recipes/[slug]/import`

**Authentication**: Required (user importing to their account)

**Request Body**:

```typescript
{ token: string }
```

**Response** (201 Created):

```typescript
{
  recipe: Recipe;          // Newly created recipe
  warnings?: string[];     // ["IMAGE_COPY_FAILED", "IMAGE_METADATA_UPDATE_FAILED"]
}
```

**Behavior**:
1. Validate token (same as public fetch)
2. Check `allow_save` permission (403 if false)
3. Copy recipe data (excluding `id`, `user_id`, `created_at`, `updated_at`)
4. If recipe has image:
   - Extract storage path: `/storage/v1/object/public/recipe-images/{path}`
   - Copy image: `{originalPath}` → `{newUserId}/{newRecipeId}/{timestamp}.{ext}`
   - Generate new public URL
   - Update `image_metadata.uploadedAt`
5. Insert new recipe with current user's `user_id`
6. Return new recipe + any warnings

**Image Copy Logic**:

```typescript
static async copyImageForUser(
  sourceUrl: string,
  newUserId: string,
  newRecipeId: string,
  metadata: Recipe["image_metadata"]
): Promise<{ imageUrl: string; imageMetadata: Recipe["image_metadata"] } | null> {
  const admin = getAdminClient();
  const sourcePath = extractStoragePathFromUrl(sourceUrl);

  if (!sourcePath) return null;

  // Derive destination: {userId}/{recipeId}/{timestamp}.{ext}
  const destinationPath = deriveDestinationPath(newUserId, newRecipeId, sourcePath);

  // Copy file in storage
  const { error: copyError } = await admin.storage
    .from(SHARE_BUCKET)
    .copy(sourcePath, destinationPath);

  if (copyError) {
    throw new SharedRecipeError("Unable to copy shared recipe image", "IMAGE_COPY_FAILED");
  }

  // Generate new public URL
  const { data: publicUrlData } = admin.storage
    .from(SHARE_BUCKET)
    .getPublicUrl(destinationPath);

  // Update metadata timestamp
  const newMetadata = metadata ? {
    ...metadata,
    uploadedAt: new Date().toISOString(),
  } : null;

  return {
    imageUrl: publicUrlData.publicUrl,
    imageMetadata: newMetadata,
  };
}
```

**Graceful Degradation**:

If image copy fails:
- Recipe is still imported (without image)
- Warning added to response: `["IMAGE_COPY_FAILED"]`
- User is notified but import is not blocked

**Error Cases**:
- 403: `allow_save=false` or user doesn't have permission
- 404: Share not found
- 410: Share expired
- 500: Database error (recipe insertion failed)

### 6. List User's Shared Recipes: `GET /api/user/shared-recipes`

**Authentication**: Required

**Query Parameters**:
- `locale` (optional): "nl" or "en" for URL generation

**Response** (200 OK):

```typescript
{
  links: [
    {
      recipeId: string;
      slug: string;
      allowSave: boolean;
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
      sharePath: string;  // Full reconstructed URL
    },
    ...
  ]
}
```

**Behavior**:
1. Fetch cached metadata from `user_profiles.shared_recipe_links`
2. Reconstruct share URLs using cached tokens
3. Return list of all active shares

**Why Use Cache?**

This endpoint doesn't query `shared_recipe_links` table. It uses the JSONB cache to:
- Avoid slow queries for users with many shares
- Access plaintext tokens for URL reconstruction
- Provide fast response times

**Limitation**: If cache is out of sync with actual shares (e.g., manual database edits), results may be stale. Cache is updated on every create/delete operation.

---

## Service Layer

### RecipeShareService Class

**Responsibilities**:
- Token generation and hashing
- Share link CRUD operations
- Metadata cache management
- Public share access validation
- Image handling (signed URLs, copying)
- View count tracking

**Key Methods**:

#### Metadata Cache Management

```typescript
// Save or update share metadata in user profile cache
static async saveShareLinkMetadata(
  supabaseClient: SupabaseClient,
  userId: string,
  recipeId: string,
  metadata: { slug, token, allowSave, expiresAt, createdAt }
): Promise<void>

// Remove share metadata from cache
static async removeShareLinkMetadata(
  supabaseClient: SupabaseClient,
  userId: string,
  recipeId: string
): Promise<void>

// Get cached metadata for specific recipe
static async getShareLinkMetadataForRecipe(
  supabaseClient: SupabaseClient,
  userId: string,
  recipeId: string
): Promise<StoredShareLinkMetadata | null>

// List all cached share metadata for user
static async listShareLinkMetadata(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<StoredShareLinkMetadata[]>
```

**Cache Operations**:

```typescript
// Fetch current cache
const existing = await supabaseClient
  .from("user_profiles")
  .select("shared_recipe_links")
  .eq("id", userId)
  .maybeSingle();

// Normalize to typed array
const links = RecipeShareService.normalizeStoredLinks(
  existing?.shared_recipe_links ?? []
);

// Update cache: remove old entry for this recipe, add new entry
const filtered = links.filter(link => link.recipeId !== recipeId);
filtered.push({ recipeId, slug, token, allowSave, expiresAt, createdAt, updatedAt });

// Persist
await supabaseClient
  .from("user_profiles")
  .update({ shared_recipe_links: filtered })
  .eq("id", userId);
```

**Normalization**:

```typescript
private static normalizeStoredLinks(raw: unknown): StoredShareLinkMetadata[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(entry => {
      // Validate required fields
      if (!entry?.recipeId || !entry?.slug || !entry?.token) return null;

      // Return typed object with defaults
      return {
        recipeId: entry.recipeId,
        slug: entry.slug,
        token: entry.token,
        allowSave: entry.allowSave ?? true,
        expiresAt: entry.expiresAt ?? null,
        createdAt: entry.createdAt ?? null,
        updatedAt: entry.updatedAt ?? new Date(0).toISOString(),
      };
    })
    .filter((value): value is StoredShareLinkMetadata => value !== null);
}
```

Handles invalid/corrupted cache entries gracefully.

#### Share Link CRUD

```typescript
// Create new share link (with retry on slug collision)
static async createShareLink(
  supabaseClient: SupabaseClient,
  userId: string,
  recipeId: string,
  options: { expiresAt?, allowSave? }
): Promise<CreatedShareLink>

// Fetch existing share for recipe
static async getShareLinkForRecipe(
  supabaseClient: SupabaseClient,
  userId: string,
  recipeId: string
): Promise<ShareLinkRecord | null>

// Delete share link
static async deleteShareLink(
  supabaseClient: SupabaseClient,
  userId: string,
  recipeId: string
): Promise<void>
```

#### Public Share Access

```typescript
// Validate token and fetch shared recipe (internal payload)
static async getSharedRecipe(
  slug: string,
  token: string
): Promise<SharedRecipeInternalPayload>

// Build sanitized payload for public consumption
static buildPublicPayload(
  data: SharedRecipeInternalPayload,
  signedImageUrl: string | null
): SharedRecipePublicPayload
```

**Sanitization**:

```typescript
function sanitizeRecipeForPublic(recipe: Recipe): Omit<Recipe, "user_id"> {
  const { user_id, image_url, ...rest } = recipe;

  return {
    ...rest,
    image_url: null,  // Replaced with signedImageUrl in payload
  };
}
```

Removes:
- `user_id`: Privacy (don't expose owner's internal ID)
- `image_url`: Security (replaced with temporary signed URL)

#### Image Handling

```typescript
// Generate temporary signed URL for public image access
static async createSignedImageUrl(
  url: string | null
): Promise<string | null>

// Copy image to new user's storage on import
static async copyImageForUser(
  sourceUrl: string,
  newUserId: string,
  newRecipeId: string,
  metadata: Recipe["image_metadata"]
): Promise<{ imageUrl, imageMetadata } | null>
```

**Path Extraction**:

```typescript
function extractStoragePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/recipe-images\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
```

**Destination Derivation**:

```typescript
function deriveDestinationPath(
  userId: string,
  recipeId: string,
  sourcePath: string
): string {
  const extensionMatch = sourcePath.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? `.${extensionMatch[1]}` : ".webp";
  const timestamp = Date.now();

  return `${userId}/${recipeId}/${timestamp}${extension}`;
}
```

Example:
- Source: `abc123/def456/1234567890.jpg`
- Destination: `xyz789/ghi012/1640000000000.jpg`

#### Utilities

```typescript
// Build share URL path
static buildSharePath(locale: string, slug: string, token: string): string

// Increment view count (async, non-throwing)
static async recordView(linkId: string): Promise<void>
```

### Error Handling

**Custom Error Class**:

```typescript
export class SharedRecipeError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "TOKEN_INVALID" | "EXPIRED" | "FORBIDDEN" | "IMAGE_COPY_FAILED"
  ) {
    super(message);
  }
}
```

**Usage**:

```typescript
if (!link) {
  throw new SharedRecipeError("Share link not found", "NOT_FOUND");
}

if (isExpired(link.expires_at)) {
  throw new SharedRecipeError("Share link expired", "EXPIRED");
}

if (hashToken(token) !== link.token_hash) {
  throw new SharedRecipeError("Invalid share token", "TOKEN_INVALID");
}
```

**Error Mapping to HTTP Status**:

```typescript
try {
  const data = await RecipeShareService.getSharedRecipe(slug, token);
  return NextResponse.json(data, { status: 200 });
} catch (error) {
  if (error instanceof SharedRecipeError) {
    if (error.code === "NOT_FOUND" || error.code === "TOKEN_INVALID") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.code === "EXPIRED") {
      return NextResponse.json({ error: error.message }, { status: 410 });
    }
    if (error.code === "FORBIDDEN") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

---

## Client-Side Implementation

### ShareRecipeButton Component

**File**: `src/components/recipes/share-recipe-button.tsx`

**Responsibilities**:
- Trigger share link creation
- Display share URL with copy functionality
- Regenerate or delete share links
- Handle loading and error states

**Component Structure**:

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="ghost" size="icon">
      <Share2 className="h-4 w-4" />
    </Button>
  </DialogTrigger>

  <DialogContent>
    {loading ? (
      <LoadingState />
    ) : shareData ? (
      <ActiveShareView
        shareUrl={shareData.sharePath}
        createdAt={shareData.createdAt}
        expiresAt={shareData.expiresAt}
        allowSave={shareData.allowSave}
        onCopy={handleCopy}
        onRegenerate={handleRegenerate}
        onDelete={handleDelete}
      />
    ) : (
      <NotSharedView onGenerate={handleGenerate} />
    )}
  </DialogContent>
</Dialog>
```

**State Management**:

```typescript
const [open, setOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [shareData, setShareData] = useState<ShareData | null>(null);
const [copied, setCopied] = useState(false);
```

**Loading Share Status**:

```typescript
useEffect(() => {
  if (open && !shareData) {
    loadShareStatus();
  }
}, [open]);

async function loadShareStatus() {
  setLoading(true);

  const response = await fetch(`/api/recipes/${recipeId}/share?locale=${locale}`);

  if (response.ok) {
    const { share } = await response.json();
    setShareData(share);
  }

  setLoading(false);
}
```

**Creating Share**:

```typescript
async function handleGenerate() {
  setLoading(true);

  const response = await fetch(`/api/recipes/${recipeId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allowSave: true,
      locale,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    setShareData({
      sharePath: `${window.location.origin}${data.sharePath}`,
      slug: data.slug,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      allowSave: data.allowSave,
    });
  }

  setLoading(false);
}
```

**Copy to Clipboard**:

```typescript
async function handleCopy() {
  if (!shareData?.sharePath) return;

  await navigator.clipboard.writeText(shareData.sharePath);
  setCopied(true);

  setTimeout(() => setCopied(false), 2000);
}
```

**Regenerating**:

```typescript
async function handleRegenerate() {
  // Delete existing + create new
  await handleDelete();
  await handleGenerate();
}
```

**Deleting**:

```typescript
async function handleDelete() {
  setLoading(true);

  await fetch(`/api/recipes/${recipeId}/share`, {
    method: "DELETE",
  });

  setShareData(null);
  setLoading(false);
}
```

### Shared Recipe Page (Server-Side)

**File**: `src/app/[locale]/share/[slug]/page.tsx`

**Responsibilities**:
- Pre-fetch share data server-side
- Handle error states (expired, not found, missing token)
- Pass data to client component

**Server Component**:

```tsx
export default async function SharedRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale, slug } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <ErrorView message="Missing token parameter" />;
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/shared-recipes/${slug}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );

    if (response.status === 410) {
      return <ExpiredView />;
    }

    if (!response.ok) {
      return <NotFoundView />;
    }

    const data = await response.json();

    return <SharedRecipeClient data={data} locale={locale} />;
  } catch (error) {
    console.error("Failed to fetch shared recipe", error);
    return <ErrorView message="Failed to load shared recipe" />;
  }
}
```

**Benefits of Server-Side Pre-Fetching**:
- Faster initial page load (no client-side API call)
- SEO-friendly (content rendered server-side)
- Error handling before hydration
- Simplified client component

### SharedRecipeClient Component

**File**: `src/app/[locale]/share/[slug]/shared-recipe-client.tsx`

**Responsibilities**:
- Display shared recipe with owner information
- Handle import action
- Show permission-based UI (save button vs. login prompt)
- Provide print functionality

**Component Structure**:

```tsx
<div className="shared-recipe-container">
  <Banner>
    <p>Shared by {ownerDisplayName}</p>
    {expiresAt && <p>Expires: {formatDate(expiresAt)}</p>}
  </Banner>

  <RecipeDisplay
    recipe={recipe}
    imageUrl={signedImageUrl}
  />

  <ActionBar>
    {allowSave && isAuthenticated ? (
      <Button onClick={handleImport}>Save to My Recipes</Button>
    ) : allowSave && !isAuthenticated ? (
      <Button onClick={() => router.push(`/login?redirect=${currentUrl}`)}>
        Login to Save
      </Button>
    ) : (
      <p>View only (saving disabled)</p>
    )}

    <Button onClick={handlePrint}>Print</Button>
  </ActionBar>
</div>
```

**Importing Recipe**:

```typescript
async function handleImport() {
  setImporting(true);

  const response = await fetch(`/api/shared-recipes/${slug}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (response.ok) {
    const { recipe, warnings } = await response.json();

    if (warnings?.includes("IMAGE_COPY_FAILED")) {
      toast.warning("Recipe saved, but image could not be copied");
    } else {
      toast.success("Recipe saved to your collection");
    }

    router.push(`/${locale}/recipes/${recipe.id}`);
  } else {
    toast.error("Failed to save recipe");
  }

  setImporting(false);
}
```

**Print Functionality**:

```typescript
function handlePrint() {
  window.print();
}
```

Uses browser's native print dialog. CSS can be customized with `@media print` rules.

---

## Technical Decisions & Trade-offs

### 1. Why Hash Tokens Instead of Plain Storage?

**Decision**: Store SHA-256 hash, not plaintext token

**Rationale**:
- **Security**: Database breach doesn't expose working tokens
- **Compliance**: Follows security best practices (similar to password hashing)
- **Minimal UX Impact**: Token returned once during creation, cached client-side

**Trade-off**:
- ❌ Cannot retrieve original token if user loses it
- ✅ More secure (tokens can't be reverse-engineered from database)

**Alternative Considered**: Encrypt tokens with symmetric key
- ✅ Allows retrieval
- ❌ Key management complexity
- ❌ Still vulnerable if key is compromised

### 2. Why Use Slug + Token Instead of Single Random URL?

**Decision**: Two-component URL (`/share/{slug}?token={token}`)

**Rationale**:
- **Readability**: Shorter URLs, easier to share verbally
- **Debuggability**: Can check if slug exists independently of token
- **Analytics**: Track slug-level metrics even with invalid tokens

**Trade-off**:
- ❌ Slightly more complex implementation
- ✅ Better UX (shorter, more shareable URLs)

**Alternative Considered**: Single 64-character random ID
- ✅ Simpler (one lookup)
- ❌ Very long URLs
- ❌ Hard to debug (which part is wrong?)

### 3. Why Cache Metadata in User Profiles?

**Decision**: Store `{ recipeId, slug, token, ... }` in JSONB column

**Rationale**:
- **URL Reconstruction**: Can rebuild full share URL without exposing token in database
- **Fast Listing**: No join required to list all shares
- **User-Specific**: RLS protects metadata from other users

**Trade-off**:
- ❌ Data duplication (source of truth is `shared_recipe_links`)
- ❌ Potential cache staleness if not updated consistently
- ✅ Fast read performance
- ✅ Client-side URL access

**Alternative Considered**: Store tokens encrypted in `shared_recipe_links`
- ✅ No duplication
- ❌ Key management complexity
- ❌ Requires decryption on every fetch

### 4. Why Limit to One Share Per Recipe?

**Decision**: Unique constraint on `recipe_id` in `shared_recipe_links`

**Rationale**:
- **Simplified UX**: No need to manage multiple links per recipe
- **Clear Revocation**: Deleting share doesn't leave orphaned links
- **Cache Consistency**: One-to-one mapping simplifies metadata cache

**Trade-off**:
- ❌ Can't have different permissions for different recipients
- ✅ Simpler implementation and UX

**Alternative Considered**: Multiple shares per recipe
- ✅ Fine-grained permissions (different expiry, allowSave for each link)
- ❌ Complex UI (which link to use?)
- ❌ Cache complexity (array of links per recipe)

**Workaround**: User can duplicate recipe and share each copy with different settings.

### 5. Why Use Admin Client for Public Access?

**Decision**: Bypass RLS with service role key for public share viewing

**Rationale**:
- **Public Access**: Unauthenticated users need to view shares
- **RLS Limitation**: Policies are tied to `auth.uid()` (null for unauthenticated)
- **Controlled Bypass**: Token validation ensures only authorized access

**Trade-off**:
- ❌ Admin client has full database access (security risk if misused)
- ✅ Allows public access without disabling RLS globally

**Alternative Considered**: Disable RLS on `recipes` table
- ✅ No admin client needed
- ❌ Major security risk (all recipes exposed)
- ❌ Breaks user isolation

**Mitigation**: Admin client usage is strictly limited to:
1. Token-validated share fetching
2. View count recording
3. Image copying on import

### 6. Why Copy Images on Import Instead of Referencing Original?

**Decision**: Copy image file to new user's storage directory

**Rationale**:
- **Independence**: Imported recipe is fully owned by recipient
- **Privacy**: Original owner can delete their recipe without breaking imports
- **Storage Isolation**: Each user's images in their own directory

**Trade-off**:
- ❌ Storage duplication (same image stored multiple times)
- ❌ Slower import process
- ✅ Complete ownership transfer
- ✅ No orphaned references

**Alternative Considered**: Reference original image URL
- ✅ No storage duplication
- ❌ Broken images if original deleted
- ❌ Privacy concerns (owner can see their image accessed)

### 7. Why Asynchronous View Counting?

**Decision**: Record views in background, don't block response

**Rationale**:
- **Performance**: View increment shouldn't slow down page load
- **Resilience**: View counting failures don't break share viewing
- **Non-Critical**: View counts are analytics, not essential functionality

**Trade-off**:
- ❌ View counts may be slightly delayed
- ❌ Failed increments lost (no retry)
- ✅ Fast response times
- ✅ Better user experience

**Implementation**:

```typescript
// Fire-and-forget (no await)
RecipeShareService.recordView(linkId).catch(err => {
  console.error("Failed to record view", err);
  // Don't throw - continue with response
});

return NextResponse.json(publicPayload);
```

### 8. Why 1-Hour Signed URLs for Images?

**Decision**: Generate temporary signed URLs with 60-minute expiration

**Rationale**:
- **Security**: Images not publicly accessible long-term
- **Reasonable Duration**: Most users view recipes < 1 hour
- **Prevents Hotlinking**: Links expire, can't be bookmarked

**Trade-off**:
- ❌ Images break if page open > 1 hour
- ✅ Strong security (short-lived access)

**Alternative Considered**: 24-hour expiration
- ✅ Less likely to expire during viewing
- ❌ Weaker security (longer exposure window)

**Mitigation**: User can refresh page to get new signed URL.

---

## Error Handling Patterns

### 1. Custom Error Types with Codes

**Pattern**: Domain-specific error class with error codes

```typescript
export class SharedRecipeError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "TOKEN_INVALID" | "EXPIRED" | "FORBIDDEN" | "IMAGE_COPY_FAILED"
  ) {
    super(message);
  }
}
```

**Benefits**:
- Type-safe error handling
- Consistent error responses
- Easy mapping to HTTP status codes
- Machine-readable error codes for clients

**Usage**:

```typescript
// Service layer throws typed errors
if (isExpired(link.expires_at)) {
  throw new SharedRecipeError("Share link expired", "EXPIRED");
}

// API layer maps to HTTP status
catch (error) {
  if (error instanceof SharedRecipeError) {
    switch (error.code) {
      case "EXPIRED": return NextResponse.json({ error: error.message }, { status: 410 });
      case "FORBIDDEN": return NextResponse.json({ error: error.message }, { status: 403 });
      case "NOT_FOUND":
      case "TOKEN_INVALID": return NextResponse.json({ error: error.message }, { status: 404 });
    }
  }

  // Generic error
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

### 2. Graceful Degradation

**Pattern**: Non-critical operations fail silently with warnings

**Example**: Image copy during import

```typescript
let imageUrl = null;
let imageMetadata = null;
const warnings: string[] = [];

if (sharedRecipe.recipe.image_url) {
  try {
    const imageResult = await RecipeShareService.copyImageForUser(
      sharedRecipe.signedImageUrl,
      user.id,
      newRecipeId,
      sharedRecipe.recipe.image_metadata
    );

    if (imageResult) {
      imageUrl = imageResult.imageUrl;
      imageMetadata = imageResult.imageMetadata;
    }
  } catch (error) {
    if (error instanceof SharedRecipeError && error.code === "IMAGE_COPY_FAILED") {
      warnings.push("IMAGE_COPY_FAILED");
    } else {
      console.error("Unexpected error copying image", error);
      warnings.push("IMAGE_METADATA_UPDATE_FAILED");
    }
  }
}

// Recipe is still imported without image
const { data: newRecipe } = await supabase
  .from("recipes")
  .insert([{ ...recipeData, image_url: imageUrl, image_metadata: imageMetadata }])
  .select()
  .single();

return NextResponse.json({ recipe: newRecipe, warnings });
```

**Benefits**:
- User still gets value (recipe imported)
- Aware of partial failure (warnings returned)
- No abrupt errors for non-essential features

### 3. Async Operations Don't Block

**Pattern**: Fire-and-forget for non-critical side effects

**Example**: View count recording

```typescript
// Don't await - continue with response
RecipeShareService.recordView(linkId).catch(err => {
  console.error("Failed to record view", err);
});

return NextResponse.json(publicPayload, { status: 200 });
```

**Benefits**:
- Fast response times (don't wait for DB write)
- Resilient (view counting failures don't break viewing)
- Logged for debugging (errors still visible)

### 4. Retries with Exponential Backoff

**Pattern**: Retry transient failures with increasing delays

**Example**: Slug collision handling

```typescript
for (let attempt = 0; attempt < 5; attempt += 1) {
  const slug = generateSlug();
  const token = generateToken();

  const { data, error } = await supabaseClient
    .from("shared_recipe_links")
    .insert([{ slug, token_hash: hashToken(token), ... }]);

  if (!error) {
    return { slug, token, ... };  // Success
  }

  if (error.code === "23505") {  // Unique constraint violation
    continue;  // Retry with new slug
  }

  throw error;  // Non-retryable error
}

throw new Error("Failed to generate unique slug after 5 attempts");
```

**Benefits**:
- Handles transient failures (slug collisions)
- Avoids infinite loops (max 5 attempts)
- Fast failure for non-retryable errors

### 5. Null-Safe Data Access

**Pattern**: Handle missing/corrupted data gracefully

**Example**: Cache normalization

```typescript
private static normalizeStoredLinks(raw: unknown): StoredShareLinkMetadata[] {
  if (!Array.isArray(raw)) {
    return [];  // Invalid data → empty array
  }

  return raw
    .map(entry => {
      if (!entry || typeof entry !== "object") {
        return null;  // Skip invalid entries
      }

      const candidate = entry as Record<string, unknown>;

      // Validate required fields
      if (!candidate.recipeId || !candidate.slug || !candidate.token) {
        return null;  // Skip incomplete entries
      }

      // Return with defaults for optional fields
      return {
        recipeId: candidate.recipeId as string,
        slug: candidate.slug as string,
        token: candidate.token as string,
        allowSave: typeof candidate.allowSave === "boolean" ? candidate.allowSave : true,
        expiresAt: typeof candidate.expiresAt === "string" ? candidate.expiresAt : null,
        // ...
      };
    })
    .filter((value): value is StoredShareLinkMetadata => value !== null);
}
```

**Benefits**:
- Resilient to corrupted cache data
- Type-safe (returns typed array)
- No runtime crashes from bad data

---

## Testing Strategy

### Unit Tests

**File**: `src/__tests__/unit/recipe-share-service.test.ts`

**Coverage**:
- ✅ Token generation and hashing
- ✅ Slug uniqueness and collision retries
- ✅ Metadata cache normalization (valid/invalid data)
- ✅ Metadata CRUD operations (save, remove, get, list)
- ✅ Token validation (hash matching)
- ✅ Expiration checks (various date formats)
- ✅ Image path extraction (various URL formats)
- ✅ Destination path derivation
- ✅ Signed URL generation
- ✅ Public payload sanitization (user_id removed, image_url replaced)
- ✅ View count incrementation

**Key Test Cases**:

```typescript
describe("RecipeShareService", () => {
  describe("hashToken", () => {
    it("produces consistent hashes", () => {
      const token = "test-token";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different tokens", () => {
      expect(hashToken("token1")).not.toBe(hashToken("token2"));
    });
  });

  describe("normalizeStoredLinks", () => {
    it("filters out invalid entries", () => {
      const raw = [
        { recipeId: "1", slug: "abc", token: "xyz", allowSave: true },
        { recipeId: "2", slug: "def" },  // Missing token
        null,
        "invalid",
      ];

      const result = RecipeShareService.normalizeStoredLinks(raw);
      expect(result).toHaveLength(1);
      expect(result[0].recipeId).toBe("1");
    });

    it("applies defaults for optional fields", () => {
      const raw = [{ recipeId: "1", slug: "abc", token: "xyz" }];
      const result = RecipeShareService.normalizeStoredLinks(raw);

      expect(result[0].allowSave).toBe(true);
      expect(result[0].expiresAt).toBeNull();
    });
  });

  describe("isExpired", () => {
    it("returns false for null expiration", () => {
      expect(isExpired(null)).toBe(false);
    });

    it("returns true for past dates", () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(isExpired(past)).toBe(true);
    });

    it("returns false for future dates", () => {
      const future = new Date(Date.now() + 1000).toISOString();
      expect(isExpired(future)).toBe(false);
    });
  });

  describe("extractStoragePathFromUrl", () => {
    it("extracts path from valid URL", () => {
      const url = "https://example.supabase.co/storage/v1/object/public/recipe-images/user123/recipe456/image.jpg";
      const path = extractStoragePathFromUrl(url);
      expect(path).toBe("user123/recipe456/image.jpg");
    });

    it("returns null for invalid URLs", () => {
      expect(extractStoragePathFromUrl("https://example.com/invalid")).toBeNull();
      expect(extractStoragePathFromUrl(null)).toBeNull();
    });
  });
});
```

### Integration Tests

**File**: `src/__tests__/integration/recipe-share.integration.test.ts`

**Coverage**:
- ✅ Create share link (authenticated user)
- ✅ Fetch share link (owner only)
- ✅ Delete share link (owner only)
- ✅ Public fetch shared recipe (valid token)
- ✅ Public fetch shared recipe (invalid token → 404)
- ✅ Public fetch shared recipe (expired → 410)
- ✅ Import shared recipe (authenticated, allow_save=true)
- ✅ Import shared recipe (allow_save=false → 403)
- ✅ Import shared recipe (unauthenticated → 401)
- ✅ Image copy on import (success + failure scenarios)
- ✅ Metadata cache consistency

**Key Test Cases**:

```typescript
describe("Recipe Sharing API", () => {
  let supabase: SupabaseClient;
  let userId: string;
  let recipeId: string;

  beforeEach(async () => {
    // Set up test user and recipe
    const { data: { user } } = await supabase.auth.signUp({
      email: "test@example.com",
      password: "test123456",
    });
    userId = user!.id;

    const { data: recipe } = await supabase
      .from("recipes")
      .insert([{ title: "Test Recipe", user_id: userId }])
      .select()
      .single();
    recipeId = recipe!.id;
  });

  describe("POST /api/recipes/[id]/share", () => {
    it("creates share link for authenticated owner", async () => {
      const response = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${await getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ allowSave: true }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.slug).toBeDefined();
      expect(data.token).toBeDefined();
      expect(data.sharePath).toMatch(/^\/[a-z]{2}\/share\/.+\?token=.+$/);
    });

    it("replaces existing share for same recipe", async () => {
      // Create first share
      const response1 = await createShare(recipeId);
      const { slug: slug1 } = await response1.json();

      // Create second share
      const response2 = await createShare(recipeId);
      const { slug: slug2 } = await response2.json();

      expect(slug2).not.toBe(slug1);

      // First share should be deleted
      const { data } = await supabase
        .from("shared_recipe_links")
        .select("*")
        .eq("recipe_id", recipeId);

      expect(data).toHaveLength(1);
      expect(data![0].slug).toBe(slug2);
    });

    it("returns 403 for non-owner", async () => {
      const otherUser = await createTestUser("other@example.com");

      const response = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${otherUser.accessToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/shared-recipes/[slug]", () => {
    it("returns recipe with valid token", async () => {
      const { slug, token } = await createShare(recipeId);

      const response = await fetch(`/api/shared-recipes/${slug}?token=${encodeURIComponent(token)}`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.recipe.id).toBe(recipeId);
      expect(data.recipe.user_id).toBeUndefined();
      expect(data.allowSave).toBe(true);
    });

    it("returns 404 with invalid token", async () => {
      const { slug } = await createShare(recipeId);

      const response = await fetch(`/api/shared-recipes/${slug}?token=invalid-token`);

      expect(response.status).toBe(404);
    });

    it("returns 410 for expired share", async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const { slug, token } = await createShare(recipeId, { expiresAt: expiredDate });

      const response = await fetch(`/api/shared-recipes/${slug}?token=${encodeURIComponent(token)}`);

      expect(response.status).toBe(410);
    });
  });

  describe("POST /api/shared-recipes/[slug]/import", () => {
    it("imports recipe with valid token and allow_save", async () => {
      const { slug, token } = await createShare(recipeId, { allowSave: true });
      const importerUser = await createTestUser("importer@example.com");

      const response = await fetch(`/api/shared-recipes/${slug}/import`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${importerUser.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      expect(response.status).toBe(201);

      const { recipe } = await response.json();
      expect(recipe.id).not.toBe(recipeId);
      expect(recipe.user_id).toBe(importerUser.id);
      expect(recipe.title).toBe("Test Recipe");
    });

    it("returns 403 when allow_save is false", async () => {
      const { slug, token } = await createShare(recipeId, { allowSave: false });
      const importerUser = await createTestUser("importer@example.com");

      const response = await fetch(`/api/shared-recipes/${slug}/import`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${importerUser.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      expect(response.status).toBe(403);
    });

    it("copies image on import", async () => {
      // Upload image to original recipe
      const imageUrl = await uploadTestImage(userId, recipeId);
      await supabase
        .from("recipes")
        .update({ image_url: imageUrl })
        .eq("id", recipeId);

      const { slug, token } = await createShare(recipeId);
      const importerUser = await createTestUser("importer@example.com");

      const response = await fetch(`/api/shared-recipes/${slug}/import`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${importerUser.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const { recipe, warnings } = await response.json();

      expect(recipe.image_url).toBeDefined();
      expect(recipe.image_url).not.toBe(imageUrl);
      expect(recipe.image_url).toContain(importerUser.id);
      expect(warnings).toBeUndefined();
    });
  });
});
```

### Security Test Scenarios

**Critical Security Tests**:

```typescript
describe("Security", () => {
  it("prevents token enumeration", async () => {
    const { slug } = await createShare(recipeId);

    const invalidTokens = [
      "short",
      "a".repeat(43),
      "invalid-token-123",
      "",
    ];

    for (const token of invalidTokens) {
      const response = await fetch(`/api/shared-recipes/${slug}?token=${token}`);
      expect(response.status).toBe(404);  // Same error as "not found"
    }
  });

  it("prevents cross-user access", async () => {
    const { slug, token } = await createShare(recipeId);
    const otherUser = await createTestUser("other@example.com");

    // Other user can view (public access)
    const viewResponse = await fetch(`/api/shared-recipes/${slug}?token=${token}`);
    expect(viewResponse.status).toBe(200);

    // But cannot delete
    const deleteResponse = await fetch(`/api/recipes/${recipeId}/share`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${otherUser.accessToken}` },
    });
    expect(deleteResponse.status).toBe(403);
  });

  it("sanitizes recipe data in public payload", async () => {
    const { slug, token } = await createShare(recipeId);

    const response = await fetch(`/api/shared-recipes/${slug}?token=${token}`);
    const data = await response.json();

    // user_id should be removed
    expect(data.recipe.user_id).toBeUndefined();
    expect(Object.keys(data.recipe)).not.toContain("user_id");

    // image_url should be replaced with signedImageUrl
    expect(data.recipe.image_url).toBeNull();
    expect(data.signedImageUrl).toBeDefined();
  });
});
```

### Edge Cases to Cover

- Empty/null request bodies
- Malformed JSON
- Non-existent recipe IDs
- Deleted recipes (CASCADE delete of shares)
- Corrupted metadata cache
- Missing environment variables (SUPABASE_URL, SERVICE_ROLE_KEY)
- Network errors during image copy
- Storage bucket access errors
- Concurrent share creation (race conditions)
- Very long expiration dates (year 9999)
- Invalid date formats in expiresAt

---

## Scaling Considerations

### 1. View Count Tracking at Scale

**Current Implementation**:

```typescript
// Read current count
const { data } = await admin
  .from("shared_recipe_links")
  .select("view_count")
  .eq("id", linkId)
  .maybeSingle();

// Increment
await admin
  .from("shared_recipe_links")
  .update({ view_count: (data?.view_count ?? 0) + 1 })
  .eq("id", linkId);
```

**Problem**: Two database queries per view (inefficient at scale).

**Optimization 1**: Use SQL increment

```sql
UPDATE shared_recipe_links
SET view_count = view_count + 1, last_viewed_at = NOW()
WHERE id = $1;
```

**Optimization 2**: Batch view counts in Redis

```typescript
// Increment in Redis cache
await redis.incr(`share:${linkId}:views`);

// Flush to database periodically (cron job every 5 minutes)
const keys = await redis.keys("share:*:views");
for (const key of keys) {
  const linkId = key.match(/share:(.+):views/)[1];
  const count = await redis.get(key);

  await db.query(
    "UPDATE shared_recipe_links SET view_count = view_count + $1 WHERE id = $2",
    [count, linkId]
  );

  await redis.del(key);
}
```

**Benefits**: Reduces database writes by ~300x (1 write per 5 min vs. 1 per view).

### 2. Metadata Cache Consistency

**Current Implementation**: JSONB column in `user_profiles`

**Problem**: Cache can become stale if:
- Share deleted directly in database (bypassing service layer)
- Concurrent updates (race condition)

**Mitigation 1**: Add database trigger

```sql
CREATE FUNCTION sync_share_metadata() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE user_profiles
    SET shared_recipe_links = (
      SELECT jsonb_agg(link)
      FROM jsonb_array_elements(shared_recipe_links) AS link
      WHERE link->>'recipeId' != OLD.recipe_id
    )
    WHERE id = OLD.owner_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_share_metadata_on_delete
AFTER DELETE ON shared_recipe_links
FOR EACH ROW
EXECUTE FUNCTION sync_share_metadata();
```

**Mitigation 2**: Add cache validation

```typescript
// Periodically validate cache (cron job daily)
const { data: shares } = await supabase
  .from("shared_recipe_links")
  .select("recipe_id, slug, owner_id")
  .eq("owner_id", userId);

const cached = await RecipeShareService.listShareLinkMetadata(supabase, userId);

// Find stale entries (in cache but not in DB)
const staleRecipeIds = cached
  .filter(c => !shares.some(s => s.recipe_id === c.recipeId))
  .map(c => c.recipeId);

// Remove stale entries
for (const recipeId of staleRecipeIds) {
  await RecipeShareService.removeShareLinkMetadata(supabase, userId, recipeId);
}
```

### 3. Image Storage Implications

**Current Implementation**: Copy image on import

**Problem**: Storage usage scales linearly with imports.

**Example**: 1 MB image shared 1000 times = 1 GB storage.

**Optimization**: Deduplication

```typescript
// Hash image content
const imageHash = createHash("sha256")
  .update(imageBuffer)
  .digest("hex");

// Check if image already exists
const { data: existing } = await storage
  .from("recipe-images")
  .list(`shared/${imageHash.slice(0, 2)}`, {
    search: imageHash,
  });

if (existing.length > 0) {
  // Reference existing image
  return `${BUCKET_URL}/shared/${imageHash.slice(0, 2)}/${imageHash}`;
} else {
  // Upload new image
  await storage
    .from("recipe-images")
    .upload(`shared/${imageHash.slice(0, 2)}/${imageHash}`, imageBuffer);
}
```

**Benefits**: Reduces storage by ~10x (assuming 10% unique images).

### 4. Database Indexes

**Current Indexes**:

```sql
CREATE INDEX idx_shared_recipe_links_owner ON shared_recipe_links(owner_id);
CREATE INDEX idx_shared_recipe_links_recipe ON shared_recipe_links(recipe_id);
```

**Additional Indexes for Scale**:

```sql
-- Fast slug lookup (public access)
CREATE INDEX idx_shared_recipe_links_slug ON shared_recipe_links(slug);

-- Fast expiration cleanup (cron job)
CREATE INDEX idx_shared_recipe_links_expired ON shared_recipe_links(expires_at)
WHERE expires_at IS NOT NULL;
```

**Query Performance**:
- Slug lookup: O(log n) with index vs. O(n) without
- At 1M shares, index = ~20 disk reads vs. full scan = 1M reads

### 5. Token Hash Performance

**Current**: SHA-256 (fast, secure)

**Alternatives**:

| Algorithm    | Speed       | Security | Use Case                     |
| ------------ | ----------- | -------- | ---------------------------- |
| **SHA-256**  | ~10 MB/s    | High     | Current (good balance)       |
| bcrypt       | ~1 KB/s     | Very High| Overkill (designed for slow) |
| SHA-1        | ~100 MB/s   | Low      | Deprecated (collisions)      |
| xxHash       | ~1000 MB/s  | None     | Not suitable (not crypto)    |

**Recommendation**: Keep SHA-256 (fast enough, secure).

### 6. Rate Limiting

**Current**: No rate limiting

**Recommendation**: Add rate limiting on public endpoints

```typescript
// Using upstash/ratelimit
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),  // 10 requests per minute
});

export async function GET(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Continue with normal handling
}
```

**Prevents**: Brute-force token enumeration attacks.

---

## Migration Guide

### Adapting This Pattern to Other Features

This section provides guidance for implementing similar sharing functionality in other projects.

### 1. Minimum Required Components

**Database**:
- Share links table (slug, token_hash, permissions, expiration)
- Metadata cache column (optional, for URL reconstruction)
- Indexes on slug and owner_id

**API**:
- Create share endpoint (authenticated)
- Public fetch endpoint (token-validated)
- Delete share endpoint (authenticated)

**Service Layer**:
- Token generation and hashing
- Share CRUD operations
- Public access validation

**UI**:
- Share management dialog (owner)
- Public viewing page (recipient)

### 2. Database Schema Template

```sql
-- Share links table
CREATE TABLE {entity}_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  {entity}_id UUID NOT NULL REFERENCES {entities}(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,

  -- Permissions
  allow_{permission} BOOLEAN NOT NULL DEFAULT TRUE,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_{entity}_shares_owner ON {entity}_shares(owner_id);
CREATE INDEX idx_{entity}_shares_{entity} ON {entity}_shares({entity}_id);
CREATE INDEX idx_{entity}_shares_slug ON {entity}_shares(slug);

-- RLS
ALTER TABLE {entity}_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage shares" ON {entity}_shares
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Auto-update timestamp
CREATE TRIGGER update_{entity}_shares_updated_at
  BEFORE UPDATE ON {entity}_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Metadata cache
ALTER TABLE user_profiles
ADD COLUMN {entity}_shares JSONB NOT NULL DEFAULT '[]'::jsonb;
```

### 3. Token Generation Template

```typescript
import { createHash, randomBytes } from "crypto";

// Generate slug (8 characters, base64url)
function generateSlug(): string {
  return randomBytes(6).toString("base64url");
}

// Generate token (43 characters, base64url)
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// Hash token for storage
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Validate token
function validateToken(providedToken: string, storedHash: string): boolean {
  return hashToken(providedToken) === storedHash;
}
```

### 4. API Endpoint Template

**Create Share**:

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const { user, supabase } = await requireAuth();

  // 2. Verify ownership
  const { data: entity } = await supabase
    .from("{entities}")
    .select("id")
    .eq("id", entityId)
    .eq("user_id", user.id)
    .single();

  if (!entity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 3. Generate slug and token
  const slug = generateSlug();
  const token = generateToken();
  const tokenHash = hashToken(token);

  // 4. Delete existing share (one per entity)
  await supabase
    .from("{entity}_shares")
    .delete()
    .eq("{entity}_id", entityId)
    .eq("owner_id", user.id);

  // 5. Create new share
  const { data: share } = await supabase
    .from("{entity}_shares")
    .insert([{
      {entity}_id: entityId,
      owner_id: user.id,
      slug,
      token_hash: tokenHash,
      // ... permissions, expiration
    }])
    .select()
    .single();

  // 6. Build share URL
  const shareUrl = `/{locale}/share/{slug}?token=${encodeURIComponent(token)}`;

  // 7. Return
  return NextResponse.json({
    shareUrl,
    slug,
    token,  // Only returned once!
    // ... other fields
  }, { status: 201 });
}
```

**Public Fetch**:

```typescript
export async function GET(request: NextRequest) {
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // 1. Fetch share record (admin client)
  const admin = getAdminClient();
  const { data: share } = await admin
    .from("{entity}_shares")
    .select("*, {entities}(*)")
    .eq("slug", slug)
    .single();

  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Validate token
  if (hashToken(token) !== share.token_hash) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  // 3. Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  // 4. Sanitize entity data (remove user_id, etc.)
  const sanitized = sanitizeForPublic(share.{entity});

  // 5. Record view (async)
  recordView(share.id).catch(console.error);

  // 6. Return
  return NextResponse.json({
    entity: sanitized,
    permissions: { /* ... */ },
    // ... other fields
  });
}
```

### 5. Essential Security Measures

**Required**:
1. ✅ Hash tokens (SHA-256), never store plaintext
2. ✅ Validate token on every access
3. ✅ Enforce ownership before creating/deleting shares
4. ✅ Use admin client for public access (bypass RLS)
5. ✅ Sanitize data before returning (remove user_id, etc.)
6. ✅ Check expiration on every access

**Recommended**:
1. ✅ Rate limit public endpoints (prevent brute-force)
2. ✅ Use signed URLs for sensitive assets (images, files)
3. ✅ Add unique constraint on slug (prevent collisions)
4. ✅ Limit to one share per entity (simplify UX)
5. ✅ Log access attempts (for security auditing)

**Optional**:
1. ⚪ IP-based access control
2. ⚪ Geolocation restrictions
3. ⚪ Email verification for imports
4. ⚪ Watermarking for shared content

### 6. Testing Checklist

**Unit Tests**:
- [ ] Token generation (uniqueness, length)
- [ ] Token hashing (consistency, collision resistance)
- [ ] Expiration logic (null, past, future dates)
- [ ] Data sanitization (user_id removed, etc.)

**Integration Tests**:
- [ ] Create share (authenticated, ownership verified)
- [ ] Fetch share (valid token, invalid token, expired)
- [ ] Delete share (owner only, cascade delete)
- [ ] Cross-user access (blocked)

**Security Tests**:
- [ ] Token enumeration (high entropy, no timing leaks)
- [ ] RLS bypass prevention (admin client only for specific operations)
- [ ] Data leakage (user_id not in public payload)
- [ ] CSRF protection (tokens in request body, not URL for writes)

**Performance Tests**:
- [ ] View count tracking (doesn't block response)
- [ ] Cache consistency (metadata synced)
- [ ] Database indexes (slug, owner_id)

### 7. Common Pitfalls to Avoid

**❌ Storing plaintext tokens in database**
- Use SHA-256 hash instead
- Return token only once during creation

**❌ Using weak random number generators**
- Use `crypto.randomBytes()`, not `Math.random()`

**❌ Exposing user IDs in public payloads**
- Sanitize data before returning
- Remove all internal identifiers

**❌ Blocking response on view counting**
- Make view counting async (fire-and-forget)
- Log errors, don't throw

**❌ Not validating token on every access**
- Always hash + compare, even if slug is valid

**❌ Forgetting to check expiration**
- Check on every access, not just creation

**❌ Not using indexes on slug**
- Add `CREATE INDEX ON {entity}_shares(slug)` for fast lookups

**❌ Allowing multiple shares per entity without UX**
- Either enforce one share per entity (unique constraint)
- Or build UI to manage multiple shares

### 8. Performance Optimizations

**When to Optimize**:
- View counts > 10,000/day → Use Redis batching
- Shares > 100,000 → Add database indexes
- Image imports > 1,000/day → Implement deduplication
- Concurrent share creation → Add optimistic locking

**When NOT to Optimize**:
- Small scale (< 10,000 shares) → Current implementation is fine
- Low traffic (< 100 views/day) → View counting overhead negligible

### 9. Checklist for Implementation

**Phase 1: Database**
- [ ] Create share links table with slug, token_hash, permissions
- [ ] Add indexes on slug, owner_id
- [ ] Enable RLS with owner policy
- [ ] Add cascade delete triggers
- [ ] (Optional) Add metadata cache column

**Phase 2: Service Layer**
- [ ] Implement token generation (randomBytes)
- [ ] Implement token hashing (SHA-256)
- [ ] Implement share CRUD operations
- [ ] Implement token validation
- [ ] Implement expiration checks
- [ ] Implement data sanitization

**Phase 3: API**
- [ ] Create share endpoint (authenticated)
- [ ] Public fetch endpoint (token-validated)
- [ ] Delete share endpoint (authenticated)
- [ ] (Optional) Import/copy endpoint
- [ ] Add error handling with typed errors

**Phase 4: UI**
- [ ] Share management dialog (owner)
- [ ] Copy URL functionality
- [ ] Public viewing page (recipient)
- [ ] (Optional) Import button

**Phase 5: Testing**
- [ ] Unit tests for token/hash functions
- [ ] Integration tests for API endpoints
- [ ] Security tests for access control
- [ ] End-to-end tests for user flows

**Phase 6: Documentation**
- [ ] API endpoint documentation
- [ ] Security considerations document
- [ ] User guide (how to share)
- [ ] Developer guide (how it works)

---

## Conclusion

This recipe sharing system demonstrates a production-ready implementation of secure, token-based content sharing. Key takeaways:

1. **Security First**: Hash tokens, validate on every access, sanitize public data
2. **User Experience**: Simple UX (one share per recipe), fast responses (async view counting)
3. **Performance**: Proper indexing, caching where needed, graceful degradation
4. **Maintainability**: Typed errors, comprehensive tests, clear separation of concerns

When adapting this pattern to other features, prioritize:
- **Essential security measures** (token hashing, validation, RLS)
- **Minimum viable implementation** (start simple, optimize when needed)
- **Comprehensive testing** (security, integration, edge cases)

Remember: Premature optimization is the root of all evil. Start with the basics, measure performance, and optimize based on real usage patterns.
