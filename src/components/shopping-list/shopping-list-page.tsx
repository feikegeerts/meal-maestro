"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { toast } from "sonner";

import { ShoppingListItemRow } from "@/components/shopping-list/shopping-list-item";
import { AddItemBar } from "@/components/shopping-list/add-item-bar";
import { ClearActions } from "@/components/shopping-list/clear-actions";
import {
  useShoppingListQuery,
  useAddFreeformItemMutation,
  useToggleItemMutation,
  useDeleteItemMutation,
  useReorderItemsMutation,
  useClearCheckedMutation,
  useClearAllMutation,
} from "@/lib/hooks/use-shopping-list-query";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function ShoppingListPage() {
  const { data: items = [], isLoading } = useShoppingListQuery();
  const addItem = useAddFreeformItemMutation();
  const toggleItem = useToggleItemMutation();
  const deleteItem = useDeleteItemMutation();
  const reorderItems = useReorderItemsMutation();
  const clearChecked = useClearCheckedMutation();
  const clearAll = useClearAllMutation();

  const t = useTranslations("shoppingList");
  const [checkedSectionOpen, setCheckedSectionOpen] = useState(true);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { uncheckedItems, checkedItems } = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    return {
      uncheckedItems: sorted.filter((item) => !item.checked),
      checkedItems: sorted.filter((item) => item.checked),
    };
  }, [items]);

  const uncheckedIds = useMemo(
    () => uncheckedItems.map((item) => item.id),
    [uncheckedItems]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = uncheckedItems.findIndex((item) => item.id === active.id);
    const newIndex = uncheckedItems.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(uncheckedItems, oldIndex, newIndex);
    const newIds = [
      ...reordered.map((item) => item.id),
      ...checkedItems.map((item) => item.id),
    ];

    reorderItems.mutate(
      { item_ids: newIds },
      {
        onError: () => toast.error("Failed to reorder items"),
      }
    );
  };

  const handleAdd = (parsed: {
    name: string;
    amount: number | null;
    unit: string | null;
  }) => {
    addItem.mutate(
      { name: parsed.name, amount: parsed.amount, unit: parsed.unit },
      {
        onError: () => toast.error("Failed to add item"),
      }
    );
  };

  const handleToggle = (id: string, checked: boolean) => {
    toggleItem.mutate(
      { itemId: id, checked },
      {
        onError: () => toast.error("Failed to update item"),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id, {
      onError: () => toast.error("Failed to delete item"),
    });
  };

  const handleClearChecked = () => {
    clearChecked.mutate(undefined, {
      onError: () => toast.error("Failed to clear done items"),
    });
  };

  const handleClearAll = () => {
    clearAll.mutate(undefined, {
      onError: () => toast.error("Failed to clear list"),
    });
  };

  // Reorder excluded — it's optimistic and shouldn't disable the UI
  const isMutating =
    addItem.isPending ||
    toggleItem.isPending ||
    deleteItem.isPending ||
    clearChecked.isPending ||
    clearAll.isPending;

  const hasItems = items.length > 0;
  const hasChecked = checkedItems.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        </div>
        <ClearActions
          hasChecked={hasChecked}
          hasItems={hasItems}
          onClearChecked={handleClearChecked}
          onClearAll={handleClearAll}
          disabled={isMutating}
        />
      </div>

      {/* Add item bar */}
      <div className="mb-6">
        <AddItemBar onAdd={handleAdd} disabled={isMutating} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasItems && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">{t("emptyTitle")}</p>
          <p className="text-sm mt-1">
            {t("emptyDescription")}
          </p>
        </div>
      )}

      {/* Unchecked items — sortable */}
      {!isLoading && uncheckedItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={uncheckedIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {uncheckedItems.map((item) => (
                <ShoppingListItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Checked / Done section */}
      {!isLoading && hasChecked && (
        <div className={cn("mt-6", uncheckedItems.length > 0 && "mt-6")}>
          <button
            onClick={() => setCheckedSectionOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 w-full text-left"
            aria-expanded={checkedSectionOpen}
          >
            {checkedSectionOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {t("done")} ({checkedItems.length})
          </button>

          {checkedSectionOpen && (
            <div className="space-y-2">
              {checkedItems.map((item) => (
                <ShoppingListItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
