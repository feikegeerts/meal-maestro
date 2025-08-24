"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import {
  Recipe,
  RecipeInput,
  RecipeIngredient,
  RecipeSeason,
  validateRecipeInput,
} from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SheetClose } from "@/components/ui/sheet";
import { useTranslations } from "next-intl";

import { useAutoSave } from "./recipe-edit/hooks/use-auto-save";
import { FormTransformerService } from "./recipe-edit/services/form-transformer";
import { BasicInformationSection } from "./recipe-edit/components/basic-information-section";
import { IngredientsSection } from "./recipe-edit/components/ingredients-section";
import { InstructionsSection } from "./recipe-edit/components/instructions-section";
import { CategorizedTagSelector } from "./recipe-edit/components/categorized-tag-selector";
import { FormLayoutRenderer } from "./recipe-edit/components/form-layout-renderer";

interface RecipeEditFormProps {
  recipe: Recipe;
  onSave: (recipeData: Partial<RecipeInput>) => Promise<void>;
  loading?: boolean;
  includeChat?: boolean;
  standalone?: boolean;
  onCancel?: () => void;
  layoutMode?: "single-column" | "two-column";
}

// Export auto-save function for external use (backward compatibility)
export const triggerAutoSave = async (): Promise<boolean> => {
  console.warn(
    "triggerAutoSave is deprecated. Auto-save is now handled by useAutoSave hook."
  );
  return true;
};

export function RecipeEditForm({
  recipe,
  onSave,
  loading = false,
  includeChat = false,
  standalone = false,
  onCancel,
  layoutMode = "single-column",
}: RecipeEditFormProps) {
  const t = useTranslations("recipeForm");

  const [formData, setFormData] = useState<RecipeInput>({
    title: recipe.title,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ing) => ({ ...ing }))
        : [
            {
              id: FormTransformerService.generateIngredientId(),
              name: "",
              amount: null,
              unit: null,
              notes: "",
            },
          ],
    servings: recipe.servings || 4,
    description: recipe.description,
    category: recipe.category,
    cuisine: recipe.cuisine,
    diet_types: recipe.diet_types || [],
    cooking_methods: recipe.cooking_methods || [],
    dish_types: recipe.dish_types || [],
    proteins: recipe.proteins || [],
    occasions: recipe.occasions || [],
    characteristics: recipe.characteristics || [],
    season: recipe.season || RecipeSeason.YEAR_ROUND,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-save hook replaces global state pattern
  useAutoSave({
    formData,
    originalRecipe: recipe,
    onSave,
  });

  const memoizedFormState = useMemo(() => formData, [formData]);

  const handleAIRecipeUpdate = useCallback(
    (aiRecipeData: unknown) => {
      const updatedFormData = FormTransformerService.transformAIRecipeData(
        aiRecipeData,
        formData
      );

      setFormData(updatedFormData);
      setErrors([]);
      FormTransformerService.scrollToFormOnMobile(layoutMode);
    },
    [formData, layoutMode]
  );

  const handleSave = useCallback(async () => {
    const validation = validateRecipeInput(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    const updateData = FormTransformerService.createUpdatePayload(formData);

    try {
      await onSave(updateData);
      if (!standalone) {
        closeButtonRef.current?.click();
      }
    } catch (error) {
      console.error("Save failed:", error);
    }
  }, [formData, onSave, standalone]);

  const handleIngredientsChange = useCallback(
    (ingredients: RecipeIngredient[]) => {
      setFormData((prev) => ({ ...prev, ingredients }));
    },
    []
  );

  const handleFormDataChange = useCallback((updates: Partial<RecipeInput>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const FormSections = useMemo(
    () => (
      <>
        {errors.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-destructive space-y-1">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <BasicInformationSection
          formData={formData}
          onFormDataChange={handleFormDataChange}
          loading={loading}
        />

        <IngredientsSection
          ingredients={formData.ingredients}
          onIngredientsChange={handleIngredientsChange}
          loading={loading}
        />

        <InstructionsSection
          description={formData.description}
          onDescriptionChange={(description) =>
            handleFormDataChange({ description })
          }
          loading={loading}
        />

        <Card>
          <CardContent className="p-0">
            <CategorizedTagSelector
              formData={formData}
              onFormDataChange={handleFormDataChange}
              disabled={loading}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-4 border-t">
          {standalone ? (
            <>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading
                  ? t("saving")
                  : recipe.id
                  ? t("saveChanges")
                  : t("createRecipe")}
              </Button>
              <Button
                variant="outline"
                disabled={loading}
                className="flex-1"
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
            </>
          ) : (
            <>
              <SheetClose asChild>
                <button
                  ref={closeButtonRef}
                  className="hidden"
                  aria-hidden="true"
                />
              </SheetClose>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? t("saving") : t("saveChanges")}
              </Button>
              <SheetClose asChild>
                <Button variant="outline" disabled={loading} className="flex-1">
                  {t("cancel")}
                </Button>
              </SheetClose>
            </>
          )}
        </div>
      </>
    ),
    [
      errors,
      formData,
      loading,
      handleIngredientsChange,
      handleFormDataChange,
      handleSave,
      standalone,
      onCancel,
      recipe.id,
      t,
    ]
  );

  // Smart two-column sections for when chat is not included
  const LeftColumnSections = useMemo(
    () => (
      <>
        {errors.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-destructive space-y-1">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <BasicInformationSection
          formData={formData}
          onFormDataChange={handleFormDataChange}
          loading={loading}
        />

        <IngredientsSection
          ingredients={formData.ingredients}
          onIngredientsChange={handleIngredientsChange}
          loading={loading}
        />
      </>
    ),
    [errors, formData, loading, handleIngredientsChange, handleFormDataChange]
  );

  const RightColumnSections = useMemo(
    () => (
      <>
        <InstructionsSection
          description={formData.description}
          onDescriptionChange={(description) =>
            handleFormDataChange({ description })
          }
          loading={loading}
        />

        <Card>
          <CardContent className="p-0">
            <CategorizedTagSelector
              formData={formData}
              onFormDataChange={handleFormDataChange}
              disabled={loading}
            />
          </CardContent>
        </Card>
      </>
    ),
    [formData, handleFormDataChange, loading]
  );

  const ActionButtons = useMemo(
    () => (
      <div className="flex gap-3 pt-4 border-t">
        {standalone ? (
          <>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading
                ? t("saving")
                : recipe.id
                ? t("saveChanges")
                : t("createRecipe")}
            </Button>
            <Button
              variant="outline"
              disabled={loading}
              className="flex-1"
              onClick={onCancel}
            >
              {t("cancel")}
            </Button>
          </>
        ) : (
          <>
            <SheetClose asChild>
              <button
                ref={closeButtonRef}
                className="hidden"
                aria-hidden="true"
              />
            </SheetClose>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? t("saving") : t("saveChanges")}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={loading} className="flex-1">
                {t("cancel")}
              </Button>
            </SheetClose>
          </>
        )}
      </div>
    ),
    [handleSave, loading, recipe.id, standalone, onCancel, t]
  );

  return (
    <FormLayoutRenderer
      layoutMode={layoutMode}
      includeChat={includeChat}
      recipe={recipe}
      memoizedFormState={memoizedFormState}
      onAIRecipeUpdate={handleAIRecipeUpdate}
      leftColumnSections={LeftColumnSections}
      rightColumnSections={RightColumnSections}
      actionButtons={ActionButtons}
    >
      {FormSections}
      {!standalone && (
        <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
      )}
    </FormLayoutRenderer>
  );
}
