import { db } from "@/db";
import { shoppingListItems } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getPartnerUserIds } from "@/lib/partnership-service";
import { areUnitsCompatible, mergeAmounts } from "@/lib/recipe-utils";
import type {
  ShoppingListItem,
  AddFromRecipeIngredient,
  AddFromRecipeResponse,
} from "@/lib/shopping-list-types";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Row → API shape mapper
// ---------------------------------------------------------------------------

type DbRow = typeof shoppingListItems.$inferSelect;

function toSnakeCase(row: DbRow): ShoppingListItem {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    amount: row.amount != null ? parseFloat(row.amount) : null,
    unit: row.unit,
    notes: row.notes,
    recipe_id: row.recipeId,
    checked: row.checked,
    sort_order: row.sortOrder,
    created_at: row.createdAt?.toISOString() ?? "",
    updated_at: row.updatedAt?.toISOString() ?? "",
  };
}

// ---------------------------------------------------------------------------
// Household access helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Drizzle WHERE condition scoping items to the household (user +
 * accepted partner if any).
 */
async function householdCondition(userId: string) {
  const userIds = await getPartnerUserIds(userId);
  return inArray(shoppingListItems.userId, userIds);
}

/**
 * Checks that itemId belongs to the household; throws ShoppingListError
 * if not found or not owned by the household.
 */
