# Shopping List Feature — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Author:** Claudia + Feike

## Overview

A hybrid shopping list feature for Meal Maestro that lets users add recipe ingredients to a shopping list (with smart merging) and also add freeform items. The list is automatically shared with the user's partner if a partnership exists.

## Goals

- Let users build a shopping list directly from recipes they want to cook
- Intelligently merge duplicate ingredients across multiple recipes
- Support freeform items for non-recipe purchases
- Automatically share the list with the user's partner
- Provide a smooth mobile-first shopping experience with drag-and-drop reordering

## Non-Goals (for this version)

- External app integrations (Google Keep, AH, Bring!, Todoist, etc.)
- Category/aisle grouping
- Meal planning or bulk recipe selection
- AI-powered ingredient matching
- Multiple or named shopping lists
- Shopping list history/archiving

## Data Model

### Table: `shopping_list_items`

| Column      | Type      | Constraints                                      |
|-------------|-----------|--------------------------------------------------|
| `id`        | uuid      | PK, default `gen_random_uuid()`                  |
| `userId`    | uuid      | FK → `users(id)`, NOT NULL                       |
| `name`      | text      | NOT NULL                                         |
| `amount`    | numeric(8,3) | nullable                                      |
| `unit`      | text      | nullable                                         |
| `notes`     | text      | nullable                                         |
| `recipeId`  | uuid      | FK → `recipes(id)` ON DELETE SET NULL, nullable   |
| `checked`   | boolean   | default `false`                                  |
| `sortOrder` | integer   | NOT NULL                                         |
| `createdAt` | timestamp | default `now()`                                  |
| `updatedAt` | timestamp | default `now()`, `$onUpdate(() => new Date())`   |

**Index:** Composite on `(userId, checked, sortOrder)` — covers the primary query pattern.

### Design decisions

- **`userId`** is the item owner. Partner access is resolved at query time using `getPartnerUserIds()` — no row duplication.
- **`recipeId`** is nullable (`null` = freeform item). `ON DELETE SET NULL` means deleting a recipe does not remove the shopping list item. **Known limitation:** if a partnership is dissolved and recipes become inaccessible, `recipeId` may point to an inaccessible recipe. This is acceptable because shopping list items are ephemeral — the `recipeId` is informational only and the item remains usable without it.
- **`notes`** preserves recipe ingredient notes (e.g., "boneless, skinless", "finely diced") which can carry important shopping context.
- **`sortOrder`** is an integer for drag-and-drop ordering. Reordering updates sort orders in a batch.
- **No parent `shopping_lists` table** — since there is only one active list per user/household, the items table *is* the list. A parent table can be introduced later if multiple/named lists are needed.
- Checked items keep their `sortOrder` within the done section so they don't jumble when unchecked.

## Merge Logic

When a user adds ingredients from a recipe to the shopping list:

1. Fetch all **unchecked** items for the user's household (via `getPartnerUserIds()`)
2. For each ingredient from the recipe:
   - **Name match:** case-insensitive, trimmed. "Onion" matches "onion".
   - **Unit compatibility check:** Can the units be combined? "g" + "kg" → yes (convert). "cloves" + "g" → no. Requires new utility functions (see "New Utilities" section below).
   - **Match + compatible units:** Update existing item's amount (converted to the larger unit where sensible).
   - **Match + incompatible units:** Add as a new item.
   - **No match:** Insert new item with `sortOrder` at the end of unchecked items.
3. Set `recipeId` on newly added items. Merged items keep the `recipeId` of the first recipe that added them.

### What merge does NOT do

- **No fuzzy matching:** "tomatoes" vs "cherry tomatoes" vs "tinned tomatoes" are treated as different items. Exact name match only (after normalisation).
- **No AI categorisation:** Keeps it fast and free.
- **No scaling:** If the recipe serves 4 and the user wants to cook for 2, they should scale the recipe before adding. The list receives whatever amounts are currently displayed.

### Edge cases

- **Same recipe added twice:** Merges/doubles the amounts (intentional — cooking it twice).
- **Sectioned ingredients:** Flatten all sections, merge each ingredient the same way.
- **Ingredients with no amount** (e.g., "salt to taste"): Added as-is, no merge on these.

## New Utilities Required

### Unit compatibility and conversion (`src/lib/recipe-utils.ts`)

The existing `smartWeightConversion` and `smartVolumeConversion` functions handle single-unit conversions but there is no general-purpose compatibility check or cross-unit merging function. The following new functions are needed:

- **`areUnitsCompatible(unitA: string, unitB: string): boolean`** — Returns true if both units belong to the same family. Unit families:
  - Weight metric: g, kg
  - Weight imperial: oz, lb
  - Volume metric: ml, l
  - Volume imperial: tsp, tbsp, cup, fl oz
  - Count: pieces, cloves, slices, etc. (only compatible with exact same unit)
