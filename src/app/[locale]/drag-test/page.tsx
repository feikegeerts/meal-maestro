/**
 * Drag & Drop Test Implementation
 * 
 * This component demonstrates the correct way to implement drag and drop
 * with @dnd-kit for smooth live reordering. Key implementation details:
 * 
 * 1. LAYOUT: Uses `flex flex-col gap-6` instead of `space-y-*` because
 *    CSS transforms don't affect document flow, causing overlaps with margin-based spacing
 * 
 * 2. LIVE REORDERING: Achieved through:
 *    - useSortable hook with transition configuration
 *    - CSS.Transform.toString(transform) for smooth positioning
 *    - Custom easing curve for natural motion
 * 
 * 3. NO DRAG OVERLAY: When live reordering works, overlay becomes redundant
 *    since users see real items moving in real-time
 * 
 * 4. COLLISION DETECTION: closestCenter works best for vertical lists
 *    compared to pointerWithin which can be less predictable
 * 
 * See /docs/drag-drop-implementation.md for detailed explanation
 */

"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    transition: {
      duration: 150,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Throttled logging - only log significant changes
  if (transform && (transform.x !== 0 || transform.y !== 0)) {
    const transformKey = `${Math.round(transform.x)},${Math.round(transform.y)}`;
    const windowDebug = (window as unknown) as Window & { [key: string]: string };
    if (windowDebug.lastLoggedTransform !== `${id}-${transformKey}`) {
      console.log(`✅ TEST Item ${id} - transform:`, transform, 'isDragging:', isDragging);
      windowDebug.lastLoggedTransform = `${id}-${transformKey}`;
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function DragTestPage() {
  const [items, setItems] = useState(["1", "2", "3", "4", "5"]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Drag and Drop Test</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-6 max-w-md">
            {items.map((id) => (
              <SortableItem key={id} id={id}>
                <div className="p-4 bg-white dark:bg-gray-800 border rounded-lg shadow cursor-move hover:shadow-md transition-shadow">
                  Item {id}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
