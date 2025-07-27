"use client";

import { useState } from "react";
import { RecipeIngredient, COOKING_UNITS } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface StructuredIngredientInputProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  disabled?: boolean;
}

export function StructuredIngredientInput({
  ingredients,
  onChange,
  disabled = false,
}: StructuredIngredientInputProps) {
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
      updateIngredient(id, { amount: numValue });
    }
  };

  const handleUnitSelect = (id: string, unit: string) => {
    updateIngredient(id, { unit: unit === "none" ? null : unit });
    setShowUnitDropdown({ ...showUnitDropdown, [id]: false });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Ingredients</Label>

      <div className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="space-y-3">
            {/* Mobile Layout (Stacked) */}
            <div className="block sm:hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Ingredient {index + 1}
                </span>
                {ingredients.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeIngredient(ingredient.id)}
                    disabled={disabled}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {/* Amount and Unit Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Amount
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={ingredient.amount || ""}
                      onChange={(e) =>
                        handleAmountChange(ingredient.id, e.target.value)
                      }
                      disabled={disabled}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Unit
                    </Label>
                    <Select
                      value={ingredient.unit || "none"}
                      onValueChange={(value) =>
                        handleUnitSelect(ingredient.id, value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        {COOKING_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ingredient Name */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Ingredient
                  </Label>
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, { name: e.target.value })
                    }
                    disabled={disabled}
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Notes (optional)
                  </Label>
                  <Input
                    placeholder="Notes"
                    value={ingredient.notes || ""}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, { notes: e.target.value })
                    }
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            {/* Desktop Layout (Grid) */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-6">
                {index + 1}.
              </span>
              <div className="flex-1 grid grid-cols-12 gap-2">
                {/* Amount */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={ingredient.amount || ""}
                    onChange={(e) =>
                      handleAmountChange(ingredient.id, e.target.value)
                    }
                    disabled={disabled}
                    className="text-center"
                  />
                </div>

                {/* Unit */}
                <div className="col-span-2">
                  <Select
                    value={ingredient.unit || "none"}
                    onValueChange={(value) =>
                      handleUnitSelect(ingredient.id, value)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {COOKING_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name */}
                <div className="col-span-5">
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, { name: e.target.value })
                    }
                    disabled={disabled}
                    className="flex-1"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <Input
                    placeholder="Notes"
                    value={ingredient.notes || ""}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, { notes: e.target.value })
                    }
                    disabled={disabled}
                    className="text-xs"
                  />
                </div>

                {/* Remove Button */}
                <div className="col-span-1">
                  {ingredients.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(ingredient.id)}
                      disabled={disabled}
                      className="px-2 h-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Helper text for "to taste" items */}
            {ingredient.amount === null && ingredient.name && (
              <div className="ml-0 sm:ml-8 text-xs text-muted-foreground">
                No amount specified - will display as &quot;{ingredient.name} to
                taste&quot;
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Column headers for desktop only */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
        <span className="w-6"></span>
        <div className="flex-1 grid grid-cols-12 gap-2">
          <div className="col-span-2 text-center">Amount</div>
          <div className="col-span-2 text-center">Unit</div>
          <div className="col-span-5 text-center">Ingredient</div>
          <div className="col-span-2 text-center">Notes</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {ingredients.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No ingredients added yet. Click &quot;Add Ingredient&quot; to get
          started.
        </div>
      )}

      {/* Add Ingredient Button at Bottom */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Ingredient
        </Button>
      </div>
    </div>
  );
}
