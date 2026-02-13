# Drizzle ORM Test Mock Patterns

After migrating from Supabase to Drizzle ORM + Neon, every test that transitively imports `@/db` needs a mock to prevent `neon(process.env.DATABASE_URL!)` from running at import time (DATABASE_URL isn't set in the test environment).

This document captures the patterns used across the test suite.

---

## Core Problem

`src/db/index.ts` calls `neon()` at module load time:

```ts
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

Any test file that imports code which transitively imports `@/db` will crash unless `@/db` is mocked.

## Pattern 1: Simple Chainable Mock

For code that only does basic `db.select().from().where().limit()`:

```ts
jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ languagePreference: "en" }]),
        }),
      }),
    }),
  },
}));
```

**Used in:** `email-template-service.test.ts`, `auth.integration.test.ts`

### Per-test overrides with `__` accessor pattern

Expose internal mock chains via a `__`-prefixed key for per-test configuration:

```ts
jest.mock("@/db", () => {
  const selectChain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ languagePreference: "en" }]),
  };
  return {
    db: {
      select: jest.fn(() => selectChain),
      __selectChain: selectChain, // exposed for per-test overrides
    },
  };
});

// In test:
function getSelectChain() {
  const { db } = require("@/db");
  return db.__selectChain;
}

it("should handle Dutch locale", async () => {
  getSelectChain().limit.mockResolvedValue([{ languagePreference: "nl" }]);
  // ...
});
```

## Pattern 2: Module-Level Mutable State

For tests that need different DB responses per test, declare module-level `let` variables and reference them inside the `jest.mock()` factory. Because `jest.mock()` is hoisted but the factory closure captures references (not values), the mutable variables work correctly.

```ts
let rateLimitCount = 0;
let rateLimitInserts: Record<string, unknown>[] = [];

jest.mock("@/db", () => {
  const selectFn = jest.fn().mockImplementation(() => ({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ count: rateLimitCount }]),
    }),
  }));

  const insertFn = jest.fn().mockImplementation(() => ({
    values: jest.fn().mockImplementation((val: Record<string, unknown>) => {
      rateLimitInserts.push(val);
      return Promise.resolve({ rowCount: 1 });
    }),
  }));

  const deleteFn = jest.fn().mockImplementation(() => ({
    where: jest.fn().mockResolvedValue({ rowCount: 0 }),
  }));

  return { db: { select: selectFn, insert: insertFn, delete: deleteFn } };
});

// In beforeEach:
beforeEach(() => {
  rateLimitCount = 0;
  rateLimitInserts = [];
});
```

**Used in:** `scrape-recipe/route.test.ts`, `feedback.integration.test.ts`, `usage-limit-service.test.ts`

## Pattern 3: Multi-Query Dispatch

When code makes multiple different `db.select()` calls (e.g., profile lookup then custom units), dispatch based on call order or table argument:

```ts
jest.mock("@/db", () => {
  const profileChain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  };
  const customUnitsChain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue([]),
  };

  let selectCallCount = 0;
  const selectFn = jest.fn().mockImplementation(() => {
    selectCallCount++;
    return {
      from: jest.fn().mockImplementation(() => {
        return selectCallCount <= 1 ? profileChain : customUnitsChain;
      }),
    };
  });

  return {
    db: {
      select: selectFn,
      __profileChain: profileChain,
      __customUnitsChain: customUnitsChain,
    },
  };
});
```

**Used in:** `recipe-chat-service.test.ts`

---

## Mocking Neon Auth (`auth.getSession`)

For code using `requireAuth()` which delegates to `auth.getSession()`:

```ts
// Factory creates the jest.fn() internally (no hoisting issue)
jest.mock("@/lib/auth/server", () => ({
  auth: {
    getSession: jest.fn(),
  },
}));

import { auth } from "@/lib/auth/server";

// Grab reference to the mock AFTER import
const mockGetSession = auth.getSession as jest.Mock;

// In tests:
mockGetSession.mockResolvedValue({
  data: { user: { id: "user-1", email: "test@example.com", name: "Test", image: null } },
});
```

For tests that don't need to control the session directly, mock `requireAuth` instead:

```ts
jest.mock("@/lib/auth-server", () => ({
  requireAuth: jest.fn(),
}));

const mockRequireAuth = requireAuth as jest.Mock;

// Authenticated:
mockRequireAuth.mockResolvedValue({ user: { id: "user-1", email: "test@example.com" } });

// Unauthenticated:
mockRequireAuth.mockResolvedValue(
  new Response(JSON.stringify({ error: "Authentication required", code: "UNAUTHORIZED" }), { status: 401 })
);
```

---

## Jest Mock Hoisting Gotcha

`jest.mock()` factories are hoisted to the top of the file, BEFORE any `const`/`let`/`import` statements. This means you **cannot** reference variables declared with `const` inside a `jest.mock()` factory:

```ts
// BROKEN — ReferenceError: Cannot access 'mockFn' before initialization
const mockFn = jest.fn();
jest.mock("@/some-module", () => ({ fn: mockFn }));
```

**Solutions:**

1. **Factory-internal mock + post-import reference** (preferred):
   ```ts
   jest.mock("@/some-module", () => ({ fn: jest.fn() }));
   import { fn } from "@/some-module";
   const mockFn = fn as jest.Mock;
   ```

2. **`__`-prefixed accessor pattern** (when you need the mock before import resolves):
   ```ts
   jest.mock("@/some-module", () => {
     const mock = jest.fn();
     return { fn: mock, __mockFn: mock };
   });
   function getMock() {
     return require("@/some-module").__mockFn;
   }
   ```

3. **Module-level `let` variables** (for mutable state the factory reads at call time):
   ```ts
   let returnValue = "default";
   jest.mock("@/some-module", () => ({
     fn: jest.fn().mockImplementation(() => returnValue),
   }));
   // Works because `let` is hoisted (as undefined) and the factory
   // reads it at call time, not at definition time.
   ```

---

## ESM Transform Patterns

Some dependencies (Neon Auth chain) are ESM-only. Add them to `transformIgnorePatterns` in both jest configs:

**jest.config.js** (unit tests):
```js
transformIgnorePatterns: [
  "node_modules/(?!.*(next-intl|use-intl|msw|@mswjs/interceptors|until-async|@neondatabase|better-auth|nanostores|jose)/)",
]
```

**jest.integration.config.js** (integration tests):
```js
transformIgnorePatterns: [
  "node_modules/(?!.*(next-intl|use-intl|msw|@mswjs/interceptors|until-async|@neondatabase|better-auth|better-call|nanostores|jose|rou3|@noble)/)",
]
```

---

## Quick Reference: Which Pattern to Use

| Scenario | Pattern |
|---|---|
| Code does a single `db.select()` chain | Pattern 1 (simple) |
| Need different DB responses per test | Pattern 2 (mutable state) |
| Code does multiple different queries | Pattern 3 (multi-query dispatch) |
| Testing `requireAuth()` itself | Mock `@/lib/auth/server` |
| Testing a route that calls `requireAuth()` | Mock `@/lib/auth-server` |