- **`mergeAmounts(amountA: number, unitA: string, amountB: number, unitB: string): { amount: number; unit: string }`** — Converts both amounts to the same unit (preferring the larger unit for readability, e.g., 1500g → 1.5kg) and returns the sum.

### Ingredient string parser (`src/lib/recipe-utils.ts`)

There is no existing natural language ingredient parser in the codebase. A new function is needed for the freeform add bar:

- **`parseIngredientString(input: string): { amount: number | null; unit: string | null; name: string }`** — Parses strings like "2 onions", "500g flour", "1.5 tbsp olive oil" into structured data. The parser should handle:
  - Leading numbers (integer, decimal, fraction): "2", "0.5", "1/2"
  - Optional unit immediately after or separated by space: "500g", "2 tbsp"
  - Remainder as name
  - No amount: "salt" → `{ amount: null, unit: null, name: "salt" }`

## Authorisation

All item-level mutations (`updateItem`, `deleteItem`, `toggleItem`) verify that `item.userId` is in the set returned by `getPartnerUserIds(callerUserId)` before proceeding. This ensures users can only mutate items belonging to their household.

Zod validation schemas are required for all API request bodies, particularly:
- `AddFromRecipeSchema` — validates `recipeId` (uuid) and `ingredients` array
- `AddFreeformItemSchema` — validates `name` (non-empty string), optional `amount` and `unit`
- `UpdateItemSchema` — validates partial updates to name/amount/unit/checked
- `ReorderItemsSchema` — validates array of item IDs

## Service Layer

**File:** `src/lib/shopping-list-service.ts`

| Function                                      | Description                                                                                 |
|-----------------------------------------------|---------------------------------------------------------------------------------------------|
| `getShoppingList(userId)`                     | Fetch all items for household, ordered: unchecked by sortOrder, then checked by sortOrder   |
| `addFromRecipe(userId, recipeId, ingredients)` | Merge logic as described above. Accepts scaled ingredients as displayed on screen            |
| `addFreeformItem(userId, name, amount?, unit?)` | Add a manual item, sortOrder at end of unchecked items                                     |
| `toggleItem(userId, itemId)`                  | Toggle checked state. Checking → move sortOrder to end of checked section. Unchecking → end of unchecked section |
| `reorderItems(userId, itemIds)`               | Client sends the complete ordered list of item IDs for the relevant section (unchecked or checked). Server assigns `sortOrder` values sequentially based on array position. Items not in the list retain their existing `sortOrder`. |
| `updateItem(userId, itemId, updates)`         | Edit name/amount/unit of an existing item                                                   |
| `deleteItem(userId, itemId)`                  | Remove a single item                                                                        |
| `clearChecked(userId)`                        | Delete all checked items for household                                                      |
| `clearAll(userId)`                            | Delete all items for household                                                              |

All functions resolve partner access via `getPartnerUserIds(userId)`.

## API Routes

| Method | Route                          | Maps to          |
|--------|--------------------------------|-------------------|
| GET    | `/api/shopping-list`           | `getShoppingList`  |
| POST   | `/api/shopping-list`           | `addFreeformItem`  |
| POST   | `/api/shopping-list/from-recipe` | `addFromRecipe`  |
| PATCH  | `/api/shopping-list/[id]`      | `updateItem` / `toggleItem` |
| DELETE | `/api/shopping-list/[id]`      | `deleteItem`       |
| PATCH  | `/api/shopping-list/reorder`   | `reorderItems`     |
| DELETE | `/api/shopping-list/clear`     | `clearChecked` (`?all=true` for `clearAll`) |

All routes use `requireAuth()` from `src/lib/auth-server.ts`. Responses use snake_case (standard API convention).

## TanStack Query Integration

**File:** `src/lib/hooks/use-shopping-list-query.ts`

**Query key:** `['shopping-list']`

| Hook                            | Type     | Behaviour                                            |
|---------------------------------|----------|------------------------------------------------------|
| `useShoppingListQuery()`        | Query    | Fetch list                                           |
| `useAddFromRecipeMutation()`    | Mutation | Optimistic append, refetch for server-merged result  |
| `useAddFreeformItemMutation()`  | Mutation | Optimistic append                                    |
| `useToggleItemMutation()`       | Mutation | Optimistic toggle + move between sections            |
| `useReorderItemsMutation()`     | Mutation | Optimistic reorder                                   |
| `useUpdateItemMutation()`       | Mutation | Optimistic update                                    |
| `useDeleteItemMutation()`       | Mutation | Optimistic remove                                    |
| `useClearCheckedMutation()`     | Mutation | Optimistic remove checked items                      |
| `useClearAllMutation()`         | Mutation | Optimistic remove all items                          |

All mutations use optimistic updates for snappy UI, with rollback on error.

