"use client";

import { useState, memo } from "react";
import {
  RecipeIngredient,
  COOKING_UNITS,
  normalizeIngredientUnit,
  getStepSizeForUnit,
} from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface StructuredIngredientInputProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  disabled?: boolean;
}

function StructuredIngredientInputComponent({
  ingredients,
  onChange,
  disabled = false,
}: StructuredIngredientInputProps) {
  const t = useTranslations("ingredientInput");
  const tUnits = useTranslations("units");
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

  return (
    <div className="space-y-4">
      {ingredients.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No ingredients added yet. Click &quot;Add Ingredient&quot; to get
          started.
        </div>
      ) : (
        <>
          {/* Desktop Table Layout */}
          <div className="hidden sm:block">
            {/* Table Headers */}
            <div className="flex gap-2 pb-2 mb-3 text-xs font-medium text-muted-foreground border-b">
              <div className="w-8 text-left">#</div>
              <div className="w-20 text-left">{t("amountHeader")}</div>
              <div className="w-24 text-left">{t("unitHeader")}</div>
              <div className="flex-1 text-left">{t("ingredientHeader")}</div>
              <div className="w-32 text-left">{t("notesHeader")}</div>
              <div className="w-8 text-left"></div>
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div
                  key={ingredient.id}
                  className="flex gap-2 items-center py-1"
                >
                  {/* Index */}
                  <div className="w-8 text-center text-sm text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Amount */}
                  <div className="w-20">
                    <Input
                      type="number"
                      step={getStepSizeForUnit(ingredient.unit).toString()}
                      min="0"
                      placeholder="0"
                      value={ingredient.amount || ""}
                      onChange={(e) =>
                        handleAmountChange(ingredient.id, e.target.value)
                      }
                      disabled={disabled}
                      className="text-center h-9 text-sm"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-24">
                    <Select
                      value={ingredient.unit || "none"}
                      onValueChange={(value) =>
                        handleUnitSelect(ingredient.id, value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        {COOKING_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {tUnits(unit)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ingredient Name */}
                  <div className="flex-1">
                    <Input
                      placeholder={t("ingredientNamePlaceholder")}
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(ingredient.id, {
                          name: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Notes */}
                  <div className="w-32">
                    <Input
                      placeholder={t("notesPlaceholder")}
                      value={ingredient.notes || ""}
                      onChange={(e) =>
                        updateIngredient(ingredient.id, {
                          notes: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="w-8 text-center">
                    {ingredients.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredient(ingredient.id)}
                        disabled={disabled}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Layout - Compact List */}
          <div className="block sm:hidden space-y-3">
            {ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="bg-muted/30 rounded-lg p-2.5">
                {/* Header Row with Index and Delete */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  {ingredients.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIngredient(ingredient.id)}
                      disabled={disabled}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Optimized Two-Row Layout */}
                <div className="space-y-2">
                  {/* Row 1: Amount + Unit (compact) */}
                  <div className="flex gap-2 items-center">
                    <div className="w-20">
                      <Input
                        type="number"
                        step={getStepSizeForUnit(ingredient.unit).toString()}
                        min="0"
                        placeholder="0"
                        value={ingredient.amount || ""}
                        onChange={(e) =>
                          handleAmountChange(ingredient.id, e.target.value)
                        }
                        disabled={disabled}
                        className="text-center h-9 text-sm px-3 py-1"
                      />
                    </div>
                    <div className="w-20">
                      <Select
                        value={ingredient.unit || "none"}
                        onValueChange={(value) =>
                          handleUnitSelect(ingredient.id, value)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9 text-sm min-h-9">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {COOKING_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {tUnits(unit)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Ingredient Name (full width) */}
                  <div>
                    <Input
                      placeholder={t("ingredientNamePlaceholder")}
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(ingredient.id, {
                          name: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Row 3: Notes (if needed) */}
                  {(ingredient.notes || !disabled) && (
                    <div>
                      <Input
                        placeholder={t("notesPlaceholder")}
                        value={ingredient.notes || ""}
                        onChange={(e) =>
                          updateIngredient(ingredient.id, {
                            notes: e.target.value,
                          })
                        }
                        disabled={disabled}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Ingredient Button at Bottom */}
      <div className="flex justify-center pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          disabled={disabled}
          className="h-8 text-sm sm:h-9 sm:text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5 sm:h-4 sm:w-4 sm:mr-2" />
          {t("addIngredient")}
        </Button>
      </div>
    </div>
  );
}

export const StructuredIngredientInput = memo(
  StructuredIngredientInputComponent,
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    const ingredientsEqual =
      prevProps.ingredients.length === nextProps.ingredients.length &&
      prevProps.ingredients.every((prev, index) => {
        const next = nextProps.ingredients[index];
        return (
          prev.id === next.id &&
          prev.name === next.name &&
          prev.amount === next.amount &&
          prev.unit === next.unit &&
          prev.notes === next.notes
        );
      });

    const propsEqual =
      ingredientsEqual &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.onChange === nextProps.onChange;

    return propsEqual;
  }
);
