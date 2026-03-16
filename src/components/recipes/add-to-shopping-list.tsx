"use client";

import { useState } from "react";
import { useRouter } from "@/app/i18n/routing";
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
