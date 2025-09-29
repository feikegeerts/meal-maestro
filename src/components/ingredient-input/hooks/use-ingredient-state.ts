import { useState } from "react";
import { RecipeIngredient } from "@/types/recipe";
import { normalizeIngredientUnit } from "@/lib/recipe-utils";

interface UseIngredientStateProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

export function useIngredientState({
  ingredients,
  onChange,
}: UseIngredientStateProps) {
  const [showUnitDropdown, setShowUnitDropdown] = useState<{
    [key: string]: boolean;
  }>({});

  const generateId = () => `ingredient-${Date.now()}-${Math.random()}`;

  const addIngredient = () => {
    const newIngredient: RecipeIngredient = {
      id: generateId(),
      name: "",
      amount: null,
      unit: null,
      notes: "",
    };
    onChange([...ingredients, newIngredient]);
  };

  const removeIngredient = (id: string) => {
    onChange(ingredients.filter((ingredient) => ingredient.id !== id));
  };

  const updateIngredient = (id: string, updates: Partial<RecipeIngredient>) => {
    onChange(
      ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, ...updates } : ingredient
      )
    );
  };

  const handleAmountChange = (id: string, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    if (value === "" || (!isNaN(numValue!) && numValue! > 0)) {
      const currentIngredient = ingredients.find((ing) => ing.id === id);

      // Apply smart conversion if there's a unit and new amount
      if (numValue && currentIngredient?.unit) {
        const smartResult = normalizeIngredientUnit(
          numValue,
          currentIngredient.unit
        );
        if (smartResult) {
          updateIngredient(id, {
            amount: smartResult.amount,
            unit: smartResult.unit,
          });
        } else {
          updateIngredient(id, { amount: numValue });
        }
      } else {
        updateIngredient(id, { amount: numValue });
      }
    }
  };

  const handleUnitSelect = (id: string, unit: string) => {
    const currentIngredient = ingredients.find((ing) => ing.id === id);
    const newUnit = unit === "none" ? null : unit;

    // Apply smart conversion if there's an amount and new unit
    if (currentIngredient?.amount && newUnit) {
      const smartResult = normalizeIngredientUnit(
        currentIngredient.amount,
        newUnit
      );
      if (smartResult) {
        updateIngredient(id, {
          amount: smartResult.amount,
          unit: smartResult.unit,
        });
      } else {
        updateIngredient(id, { unit: newUnit });
      }
    } else {
      updateIngredient(id, { unit: newUnit });
    }

    setShowUnitDropdown({ ...showUnitDropdown, [id]: false });
  };

  return {
    showUnitDropdown,
    setShowUnitDropdown,
    addIngredient,
    removeIngredient,
    updateIngredient,
    handleAmountChange,
    handleUnitSelect,
  };
}
