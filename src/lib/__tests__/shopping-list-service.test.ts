import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mutable state for per-test DB responses
// ---------------------------------------------------------------------------

let partnerUserIds: string[] = ["user-a"];

// ---------------------------------------------------------------------------
// Mock @/db — must be before all imports
// ---------------------------------------------------------------------------

vi.mock("@/db", () => {
  const selectFn = vi.fn();
  const insertFn = vi.fn();
  const updateFn = vi.fn();
  const deleteFn = vi.fn();
  const transactionFn = vi.fn();

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      delete: deleteFn,
      transaction: transactionFn,
    },
  };
});

vi.mock("@/lib/partnership-service", () => ({
  getPartnerUserIds: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import service under test (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  getShoppingList,
  addFreeformItem,
  setItemChecked,
  updateItem,
  deleteItem,
  reorderItems,
  clearChecked,
  clearAll,
  addFromRecipe,
  ShoppingListError,
} from "@/lib/shopping-list-service";
import { db } from "@/db";
import { getPartnerUserIds } from "@/lib/partnership-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<{
  id: string;
  userId: string;
  name: string;
  amount: string | null;
  unit: string | null;
  notes: string | null;
  recipeId: string | null;
  checked: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "item-1",
    userId: "user-a",
    name: "Flour",
    amount: "200.000",
    unit: "g",
    notes: null,
    recipeId: null,
    checked: false,
    sortOrder: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  partnerUserIds = ["user-a"];

  vi.clearAllMocks();
  (getPartnerUserIds as Mock).mockImplementation(async () => partnerUserIds);
});

// ---------------------------------------------------------------------------
// getShoppingList
// ---------------------------------------------------------------------------

describe("getShoppingList", () => {
  it("returns empty array when no items exist", async () => {
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await getShoppingList("user-a");
    expect(result).toEqual([]);
  });

  it("returns mapped snake_case items ordered by checked then sortOrder", async () => {
    const item = makeItem({ sortOrder: 0 });
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    const result = await getShoppingList("user-a");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Flour");
    expect(result[0].amount).toBe(200);
    expect(result[0].unit).toBe("g");
    expect(result[0].sort_order).toBe(0);
    expect(result[0].user_id).toBe("user-a");
  });

  it("converts decimal string amounts to numbers", async () => {
    const item = makeItem({ amount: "1.500" });
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    const result = await getShoppingList("user-a");
    expect(result[0].amount).toBe(1.5);
  });

  it("returns null for null amounts", async () => {
    const item = makeItem({ amount: null });
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    const result = await getShoppingList("user-a");
    expect(result[0].amount).toBeNull();
  });

  it("includes partner items when user has an accepted partnership", async () => {
    partnerUserIds = ["user-a", "user-b"];
    const itemA = makeItem({ id: "item-1", userId: "user-a" });
    const itemB = makeItem({ id: "item-2", userId: "user-b", name: "Sugar" });

    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([itemA, itemB]),
        }),
      }),
    });

    const result = await getShoppingList("user-a");
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// addFreeformItem
// ---------------------------------------------------------------------------

