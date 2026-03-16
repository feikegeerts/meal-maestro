"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/lib/shopping-list-types";

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

export function ShoppingListItemRow({
  item,
  onToggle,
  onDelete,
}: ShoppingListItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-opacity",
        isDragging && "opacity-50",
        item.checked && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground focus-visible:outline-none active:cursor-grabbing"
        aria-label="Drag to reorder"
        tabIndex={0}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => onToggle(item.id, !item.checked)}
        aria-label={`Mark ${item.name} as ${item.checked ? "unchecked" : "done"}`}
      />

      {/* Item content */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span
          className={cn(
            "text-sm leading-tight",
            item.checked && "line-through text-muted-foreground"
          )}
        >
          {(item.amount !== null || item.unit) && (
            <span className="text-primary font-medium mr-1">
              {item.amount !== null ? item.amount : ""}
              {item.unit ? ` ${item.unit}` : ""}
            </span>
          )}
          <span>{item.name}</span>
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground truncate">
            {item.notes}
          </span>
        )}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(item.id)}
        aria-label={`Delete ${item.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
