"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import {
  Recipe,
  RecipeInput,
  RecipeIngredient,
  RecipeSeason,
  RecipeNutrition,
  RecipeSection,
} from "@/types/recipe";
import { validateRecipeInput } from "@/lib/recipe-utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SheetClose } from "@/components/ui/sheet";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import type { ConversationStore } from "@/lib/conversation-store";
import { useAutoSave } from "./recipe-edit/hooks/use-auto-save";
import { FormTransformerService } from "./recipe-edit/services/form-transformer";
import { BasicInformationSection } from "./recipe-edit/components/basic-information-section";
import { IngredientsSection } from "./recipe-edit/components/ingredients-section";
import { InstructionsSection } from "./recipe-edit/components/instructions-section";
import { SectionsSection } from "./recipe-edit/components/sections-section";
import { MetadataSection } from "./recipe-edit/components/metadata-section";
import { CategorizedTagSelector } from "./recipe-edit/components/categorized-tag-selector";
import { FormLayoutRenderer } from "./recipe-edit/components/form-layout-renderer";
import { NutritionSection } from "./recipe-edit/components/nutrition-section";
import { Checkbox } from "@/components/ui/checkbox";

interface RecipeEditFormProps {
  recipe: Recipe;
  onSave: (recipeData: Partial<RecipeInput>) => Promise<void>;
  loading?: boolean;
  includeChat?: boolean;
  standalone?: boolean;
  onCancel?: () => void;
  layoutMode?: "single-column" | "two-column";
  conversationId?: string;
  conversationStore?: ConversationStore;
  conversationGreetingContext?: string;
  showNutrition?: boolean;
  enableChatReset?: boolean;
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
  conversationId,
  conversationStore,
  conversationGreetingContext,
  showNutrition = true,
  enableChatReset = false,
}: RecipeEditFormProps) {
  const t = useTranslations("recipeForm");

  const [formData, setFormData] = useState<RecipeInput>({
    title: recipe.title,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ing) => ({ ...ing }))
        : recipe.sections?.flatMap((section) =>
            section.ingredients.map((ing) => ({ ...ing }))
          ) || [
            {
              id: FormTransformerService.generateIngredientId(),
              name: "",
              amount: null,
              unit: null,
              notes: "",
            },
          ],
    sections: recipe.sections || [],
    servings: recipe.servings || 4,
    reference: recipe.reference ?? "",
    prep_time: recipe.prep_time ?? null,
    cook_time: null,
    total_time: recipe.total_time ?? null,
    pairing_wine: recipe.pairing_wine ?? "",
    utensils: recipe.utensils ?? [],
    notes: recipe.notes ?? "",
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
    nutrition: recipe.nutrition || null,
  });
  const hasSectionsInitially = (recipe.sections?.length ?? 0) > 0;
  const [useSections, setUseSections] = useState<boolean>(hasSectionsInitially);
  const [errors, setErrors] = useState<string[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [nutritionStale, setNutritionStale] = useState(false);

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
    const derivedTotalTime =
      formData.total_time ??
      (typeof formData.prep_time === "number" ? formData.prep_time : null);
    const formWithDerivedTotal = {
      ...formData,
      total_time: derivedTotalTime,
    };

    const validation = validateRecipeInput(formWithDerivedTotal);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    const updateData =
      FormTransformerService.createUpdatePayload(formWithDerivedTotal);

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
      setFormData((prev) => {
        if (prev.nutrition) {
          setNutritionStale(true);
        }
        return { ...prev, ingredients };
      });
    },
    []
  );

  const handleFormDataChange = useCallback((updates: Partial<RecipeInput>) => {
    setFormData((prev) => {
      if (
        prev.nutrition &&
        "servings" in updates &&
        typeof updates.servings === "number" &&
        updates.servings !== prev.servings
      ) {
        setNutritionStale(true);
      }
      return { ...prev, ...updates };
    });
  }, []);

  const handleSectionsChange = useCallback(
    (sections: RecipeSection[]) => {
      setFormData((prev) => {
        const flattenedIngredients = sections.flatMap(
          (section) => section.ingredients
        );
        const fallbackDescription = useSections
          ? ""
          : prev.description && prev.description.trim().length > 0
          ? prev.description
          : sections
              .map((section) => section.instructions)
              .filter(Boolean)
              .join("\n\n");

        if (prev.nutrition) {
          setNutritionStale(true);
        }

        return {
          ...prev,
          sections,
          ingredients: flattenedIngredients.length
            ? flattenedIngredients
            : prev.ingredients,
          description: fallbackDescription,
        };
      });
    },
    [useSections]
  );

  const handleToggleSections = useCallback(
    (checked: boolean) => {
      const enableSections = Boolean(checked);
      setUseSections(enableSections);
      setFormData((prev) => {
        if (prev.nutrition) {
          setNutritionStale(true);
        }
        if (enableSections) {
          const initialSections =
            prev.sections && prev.sections.length > 0
              ? prev.sections
              : [
                  {
                    id: FormTransformerService.generateSectionId(),
                    title: t("defaultSectionTitle"),
                    ingredients:
                      prev.ingredients && prev.ingredients.length > 0
                        ? prev.ingredients
                        : [
                            {
                              id: FormTransformerService.generateIngredientId(),
                              name: "",
                              amount: null,
                              unit: null,
                              notes: "",
                            },
                          ],
                    instructions: prev.description || "",
                  },
                ];

          const flattened = initialSections.flatMap(
            (section) => section.ingredients
          );
          return {
            ...prev,
            sections: initialSections,
            ingredients: flattened,
            description: "",
          };
        }

        const flattenedFromSections = prev.sections?.flatMap(
          (section) => section.ingredients
        );
        const combinedDescription =
          prev.description && prev.description.trim().length > 0
            ? prev.description
            : prev.sections
            ? prev.sections
                .map((section) => section.instructions)
                .filter(Boolean)
                .join("\n\n")
            : "";

        return {
          ...prev,
          sections: [],
          ingredients:
            prev.ingredients.length > 0
              ? prev.ingredients
              : flattenedFromSections || [],
          description: combinedDescription,
        };
      });
    },
    [t]
  );

  const handleAddSection = useCallback(() => {
    setFormData((prev) => {
      if (prev.nutrition) {
        setNutritionStale(true);
      }
      const nextSections: RecipeSection[] = [
        ...(prev.sections || []),
        {
          id: FormTransformerService.generateSectionId(),
          title: t("defaultSectionTitle"),
          ingredients: [
            {
              id: FormTransformerService.generateIngredientId(),
              name: "",
              amount: null,
              unit: null,
              notes: "",
            },
          ],
          instructions: "",
        },
      ];

      return {
        ...prev,
        sections: nextSections,
        ingredients: nextSections.flatMap((section) => section.ingredients),
      };
    });
  }, [t]);

  const handleNutritionFetched = useCallback(
    ({
      nutrition,
      cacheHit,
    }: {
      nutrition: RecipeNutrition;
      cacheHit: boolean;
    }) => {
      setFormData((prev) => ({
        ...prev,
        nutrition,
      }));
      setNutritionStale(false);
      if (!cacheHit) {
        setErrors((prev) =>
          prev.filter((message) => !message.toLowerCase().includes("nutrition"))
        );
      }
    },
    []
  );

  const FormSections = useMemo(
    () => (
      <>
        <BasicInformationSection
          formData={formData}
          onFormDataChange={handleFormDataChange}
          loading={loading}
        />

        <div className="rounded-lg border p-4 bg-card">
          <div className="flex items-start gap-3">
            <Checkbox
              id="use-sections"
              checked={useSections}
              onCheckedChange={(value) => handleToggleSections(Boolean(value))}
              disabled={loading}
              className="mt-2"
            />
            <div className="space-y-1">
              <label
                htmlFor="use-sections"
                className="text-sm font-medium leading-none"
              >
                {t("useSectionsLabel")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("useSectionsDescription")}
              </p>
            </div>
          </div>
        </div>

        {useSections ? (
          <SectionsSection
            sections={
              formData.sections && formData.sections.length > 0
                ? formData.sections
                : [
                    {
                      id: FormTransformerService.generateSectionId(),
                      title: t("defaultSectionTitle"),
                      ingredients: formData.ingredients,
                      instructions: formData.description,
                    },
                  ]
            }
            onChange={handleSectionsChange}
            onAddSection={handleAddSection}
            disabled={loading}
          />
        ) : (
          <IngredientsSection
            ingredients={formData.ingredients}
            onIngredientsChange={handleIngredientsChange}
            loading={loading}
          />
        )}

        {!useSections && (
          <InstructionsSection
            description={formData.description}
            onDescriptionChange={(description) =>
              handleFormDataChange({ description })
            }
            loading={loading}
          />
        )}

        <MetadataSection
          formData={formData}
          onFormDataChange={handleFormDataChange}
          loading={loading}
        />

        <CategorizedTagSelector
          formData={formData}
          onFormDataChange={handleFormDataChange}
          disabled={loading}
        />

        {showNutrition && (
          <NutritionSection
            recipeId={recipe.id}
            ingredients={formData.ingredients}
            servings={formData.servings}
            nutrition={formData.nutrition}
            isStale={nutritionStale}
            onFetchComplete={handleNutritionFetched}
            disabled={loading}
          />
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("validationErrors.title")}</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => {
                  // Convert system messages to more conversational ones
                  let friendlyError = error;
                  if (error.includes("title is required")) {
                    friendlyError = t("validationErrors.titleMissing");
                  } else if (error.includes("description is required")) {
                    friendlyError = t("validationErrors.descriptionMissing");
                  } else if (error.includes("name is required")) {
                    friendlyError = t("validationErrors.ingredientNameMissing");
                  } else if (error.includes("ingredients")) {
                    friendlyError = t("validationErrors.ingredientIssue");
                  }

                  return <div key={index}>• {friendlyError}</div>;
                })}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 pt-4 border-t">
          {standalone ? (
            <>
              <Button
                variant="outline"
                disabled={loading}
                className="flex-1 order-1"
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 order-2"
              >
                {loading
                  ? t("saving")
                  : recipe.id
                  ? t("saveChanges")
                  : t("createRecipe")}
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
              <SheetClose asChild>
                <Button variant="outline" disabled={loading} className="flex-1">
                  {t("cancel")}
                </Button>
              </SheetClose>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? t("saving") : t("saveChanges")}
              </Button>
            </>
          )}
        </div>
      </>
    ),
    [
      errors,
      formData,
      loading,
      useSections,
      handleToggleSections,
      handleSectionsChange,
      handleAddSection,
      handleIngredientsChange,
      handleFormDataChange,
      handleSave,
      standalone,
      onCancel,
      recipe.id,
      t,
      nutritionStale,
      handleNutritionFetched,
      showNutrition,
    ]
  );

  // Smart two-column sections for when chat is not included
  const LeftColumnSections = useMemo(
    () => (
      <>
        <BasicInformationSection
          formData={formData}
          onFormDataChange={handleFormDataChange}
          loading={loading}
        />

        <div className="rounded-lg border p-4 bg-card">
          <div className="flex items-start gap-3">
            <Checkbox
              id="use-sections-inline"
              checked={useSections}
              onCheckedChange={(value) => handleToggleSections(Boolean(value))}
              disabled={loading}
              className="mt-2"
            />
            <div className="space-y-1">
              <label
                htmlFor="use-sections-inline"
                className="text-sm font-medium leading-none"
              >
                {t("useSectionsLabel")}
              </label>
              <p className="text-xs text-muted-foreground">
                {t("useSectionsDescription")}
              </p>
            </div>
          </div>
        </div>

        {useSections ? (
          <SectionsSection
            sections={
              formData.sections && formData.sections.length > 0
                ? formData.sections
                : [
                    {
                      id: FormTransformerService.generateSectionId(),
                      title: t("defaultSectionTitle"),
                      ingredients: formData.ingredients,
                      instructions: formData.description,
                    },
                  ]
            }
            onChange={handleSectionsChange}
            onAddSection={handleAddSection}
            disabled={loading}
          />
        ) : (
          <IngredientsSection
            ingredients={formData.ingredients}
            onIngredientsChange={handleIngredientsChange}
            loading={loading}
          />
        )}
      </>
    ),
    [
      formData,
      loading,
      handleIngredientsChange,
      handleFormDataChange,
      useSections,
      handleToggleSections,
      handleSectionsChange,
      handleAddSection,
      t,
    ]
  );

  const RightColumnSections = useMemo(
    () => (
      <>
        {!useSections && (
          <InstructionsSection
            description={formData.description}
            onDescriptionChange={(description) =>
              handleFormDataChange({ description })
            }
            loading={loading}
          />
        )}

        <MetadataSection
          formData={formData}
          onFormDataChange={handleFormDataChange}
          loading={loading}
        />

        <CategorizedTagSelector
          formData={formData}
          onFormDataChange={handleFormDataChange}
          disabled={loading}
        />

        {showNutrition && (
          <NutritionSection
            recipeId={recipe.id}
            ingredients={formData.ingredients}
            servings={formData.servings}
            nutrition={formData.nutrition}
            isStale={nutritionStale}
            onFetchComplete={handleNutritionFetched}
            disabled={loading}
          />
        )}
      </>
    ),
    [
      formData,
      handleFormDataChange,
      loading,
      nutritionStale,
      handleNutritionFetched,
      recipe.id,
      showNutrition,
      useSections,
    ]
  );

  const ActionButtons = useMemo(
    () => (
      <>
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-3 pt-4 border-t justify-center">
          {standalone ? (
            <>
              <Button
                variant="outline"
                disabled={loading}
                className=""
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={loading} className="">
                {loading
                  ? t("saving")
                  : recipe.id
                  ? t("saveChanges")
                  : t("createRecipe")}
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
              <SheetClose asChild>
                <Button variant="outline" disabled={loading} className="flex-1">
                  {t("cancel")}
                </Button>
              </SheetClose>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? t("saving") : t("saveChanges")}
              </Button>
            </>
          )}
        </div>
      </>
    ),
    [handleSave, loading, recipe.id, standalone, onCancel, t, errors]
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
      conversationId={conversationId}
      conversationStore={conversationStore}
      conversationGreetingContext={conversationGreetingContext}
      enableChatReset={enableChatReset}
    >
      {FormSections}
      {!standalone && (
        <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
      )}
    </FormLayoutRenderer>
  );
}
