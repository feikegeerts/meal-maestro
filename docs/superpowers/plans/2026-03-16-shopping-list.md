# Shopping List Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hybrid shopping list feature that lets users add recipe ingredients (with smart merging) and freeform items, with automatic partner sharing and drag-and-drop reordering.

**Architecture:** Database-backed (Neon/Postgres via Drizzle ORM) following the established pattern: schema → service → API routes → TanStack Query hooks → UI components. Partner sharing reuses `getPartnerUserIds()` from the partnership service.

**Tech Stack:** Next.js (App Router), TypeScript, Drizzle ORM, Neon Postgres, TanStack Query v5, @dnd-kit, sonner (toasts), Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-shopping-list-design.md`

---

## Chunk 1: Utilities — Unit Compatibility, Merge, and Ingredient Parsing

These pure utility functions have no dependencies on the database or API layer. They are the foundation for the merge logic and freeform input.

### Task 1: Unit Compatibility and Merge Functions

**Files:**
- Modify: `src/lib/recipe-utils.ts`
- Create: `src/__tests__/unit/recipe-utils-units.test.ts`

- [ ] **Step 1: Write failing tests for `areUnitsCompatible`**

```typescript
// src/__tests__/unit/recipe-utils-units.test.ts
import { describe, it, expect } from "vitest";
import { areUnitsCompatible, mergeAmounts } from "@/lib/recipe-utils";

