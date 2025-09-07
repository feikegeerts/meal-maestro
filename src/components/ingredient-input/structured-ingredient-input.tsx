"use client";

import { memo } from "react";
import { RecipeIngredient, getStepSizeForUnit } from "@/types/recipe";
import { useTranslations } from "next-intl";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

// Hooks
import { useIngredientState } from "./hooks/use-ingredient-state";
import { useDragAndDrop } from "./hooks/use-drag-and-drop";
import { useResponsiveLayout } from "./hooks/use-responsive-layout";

// Components
import { DesktopIngredientItem } from "./desktop/desktop-ingredient-item";
import { MobileIngredientItem } from "./mobile/mobile-ingredient-item";
import { AddIngredientButton } from "./shared/add-ingredient-button";
import { EmptyState } from "./shared/empty-state";

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

  // Custom hooks
  const { isMobile } = useResponsiveLayout();
  const {
    addIngredient,
    removeIngredient,
    updateIngredient,
    handleAmountChange,
    handleUnitSelect,
  } = useIngredientState({ ingredients, onChange });
  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    sortableIds,
    collisionDetection,
    strategy,
  } = useDragAndDrop({ ingredients, onChange });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {ingredients.length === 0 ? (
          <EmptyState message='No ingredients added yet. Click "Add Ingredient" to get started.' />
        ) : (
          <SortableContext items={sortableIds} strategy={strategy}>
            {!isMobile ? (
              /* Desktop Table Layout */
              <div>
                {/* Table Headers */}
                <div className="flex gap-2 pb-2 mb-3 text-xs font-medium text-muted-foreground border-b">
                  <div className="w-6 text-left"></div>
                  <div className="w-8 text-left">#</div>
                  <div className="w-20 text-left">{t("amountHeader")}</div>
                  <div className="w-24 text-left">{t("unitHeader")}</div>
                  <div className="flex-1 text-left">{t("ingredientHeader")}</div>
                  <div className="w-32 text-left">{t("notesHeader")}</div>
                  <div className="w-8 text-left"></div>
                </div>

                <div className="flex flex-col gap-2">
                  {ingredients.map((ingredient, index) => (
                    <DesktopIngredientItem
                      key={ingredient.id}
                      ingredient={ingredient}
                      index={index}
                      disabled={disabled}
                      onAmountChange={handleAmountChange}
                      onUnitSelect={handleUnitSelect}
                      onUpdate={updateIngredient}
                      onRemove={removeIngredient}
                      ingredientsLength={ingredients.length}
                      t={t}
                      tUnits={tUnits}
                      getStepSizeForUnit={getStepSizeForUnit}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Mobile Layout - Compact List */
              <div className="flex flex-col gap-4">
                {ingredients.map((ingredient, index) => (
                  <MobileIngredientItem
                    key={ingredient.id}
                    ingredient={ingredient}
                    index={index}
                    disabled={disabled}
                    onAmountChange={handleAmountChange}
                    onUnitSelect={handleUnitSelect}
                    onUpdate={updateIngredient}
                    onRemove={removeIngredient}
                    ingredientsLength={ingredients.length}
                    t={t}
                    tUnits={tUnits}
                    getStepSizeForUnit={getStepSizeForUnit}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        )}

        <AddIngredientButton onAdd={addIngredient} disabled={disabled} t={t} />
      </div>
    </DndContext>
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