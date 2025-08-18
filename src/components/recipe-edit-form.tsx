"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Recipe,
  RecipeInput,
  RecipeIngredient,
  RecipeSeason,
  RECIPE_CATEGORIES,
  RECIPE_SEASONS,
  CUISINE_TYPES,
  DIET_TYPES,
  COOKING_METHOD_TYPES,
  DISH_TYPES,
  PROTEIN_TYPES,
  OCCASION_TYPES,
  CHARACTERISTIC_TYPES,
  validateRecipeInput,
} from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { SheetClose } from "@/components/ui/sheet";
import { StructuredIngredientInput } from "@/components/structured-ingredient-input";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useTranslations } from "next-intl";

interface RecipeEditFormProps {
  recipe: Recipe;
  onSave: (recipeData: Partial<RecipeInput>) => Promise<void>;
  loading?: boolean;
  includeChat?: boolean;
  standalone?: boolean;
  onCancel?: () => void;
  layoutMode?: "single-column" | "two-column";
}

// Global variable to store the current form state for auto-save
let currentFormState: {
  formData: RecipeInput;
  hasChanges: boolean;
  onSave: (recipeData: Partial<RecipeInput>) => Promise<void>;
} | null = null;

// Global function to trigger auto-save
export const triggerAutoSave = async (): Promise<boolean> => {
  if (!currentFormState || !currentFormState.hasChanges) {
    return true; // No changes to save
  }

  const { formData, onSave } = currentFormState;
  const validation = validateRecipeInput(formData);

  if (!validation.valid) {
    return false; // Don't close if validation fails
  }

  try {
    const updateData: Partial<RecipeInput> = {
      title: formData.title,
      ingredients: formData.ingredients,
      servings: formData.servings,
      description: formData.description,
      category: formData.category,
      cuisine: formData.cuisine,
      diet_types: formData.diet_types,
      cooking_methods: formData.cooking_methods,
      dish_types: formData.dish_types,
      proteins: formData.proteins,
      occasions: formData.occasions,
      characteristics: formData.characteristics,
      season: formData.season,
    };

    await onSave(updateData);
    return true; // Allow close
  } catch (error) {
    console.error("Auto-save failed:", error);
    return false; // Don't close if save fails
  }
};


interface CategorizedTagSelectorProps {
  formData: RecipeInput;
  onFormDataChange: (updates: Partial<RecipeInput>) => void;
  disabled?: boolean;
}