describe("areUnitsCompatible", () => {
  it("returns true for same unit", () => {
    expect(areUnitsCompatible("g", "g")).toBe(true);
  });

  it("returns true for weight metric family (g, kg)", () => {
    expect(areUnitsCompatible("g", "kg")).toBe(true);
    expect(areUnitsCompatible("kg", "g")).toBe(true);
  });

  it("returns true for weight imperial family (oz, lb)", () => {
    expect(areUnitsCompatible("oz", "lb")).toBe(true);
  });

  it("returns true for volume metric family (ml, l)", () => {
    expect(areUnitsCompatible("ml", "l")).toBe(true);
    expect(areUnitsCompatible("l", "ml")).toBe(true);
  });

  it("returns true for volume imperial family (tsp, tbsp, cup, fl oz)", () => {
    expect(areUnitsCompatible("tsp", "tbsp")).toBe(true);
    expect(areUnitsCompatible("cup", "fl oz")).toBe(true);
    expect(areUnitsCompatible("tbsp", "cup")).toBe(true);
  });

  it("returns false for cross-family units", () => {
    expect(areUnitsCompatible("g", "ml")).toBe(false);
    expect(areUnitsCompatible("kg", "l")).toBe(false);
    expect(areUnitsCompatible("oz", "cup")).toBe(false);
  });

  it("returns false for incompatible count units", () => {
    expect(areUnitsCompatible("clove", "g")).toBe(false);
    expect(areUnitsCompatible("slice", "piece")).toBe(false);
  });

  it("returns true for identical count units", () => {
    expect(areUnitsCompatible("clove", "clove")).toBe(true);
  });

  it("handles null units — both null is compatible", () => {
    expect(areUnitsCompatible(null, null)).toBe(true);
  });

  it("handles null vs non-null — incompatible", () => {
    expect(areUnitsCompatible(null, "g")).toBe(false);
    expect(areUnitsCompatible("g", null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/unit/recipe-utils-units.test.ts`
Expected: FAIL — `areUnitsCompatible` is not exported from `@/lib/recipe-utils`

- [ ] **Step 3: Implement `areUnitsCompatible`**

Add to `src/lib/recipe-utils.ts`:

```typescript
const UNIT_FAMILIES: Record<string, string[]> = {
  "weight-metric": ["g", "kg"],
  "weight-imperial": ["oz", "lb"],
  "volume-metric": ["ml", "l"],
  "volume-imperial": ["tsp", "tbsp", "cup", "fl oz"],
};

function getUnitFamily(unit: string): string | null {
  for (const [family, units] of Object.entries(UNIT_FAMILIES)) {
    if (units.includes(unit.toLowerCase())) return family;
  }
  return null;
}

export function areUnitsCompatible(
  unitA: string | null,
  unitB: string | null,
): boolean {
  if (unitA === null && unitB === null) return true;
  if (unitA === null || unitB === null) return false;
  const a = unitA.toLowerCase();
  const b = unitB.toLowerCase();
  if (a === b) return true;
  const familyA = getUnitFamily(a);
  const familyB = getUnitFamily(b);
  if (familyA === null || familyB === null) return false;
  return familyA === familyB;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/unit/recipe-utils-units.test.ts`
Expected: All `areUnitsCompatible` tests PASS

- [ ] **Step 5: Write failing tests for `mergeAmounts`**

Append to the same test file:

```typescript
describe("mergeAmounts", () => {
  it("sums same units directly", () => {
    expect(mergeAmounts(200, "g", 300, "g")).toEqual({ amount: 500, unit: "g" });
  });

  it("converts g + kg to kg when result >= 1000g", () => {
    expect(mergeAmounts(800, "g", 0.5, "kg")).toEqual({ amount: 1.3, unit: "kg" });
  });

  it("converts kg + g staying in g when result < 1000g", () => {
    expect(mergeAmounts(0.2, "kg", 100, "g")).toEqual({ amount: 300, unit: "g" });
  });

  it("converts ml + l to l when result >= 1000ml", () => {
    expect(mergeAmounts(800, "ml", 0.5, "l")).toEqual({ amount: 1.3, unit: "l" });
  });

  it("sums tsp + tbsp by converting to tbsp", () => {
    // 3 tsp = 1 tbsp, so 6 tsp + 2 tbsp = 2 + 2 = 4 tbsp
    expect(mergeAmounts(6, "tsp", 2, "tbsp")).toEqual({ amount: 4, unit: "tbsp" });
  });

  it("sums oz + lb by converting to lb when large", () => {
    // 16 oz = 1 lb, so 24 oz + 1 lb = 1.5 + 1 = 2.5 lb
    expect(mergeAmounts(24, "oz", 1, "lb")).toEqual({ amount: 2.5, unit: "lb" });
  });

  it("returns smart-converted result (e.g., 1500g becomes 1.5kg)", () => {
    expect(mergeAmounts(1000, "g", 500, "g")).toEqual({ amount: 1.5, unit: "kg" });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/unit/recipe-utils-units.test.ts`
Expected: FAIL — `mergeAmounts` is not exported

- [ ] **Step 7: Implement `mergeAmounts`**

Add to `src/lib/recipe-utils.ts`:

```typescript
// Conversion factors to the base unit of each family
const TO_BASE_UNIT: Record<string, { base: string; factor: number }> = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  oz: { base: "oz", factor: 1 },
  lb: { base: "oz", factor: 16 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  tsp: { base: "tsp", factor: 1 },
  tbsp: { base: "tsp", factor: 3 },
  cup: { base: "tsp", factor: 48 },
  "fl oz": { base: "tsp", factor: 6 },
};

export function mergeAmounts(
  amountA: number,
  unitA: string,
  amountB: number,
  unitB: string,
): { amount: number; unit: string } {
  const a = unitA.toLowerCase();
  const b = unitB.toLowerCase();

  const convA = TO_BASE_UNIT[a];
  const convB = TO_BASE_UNIT[b];

  if (!convA || !convB || convA.base !== convB.base) {
    // Fallback: cannot convert, just sum in first unit
    return { amount: amountA + amountB, unit: unitA };
  }

  // Convert both to base unit, sum, then smart-convert back
  const totalInBase = amountA * convA.factor + amountB * convB.factor;
  const baseUnit = convA.base;

  // Use existing smart conversion to pick readable unit
  const result = baseUnit === "g"
    ? smartWeightConversion(totalInBase, baseUnit)
    : baseUnit === "ml"
      ? smartVolumeConversion(totalInBase, baseUnit)
      : smartImperialConversion(totalInBase, baseUnit);

  return { amount: parseFloat(result.amount.toFixed(3)), unit: result.unit };
}

// New helper for imperial smart conversion
function smartImperialConversion(
  amount: number,
  baseUnit: string,
): { amount: number; unit: string } {
  if (baseUnit === "oz") {
    if (amount >= 16) return { amount: amount / 16, unit: "lb" };
    return { amount, unit: "oz" };
  }
  if (baseUnit === "tsp") {
    if (amount >= 48) return { amount: amount / 48, unit: "cup" };
    if (amount >= 3) return { amount: amount / 3, unit: "tbsp" };
    return { amount, unit: "tsp" };
  }
  return { amount, unit: baseUnit };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/unit/recipe-utils-units.test.ts`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/recipe-utils.ts src/__tests__/unit/recipe-utils-units.test.ts
git commit -m "feat: add unit compatibility check and merge functions for shopping list"
```

### Task 2: Ingredient String Parser

**Files:**
- Modify: `src/lib/recipe-utils.ts`
- Create: `src/__tests__/unit/recipe-utils-parser.test.ts`

- [ ] **Step 1: Write failing tests for `parseIngredientString`**

```typescript
// src/__tests__/unit/recipe-utils-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseIngredientString } from "@/lib/recipe-utils";

describe("parseIngredientString", () => {
  it("parses amount + unit + name with space", () => {
    expect(parseIngredientString("500 g flour")).toEqual({
      amount: 500, unit: "g", name: "flour",
    });
  });

  it("parses amount + unit glued together", () => {
    expect(parseIngredientString("500g flour")).toEqual({
      amount: 500, unit: "g", name: "flour",
    });
  });

  it("parses amount + multi-word unit + name", () => {
    expect(parseIngredientString("2 fl oz cream")).toEqual({
      amount: 2, unit: "fl oz", name: "cream",
    });
  });

  it("parses amount + name without unit", () => {
    expect(parseIngredientString("3 onions")).toEqual({
      amount: 3, unit: null, name: "onions",
    });
  });

  it("parses decimal amount", () => {
    expect(parseIngredientString("1.5 tbsp olive oil")).toEqual({
      amount: 1.5, unit: "tbsp", name: "olive oil",
    });
  });

  it("parses fraction", () => {
    expect(parseIngredientString("1/2 cup sugar")).toEqual({
      amount: 0.5, unit: "cup", name: "sugar",
    });
  });

  it("parses name only (no amount)", () => {
    expect(parseIngredientString("salt")).toEqual({
      amount: null, unit: null, name: "salt",
    });
  });

  it("parses multi-word name only", () => {
    expect(parseIngredientString("toilet paper")).toEqual({
      amount: null, unit: null, name: "toilet paper",
    });
  });

  it("trims whitespace", () => {
    expect(parseIngredientString("  2  kg  chicken  ")).toEqual({
      amount: 2, unit: "kg", name: "chicken",
    });
  });

  it("handles empty string", () => {
    expect(parseIngredientString("")).toEqual({
      amount: null, unit: null, name: "",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/unit/recipe-utils-parser.test.ts`
Expected: FAIL — `parseIngredientString` not exported

- [ ] **Step 3: Implement `parseIngredientString`**

Add to `src/lib/recipe-utils.ts`:

```typescript
const KNOWN_UNITS = new Set([
  "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "fl oz",
  "oz", "lb", "clove", "cloves", "slice", "slices",
  "piece", "pieces", "bunch", "tin", "can",
]);

// Multi-word units must be checked first
const MULTI_WORD_UNITS = ["fl oz"];

export function parseIngredientString(input: string): {
  amount: number | null;
  unit: string | null;
  name: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { amount: null, unit: null, name: "" };

  // Try to match a leading number (integer, decimal, or fraction)
  const numberMatch = trimmed.match(
    /^(\d+(?:\.\d+)?|\d+\/\d+)\s*/,
  );

  if (!numberMatch) {
    return { amount: null, unit: null, name: trimmed };
  }

  const rawAmount = numberMatch[1];
  const amount = rawAmount.includes("/")
    ? rawAmount.split("/").reduce((a, b) => Number(a) / Number(b))
    : parseFloat(rawAmount);

  let rest = trimmed.slice(numberMatch[0].length);

  // Check for unit glued to number (e.g., "500g flour" → rest is "g flour")
  // The number regex already consumed digits, so rest starts after the number
  // But we need to handle "500g" where there's no space
  const gluedMatch = trimmed.match(
    /^(\d+(?:\.\d+)?|\d+\/\d+)([a-zA-Z])/,
  );
  if (gluedMatch && !numberMatch[0].endsWith(" ")) {
    // Re-parse: the unit is glued to the number
    rest = trimmed.slice(gluedMatch[1].length);
  }

  rest = rest.trim();

  // Check multi-word units first
  for (const mwu of MULTI_WORD_UNITS) {
    if (rest.toLowerCase().startsWith(mwu)) {
      const name = rest.slice(mwu.length).trim();
      return { amount, unit: mwu, name };
    }
  }

  // Check single-word unit
  const parts = rest.split(/\s+/);
  if (parts.length > 0 && KNOWN_UNITS.has(parts[0].toLowerCase())) {
    const unit = parts[0].toLowerCase();
    const name = parts.slice(1).join(" ");
    return { amount, unit, name };
  }

  // No unit found — rest is the name
  return { amount, unit: null, name: rest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/unit/recipe-utils-parser.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipe-utils.ts src/__tests__/unit/recipe-utils-parser.test.ts
git commit -m "feat: add ingredient string parser for shopping list freeform input"
```

---

## Chunk 2: Schema, Types, and Service Layer

### Task 3: Database Schema and Migration

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add `shoppingListItems` table to schema**

Add to `src/db/schema.ts` after the `userPartnerships` table definition:

```typescript
export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: decimal("amount", { precision: 8, scale: 3 }),
    unit: text("unit"),
    notes: text("notes"),
    recipeId: uuid("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    checked: boolean("checked").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_shopping_list_items_user_checked_sort").on(
      table.userId,
      table.checked,
      table.sortOrder,
    ),
  ],
);
```

Note: Import `boolean`, `integer`, and `decimal` from `drizzle-orm/pg-core` if not already imported. Check existing imports at the top of the file.

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: A new migration file in `drizzle/` directory for the `shopping_list_items` table.

- [ ] **Step 3: Apply migration**

Run: `pnpm db:migrate`
Expected: Migration applied successfully.

- [ ] **Step 4: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: add shopping_list_items table schema and migration"
```

### Task 4: Types

**Files:**
- Create: `src/lib/shopping-list-types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/shopping-list-types.ts

export interface ShoppingListItem {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  notes: string | null;
  recipe_id: string | null;
  checked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AddFromRecipeIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
  notes?: string;
}

export interface AddFromRecipeRequest {
  recipe_id: string;
  ingredients: AddFromRecipeIngredient[];
}

export interface AddFreeformItemRequest {
  name: string;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export interface UpdateItemRequest {
  name?: string;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
  checked?: boolean;
}

export interface ReorderItemsRequest {
  item_ids: string[];
}

export interface AddFromRecipeResponse {
  added: number;
  merged: number;
  items: ShoppingListItem[];
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shopping-list-types.ts
git commit -m "feat: add shopping list TypeScript types and DTOs"
```

### Task 5: Service Layer — Core CRUD

**Files:**
- Create: `src/lib/shopping-list-service.ts`
- Create: `src/__tests__/unit/shopping-list-service.test.ts`

- [ ] **Step 1: Write failing tests for `getShoppingList`**

```typescript
// src/__tests__/unit/shopping-list-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @/db before importing service
let mockDbResult: unknown[] = [];
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockDbResult)),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(() => Promise.resolve([])),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => Promise.resolve([])),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => Promise.resolve()),
    }),
  },
}));

// Mock partnership service
vi.mock("@/lib/partnership-service", () => ({
  getPartnerUserIds: vi.fn().mockResolvedValue(["user-1"]),
}));

import { getShoppingList } from "@/lib/shopping-list-service";

describe("getShoppingList", () => {
  beforeEach(() => {
    mockDbResult = [];
    vi.clearAllMocks();
  });

  it("returns empty array when no items exist", async () => {
    mockDbResult = [];
    const result = await getShoppingList("user-1");
    expect(result).toEqual([]);
  });

  it("returns items from the database", async () => {
    mockDbResult = [
      {
        id: "item-1",
        userId: "user-1",
        name: "Onion",
        amount: "3",
        unit: null,
        notes: null,
        recipeId: null,
        checked: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const result = await getShoppingList("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Onion");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/unit/shopping-list-service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement service with `getShoppingList`, `addFreeformItem`, `toggleItem`, `updateItem`, `deleteItem`, `clearChecked`, `clearAll`**

```typescript
// src/lib/shopping-list-service.ts
import { db } from "@/db";
import { shoppingListItems } from "@/db/schema";
import { getPartnerUserIds } from "@/lib/partnership-service";
import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import type { ShoppingListItem } from "@/lib/shopping-list-types";

function toSnakeCase(row: typeof shoppingListItems.$inferSelect): ShoppingListItem {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    amount: row.amount ? parseFloat(row.amount) : null,
    unit: row.unit,
    notes: row.notes,
    recipe_id: row.recipeId,
    checked: row.checked,
    sort_order: row.sortOrder,
    created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updated_at: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

async function getHouseholdCondition(userId: string) {
  const userIds = await getPartnerUserIds(userId);
  return inArray(shoppingListItems.userId, userIds);
}

async function verifyHouseholdAccess(userId: string, itemId: string) {
  const householdCondition = await getHouseholdCondition(userId);
  const rows = await db
    .select()
    .from(shoppingListItems)
    .where(and(eq(shoppingListItems.id, itemId), householdCondition));
  if (rows.length === 0) {
    throw new ShoppingListError("NOT_FOUND", "Item not found");
  }
  return rows[0];
}

async function getNextSortOrder(userId: string, checked: boolean): Promise<number> {
  const householdCondition = await getHouseholdCondition(userId);
  const result = await db
    .select({ maxSort: max(shoppingListItems.sortOrder) })
    .from(shoppingListItems)
    .where(and(householdCondition, eq(shoppingListItems.checked, checked)));
  return (result[0]?.maxSort ?? -1) + 1;
}

export async function getShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const householdCondition = await getHouseholdCondition(userId);
  const rows = await db
    .select()
    .from(shoppingListItems)
    .where(householdCondition)
    .orderBy(asc(shoppingListItems.checked), asc(shoppingListItems.sortOrder));
  return rows.map(toSnakeCase);
}

export async function addFreeformItem(
  userId: string,
  name: string,
  amount?: number | null,
  unit?: string | null,
  notes?: string | null,
): Promise<ShoppingListItem> {
  const sortOrder = await getNextSortOrder(userId, false);
  const rows = await db
    .insert(shoppingListItems)
    .values({
      userId,
      name,
      amount: amount != null ? String(amount) : null,
      unit: unit ?? null,
      notes: notes ?? null,
      sortOrder,
    })
    .returning();
  return toSnakeCase(rows[0]);
}

export async function setItemChecked(
  userId: string,
  itemId: string,
  checked: boolean,
): Promise<ShoppingListItem> {
  const existing = await verifyHouseholdAccess(userId, itemId);
  if (existing.checked === checked) return toSnakeCase(existing);
  const sortOrder = await getNextSortOrder(userId, checked);
  const rows = await db
    .update(shoppingListItems)
    .set({ checked, sortOrder })
    .where(eq(shoppingListItems.id, itemId))
    .returning();
  return toSnakeCase(rows[0]);
}

export async function updateItem(
  userId: string,
  itemId: string,
  updates: { name?: string; amount?: number | null; unit?: string | null; notes?: string | null },
): Promise<ShoppingListItem> {
  await verifyHouseholdAccess(userId, itemId);
  const setValues: Record<string, unknown> = {};
  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.amount !== undefined) setValues.amount = updates.amount != null ? String(updates.amount) : null;
  if (updates.unit !== undefined) setValues.unit = updates.unit;
  if (updates.notes !== undefined) setValues.notes = updates.notes;

  const rows = await db
    .update(shoppingListItems)
    .set(setValues)
    .where(eq(shoppingListItems.id, itemId))
    .returning();
  return toSnakeCase(rows[0]);
}

export async function deleteItem(userId: string, itemId: string): Promise<void> {
  await verifyHouseholdAccess(userId, itemId);
  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
}

export async function reorderItems(
  userId: string,
  itemIds: string[],
): Promise<void> {
  // Verify all items belong to household
  const householdCondition = await getHouseholdCondition(userId);
  const items = await db
    .select({ id: shoppingListItems.id })
    .from(shoppingListItems)
    .where(and(householdCondition, inArray(shoppingListItems.id, itemIds)));

  const validIds = new Set(items.map((i) => i.id));
  for (const id of itemIds) {
    if (!validIds.has(id)) {
      throw new ShoppingListError("NOT_FOUND", `Item ${id} not found in household`);
    }
  }

  // Update sort orders in a transaction for atomicity
  await db.transaction(async (tx) => {
    for (const [index, id] of itemIds.entries()) {
      await tx
        .update(shoppingListItems)
        .set({ sortOrder: index })
        .where(eq(shoppingListItems.id, id));
    }
  });
}

export async function clearChecked(userId: string): Promise<void> {
  const householdCondition = await getHouseholdCondition(userId);
  await db
    .delete(shoppingListItems)
    .where(and(householdCondition, eq(shoppingListItems.checked, true)));
}

export async function clearAll(userId: string): Promise<void> {
  const householdCondition = await getHouseholdCondition(userId);
  await db.delete(shoppingListItems).where(householdCondition);
}

export type ShoppingListErrorCode = "NOT_FOUND" | "FORBIDDEN";

export class ShoppingListError extends Error {
  constructor(
    public readonly code: ShoppingListErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ShoppingListError";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/unit/shopping-list-service.test.ts`
Expected: Tests PASS (adjust mock setup as needed for actual Drizzle chain patterns)

- [ ] **Step 5: Commit**

```bash
git add src/lib/shopping-list-service.ts src/__tests__/unit/shopping-list-service.test.ts
git commit -m "feat: add shopping list service with core CRUD operations"
```

### Task 6: Service Layer — Merge Logic (`addFromRecipe`)

**Files:**
- Modify: `src/lib/shopping-list-service.ts`
- Create: `src/__tests__/unit/shopping-list-merge.test.ts`

- [ ] **Step 1: Write failing tests for `addFromRecipe`**

```typescript
// src/__tests__/unit/shopping-list-merge.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Same mock setup as shopping-list-service.test.ts
// (mock @/db and @/lib/partnership-service)
let mockSelectResult: unknown[] = [];
let mockInsertResult: unknown[] = [];
let mockUpdateResult: unknown[] = [];

vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockImplementation(() => Promise.resolve(mockSelectResult)),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockImplementation(() => Promise.resolve(mockInsertResult)),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockImplementation(() => Promise.resolve(mockUpdateResult)),
          }),
        }),
      }),
    },
  };
});

vi.mock("@/lib/partnership-service", () => ({
  getPartnerUserIds: vi.fn().mockResolvedValue(["user-1"]),
}));

import { addFromRecipe } from "@/lib/shopping-list-service";

describe("addFromRecipe", () => {
  beforeEach(() => {
    mockSelectResult = [];
    mockInsertResult = [];
    mockUpdateResult = [];
    vi.clearAllMocks();
  });

  it("adds new items when list is empty", async () => {
    mockSelectResult = []; // no existing items
    mockInsertResult = [{
      id: "new-1", userId: "user-1", name: "Onion",
      amount: "2", unit: null, notes: null,
      recipeId: "recipe-1", checked: false, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }];

    const result = await addFromRecipe("user-1", "recipe-1", [
      { name: "Onion", amount: 2, unit: null },
    ]);

    expect(result.added).toBe(1);
    expect(result.merged).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/unit/shopping-list-merge.test.ts`
Expected: FAIL — `addFromRecipe` not exported or not implemented

- [ ] **Step 3: Implement `addFromRecipe` in the service**

Add to `src/lib/shopping-list-service.ts`:

```typescript
import { areUnitsCompatible, mergeAmounts } from "@/lib/recipe-utils";
import type {
  AddFromRecipeIngredient,
  AddFromRecipeResponse,
  ShoppingListItem,
} from "@/lib/shopping-list-types";

export async function addFromRecipe(
  userId: string,
  recipeId: string,
  ingredients: AddFromRecipeIngredient[],
): Promise<AddFromRecipeResponse> {
  const householdCondition = await getHouseholdCondition(userId);

  // Fetch existing unchecked items
  const existingItems = await db
    .select()
    .from(shoppingListItems)
    .where(and(householdCondition, eq(shoppingListItems.checked, false)))
    .orderBy(asc(shoppingListItems.sortOrder));

  let added = 0;
  let merged = 0;
  let nextSortOrder = existingItems.length > 0
    ? Math.max(...existingItems.map((i) => i.sortOrder)) + 1
    : 0;

  const resultItems: ShoppingListItem[] = [];

  for (const ingredient of ingredients) {
    const normalizedName = ingredient.name.trim().toLowerCase();

    // Find matching existing item
    const match = existingItems.find(
      (item) => item.name.trim().toLowerCase() === normalizedName,
    );

    if (
      match &&
      ingredient.amount != null &&
      match.amount != null &&
      areUnitsCompatible(match.unit, ingredient.unit)
    ) {
      // Merge: compatible units with amounts
      const mergedResult: { amount: number; unit: string | null } =
        match.unit && ingredient.unit
          ? mergeAmounts(
              parseFloat(match.amount),
              match.unit,
              ingredient.amount,
              ingredient.unit,
            )
          : {
              // Both units null (areUnitsCompatible(null, null) === true) — just sum
              amount: parseFloat(match.amount) + ingredient.amount,
              unit: match.unit ?? ingredient.unit ?? null,
            };

      const rows = await db
        .update(shoppingListItems)
        .set({
          amount: String(mergedResult.amount),
          unit: mergedResult.unit,
        })
        .where(eq(shoppingListItems.id, match.id))
        .returning();

      merged++;
      resultItems.push(toSnakeCase(rows[0]));
    } else if (
      match &&
      ingredient.amount == null &&
      match.amount == null
    ) {
      // Both have no amount (e.g., "salt to taste") — skip, already on list
      merged++;
      resultItems.push(toSnakeCase(match));
    } else {
      // No match or incompatible units — insert new item
      const rows = await db
        .insert(shoppingListItems)
        .values({
          userId,
          name: ingredient.name.trim(),
          amount: ingredient.amount != null ? String(ingredient.amount) : null,
          unit: ingredient.unit ?? null,
          notes: ingredient.notes ?? null,
          recipeId,
          sortOrder: nextSortOrder++,
        })
        .returning();

      added++;
      resultItems.push(toSnakeCase(rows[0]));
    }
  }

  return { added, merged, items: resultItems };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/unit/shopping-list-merge.test.ts`
Expected: Tests PASS

- [ ] **Step 5: Run all tests to ensure nothing is broken**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/shopping-list-service.ts src/__tests__/unit/shopping-list-merge.test.ts
git commit -m "feat: add recipe-to-shopping-list merge logic with unit-aware combining"
```

---

## Chunk 3: API Routes

### Task 7: Main API Route (GET + POST)

**Files:**
- Create: `src/app/api/shopping-list/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shopping-list/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import {
  getShoppingList,
  addFreeformItem,
  ShoppingListError,
} from "@/lib/shopping-list-service";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const items = await getShoppingList(user.id);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
      { status: 500 },
    );
  }
}

const AddFreeformItemSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = AddFreeformItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const { name, amount, unit, notes } = parsed.data;
    const item = await addFreeformItem(user.id, name, amount, unit, notes);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shopping-list/route.ts
git commit -m "feat: add GET/POST API routes for shopping list"
```

### Task 8: From-Recipe API Route

**Files:**
- Create: `src/app/api/shopping-list/from-recipe/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shopping-list/from-recipe/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import { addFromRecipe } from "@/lib/shopping-list-service";

const AddFromRecipeSchema = z.object({
  recipe_id: z.string().uuid("Invalid recipe ID"),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      amount: z.number().nullable(),
      unit: z.string().nullable(),
      notes: z.string().optional(),
    }),
  ).min(1, "At least one ingredient is required"),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = AddFromRecipeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const { recipe_id, ingredients } = parsed.data;
    const result = await addFromRecipe(user.id, recipe_id, ingredients);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding from recipe:", error);
    return NextResponse.json(
      { error: "Failed to add from recipe" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shopping-list/from-recipe/route.ts
git commit -m "feat: add from-recipe API route for shopping list"
```

### Task 9: Item-Level API Route (PATCH + DELETE)

**Files:**
- Create: `src/app/api/shopping-list/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/shopping-list/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import {
  updateItem,
  setItemChecked,
  deleteItem,
  ShoppingListError,
} from "@/lib/shopping-list-service";

const UpdateItemSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  checked: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const { checked, ...updates } = parsed.data;

    // If `checked` is provided, update checked state (with sortOrder recalculation)
    if (checked !== undefined) {
      const item = await setItemChecked(user.id, id, checked);
      // If there are also other updates, apply them too
      if (Object.keys(updates).some((k) => updates[k as keyof typeof updates] !== undefined)) {
        const updatedItem = await updateItem(user.id, id, updates);
        return NextResponse.json(updatedItem);
      }
      return NextResponse.json(item);
    }

    const item = await updateItem(user.id, id, updates);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof ShoppingListError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "NOT_FOUND" ? 404 : 403 },
      );
    }
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;
  const { id } = await params;

  try {
    await deleteItem(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ShoppingListError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "NOT_FOUND" ? 404 : 403 },
      );
    }
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/shopping-list/[id]/route.ts
git commit -m "feat: add item-level PATCH/DELETE API routes for shopping list"
```

### Task 10: Reorder and Clear API Routes

**Files:**
- Create: `src/app/api/shopping-list/reorder/route.ts`
- Create: `src/app/api/shopping-list/clear/route.ts`

- [ ] **Step 1: Create reorder route**

```typescript
// src/app/api/shopping-list/reorder/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { z } from "zod";
import { reorderItems, ShoppingListError } from "@/lib/shopping-list-service";

const ReorderItemsSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1, "At least one item ID required"),
});

export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parsed = ReorderItemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    await reorderItems(user.id, parsed.data.item_ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ShoppingListError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 },
      );
    }
    console.error("Error reordering items:", error);
    return NextResponse.json(
      { error: "Failed to reorder items" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create clear route**

```typescript
// src/app/api/shopping-list/clear/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { clearChecked, clearAll } from "@/lib/shopping-list-service";

export async function DELETE(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    if (all) {
      await clearAll(user.id);
    } else {
      await clearChecked(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing items:", error);
    return NextResponse.json(
      { error: "Failed to clear items" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shopping-list/reorder/route.ts src/app/api/shopping-list/clear/route.ts
git commit -m "feat: add reorder and clear API routes for shopping list"
```

---

## Chunk 4: Client Layer (Client Service + TanStack Query Hooks)

### Task 11: Client Service

**Files:**
- Create: `src/lib/shopping-list-client-service.ts`

- [ ] **Step 1: Create client service**

```typescript
// src/lib/shopping-list-client-service.ts
import type {
  ShoppingListItem,
  AddFreeformItemRequest,
  AddFromRecipeRequest,
  AddFromRecipeResponse,
  UpdateItemRequest,
  ReorderItemsRequest,
} from "@/lib/shopping-list-types";

const BASE_URL = "/api/shopping-list";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

export const shoppingListClientService = {
  getList(): Promise<ShoppingListItem[]> {
    return fetchJSON(BASE_URL);
  },

  addFreeformItem(data: AddFreeformItemRequest): Promise<ShoppingListItem> {
    return fetchJSON(BASE_URL, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  addFromRecipe(data: AddFromRecipeRequest): Promise<AddFromRecipeResponse> {
    return fetchJSON(`${BASE_URL}/from-recipe`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateItem(id: string, data: UpdateItemRequest): Promise<ShoppingListItem> {
    return fetchJSON(`${BASE_URL}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  setItemChecked(id: string, checked: boolean): Promise<ShoppingListItem> {
    return fetchJSON(`${BASE_URL}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ checked }),
    });
  },

  deleteItem(id: string): Promise<void> {
    return fetchJSON(`${BASE_URL}/${id}`, { method: "DELETE" });
  },

  reorderItems(data: ReorderItemsRequest): Promise<void> {
    return fetchJSON(`${BASE_URL}/reorder`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  clearChecked(): Promise<void> {
    return fetchJSON(`${BASE_URL}/clear`, { method: "DELETE" });
  },

  clearAll(): Promise<void> {
    return fetchJSON(`${BASE_URL}/clear?all=true`, { method: "DELETE" });
  },
};
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/shopping-list-client-service.ts
git commit -m "feat: add shopping list client service (fetch wrapper)"
```

### Task 12: TanStack Query Hooks

**Files:**
- Create: `src/lib/hooks/use-shopping-list-query.ts`

- [ ] **Step 1: Create hooks file**

```typescript
// src/lib/hooks/use-shopping-list-query.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { shoppingListClientService } from "@/lib/shopping-list-client-service";
import type {
  ShoppingListItem,
  AddFreeformItemRequest,
  AddFromRecipeRequest,
  AddFromRecipeResponse,
  UpdateItemRequest,
} from "@/lib/shopping-list-types";

export const SHOPPING_LIST_KEY = ["shopping-list"] as const;

export function useShoppingListQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: SHOPPING_LIST_KEY,
    queryFn: () => shoppingListClientService.getList(),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!user,
  });
}

// Reads from cache only — does NOT trigger a fetch.
// Returns undefined if the list has not been fetched yet in this session.
export function useShoppingListCount(): number | undefined {
  const queryClient = useQueryClient();
  const data = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
  if (!data) return undefined;
  return data.filter((item) => !item.checked).length;
}

export function useAddFreeformItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddFreeformItemRequest) =>
      shoppingListClientService.addFreeformItem(data),
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      if (previous) {
        const optimistic: ShoppingListItem = {
          id: `temp-${Date.now()}`,
          user_id: "",
          name: newItem.name,
          amount: newItem.amount ?? null,
          unit: newItem.unit ?? null,
          notes: newItem.notes ?? null,
          recipe_id: null,
          checked: false,
          sort_order: previous.filter((i) => !i.checked).length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<ShoppingListItem[]>(
          SHOPPING_LIST_KEY,
          [...previous.filter((i) => !i.checked), optimistic, ...previous.filter((i) => i.checked)],
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useAddFromRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation<AddFromRecipeResponse, Error, AddFromRecipeRequest>({
    mutationFn: (data) => shoppingListClientService.addFromRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useToggleItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      shoppingListClientService.setItemChecked(itemId, checked),
    onMutate: async ({ itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      if (previous) {
        queryClient.setQueryData<ShoppingListItem[]>(
          SHOPPING_LIST_KEY,
          previous.map((item) =>
            item.id === itemId ? { ...item, checked } : item,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useReorderItemsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      shoppingListClientService.reorderItems({ item_ids: itemIds }),
    onMutate: async (itemIds) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      if (previous) {
        const itemMap = new Map(previous.map((i) => [i.id, i]));
        const reordered = itemIds
          .map((id) => itemMap.get(id))
          .filter(Boolean) as ShoppingListItem[];
        const rest = previous.filter((i) => !itemIds.includes(i.id));
        queryClient.setQueryData<ShoppingListItem[]>(
          SHOPPING_LIST_KEY,
          [...reordered, ...rest],
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateItemRequest & { id: string }) =>
      shoppingListClientService.updateItem(id, data),
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      if (previous) {
        queryClient.setQueryData<ShoppingListItem[]>(
          SHOPPING_LIST_KEY,
          previous.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...(updates.name !== undefined && { name: updates.name }),
                  ...(updates.amount !== undefined && { amount: updates.amount ?? null }),
                  ...(updates.unit !== undefined && { unit: updates.unit ?? null }),
                  ...(updates.notes !== undefined && { notes: updates.notes ?? null }),
                }
              : item,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      shoppingListClientService.deleteItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      if (previous) {
        queryClient.setQueryData<ShoppingListItem[]>(
          SHOPPING_LIST_KEY,
          previous.filter((item) => item.id !== itemId),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useClearCheckedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => shoppingListClientService.clearChecked(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      if (previous) {
        queryClient.setQueryData<ShoppingListItem[]>(
          SHOPPING_LIST_KEY,
          previous.filter((item) => !item.checked),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}

export function useClearAllMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => shoppingListClientService.clearAll(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);
      queryClient.setQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY, []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-shopping-list-query.ts
git commit -m "feat: add TanStack Query hooks for shopping list with optimistic updates"
```

---

## Chunk 5: UI Components — Shopping List Page

> **Note on i18n:** The component code below uses hardcoded English strings for readability. When implementing, use `useTranslations("shoppingList")` from `next-intl` from the start and reference the translation keys defined in Task 19. Do NOT commit hardcoded strings. All user-visible text must go through `t()`. Follow the existing pattern in components like `src/components/settings/partner-card.tsx`.

> **Note on `authenticatedFetch`:** The client service (Task 11) defines its own `fetchJSON` helper. When implementing, check if the existing `authenticatedFetch` from `src/lib/recipe-service.ts` can be reused. If it can, use it instead of duplicating fetch logic.

### Task 13: Shopping List Item Component

**Files:**
- Create: `src/components/shopping-list/shopping-list-item.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shopping-list/shopping-list-item.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ShoppingListItem as ShoppingListItemType } from "@/lib/shopping-list-types";

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

export function ShoppingListItemRow({
  item,
  onToggle,
  onDelete,
}: ShoppingListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : item.checked ? 0.5 : 1,
  };

  const amountDisplay = [
    item.amount != null ? String(item.amount) : null,
    item.unit,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        item.checked ? "opacity-50" : ""
      }`}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={item.checked}
        onCheckedChange={() => onToggle(item.id, !item.checked)}
      />

      <div className="flex-1 min-w-0">
        <span className={item.checked ? "line-through text-muted-foreground" : ""}>
          {amountDisplay && (
            <span className="text-primary font-medium">{amountDisplay} </span>
          )}
          {item.name}
        </span>
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
        )}
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="text-muted-foreground hover:text-destructive flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shopping-list/shopping-list-item.tsx
git commit -m "feat: add shopping list item component with drag-and-drop"
```

### Task 14: Add Item Bar Component

**Files:**
- Create: `src/components/shopping-list/add-item-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shopping-list/add-item-bar.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseIngredientString } from "@/lib/recipe-utils";