describe("addFreeformItem", () => {
  it("inserts a new item at end of unchecked section", async () => {
    const unchecked = [makeItem({ sortOrder: 2 })];
    const newItem = makeItem({ id: "item-new", sortOrder: 3 });

    let selectCall = 0;
    (db.select as Mock).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCall++;
          if (selectCall === 1) {
            // First select: unchecked items to find max sort order
            return Promise.resolve(unchecked.map((i) => ({ sortOrder: i.sortOrder })));
          }
          return Promise.resolve([newItem]);
        }),
      }),
    }));

    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newItem]),
      }),
    });

    const result = await addFreeformItem("user-a", "Sugar", 100, "g", null);
    expect(result.name).toBe("Flour"); // newItem fixture name
    expect(result.sort_order).toBe(3);
  });

  it("uses sortOrder 0 when no unchecked items exist", async () => {
    const newItem = makeItem({ sortOrder: 0, name: "Salt" });

    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newItem]),
      }),
    });

    const result = await addFreeformItem("user-a", "Salt");
    expect(result.sort_order).toBe(0);

    const valuesCall = (db.insert as Mock).mock.results[0].value.values.mock.calls[0][0];
    expect(valuesCall.sortOrder).toBe(0);
  });

  it("stores amount as string for the decimal column", async () => {
    const newItem = makeItem({ amount: "2.500", name: "Butter" });

    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newItem]),
      }),
    });

    await addFreeformItem("user-a", "Butter", 2.5, "kg");
    const valuesCall = (db.insert as Mock).mock.results[0].value.values.mock.calls[0][0];
    expect(valuesCall.amount).toBe("2.5");
  });
});

// ---------------------------------------------------------------------------
// setItemChecked
// ---------------------------------------------------------------------------

describe("setItemChecked", () => {
  it("throws NOT_FOUND when item does not exist", async () => {
    // verifyHouseholdAccess: single item lookup returns empty
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(setItemChecked("user-a", "nonexistent", true)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN when item belongs to a different user outside the household", async () => {
    partnerUserIds = ["user-a"]; // no partner
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makeItem({ userId: "user-x" })]),
        }),
      }),
    });

    await expect(setItemChecked("user-a", "item-1", true)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("updates the checked state and moves item to end of target section", async () => {
    const item = makeItem({ checked: false, sortOrder: 0 });
    const updatedItem = makeItem({ checked: true, sortOrder: 1 });

    let selectCall = 0;
    (db.select as Mock).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // verifyHouseholdAccess
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([item]),
            }),
          }),
        };
      }
      // householdCondition + find checked items in section
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ sortOrder: 0 }]),
        }),
      };
    });

    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedItem]),
        }),
      }),
    });

    const result = await setItemChecked("user-a", "item-1", true);
    expect(result.checked).toBe(true);

    const setCall = (db.update as Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.sortOrder).toBe(1); // max(0) + 1
  });
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

describe("updateItem", () => {
  it("throws NOT_FOUND when item does not exist", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(updateItem("user-a", "nonexistent", { name: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("updates name without touching amount when amount is not provided", async () => {
    const item = makeItem();
    const updated = makeItem({ name: "Bread Flour" });

    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const result = await updateItem("user-a", "item-1", { name: "Bread Flour" });
    expect(result.name).toBe("Bread Flour");

    const setCall = (db.update as Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setCall).not.toHaveProperty("amount");
  });

  it("converts amount to string when provided", async () => {
    const item = makeItem();
    const updated = makeItem({ amount: "350.000" });

    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    await updateItem("user-a", "item-1", { amount: 350 });
    const setCall = (db.update as Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.amount).toBe("350");
  });

  it("sets amount to null when explicitly passed as null", async () => {
    const item = makeItem();
    const updated = makeItem({ amount: null });

    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    await updateItem("user-a", "item-1", { amount: null });
    const setCall = (db.update as Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.amount).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

describe("deleteItem", () => {
  it("throws NOT_FOUND when item does not exist", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(deleteItem("user-a", "nonexistent")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN when item belongs outside the household", async () => {
    partnerUserIds = ["user-a"];
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makeItem({ userId: "user-x" })]),
        }),
      }),
    });

    await expect(deleteItem("user-a", "item-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("deletes the item when ownership is verified", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makeItem()]),
        }),
      }),
    });

    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    await expect(deleteItem("user-a", "item-1")).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// reorderItems
// ---------------------------------------------------------------------------