## UI Design

### Recipe Detail Page — "Add to Shopping List" Flow

1. **Default state:** An "Add to list" button (with cart icon) sits next to the Ingredients section header.
2. **Selection mode:** Tapping the button reveals checkboxes on each ingredient (all pre-checked by default). A "Cancel" button and an "Add X items" button (with dynamic count) replace the original button.
3. **Confirmation:** After adding, a toast notification appears: "5 items added to shopping list" with a secondary line "2 merged with existing items" if merging occurred, and a "View list →" link. The user stays on the recipe page.

### Shopping List Page (`/shopping-list`)

- **Navigation:** New link in main nav between Recipes and Account. Shows a badge with the unchecked item count. The badge only renders after the shopping list query has been fetched at least once in the session (no separate count endpoint needed — the full list query is lightweight).
- **Header:** "Shopping List" title + "Clear done" and "Clear all" action buttons. "Clear all" requires a confirmation dialog.
- **Freeform add bar:** A text input where users type naturally (e.g., "2 onions", "500g flour"). The new `parseIngredientString()` function (see "New Utilities" section) extracts amount/unit from the string. Plus an "Add" button.
- **Unchecked items section:** Drag-and-drop reorderable list. Each item shows: checkbox, amount+unit (highlighted), name, and a drag handle. Tapping an item could expand it for inline editing. Reuses existing drag-and-drop components from the ingredient input.
- **Done section:** Collapsible, with a "Done (N)" header. Checked items shown with strikethrough at lower opacity. Items can be unchecked to move them back to the active section.

### Mobile

The layout is naturally single-column and works as-is. Drag-and-drop on mobile uses touch-hold + drag (same interaction as existing ingredient reordering).

## Partner Sharing

If the user has an accepted partnership, the shopping list is **automatically shared**. Both partners can add, check off, reorder, and clear items on the same list.

Implementation: All service functions use `getPartnerUserIds(userId)` to resolve the household's user IDs, then query/mutate items owned by any of those users. This is the same pattern used by recipe endpoints via `recipeAccessCondition()`.

No opt-in UI is needed — sharing follows the existing partnership relationship.

## Components and Libraries to Reuse

- **Drag-and-drop libraries:** `@dnd-kit/core` and `@dnd-kit/sortable` (already installed). Note: the existing `use-drag-and-drop.ts` hook is tightly coupled to recipe ingredient editing (local form state). A new `useShoppingListDragAndDrop` hook is needed that works with server state via TanStack Query mutations.
- **Unit conversion utilities:** `smartWeightConversion` / `smartVolumeConversion` in `recipe-utils.ts` as building blocks for the new merge functions.
- **Toast notifications:** Existing toast/notification system.
- **Partnership access:** `getPartnerUserIds()` from `partnership-service.ts`.

## Files to Create or Modify

### New files

| File | Purpose |
|------|---------|
| `src/db/schema.ts` (modify) | Add `shoppingListItems` table definition |
| `drizzle/XXXX_shopping_list.sql` | Migration (via `drizzle-kit generate`) |
| `src/lib/shopping-list-service.ts` | Service layer with all business logic |
| `src/lib/shopping-list-types.ts` | TypeScript types and response DTOs |
| `src/lib/hooks/use-shopping-list-query.ts` | TanStack Query hooks |
| `src/app/api/shopping-list/route.ts` | GET + POST (list / add freeform) |
| `src/app/api/shopping-list/from-recipe/route.ts` | POST (add from recipe) |
| `src/app/api/shopping-list/[id]/route.ts` | PATCH + DELETE (update / delete item) |
| `src/app/api/shopping-list/reorder/route.ts` | PATCH (reorder items) |
| `src/app/api/shopping-list/clear/route.ts` | DELETE (clear checked / all) |
| `src/components/shopping-list/shopping-list-page.tsx` | Main page component |
| `src/components/shopping-list/shopping-list-item.tsx` | Individual item component |
| `src/components/shopping-list/add-item-bar.tsx` | Freeform add input |
| `src/components/shopping-list/clear-actions.tsx` | Clear done / clear all buttons |
| `src/components/recipes/add-to-shopping-list.tsx` | Selection mode component for recipe page |
| `src/app/[locale]/shopping-list/page.tsx` | Route page |

### Modified files

| File | Change |
|------|--------|
| `src/lib/recipe-utils.ts` | Add `areUnitsCompatible()`, `mergeAmounts()`, `parseIngredientString()` |
| `src/components/navigation/main-nav.tsx` | Add Shopping List nav link with badge |
| `src/app/[locale]/recipes/[id]/page.tsx` | Integrate "Add to list" button + selection mode |
| `src/messages/main-en.json`, `src/messages/main-nl.json` (etc.) | Add shopping list translation strings to existing namespace files |