async function verifyHouseholdAccess(
  userId: string,
  itemId: string,
): Promise<DbRow> {
  const userIds = await getPartnerUserIds(userId);
  const [item] = await db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.id, itemId))
    .limit(1);

  if (!item) {
    throw new ShoppingListError("NOT_FOUND", "Shopping list item not found");
  }

  if (!userIds.includes(item.userId)) {
    throw new ShoppingListError(
      "FORBIDDEN",
      "You do not have access to this item",
    );
  }

  return item;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getShoppingList(userId: string): Promise<ShoppingListItem[]> {
  const condition = await householdCondition(userId);
  const rows = await db
    .select()
    .from(shoppingListItems)
    .where(condition)
    .orderBy(asc(shoppingListItems.checked), asc(shoppingListItems.sortOrder));

  return rows.map(toSnakeCase);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addFreeformItem(
  userId: string,
  name: string,
  amount?: number | null,
  unit?: string | null,
  notes?: string | null,
): Promise<ShoppingListItem> {
  const condition = await householdCondition(userId);

  // Find highest sortOrder among unchecked items to place new item at end
  const unchecked = await db
    .select({ sortOrder: shoppingListItems.sortOrder })
    .from(shoppingListItems)
    .where(and(condition, eq(shoppingListItems.checked, false)));

  const maxSort =
    unchecked.length > 0
      ? Math.max(...unchecked.map((r) => r.sortOrder))
      : -1;

  const [inserted] = await db
    .insert(shoppingListItems)
    .values({
      userId,
      name,
      amount: amount != null ? String(amount) : null,
      unit: unit ?? null,
      notes: notes ?? null,
      checked: false,
      sortOrder: maxSort + 1,
    })
    .returning();

  return toSnakeCase(inserted);
}

export async function setItemChecked(
  userId: string,
  itemId: string,
  checked: boolean,
): Promise<ShoppingListItem> {
  await verifyHouseholdAccess(userId, itemId);

  const condition = await householdCondition(userId);

  // Find highest sortOrder in the target section (checked or unchecked)
  const sectionItems = await db
    .select({ sortOrder: shoppingListItems.sortOrder })
    .from(shoppingListItems)
    .where(and(condition, eq(shoppingListItems.checked, checked)));

  const maxSort =
    sectionItems.length > 0
      ? Math.max(...sectionItems.map((r) => r.sortOrder))
      : -1;

  const [updated] = await db
    .update(shoppingListItems)
    .set({ checked, sortOrder: maxSort + 1 })
    .where(eq(shoppingListItems.id, itemId))
    .returning();

  return toSnakeCase(updated);
}

export async function updateItem(
  userId: string,
  itemId: string,
  updates: {
    name?: string;
    amount?: number | null;
    unit?: string | null;
    notes?: string | null;
    checked?: boolean;
  },
): Promise<ShoppingListItem> {
  await verifyHouseholdAccess(userId, itemId);

  const { amount, ...rest } = updates;

  const [updated] = await db
    .update(shoppingListItems)
    .set({
      ...rest,
      ...(amount !== undefined
        ? { amount: amount != null ? String(amount) : null }
        : {}),
    })
    .where(eq(shoppingListItems.id, itemId))
    .returning();

  return toSnakeCase(updated);
}

export async function deleteItem(
  userId: string,
  itemId: string,
): Promise<void> {
  await verifyHouseholdAccess(userId, itemId);
  await db
    .delete(shoppingListItems)
    .where(eq(shoppingListItems.id, itemId));
}

export async function reorderItems(
  userId: string,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;

  // Verify all items belong to household before mutating
  const userIds = await getPartnerUserIds(userId);
  const existing = await db
    .select({ id: shoppingListItems.id, userId: shoppingListItems.userId })
    .from(shoppingListItems)
    .where(inArray(shoppingListItems.id, itemIds));

  for (const id of itemIds) {
    const row = existing.find((r) => r.id === id);
    if (!row) {
      throw new ShoppingListError("NOT_FOUND", `Item ${id} not found`);
    }
    if (!userIds.includes(row.userId)) {
      throw new ShoppingListError("FORBIDDEN", `Item ${id} is not in your household`);
    }
  }

  // Neon HTTP driver does not support transactions — use individual updates.
  // Partial failure is benign: a subsequent reorder corrects sort orders.
  for (let i = 0; i < itemIds.length; i++) {
    await db
      .update(shoppingListItems)
      .set({ sortOrder: i })
      .where(eq(shoppingListItems.id, itemIds[i]));
  }
}

export async function clearChecked(userId: string): Promise<void> {
  const condition = await householdCondition(userId);
  await db
    .delete(shoppingListItems)
    .where(and(condition, eq(shoppingListItems.checked, true)));
}

export async function clearAll(userId: string): Promise<void> {
  const condition = await householdCondition(userId);
  await db.delete(shoppingListItems).where(condition);
}

// ---------------------------------------------------------------------------
// Task 6: addFromRecipe — merge logic
// ---------------------------------------------------------------------------

export async function addFromRecipe(
  userId: string,
  recipeId: string,
  ingredients: AddFromRecipeIngredient[],
): Promise<AddFromRecipeResponse> {
  const condition = await householdCondition(userId);

  // Fetch existing unchecked items for the household
  const existingRows = await db
    .select()
    .from(shoppingListItems)
    .where(and(condition, eq(shoppingListItems.checked, false)));

  const existing = existingRows.map(toSnakeCase);

  // Determine the starting sortOrder for any new items
  const allRows = await db
    .select({ sortOrder: shoppingListItems.sortOrder })
    .from(shoppingListItems)
    .where(and(condition, eq(shoppingListItems.checked, false)));

  let nextSort =
    allRows.length > 0 ? Math.max(...allRows.map((r) => r.sortOrder)) + 1 : 0;

  let added = 0;
  let merged = 0;

  for (const ingredient of ingredients) {
    const nameLower = ingredient.name.toLowerCase();

    // Case-insensitive name match
    const match = existing.find((item) => item.name.toLowerCase() === nameLower);

    if (match) {
      // Both have null amounts — already on list, skip
      if (match.amount === null && ingredient.amount === null) {
        continue;
      }

      // Both have amounts and compatible units — merge
      if (
        match.amount !== null &&
        ingredient.amount !== null &&
        areUnitsCompatible(match.unit, ingredient.unit)
      ) {
        let mergedAmount: number;
        let mergedUnit: string | null;

        if (match.unit === null && ingredient.unit === null) {
          // Both null units, just sum amounts
          mergedAmount = match.amount + ingredient.amount;
          mergedUnit = null;
        } else {
          // areUnitsCompatible guarantees neither is null here if one is non-null
          const result = mergeAmounts(
            match.amount,
            match.unit!,
            ingredient.amount,
            ingredient.unit!,
          );
          mergedAmount = result.amount;
          mergedUnit = result.unit;
        }

        await db
          .update(shoppingListItems)
          .set({
            amount: String(mergedAmount),
            unit: mergedUnit,
          })
          .where(eq(shoppingListItems.id, match.id));

        // Update local cache so subsequent ingredients see the merged state
        match.amount = mergedAmount;
        match.unit = mergedUnit;

        merged++;
        continue;
      }
    }

    // No match or incompatible — insert as new item
    await db.insert(shoppingListItems).values({
      userId,
      name: ingredient.name,
      amount: ingredient.amount != null ? String(ingredient.amount) : null,
      unit: ingredient.unit ?? null,
      notes: ingredient.notes ?? null,
      recipeId,
      checked: false,
      sortOrder: nextSort++,
    });

    added++;
  }

  // Return the updated full list of unchecked items
  const updatedCondition = await householdCondition(userId);
  const updatedRows = await db
    .select()
    .from(shoppingListItems)
    .where(and(updatedCondition, eq(shoppingListItems.checked, false)))
    .orderBy(asc(shoppingListItems.sortOrder));

  return {
    added,
    merged,
    items: updatedRows.map(toSnakeCase),
  };
}