function CategorizedTagSelector({
  formData,
  onFormDataChange,
  disabled = false,
}: CategorizedTagSelectorProps) {
  const tCuisines = useTranslations("cuisines");
  const tDietTypes = useTranslations("dietTypes");
  const tCookingMethods = useTranslations("cookingMethods");
  const tDishTypes = useTranslations("dishTypes");
  const tProteinTypes = useTranslations("proteinTypes");
  const tOccasionTypes = useTranslations("occasionTypes");
  const tCharacteristicTypes = useTranslations("characteristicTypes");
  const tHeaders = useTranslations("tagCategoryHeaders");

  const handleCuisineChange = (cuisine: string) => {
    onFormDataChange({ cuisine: cuisine === formData.cuisine ? undefined : cuisine });
  };

  const handleArrayTagToggle = (
    fieldName: keyof Pick<RecipeInput, 'diet_types' | 'cooking_methods' | 'dish_types' | 'proteins' | 'occasions' | 'characteristics'>,
    tag: string
  ) => {
    const currentArray = formData[fieldName] || [];
    const newArray = currentArray.includes(tag)
      ? currentArray.filter(t => t !== tag)
      : [...currentArray, tag];
    onFormDataChange({ [fieldName]: newArray });
  };

  return (
    <div className="space-y-6">
      {/* Cuisine (Single Selection) */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("cuisine")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CUISINE_TYPES.map((cuisine) => (
            <div key={cuisine} className="flex items-center space-x-2">
              <Checkbox
                id={`cuisine-${cuisine}`}
                checked={formData.cuisine === cuisine}
                onCheckedChange={() => handleCuisineChange(cuisine)}
                disabled={disabled}
              />
              <Label
                htmlFor={`cuisine-${cuisine}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tCuisines(cuisine)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Diet Types */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("dietTypes")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DIET_TYPES.map((dietType) => (
            <div key={dietType} className="flex items-center space-x-2">
              <Checkbox
                id={`diet-${dietType}`}
                checked={(formData.diet_types || []).includes(dietType)}
                onCheckedChange={() => handleArrayTagToggle('diet_types', dietType)}
                disabled={disabled}
              />
              <Label
                htmlFor={`diet-${dietType}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tDietTypes(dietType)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Cooking Methods */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("cookingMethods")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COOKING_METHOD_TYPES.map((method) => (
            <div key={method} className="flex items-center space-x-2">
              <Checkbox
                id={`cooking-${method}`}
                checked={(formData.cooking_methods || []).includes(method)}
                onCheckedChange={() => handleArrayTagToggle('cooking_methods', method)}
                disabled={disabled}
              />
              <Label
                htmlFor={`cooking-${method}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tCookingMethods(method)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Dish Types */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("dishTypes")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DISH_TYPES.map((dishType) => (
            <div key={dishType} className="flex items-center space-x-2">
              <Checkbox
                id={`dish-${dishType}`}
                checked={(formData.dish_types || []).includes(dishType)}
                onCheckedChange={() => handleArrayTagToggle('dish_types', dishType)}
                disabled={disabled}
              />
              <Label
                htmlFor={`dish-${dishType}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tDishTypes(dishType)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Protein Types */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("proteinTypes")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROTEIN_TYPES.map((protein) => (
            <div key={protein} className="flex items-center space-x-2">
              <Checkbox
                id={`protein-${protein}`}
                checked={(formData.proteins || []).includes(protein)}
                onCheckedChange={() => handleArrayTagToggle('proteins', protein)}
                disabled={disabled}
              />
              <Label
                htmlFor={`protein-${protein}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tProteinTypes(protein)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Occasions */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("occasionTypes")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {OCCASION_TYPES.map((occasion) => (
            <div key={occasion} className="flex items-center space-x-2">
              <Checkbox
                id={`occasion-${occasion}`}
                checked={(formData.occasions || []).includes(occasion)}
                onCheckedChange={() => handleArrayTagToggle('occasions', occasion)}
                disabled={disabled}
              />
              <Label
                htmlFor={`occasion-${occasion}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tOccasionTypes(occasion)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Characteristics */}
      <div>
        <Label className="text-sm font-medium mb-2 block">{tHeaders("characteristicTypes")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CHARACTERISTIC_TYPES.map((characteristic) => (
            <div key={characteristic} className="flex items-center space-x-2">
              <Checkbox
                id={`char-${characteristic}`}
                checked={(formData.characteristics || []).includes(characteristic)}
                onCheckedChange={() => handleArrayTagToggle('characteristics', characteristic)}
                disabled={disabled}
              />
              <Label
                htmlFor={`char-${characteristic}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tCharacteristicTypes(characteristic)}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const tCategories = useTranslations("categories");
  const tSeasons = useTranslations("seasons");

  const generateIngredientId = () =>
    `ingredient-${Date.now()}-${Math.random()}`;

  const [formData, setFormData] = useState<RecipeInput>({
    title: recipe.title,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ing) => ({ ...ing }))
        : [
            {
              id: generateIngredientId(),
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounced function to update global state
  const updateGlobalState = useCallback(() => {
    const hasFormChanges =
      formData.title !== recipe.title ||
      JSON.stringify(formData.ingredients) !==
        JSON.stringify(recipe.ingredients) ||
      formData.servings !== recipe.servings ||
      formData.description !== recipe.description ||
      formData.category !== recipe.category ||
      formData.cuisine !== recipe.cuisine ||
      JSON.stringify(formData.diet_types) !== JSON.stringify(recipe.diet_types) ||
      JSON.stringify(formData.cooking_methods) !== JSON.stringify(recipe.cooking_methods) ||
      JSON.stringify(formData.dish_types) !== JSON.stringify(recipe.dish_types) ||
      JSON.stringify(formData.proteins) !== JSON.stringify(recipe.proteins) ||
      JSON.stringify(formData.occasions) !== JSON.stringify(recipe.occasions) ||
      JSON.stringify(formData.characteristics) !== JSON.stringify(recipe.characteristics) ||
      formData.season !== recipe.season;

    // Update global state for auto-save
    currentFormState = {
      formData,
      hasChanges: hasFormChanges,
      onSave,
    };
  }, [formData, recipe, onSave]);

  // Debounced global state update - only update after user stops typing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      updateGlobalState();
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimer);
  }, [updateGlobalState]);

  // Clear global state when component unmounts
  useEffect(() => {
    return () => {
      currentFormState = null;
    };
  }, []);

  // Memoized current form state for chat interface to prevent unnecessary re-renders
  const memoizedFormState = useMemo(
    () => ({
      title: formData.title,
      ingredients: formData.ingredients,
      servings: formData.servings,
      description: formData.description,
      category: formData.category,
      cuisine: formData.cuisine,
      diet_types: formData.diet_types,
      cooking_methods: formData.cooking_methods,
      dish_types: formData.dish_types,
      proteins: formData.proteins,
      occasions: formData.occasions,
      characteristics: formData.characteristics,
      season: formData.season,
    }),
    [
      formData.title,
      formData.servings,
      formData.description,
      formData.category,
      formData.cuisine,
      formData.diet_types,
      formData.cooking_methods,
      formData.dish_types,
      formData.proteins,
      formData.occasions,
      formData.characteristics,
      formData.season,
      formData.ingredients,
    ]
  );

  // Define the expected structure of AI recipe data
  interface AIRecipeData {
    title?: string;
    description?: string;
    ingredients?: Array<{
      id?: string;
      name?: string;
      amount?: number | null;
      unit?: string | null;
      notes?: string;
    }>;
    servings?: number;
    category?: string;
    cuisine?: string;
    diet_types?: string[];
    cooking_methods?: string[];
    dish_types?: string[];
    proteins?: string[];
    occasions?: string[];
    characteristics?: string[];
    season?: string;
  }

  // Handle AI-generated recipe updates
  const handleAIRecipeUpdate = (aiRecipeData: unknown) => {
    const recipeData = aiRecipeData as AIRecipeData;

    if (recipeData) {
      const updatedFormData: RecipeInput = {
        ...formData,
        ...(recipeData.title && { title: recipeData.title }),
        ...(recipeData.description && { description: recipeData.description }),
        ...(recipeData.servings && { servings: recipeData.servings }),
        ...(recipeData.category && { category: recipeData.category }),
        ...(recipeData.cuisine && { cuisine: recipeData.cuisine }),
        ...(recipeData.diet_types && { diet_types: recipeData.diet_types }),
        ...(recipeData.cooking_methods && { cooking_methods: recipeData.cooking_methods }),
        ...(recipeData.dish_types && { dish_types: recipeData.dish_types }),
        ...(recipeData.proteins && { proteins: recipeData.proteins }),
        ...(recipeData.occasions && { occasions: recipeData.occasions }),
        ...(recipeData.characteristics && { characteristics: recipeData.characteristics }),
        ...(recipeData.season && { season: recipeData.season }),
        ...(recipeData.ingredients &&
          recipeData.ingredients.length > 0 && {
            ingredients: recipeData.ingredients
              .filter((ing): ing is typeof ing & { name: string } =>
                Boolean(ing.name?.trim())
              )
              .map((ing, index) => ({
                id: ing.id || `ingredient-ai-${Date.now()}-${index}`,
                name: ing.name.trim(),
                amount: ing.amount ?? null,
                unit: ing.unit ?? null,
                notes: ing.notes ?? "",
              })),
          }),
      };

      setFormData(updatedFormData);
      setErrors([]);

      // On mobile/tablet, scroll to form when AI updates it
      if (layoutMode === "single-column" && typeof window !== "undefined") {
        // Use a small delay to ensure the form has updated
        setTimeout(() => {
          const formElement = document.querySelector("[data-form-start]");
          if (formElement && window.innerWidth < 1024) {
            formElement.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
    }
  };

  const handleSave = useCallback(async () => {
    const validation = validateRecipeInput(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);

    const updateData: Partial<RecipeInput> = {
      title: formData.title,
      ingredients: formData.ingredients,
      servings: formData.servings,
      description: formData.description,
      category: formData.category,
      cuisine: formData.cuisine,
      diet_types: formData.diet_types,
      cooking_methods: formData.cooking_methods,
      dish_types: formData.dish_types,
      proteins: formData.proteins,
      occasions: formData.occasions,
      characteristics: formData.characteristics,
      season: formData.season,
    };

    try {
      await onSave(updateData);
      // Success - trigger the hidden close button only in sheet mode
      if (!standalone) {
        closeButtonRef.current?.click();
      }
    } catch (error) {
      // Error handling - don't close sheet so user can see errors
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

  // Auto-resize textarea function
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, []);

  // Auto-resize textarea when description changes
  useEffect(() => {
    autoResizeTextarea();
  }, [formData.description, autoResizeTextarea]);

  // Form sections component - memoized to prevent remounting
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

        {/* Basic Information */}
        <Card data-form-start>
          <CardContent className="space-y-3 sm:space-y-4">
            <h3 className="text-lg font-semibold mb-3">
              {t("basicInformation")}
            </h3>
            <div className="space-y-2">
              <Label htmlFor="title">{t("title")}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t("titlePlaceholder")}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPE_CATEGORIES.map((category) => (
                      <SelectItem
                        key={category}
                        value={category}
                        className="capitalize"
                      >
                        {tCategories(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="season">{t("season")}</Label>
                <Select
                  value={formData.season}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, season: value }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectSeason")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPE_SEASONS.map((season) => (
                      <SelectItem
                        key={season}
                        value={season}
                        className="capitalize"
                      >
                        {tSeasons(season)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Serving Size */}
            <div className="space-y-2">
              <Label htmlFor="servings">{t("servings")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.servings}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value > 0 && value <= 100) {
                      setFormData((prev) => ({ ...prev, servings: value }));
                    }
                  }}
                  placeholder="4"
                  disabled={loading}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">people</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-3">{t("ingredients")}</h3>
            <StructuredIngredientInput
              key="ingredients-input"
              ingredients={formData.ingredients}
              onChange={handleIngredientsChange}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-3">{t("instructions")}</h3>
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  // Trigger resize on input
                  setTimeout(autoResizeTextarea, 0);
                }}
                placeholder={t("descriptionPlaceholder")}
                className="min-h-[120px] resize-none overflow-hidden"
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
            </div>
            <CategorizedTagSelector
              formData={formData}
              onFormDataChange={handleFormDataChange}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {standalone ? (
            <>
              <Button
                variant="outline"
                disabled={loading}
                className="flex-1"
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
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
      handleIngredientsChange,
      handleFormDataChange,
      handleSave,
      standalone,
      onCancel,
      recipe.id,
      t,
      tCategories,
      tSeasons,
      autoResizeTextarea,
    ]
  );

  // Single column layout (original layout)
  if (layoutMode === "single-column") {
    return (
      <div className="space-y-4 sm:space-y-6 p-0">
        {/* AI Chat Assistant */}
        {includeChat && (
          <div className="mb-6">
            <ChatInterface
              selectedRecipe={recipe}
              onRecipeGenerated={handleAIRecipeUpdate}
              currentFormState={memoizedFormState}
            />
          </div>
        )}

        {FormSections}

        {/* Hidden close button for programmatic closing - only in sheet mode */}
        {!standalone && (
          <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
        )}
      </div>
    );
  }

  // Two-column layout for desktop
  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-6 lg:space-y-0">
      {/* Left Column - Chat Interface (Desktop: 5/12, Mobile: full width) */}
      {includeChat && (
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <ChatInterface
              selectedRecipe={recipe}
              onRecipeGenerated={handleAIRecipeUpdate}
              currentFormState={memoizedFormState}
              isDesktopSidebar={true}
            />
          </div>
        </div>
      )}

      {/* Right Column - Form (Desktop: 7/12, Mobile: full width) */}
      <div
        className={`space-y-4 sm:space-y-6 ${
          includeChat ? "lg:col-span-7" : "lg:col-span-12"
        }`}
      >
        {FormSections}

        {/* Hidden close button for programmatic closing - only in sheet mode */}
        {!standalone && (
          <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
