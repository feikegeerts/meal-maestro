import {
  useSensors,
  useSensor,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { RecipeIngredient } from "@/types/recipe";
import { useState } from "react";

interface UseDragAndDropProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

export function useDragAndDrop({ ingredients, onChange }: UseDragAndDropProps) {
  const [activeIngredient, setActiveIngredient] =
    useState<RecipeIngredient | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    console.log("🚀 DRAG START");
    console.log("Active ID:", event.active.id);
    console.log(
      "Current ingredients:",
      ingredients.map((ing, idx) => ({
        id: ing.id,
        name: ing.name,
        index: idx,
      }))
    );

    const ingredient = ingredients.find((ing) => ing.id === event.active.id);
    setActiveIngredient(ingredient || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log("🎯 DRAG END");
    console.log("Active ID:", active.id);
    console.log("Over ID:", over?.id);
    console.log("Over exists:", !!over);

    if (active.id !== over?.id && over) {
      const oldIndex = ingredients.findIndex(
        (ingredient) => ingredient.id === active.id
      );
      const newIndex = ingredients.findIndex(
        (ingredient) => ingredient.id === over.id
      );

      console.log("📍 INDICES: old =", oldIndex, "new =", newIndex);

      if (oldIndex !== -1 && newIndex !== -1) {
        console.log(
          "✅ MOVING:",
          ingredients[oldIndex]?.name,
          "to position",
          newIndex
        );
        onChange(arrayMove(ingredients, oldIndex, newIndex));
      }
    }

    setActiveIngredient(null);
  };

  const sortableIds = ingredients.map((ingredient) => ingredient.id);

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    sortableIds,
    collisionDetection: closestCenter,
    strategy: verticalListSortingStrategy,
    activeIngredient,
  };
}
