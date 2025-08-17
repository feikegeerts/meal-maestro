"use client";

import { useState, useRef, useEffect } from "react";
import {
  Recipe,
  RecipeInput,
  RecipeIngredient,
  RecipeSeason,
  RecipeTag,
  RECIPE_CATEGORIES,
  RECIPE_SEASONS,
  RECIPE_TAGS,
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
import { Badge } from "@/components/ui/badge";
import { SheetClose } from "@/components/ui/sheet";
import { Search } from "lucide-react";
import { StructuredIngredientInput } from "@/components/structured-ingredient-input";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useTranslations } from 'next-intl';

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
      tags: formData.tags,
      season: formData.season,
    };

    await onSave(updateData);
    return true; // Allow close
  } catch (error) {
    console.error("Auto-save failed:", error);
    return false; // Don't close if save fails
  }
};

const tagCategories = {
  dietary: RECIPE_TAGS.filter(tag => [
    RecipeTag.VEGETARIAN,
    RecipeTag.VEGAN,
    RecipeTag.GLUTEN_FREE,
    RecipeTag.DAIRY_FREE,
    RecipeTag.NUT_FREE,
    RecipeTag.KETO,
    RecipeTag.PALEO,
    RecipeTag.LOW_CARB,
    RecipeTag.LOW_FAT,
    RecipeTag.SUGAR_FREE,
    RecipeTag.LOW_SODIUM,
    RecipeTag.HIGH_PROTEIN,
  ].includes(tag as RecipeTag)),
  
  cuisine: RECIPE_TAGS.filter(tag => [
    RecipeTag.ITALIAN,
    RecipeTag.MEXICAN,
    RecipeTag.CHINESE,
    RecipeTag.INDIAN,
    RecipeTag.THAI,
    RecipeTag.FRENCH,
    RecipeTag.MEDITERRANEAN,
    RecipeTag.AMERICAN,
    RecipeTag.JAPANESE,
    RecipeTag.KOREAN,
    RecipeTag.GREEK,
    RecipeTag.SPANISH,
    RecipeTag.MIDDLE_EASTERN,
    RecipeTag.CAJUN,
    RecipeTag.SOUTHERN,
  ].includes(tag as RecipeTag)),
  
  cooking: RECIPE_TAGS.filter(tag => [
    RecipeTag.BAKING,
    RecipeTag.GRILLING,
    RecipeTag.FRYING,
    RecipeTag.ROASTING,
    RecipeTag.STEAMING,
    RecipeTag.SLOW_COOKING,
    RecipeTag.AIR_FRYER,
    RecipeTag.INSTANT_POT,
    RecipeTag.NO_COOK,
    RecipeTag.ONE_POT,
    RecipeTag.STIR_FRY,
    RecipeTag.BRAISING,
    RecipeTag.SMOKING,
    RecipeTag.PRESSURE_COOKER,
  ].includes(tag as RecipeTag)),
  
  characteristics: RECIPE_TAGS.filter(tag => [
    RecipeTag.QUICK,
    RecipeTag.EASY,
    RecipeTag.HEALTHY,
    RecipeTag.COMFORT_FOOD,
    RecipeTag.SPICY,
    RecipeTag.MILD,
    RecipeTag.SWEET,
    RecipeTag.SAVORY,
    RecipeTag.CRISPY,
    RecipeTag.CREAMY,
    RecipeTag.FRESH,
    RecipeTag.HEARTY,
    RecipeTag.LIGHT,
    RecipeTag.RICH,
  ].includes(tag as RecipeTag)),
  
  occasions: RECIPE_TAGS.filter(tag => [
    RecipeTag.PARTY,
    RecipeTag.HOLIDAY,
    RecipeTag.WEEKNIGHT,
    RecipeTag.MEAL_PREP,
    RecipeTag.KID_FRIENDLY,
    RecipeTag.DATE_NIGHT,
    RecipeTag.POTLUCK,
    RecipeTag.PICNIC,
    RecipeTag.BRUNCH,
    RecipeTag.ENTERTAINING,
    RecipeTag.BUDGET_FRIENDLY,
    RecipeTag.LEFTOVER_FRIENDLY,
  ].includes(tag as RecipeTag)),
  
  proteins: RECIPE_TAGS.filter(tag => [
    RecipeTag.CHICKEN,
    RecipeTag.BEEF,
    RecipeTag.PORK,
    RecipeTag.FISH,
    RecipeTag.SEAFOOD,
    RecipeTag.TOFU,
    RecipeTag.BEANS,
    RecipeTag.EGGS,
    RecipeTag.TURKEY,
    RecipeTag.LAMB,
    RecipeTag.DUCK,
    RecipeTag.PLANT_BASED,
  ].includes(tag as RecipeTag)),
  
  dishes: RECIPE_TAGS.filter(tag => [
    RecipeTag.SOUP,
    RecipeTag.SALAD,
    RecipeTag.SANDWICH,
    RecipeTag.PASTA,
    RecipeTag.PIZZA,
    RecipeTag.BREAD,
    RecipeTag.COOKIES,
    RecipeTag.CAKE,
    RecipeTag.PIE,
    RecipeTag.SMOOTHIE,
    RecipeTag.COCKTAIL,
    RecipeTag.SAUCE,
    RecipeTag.DIP,
    RecipeTag.MARINADE,
    RecipeTag.DRESSING,
  ].includes(tag as RecipeTag)),
};