describe("reorderItems", () => {
  it("resolves immediately for an empty array", async () => {
    await expect(reorderItems("user-a", [])).resolves.toBeUndefined();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when an item in the list does not exist", async () => {
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "item-1", userId: "user-a" },
          // item-2 missing
        ]),
      }),
    });

    await expect(reorderItems("user-a", ["item-1", "item-2"])).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN when an item belongs outside the household", async () => {
    partnerUserIds = ["user-a"];
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "item-1", userId: "user-a" },
          { id: "item-2", userId: "user-x" },
        ]),
      }),
    });

    await expect(reorderItems("user-a", ["item-1", "item-2"])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("uses a transaction and assigns sequential sortOrders", async () => {
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "item-1", userId: "user-a" },
          { id: "item-2", userId: "user-a" },
        ]),
      }),
    });

    const setCalls: object[] = [];
    const txUpdateFn = vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((data: object) => {
        setCalls.push(data);
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    (db.transaction as Mock).mockImplementation(async (cb: (tx: { update: typeof txUpdateFn }) => Promise<void>) => {
      await cb({ update: txUpdateFn });
    });

    await reorderItems("user-a", ["item-1", "item-2"]);

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(txUpdateFn).toHaveBeenCalledTimes(2);
    expect(setCalls[0]).toMatchObject({ sortOrder: 0 });
    expect(setCalls[1]).toMatchObject({ sortOrder: 1 });
  });
});

// ---------------------------------------------------------------------------
// clearChecked
// ---------------------------------------------------------------------------

describe("clearChecked", () => {
  it("deletes only checked items for the household", async () => {
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 2 }),
    });

    await expect(clearChecked("user-a")).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe("clearAll", () => {
  it("deletes all items for the household", async () => {
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 5 }),
    });

    await expect(clearAll("user-a")).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// addFromRecipe
// ---------------------------------------------------------------------------

