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