interface AddItemBarProps {
  onAdd: (data: { name: string; amount?: number | null; unit?: string | null }) => void;
}

export function AddItemBar({ onAdd }: AddItemBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    const parsed = parseIngredientString(trimmed);
    onAdd({
      name: parsed.name,
      amount: parsed.amount,
      unit: parsed.unit,
    });
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add an item... (e.g., 2 onions, 500g flour)"
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={!value.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping-list/add-item-bar.tsx
git commit -m "feat: add freeform item input bar with ingredient parsing"
```

### Task 15: Clear Actions Component

**Files:**
- Create: `src/components/shopping-list/clear-actions.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shopping-list/clear-actions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClearActionsProps {
  hasChecked: boolean;
  hasItems: boolean;
  onClearChecked: () => void;
  onClearAll: () => void;
}

export function ClearActions({
  hasChecked,
  hasItems,
  onClearChecked,
  onClearAll,
}: ClearActionsProps) {
  return (
    <div className="flex gap-2">
      {hasChecked && (
        <Button variant="outline" size="sm" onClick={onClearChecked}>
          Clear done
        </Button>
      )}
      {hasItems && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Clear all
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear entire shopping list?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all items from your shopping list. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll}>
                Clear all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shopping-list/clear-actions.tsx
git commit -m "feat: add clear actions component with confirmation dialog"
```

### Task 16: Shopping List Page Component

**Files:**
- Create: `src/components/shopping-list/shopping-list-page.tsx`

- [ ] **Step 1: Create the main page component**

This is the largest component. It wires up the DnD context, renders the item list split into unchecked/checked sections, and connects all the mutations.

```tsx
// src/components/shopping-list/shopping-list-page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ShoppingListItemRow } from "./shopping-list-item";
import { AddItemBar } from "./add-item-bar";
import { ClearActions } from "./clear-actions";
import {
  useShoppingListQuery,
  useAddFreeformItemMutation,
  useToggleItemMutation,
  useDeleteItemMutation,
  useReorderItemsMutation,
  useClearCheckedMutation,
  useClearAllMutation,
} from "@/lib/hooks/use-shopping-list-query";
import { ChevronDown, ChevronRight, ShoppingCart } from "lucide-react";

export function ShoppingListPage() {
  const { data: items = [], isLoading } = useShoppingListQuery();
  const addFreeformItem = useAddFreeformItemMutation();
  const toggleItem = useToggleItemMutation();
  const deleteItem = useDeleteItemMutation();
  const reorderItems = useReorderItemsMutation();
  const clearChecked = useClearCheckedMutation();
  const clearAll = useClearAllMutation();
  const [doneCollapsed, setDoneCollapsed] = useState(false);

  const uncheckedItems = useMemo(
    () => items.filter((i) => !i.checked),
    [items],
  );
  const checkedItems = useMemo(
    () => items.filter((i) => i.checked),
    [items],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = uncheckedItems.findIndex((i) => i.id === active.id);
    const newIndex = uncheckedItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...uncheckedItems];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderItems.mutate(reordered.map((i) => i.id));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Shopping List
        </h1>
        <ClearActions
          hasChecked={checkedItems.length > 0}
          hasItems={items.length > 0}
          onClearChecked={() => clearChecked.mutate()}
          onClearAll={() => clearAll.mutate()}
        />
      </div>

      <AddItemBar
        onAdd={(data) => addFreeformItem.mutate(data)}
      />

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Your shopping list is empty.</p>
          <p className="text-sm mt-1">
            Add items above or from any recipe page.
          </p>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={uncheckedItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {uncheckedItems.map((item) => (
                  <ShoppingListItemRow
                    key={item.id}
                    item={item}
                    onToggle={(id, checked) => toggleItem.mutate({ itemId: id, checked })}
                    onDelete={(id) => deleteItem.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {checkedItems.length > 0 && (
            <div>
              <button
                onClick={() => setDoneCollapsed(!doneCollapsed)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
              >
                {doneCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Done ({checkedItems.length})
              </button>
              {!doneCollapsed && (
                <div className="space-y-2">
                  {checkedItems.map((item) => (
                    <ShoppingListItemRow
                      key={item.id}
                      item={item}
                      onToggle={(id, checked) => toggleItem.mutate({ itemId: id, checked })}
                      onDelete={(id) => deleteItem.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shopping-list/shopping-list-page.tsx
git commit -m "feat: add shopping list page component with DnD and sections"
```

### Task 17: Route Page and Navigation

**Files:**
- Create: `src/app/[locale]/shopping-list/page.tsx`
- Modify: `src/components/navigation/main-nav.tsx`

- [ ] **Step 1: Create the route page**

```tsx
// src/app/[locale]/shopping-list/page.tsx
import { ShoppingListPage } from "@/components/shopping-list/shopping-list-page";

export default function ShoppingListRoute() {
  return (
    <div className="container py-6">
      <ShoppingListPage />
    </div>
  );
}
```

- [ ] **Step 2: Add navigation link**

In `src/components/navigation/main-nav.tsx`, add to `baseNavigationItems` after the Recipes entry:

```typescript
import { ShoppingCart } from "lucide-react";
// ... in baseNavigationItems array, after the recipes entry:
{
  name: "Shopping List",
  href: "/shopping-list",
  icon: ShoppingCart,
},
```

Also add a badge showing the item count. Import `useShoppingListCount` from `@/lib/hooks/use-shopping-list-query` and render a count badge next to the nav item label (implementation depends on existing nav item rendering pattern — add a small `<span>` with the count if > 0).

- [ ] **Step 3: Verify the app starts without errors**

Run: `pnpm dev`
Navigate to `http://localhost:3000/shopping-list`
Expected: Page loads with empty state ("Your shopping list is empty")

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/shopping-list/page.tsx src/components/navigation/main-nav.tsx
git commit -m "feat: add shopping list route and navigation link"
```

---

## Chunk 6: Recipe Page Integration

### Task 18: Add-to-Shopping-List Component on Recipe Page

**Files:**
- Create: `src/components/recipes/add-to-shopping-list.tsx`
- Modify: `src/app/[locale]/recipes/[id]/page.tsx` (or the component that renders the ingredients section)

- [ ] **Step 1: Create the selection mode hook**

This is a hook (not a component) because it needs to control what the parent renders in the ingredient list (checkboxes per ingredient). The parent component uses the hook's return values to conditionally render selection UI.

```tsx
// src/components/recipes/add-to-shopping-list.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAddFromRecipeMutation } from "@/lib/hooks/use-shopping-list-query";
import type { RecipeIngredient } from "@/types/recipe";

export function useAddToShoppingList(recipeId: string, ingredients: RecipeIngredient[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addFromRecipe = useAddFromRecipeMutation();
  const router = useRouter();

  function enterSelectionMode() {
    setSelected(new Set(ingredients.map((i) => i.id)));
    setSelectionMode(true);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
  }

  function toggleIngredient(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const selectedIngredients = ingredients
      .filter((i) => selected.has(i.id))
      .map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        notes: i.notes,
      }));

    addFromRecipe.mutate(
      { recipe_id: recipeId, ingredients: selectedIngredients },
      {
        onSuccess: (result) => {
          const parts = [];
          if (result.added > 0) parts.push(`${result.added} added`);
          if (result.merged > 0) parts.push(`${result.merged} merged`);

          toast.success(
            `${selectedIngredients.length} items added to shopping list`,
            {
              description: parts.length > 0 ? parts.join(", ") + " with existing items" : undefined,
              action: {
                label: "View list",
                onClick: () => router.push("/shopping-list"),
              },
            },
          );
          setSelectionMode(false);
        },
        onError: () => {
          toast.error("Failed to add items to shopping list");
        },
      },
    );
  }

  return {
    selectionMode,
    selected,
    selectedCount: selected.size,
    isLoading: addFromRecipe.isPending,
    enterSelectionMode,
    exitSelectionMode,
    toggleIngredient,
    handleAdd,
  };
}
```

The parent recipe detail component uses this hook like:

```tsx
const shoppingList = useAddToShoppingList(recipe.id, recipe.ingredients);

// In the ingredients header area:
{shoppingList.selectionMode ? (
  <div className="flex gap-2">
    <Button variant="ghost" size="sm" onClick={shoppingList.exitSelectionMode}>Cancel</Button>
    <Button size="sm" onClick={shoppingList.handleAdd} disabled={shoppingList.selectedCount === 0 || shoppingList.isLoading}>
      Add {shoppingList.selectedCount} items
    </Button>
  </div>
) : (
  <Button variant="outline" size="sm" onClick={shoppingList.enterSelectionMode}>
    <ShoppingCart className="h-4 w-4 mr-1" />
    Add to list
  </Button>
)}

// Per ingredient row (when in selection mode):
{shoppingList.selectionMode && (
  <Checkbox
    checked={shoppingList.selected.has(ingredient.id)}
    onCheckedChange={() => shoppingList.toggleIngredient(ingredient.id)}
  />
)}
```

Review the actual recipe detail component structure to determine the exact integration points.

- [ ] **Step 2: Integrate into recipe detail page**

Modify the recipe detail page/component to:
1. Import the `AddToShoppingList` component or hook
2. Add the "Add to list" button next to the ingredients section header
3. When in selection mode, render checkboxes alongside each ingredient
4. Show the "Add X items" / "Cancel" buttons

The exact implementation depends on the current structure of the recipe detail view. Read `src/components/recipes/recipe-detail-view.tsx` (or wherever ingredients are rendered) and integrate accordingly.

- [ ] **Step 3: Test manually**

Run: `pnpm dev`
1. Navigate to a recipe detail page
2. Click "Add to list"
3. Verify checkboxes appear on all ingredients, all pre-checked
4. Uncheck one ingredient
5. Click "Add X items"
6. Verify toast appears with count
7. Navigate to `/shopping-list` and verify items are there

- [ ] **Step 4: Commit**

```bash
git add src/components/recipes/add-to-shopping-list.tsx src/app/[locale]/recipes/[id]/page.tsx
# Also add any other modified files (e.g., recipe-detail-view.tsx)
git commit -m "feat: add ingredient selection and add-to-shopping-list on recipe page"
```

---

## Chunk 7: Translations and Final Polish

### Task 19: Add i18n Translations

**Files:**
- Modify: `src/messages/main-en.json`
- Modify: `src/messages/main-nl.json`

- [ ] **Step 1: Add English translations**

Add a `"shoppingList"` section to `src/messages/main-en.json`:

```json
{
  "shoppingList": {
    "title": "Shopping List",
    "navLabel": "Shopping List",
    "addPlaceholder": "Add an item... (e.g., 2 onions, 500g flour)",
    "emptyTitle": "Your shopping list is empty.",
    "emptyDescription": "Add items above or from any recipe page.",
    "done": "Done",
    "clearDone": "Clear done",
    "clearAll": "Clear all",
    "clearAllTitle": "Clear entire shopping list?",
    "clearAllDescription": "This will remove all items from your shopping list. This action cannot be undone.",
    "cancel": "Cancel",
    "addToList": "Add to list",
    "addItems": "Add {count} items",
    "itemsAdded": "{count} items added to shopping list",
    "itemsMerged": "{merged} merged with existing items",
    "addFailed": "Failed to add items to shopping list",
    "viewList": "View list"
  }
}
```

- [ ] **Step 2: Add Dutch translations**

Add corresponding `"shoppingList"` section to `src/messages/main-nl.json`:

```json
{
  "shoppingList": {
    "title": "Boodschappenlijst",
    "navLabel": "Boodschappen",
    "addPlaceholder": "Voeg een item toe... (bijv. 2 uien, 500g bloem)",
    "emptyTitle": "Je boodschappenlijst is leeg.",
    "emptyDescription": "Voeg items toe hierboven of vanuit een recept.",
    "done": "Klaar",
    "clearDone": "Verwijder afgevinkt",
    "clearAll": "Alles wissen",
    "clearAllTitle": "Hele boodschappenlijst wissen?",
    "clearAllDescription": "Dit verwijdert alle items van je boodschappenlijst. Deze actie kan niet ongedaan worden gemaakt.",
    "cancel": "Annuleren",
    "addToList": "Toevoegen aan lijst",
    "addItems": "{count} items toevoegen",
    "itemsAdded": "{count} items toegevoegd aan boodschappenlijst",
    "itemsMerged": "{merged} samengevoegd met bestaande items",
    "addFailed": "Kon items niet toevoegen aan boodschappenlijst",
    "viewList": "Bekijk lijst"
  }
}
```

- [ ] **Step 3: Update components to use translations**

Replace hardcoded strings in `shopping-list-page.tsx`, `add-item-bar.tsx`, `clear-actions.tsx`, and `add-to-shopping-list.tsx` with `useTranslations("shoppingList")` calls. Follow the existing pattern in the codebase (e.g., `const t = useTranslations("shoppingList");`).

- [ ] **Step 4: Commit**

```bash
git add src/messages/main-en.json src/messages/main-nl.json src/components/shopping-list/ src/components/recipes/add-to-shopping-list.tsx
git commit -m "feat: add i18n translations for shopping list (en + nl)"
```

### Task 20: Lint, Test, Type-check

- [ ] **Step 1: Run linter**

Run: `pnpm lint --fix`
Expected: No errors (or only auto-fixable ones)

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Run type check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run dev server and smoke test**

Run: `pnpm dev`
Test the full flow:
1. Navigate to `/shopping-list` — empty state shows
2. Type "2 onions" in add bar, click Add — item appears
3. Type "500g flour" — item appears
4. Drag to reorder — order persists on refresh
5. Check an item — moves to Done section
6. Click "Clear done" — checked items removed
7. Go to a recipe, click "Add to list", select ingredients, add — toast shows
8. Navigate to shopping list — recipe ingredients appear
9. Add same recipe again — amounts merge

- [ ] **Step 5: Fix any issues found during smoke testing**

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: address lint, type, and smoke test issues for shopping list"
```

### Task 21: Update ToDo.md

**Files:**
- Modify: `ToDo.md`

- [ ] **Step 1: Mark the grocery shopping list item as done**

Find the line `1. [ ] Groccery shopping list` under V2.0 feature requests and change to `1. [x] Groccery shopping list`

- [ ] **Step 2: Commit**

```bash
git add ToDo.md
git commit -m "docs: mark grocery shopping list as implemented in ToDo.md"
```
