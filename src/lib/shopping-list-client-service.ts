import { authenticatedFetch } from "@/lib/recipe-service";
import type {
  ShoppingListItem,
  AddFreeformItemRequest,
  AddFromRecipeRequest,
  AddFromRecipeResponse,
  UpdateItemRequest,
  ReorderItemsRequest,
} from "@/lib/shopping-list-types";

export const shoppingListClientService = {
  async getList(): Promise<ShoppingListItem[]> {
    const response = await authenticatedFetch("/api/shopping-list");
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch shopping list");
    }
    return response.json();
  },

  async addFreeformItem(data: AddFreeformItemRequest): Promise<ShoppingListItem> {
    const response = await authenticatedFetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || "Failed to add item");
    }
    return json;
  },

  async addFromRecipe(data: AddFromRecipeRequest): Promise<AddFromRecipeResponse> {
    const response = await authenticatedFetch("/api/shopping-list/from-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || "Failed to add items from recipe");
    }
    return json;
  },

  async updateItem(id: string, data: UpdateItemRequest): Promise<ShoppingListItem> {
    const response = await authenticatedFetch(`/api/shopping-list/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || "Failed to update item");
    }
    return json;
  },

  async setItemChecked(id: string, checked: boolean): Promise<ShoppingListItem> {
    return shoppingListClientService.updateItem(id, { checked });
  },

  async deleteItem(id: string): Promise<void> {
    const response = await authenticatedFetch(`/api/shopping-list/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete item");
    }
  },

  async reorderItems(data: ReorderItemsRequest): Promise<ShoppingListItem[]> {
    const response = await authenticatedFetch("/api/shopping-list/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || "Failed to reorder items");
    }
    return json;
  },

  async clearChecked(): Promise<void> {
    const response = await authenticatedFetch("/api/shopping-list/clear", {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to clear checked items");
    }
  },

  async clearAll(): Promise<void> {
    const response = await authenticatedFetch("/api/shopping-list/clear?all=true", {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to clear all items");
    }
  },
};