// All tags in a flat array for searching
const allTags = RECIPE_TAGS;

interface TagSelectorProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  disabled?: boolean;
  tTags: (key: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function TagSelector({
  selectedTags,
  onTagToggle,
  disabled = false,
  tTags,
  t,
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTags = searchQuery
    ? allTags.filter((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedCategory === "all"
    ? allTags
    : tagCategories[selectedCategory as keyof typeof tagCategories] || [];

  return (
    <div className="space-y-4">
      {/* Search and Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('searchTags')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>

        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCategories')}</SelectItem>
            {Object.keys(tagCategories).map((category) => (
              <SelectItem
                key={category}
                value={category}
                className="capitalize"
              >
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags Grid */}
      <div className="max-h-60 overflow-y-auto border rounded-md p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredTags.map((tag) => (
            <div key={tag} className="flex items-center space-x-2">
              <Checkbox
                id={tag}
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => onTagToggle(tag)}
                disabled={disabled}
              />
              <Label
                htmlFor={tag}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {tTags(tag)}
              </Label>
            </div>
          ))}
        </div>

        {filteredTags.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            {t('noTagsFound', { query: searchQuery })}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {selectedTags.length === 1 
          ? t('tagsSelected', { count: selectedTags.length })
          : t('tagsSelectedPlural', { count: selectedTags.length })
        }
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
  const t = useTranslations('recipeForm');
  const tCategories = useTranslations('categories');
  const tSeasons = useTranslations('seasons');
  const tTags = useTranslations('tags');
  
  const generateIngredientId = () => `ingredient-${Date.now()}-${Math.random()}`;

  const [formData, setFormData] = useState<RecipeInput>({
    title: recipe.title,
    ingredients: recipe.ingredients.length > 0 ? recipe.ingredients.map(ing => ({ ...ing })) : [
      {
        id: generateIngredientId(),
        name: "",
        amount: null,
        unit: null,
        notes: ""
      }
    ],
    servings: recipe.servings || 4,
    description: recipe.description,
    category: recipe.category,
    tags: [...recipe.tags],
    season: recipe.season || RecipeSeason.YEAR_ROUND,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Check for changes and update global state
  useEffect(() => {
    const hasFormChanges =
      formData.title !== recipe.title ||
      JSON.stringify(formData.ingredients) !==
        JSON.stringify(recipe.ingredients) ||
      formData.servings !== recipe.servings ||
      formData.description !== recipe.description ||
      formData.category !== recipe.category ||
      JSON.stringify(formData.tags) !== JSON.stringify(recipe.tags) ||
      formData.season !== recipe.season;


    // Update global state for auto-save
    currentFormState = {
      formData,
      hasChanges: hasFormChanges,
      onSave,
    };
  }, [formData, recipe, onSave]);

  // Clear global state when component unmounts
  useEffect(() => {
    return () => {
      currentFormState = null;
    };
  }, []);

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
    tags?: string[];
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
        ...(recipeData.tags && { tags: recipeData.tags }),
        ...(recipeData.season && { season: recipeData.season }),
        ...(recipeData.ingredients && recipeData.ingredients.length > 0 && {
          ingredients: recipeData.ingredients
            .filter((ing): ing is typeof ing & { name: string } => Boolean(ing.name?.trim()))
            .map((ing, index) => ({
              id: ing.id || `ingredient-ai-${Date.now()}-${index}`,
              name: ing.name.trim(),
              amount: ing.amount ?? null,
              unit: ing.unit ?? null,
              notes: ing.notes ?? ""
            }))
        })
      };
      
      setFormData(updatedFormData);
      setErrors([]);
      
      // On mobile/tablet, scroll to form when AI updates it
      if (layoutMode === "single-column" && typeof window !== 'undefined') {
        // Use a small delay to ensure the form has updated
        setTimeout(() => {
          const formElement = document.querySelector('[data-form-start]');
          if (formElement && window.innerWidth < 1024) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }
  };

  const handleSave = async () => {
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
      tags: formData.tags,
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
  };

  const handleIngredientsChange = (ingredients: RecipeIngredient[]) => {
    setFormData((prev) => ({ ...prev, ingredients }));
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Form sections component
  const FormSections = () => (
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
          <h3 className="text-lg font-semibold mb-3">{t('basicInformation')}</h3>
          <div className="space-y-2">
            <Label htmlFor="title">{t('title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={t('titlePlaceholder')}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCategory')} />
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
              <Label htmlFor="season">{t('season')}</Label>
              <Select
                value={formData.season}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, season: value }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSeason')} />
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
            <Label htmlFor="servings">{t('servings')}</Label>
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
          <h3 className="text-lg font-semibold mb-3">{t('ingredients')}</h3>
          <StructuredIngredientInput
            ingredients={formData.ingredients}
            onChange={handleIngredientsChange}
            disabled={loading}
          />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">{t('instructions')}</h3>
          <div className="space-y-2">
            <Label htmlFor="description">{t('stepByStepInstructions')}</Label>
            <div className="text-sm text-muted-foreground mb-2">
              {t('instructionsHint')}
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{t('numberedList')}</li>
                <li>{t('bulletPoints')}</li>
                <li>{t('paragraphs')}</li>
              </ul>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder={t('descriptionPlaceholder')}
              className="min-h-[120px]"
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
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <TagSelector
            selectedTags={formData.tags}
            onTagToggle={toggleTag}
            disabled={loading}
            tTags={tTags}
            t={t}
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
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? t('saving') : recipe.id ? t('saveChanges') : t('createRecipe')}
            </Button>
          </>
        ) : (
          <>
            <SheetClose asChild>
              <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
            </SheetClose>
            <SheetClose asChild>
              <Button variant="outline" disabled={loading} className="flex-1">
                {t('cancel')}
              </Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? t('saving') : t('saveChanges')}
            </Button>
          </>
        )}
      </div>
    </>
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
              currentFormState={formData}
            />
          </div>
        )}
        
        <FormSections />

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
              currentFormState={formData}
              isDesktopSidebar={true}
            />
          </div>
        </div>
      )}

      {/* Right Column - Form (Desktop: 7/12, Mobile: full width) */}
      <div className={`space-y-4 sm:space-y-6 ${includeChat ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
        <FormSections />

        {/* Hidden close button for programmatic closing - only in sheet mode */}
        {!standalone && (
          <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}