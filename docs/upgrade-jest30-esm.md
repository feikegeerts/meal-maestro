# Jest 30 + ESM Dependencies Upgrade Guide

Status: draft (do not execute yet)  
Context: After `pnpm upgrade`, tests began failing with `SyntaxError: Unexpected token 'export'` for an ESM-only dependency `until-async` pulled transitively via `msw`.

## 1. Problem Summary

Jest 30 tightened ESM handling. A pure ESM package (`until-async`, `"type": "module"`) started being imported during test initialization (through `msw`). Our current Jest config:

```js
transformIgnorePatterns: ["node_modules/(?!(next-intl|use-intl)/)"];
```

This allowlist omits `msw` and `until-async`, so those modules are executed without transformation under a CommonJS expectation, producing the parse error.

Previously the same major Jest version worked because the dependency graph did not require executing `until-async` (different resolution, or `msw` code path not touched). The latent config gap was hidden.

## 2. Transitive Chain

- Direct dev dependency: `msw@2.11.1`
- `msw` internally depends on packages that (in updated builds) import utility packages, eventually triggering `until-async@3.0.2` (pure ESM). Although `msw`'s package.json does not list `until-async` directly, another subdependency or refactor started using it (verify by searching the built `lib` folder when needed).
- `until-async@3.0.2` has:
  - `"type": "module"`
  - Exports only ESM entry points
  - No CommonJS fallback

## 3. Upgrade Objectives

1. Support pure ESM dependencies under Jest 30.
2. Keep transform performance reasonable.
3. Avoid test logic changes.
4. Provide rollback path if instability occurs.

## 4. Strategy Options

| Option                                   | Pros                        | Cons                                                 | Recommended?                  |
| ---------------------------------------- | --------------------------- | ---------------------------------------------------- | ----------------------------- |
| A: Expand allowlist + transform with SWC | Minimal changes, fast       | Must maintain allowlist                              | Yes (primary)                 |
| B: Transform all node_modules            | Simple, guaranteed coverage | Slower test startup                                  | Use temporarily for diagnosis |
| C: Native ESM test setup                 | Future-proof                | Larger config changes, potential lib incompatibility | Later only                    |
| D: Pin / freeze transitive deps          | Immediate green tests       | Delays real fix                                      | Temporary fallback            |

## 5. Implementation Plan (Option A)

Step-by-step (can be applied in a dedicated PR):

1. Install transformer (if not already): `@swc/jest` (or keep Babel if preferred). SWC recommended for speed.
2. Update `jest.config.js`:

   - Add a `transform` rule: `"^.+\\.(t|j)sx?$": ["@swc/jest", {...}]` with `module.type: "commonjs"`.
   - Expand `transformIgnorePatterns` allowlist to include both `msw` and `until-async` (and any future ESM libs) while still ignoring bulk of node_modules.

   Example pattern:

   ```js
   transformIgnorePatterns: [
     "node_modules/(?!(next-intl|use-intl|msw|until-async)/)",
   ];
   ```

   If pnpm's virtual store path causes misses, broaden to:

   ```js
   transformIgnorePatterns: [
     "/node_modules/(?!(next-intl|use-intl|msw|until-async)(/|$))",
   ];
   ```

   Diagnostic fallback (temporary):

   ```js
   transformIgnorePatterns: [];
   ```

   to confirm transforms fix the error; then reintroduce a selective pattern.

3. (Optional) Add a dedicated mock if a particular ESM util remains problematic:

   ```js
   // in src/__tests__/setup.ts (before other imports)
   jest.mock("until-async", () => ({ until: async (fn) => fn() }));
   ```

   Only if transformation still fails.

4. Run a single failing test path to validate (`rate-limit-utils.test.ts`).
5. Run full suite & measure runtime delta vs main branch.
6. Adjust coverage thresholds only if transformation broadens instrumentation.

## 6. Alternative Diagnostic (Option B)

Temporarily set:

```js
transformIgnorePatterns: [];
```

If tests pass, the issue is solely transformation allowlist. Optimize after confirmation.

## 7. Rollback Plan

If instability or performance regressions occur:

1. Revert PR containing Jest config changes (keep lockfile snapshot for reproducibility).
2. Pin msw to a version where `until-async` isn’t triggered (requires empirical test by downgrading minor versions).
3. Freeze jest-related versions in `package.json` (exact versions, remove carets) until a more thorough migration.

## 8. Lockfile / Repro Guidance

Before applying changes:

- Commit current `pnpm-lock.yaml` as baseline (`chore: lock snapshot before jest 30 esm fix`).
- After changes, commit again (`chore: jest 30 esm transform adjustments`).

This allows bisecting if new flakiness appears.

## 9. Performance Notes

Transforming additional ESM packages adds negligible overhead relative to application source. Monitor if you expand the allowlist significantly.

## 10. Future Hardening

- Add a CI script that scans for new ESM-only packages under test scope and warns if they’re not in the allowlist.
  Example approach: parse `node_modules/.pnpm/*/package.json` where `type=module` and create a report.
- Consider migrating to native ESM test flow once all internal utils are ESM-friendly (remove CommonJS output target in transformer then).

## 11. Quick Diff Sketch (not yet applied)

```diff
 jest.config.js
@@
-  // Transform ESM modules
-  transformIgnorePatterns: [
-    "node_modules/(?!(next-intl|use-intl)/)"
-  ],
+  transform: {
+    '^.+\\.(t|j)sx?$': ['@swc/jest', {
+      jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } },
+      module: { type: 'commonjs' }
+    }],
+  },
+  transformIgnorePatterns: [
+    'node_modules/(?!(next-intl|use-intl|msw|until-async)/)'
+  ],
```

## 12. Verification Checklist

- [ ] Single targeted test passes (`rate-limit-utils.test.ts`).
- [ ] Full test suite green.
- [ ] Coverage collection unchanged (± small fluctuation acceptable).
- [ ] CI runtime impact < +10%.
- [ ] No new ESM parse errors.

## 13. Open Questions

- Should we additionally include `@open-draft/*` packages (msw ecosystem) preemptively? (If future failures appear.)
- Do we want to adopt a `jest-esm.config.js` variant and gradually migrate?

## 14. Decision Record Template (fill on execution)

| Field               | Value          |
| ------------------- | -------------- |
| Date                | (fill)         |
| Commit SHA          | (fill)         |
| Jest version        | 30.2.0 (exact) |
| msw version         | 2.11.1         |
| until-async version | 3.0.2          |
| Approach chosen     | Option A       |
| Runtime delta       | (fill)         |
| Notes               | (fill)         |

---

Feel free to adjust or request automation scripts before executing this plan.
