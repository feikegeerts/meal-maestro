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
| `amount`    | numeric   | nullable                                         |
| `unit`      | text      | nullable                                         |
| `recipeId`  | uuid      | FK → `recipes(id)` ON DELETE SET NULL, nullable   |
| `checked`   | boolean   | default `false`                                  |
| `sortOrder` | integer   | NOT NULL                                         |
| `createdAt` | timestamp | default `now()`                                  |
| `updatedAt` | timestamp | default `now()`                                  |

**Index:** Composite on `(userId, checked, sortOrder)` — covers the primary query pattern.

### Design decisions

- **`userId`** is the item owner. Partner access is resolved at query time using `getPartnerUserIds()` — no row duplication.
- **`recipeId`** is nullable (`null` = freeform item). `ON DELETE SET NULL` means deleting a recipe does not remove the shopping list item.
- **`sortOrder`** is an integer for drag-and-drop ordering. Reordering updates sort orders in a batch.
- **No parent `shopping_lists` table** — since there is only one active list per user/household, the items table *is* the list. A parent table can be introduced later if multiple/named lists are needed.
- Checked items keep their `sortOrder` within the done section so they don't jumble when unchecked.

## Merge Logic

When a user adds ingredients from a recipe to the shopping list:

1. Fetch all **unchecked** items for the user's household (via `getPartnerUserIds()`)
2. For each ingredient from the recipe:
   - **Name match:** case-insensitive, trimmed. "Onion" matches "onion".
   - **Unit compatibility check:** Can the units be combined? "g" + "kg" → yes (convert via existing `recipe-utils.ts` utilities). "cloves" + "g" → no.
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

## Service Layer

**File:** `src/lib/shopping-list-service.ts`

| Function                                      | Description                                                                                 |
|-----------------------------------------------|---------------------------------------------------------------------------------------------|
| `getShoppingList(userId)`                     | Fetch all items for household, ordered: unchecked by sortOrder, then checked by sortOrder   |
| `addFromRecipe(userId, recipeId, ingredients)` | Merge logic as described above. Accepts scaled ingredients as displayed on screen            |
| `addFreeformItem(userId, name, amount?, unit?)` | Add a manual item, sortOrder at end of unchecked items                                     |
| `toggleItem(userId, itemId)`                  | Toggle checked state. Checking → move sortOrder to end of checked section. Unchecking → end of unchecked section |
| `reorderItems(userId, itemIds)`               | Batch update sortOrder based on new array order. Operates within unchecked or checked section |
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

- **Navigation:** New link in main nav between Recipes and Account. Shows a badge with the unchecked item count (sourced from TanStack Query cache).
- **Header:** "Shopping List" title + "Clear done" and "Clear all" action buttons. "Clear all" requires a confirmation dialog.
- **Freeform add bar:** A text input where users type naturally (e.g., "2 onions", "500g flour"). The existing ingredient parsing logic in `recipe-utils.ts` extracts amount/unit from the string. Plus an "Add" button.
- **Unchecked items section:** Drag-and-drop reorderable list. Each item shows: checkbox, amount+unit (highlighted), name, and a drag handle. Tapping an item could expand it for inline editing. Reuses existing drag-and-drop components from the ingredient input.
- **Done section:** Collapsible, with a "Done (N)" header. Checked items shown with strikethrough at lower opacity. Items can be unchecked to move them back to the active section.

### Mobile

The layout is naturally single-column and works as-is. Drag-and-drop on mobile uses touch-hold + drag (same interaction as existing ingredient reordering).

## Partner Sharing

If the user has an accepted partnership, the shopping list is **automatically shared**. Both partners can add, check off, reorder, and clear items on the same list.

Implementation: All service functions use `getPartnerUserIds(userId)` to resolve the household's user IDs, then query/mutate items owned by any of those users. This is the same pattern used by recipe endpoints via `recipeAccessCondition()`.

No opt-in UI is needed — sharing follows the existing partnership relationship.

## Components to Reuse

- **Drag-and-drop:** Existing ingredient drag-and-drop components (desktop + mobile variants)
- **Ingredient parsing:** `recipe-utils.ts` parsing logic for extracting amount/unit from natural language input
- **Unit conversion:** Existing unit conversion utilities for merge logic
- **Toast notifications:** Existing toast/notification system
- **Partnership access:** `getPartnerUserIds()` from `partnership-service.ts`

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
| `src/components/navigation/main-nav.tsx` | Add Shopping List nav link with badge |
| `src/app/[locale]/recipes/[id]/page.tsx` | Integrate "Add to list" button + selection mode |
| `src/messages/*.json` | Add translations for shopping list UI strings |
