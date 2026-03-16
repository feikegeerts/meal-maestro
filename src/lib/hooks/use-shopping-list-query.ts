"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { shoppingListClientService } from "@/lib/shopping-list-client-service";
import type {
  ShoppingListItem,
  AddFreeformItemRequest,
  AddFromRecipeRequest,
  UpdateItemRequest,
  ReorderItemsRequest,
} from "@/lib/shopping-list-types";

export const SHOPPING_LIST_KEY = ["shopping-list"] as const;

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export function useShoppingListQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: SHOPPING_LIST_KEY,
    queryFn: () => shoppingListClientService.getList(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

/**
 * Returns the count of unchecked items from the shopping list cache.
 * Uses useQuery with select to stay reactive (re-renders when cache updates)
 * but does not trigger a fetch if the cache is empty (enabled gated on auth).
 */
export function useShoppingListCount(): number | undefined {
  const { user } = useAuth();
  const { data: count } = useQuery({
    queryKey: SHOPPING_LIST_KEY,
    queryFn: () => shoppingListClientService.getList(),
    enabled: !!user,
    staleTime: 60_000,
    select: (items) => items.filter((item) => !item.checked).length,
    // Don't refetch just for the badge — piggyback on the main query's cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  return count;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useAddFreeformItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddFreeformItemRequest) =>
      shoppingListClientService.addFreeformItem(data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);

      // Optimistically append a placeholder item at the end of the unchecked items
      const optimisticItem: ShoppingListItem = {
        id: `optimistic-${Date.now()}`,
        user_id: "",
        name: vars.name,
        amount: vars.amount ?? null,
        unit: vars.unit ?? null,
        notes: vars.notes ?? null,
        recipe_id: null,
        checked: false,
        sort_order: (previous?.length ?? 0) + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ShoppingListItem[]>(
        SHOPPING_LIST_KEY,
        (old) => [...(old ?? []), optimisticItem],
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
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
  return useMutation({
    mutationFn: (data: AddFromRecipeRequest) =>
      shoppingListClientService.addFromRecipe(data),
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

      queryClient.setQueryData<ShoppingListItem[]>(
        SHOPPING_LIST_KEY,
        (old) =>
          old?.map((item) =>
            item.id === itemId ? { ...item, checked } : item,
          ),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
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
    mutationFn: (data: ReorderItemsRequest) =>
      shoppingListClientService.reorderItems(data),
    onMutate: async ({ item_ids }) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);

      queryClient.setQueryData<ShoppingListItem[]>(
        SHOPPING_LIST_KEY,
        (old) => {
          if (!old) return old;
          const itemMap = new Map(old.map((item) => [item.id, item]));
          const reordered = item_ids
            .map((id, index) => {
              const item = itemMap.get(id);
              return item ? { ...item, sort_order: index } : null;
            })
            .filter((item): item is ShoppingListItem => item !== null);
          // Append any items not included in the reorder (keep their order)
          const reorderedIds = new Set(item_ids);
          const remaining = old.filter((item) => !reorderedIds.has(item.id));
          return [...reordered, ...remaining];
        },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
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
    mutationFn: ({ id, ...data }: { id: string } & UpdateItemRequest) =>
      shoppingListClientService.updateItem(id, data),
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);

      queryClient.setQueryData<ShoppingListItem[]>(
        SHOPPING_LIST_KEY,
        (old) =>
          old?.map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
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
    mutationFn: (id: string) => shoppingListClientService.deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: SHOPPING_LIST_KEY });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(SHOPPING_LIST_KEY);

      queryClient.setQueryData<ShoppingListItem[]>(
        SHOPPING_LIST_KEY,
        (old) => old?.filter((item) => item.id !== id),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
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

      queryClient.setQueryData<ShoppingListItem[]>(
        SHOPPING_LIST_KEY,
        (old) => old?.filter((item) => !item.checked),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
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
      if (context?.previous !== undefined) {
        queryClient.setQueryData(SHOPPING_LIST_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_LIST_KEY });
    },
  });
}