describe("addFromRecipe", () => {
  function setupAddFromRecipe({
    existingItems = [] as ReturnType<typeof makeItem>[],
    returnedItems = [] as ReturnType<typeof makeItem>[],
  } = {}) {
    let selectCall = 0;
    (db.select as Mock).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // householdCondition → existing unchecked items
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(existingItems),
          }),
        };
      }
      if (selectCall === 2) {
        // sortOrder lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(existingItems.map((i) => ({ sortOrder: i.sortOrder }))),
          }),
        };
      }
      // Final select: updated list after mutations
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(returnedItems),
          }),
        }),
      };
    });

    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
  }

  it("inserts new items that have no match in the existing list", async () => {
    setupAddFromRecipe({ returnedItems: [makeItem({ name: "Sugar" })] });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Sugar", amount: 100, unit: "g" },
    ]);

    expect(result.added).toBe(1);
    expect(result.merged).toBe(0);
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("merges amounts when an item with the same name and compatible unit exists", async () => {
    const existing = makeItem({ name: "Flour", amount: "200.000", unit: "g", sortOrder: 0 });
    setupAddFromRecipe({
      existingItems: [existing],
      returnedItems: [makeItem({ name: "Flour", amount: "300.000", unit: "g" })],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Flour", amount: 100, unit: "g" },
    ]);

    expect(result.merged).toBe(1);
    expect(result.added).toBe(0);
    expect(db.update).toHaveBeenCalledOnce();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("merges amounts when both units are null (unit-less ingredients)", async () => {
    const existing = makeItem({ name: "Egg", amount: "2.000", unit: null, sortOrder: 0 });
    setupAddFromRecipe({
      existingItems: [existing],
      returnedItems: [makeItem({ name: "Egg", amount: "4.000", unit: null })],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Egg", amount: 2, unit: null },
    ]);

    expect(result.merged).toBe(1);
    expect(result.added).toBe(0);

    const setCall = (db.update as Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setCall.amount).toBe("4"); // 2 + 2
    expect(setCall.unit).toBeNull();
  });

  it("skips ingredient when both existing and new have null amounts (already on list)", async () => {
    const existing = makeItem({ name: "Salt", amount: null, unit: null, sortOrder: 0 });
    setupAddFromRecipe({
      existingItems: [existing],
      returnedItems: [existing],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Salt", amount: null, unit: null },
    ]);

    expect(result.added).toBe(0);
    expect(result.merged).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("inserts as new when units are incompatible (e.g. g vs ml)", async () => {
    const existing = makeItem({ name: "Milk", amount: "200.000", unit: "ml", sortOrder: 0 });
    setupAddFromRecipe({
      existingItems: [existing],
      returnedItems: [
        existing,
        makeItem({ id: "item-2", name: "Milk", amount: "100.000", unit: "g" }),
      ],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Milk", amount: 100, unit: "g" },
    ]);

    expect(result.added).toBe(1);
    expect(result.merged).toBe(0);
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("inserts as new when existing item has amount but incoming has null amount", async () => {
    const existing = makeItem({ name: "Sugar", amount: "100.000", unit: "g", sortOrder: 0 });
    setupAddFromRecipe({
      existingItems: [existing],
      returnedItems: [existing, makeItem({ id: "item-2", name: "Sugar", amount: null, unit: null })],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Sugar", amount: null, unit: null },
    ]);

    expect(result.added).toBe(1);
    expect(result.merged).toBe(0);
  });

  it("handles case-insensitive name matching", async () => {
    const existing = makeItem({ name: "flour", amount: "200.000", unit: "g", sortOrder: 0 });
    setupAddFromRecipe({
      existingItems: [existing],
      returnedItems: [makeItem({ name: "flour", amount: "300.000", unit: "g" })],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "FLOUR", amount: 100, unit: "g" },
    ]);

    expect(result.merged).toBe(1);
    expect(result.added).toBe(0);
  });

  it("handles multiple ingredients in one call — mix of insert and merge", async () => {
    const existing = makeItem({ name: "Flour", amount: "200.000", unit: "g", sortOrder: 0 });
    const newSugar = makeItem({ id: "item-new", name: "Sugar", amount: "100.000", unit: "g", sortOrder: 1 });

    let selectCall = 0;
    (db.select as Mock).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([existing]) }) };
      }
      if (selectCall === 2) {
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ sortOrder: 0 }]) }) };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([existing, newSugar]),
          }),
        }),
      };
    });

    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });
    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Flour", amount: 100, unit: "g" },   // should merge
      { name: "Sugar", amount: 100, unit: "g" },   // should insert
    ]);

    expect(result.merged).toBe(1);
    expect(result.added).toBe(1);
    expect(result.items).toHaveLength(2);
  });

  it("returns the updated item list after mutations", async () => {
    const returnedItem = makeItem({ name: "Flour", amount: "300.000", unit: "g" });
    setupAddFromRecipe({
      existingItems: [makeItem()],
      returnedItems: [returnedItem],
    });

    const result = await addFromRecipe("user-a", "recipe-1", [
      { name: "Flour", amount: 100, unit: "g" },
    ]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Flour");
    expect(result.items[0].amount).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// ShoppingListError
// ---------------------------------------------------------------------------

describe("ShoppingListError", () => {
  it("has the correct name and code properties", () => {
    const err = new ShoppingListError("NOT_FOUND", "test");
    expect(err.name).toBe("ShoppingListError");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("test");
    expect(err instanceof Error).toBe(true);
  });

  it("supports FORBIDDEN code", () => {
    const err = new ShoppingListError("FORBIDDEN", "no access");
    expect(err.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// toSnakeCase coverage — null timestamps
// ---------------------------------------------------------------------------

describe("toSnakeCase edge cases", () => {
  it("handles null createdAt and updatedAt gracefully", async () => {
    const item = makeItem({ createdAt: undefined as unknown as Date, updatedAt: undefined as unknown as Date });
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([item]),
        }),
      }),
    });

    const result = await getShoppingList("user-a");
    expect(result[0].created_at).toBe("");
    expect(result[0].updated_at).toBe("");
  });
});
