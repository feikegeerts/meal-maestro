"use client";

import { useState } from "react";
import { useRouter } from "@/app/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAddFromRecipeMutation } from "@/lib/hooks/use-shopping-list-query";
import type { RecipeIngredient } from "@/types/recipe";

export function useAddToShoppingList(recipeId: string, ingredients: RecipeIngredient[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const addFromRecipe = useAddFromRecipeMutation();
  const router = useRouter();
  const t = useTranslations("shoppingList");

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
          if (result.merged > 0) parts.push(t("itemsMerged", { merged: result.merged }));

          toast.success(
            t("itemsAdded", { count: selectedIngredients.length }),
            {
              description: parts.length > 0 ? parts.join(", ") : undefined,
              action: {
                label: t("viewList"),
                onClick: () => router.push("/shopping-list"),
              },
            },
          );
          setSelectionMode(false);
        },
        onError: () => {
          toast.error(t("addFailed"));
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
