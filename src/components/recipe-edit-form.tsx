"use client";

import { useState, useRef, useEffect } from "react";
import {
  Recipe,
  RecipeInput,
  RecipeIngredient,
  RECIPE_CATEGORIES,
  RECIPE_SEASONS,
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

interface RecipeEditFormProps {
  recipe: Recipe;
  onSave: (recipeData: Partial<RecipeInput>) => Promise<void>;
  loading?: boolean;
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
      season: formData.season === "none" ? undefined : formData.season,
    };

    await onSave(updateData);
    return true; // Allow close
  } catch (error) {
    console.error("Auto-save failed:", error);
    return false; // Don't close if save fails
  }
};

const tagCategories = {
  dietary: [
    "vegetarian",
    "vegan",
    "gluten-free",
    "dairy-free",
    "nut-free",
    "keto",
    "paleo",
    "low-carb",
    "low-fat",
    "sugar-free",
    "low-sodium",
    "high-protein",
  ],
  cuisine: [
    "italian",
    "mexican",
    "chinese",
    "indian",
    "thai",
    "french",
    "mediterranean",
    "american",
    "japanese",
    "korean",
    "greek",
    "spanish",
    "middle-eastern",
    "cajun",
    "southern",
  ],
  cooking: [
    "baking",
    "grilling",
    "frying",
    "roasting",
    "steaming",
    "slow-cooking",
    "air-fryer",
    "instant-pot",
    "no-cook",
    "one-pot",
    "stir-fry",
    "braising",
    "smoking",
    "pressure-cooker",
  ],
  characteristics: [
    "quick",
    "easy",
    "healthy",
    "comfort-food",
    "spicy",
    "mild",
    "sweet",
    "savory",
    "crispy",
    "creamy",
    "fresh",
    "hearty",
    "light",
    "rich",
  ],
  occasions: [
    "party",
    "holiday",
    "weeknight",
    "meal-prep",
    "kid-friendly",
    "date-night",
    "potluck",
    "picnic",
    "brunch",
    "entertaining",
    "budget-friendly",
    "leftover-friendly",
  ],
  proteins: [
    "chicken",
    "beef",
    "pork",
    "fish",
    "seafood",
    "tofu",
    "beans",
    "eggs",
    "turkey",
    "lamb",
    "duck",
    "plant-based",
  ],
  dishes: [
    "soup",
    "salad",
    "sandwich",
    "pasta",
    "pizza",
    "bread",
    "cookies",
    "cake",
    "pie",
    "smoothie",
    "cocktail",
    "sauce",
    "dip",
    "marinade",
    "dressing",
  ],
};

// All tags in a flat array for searching
const allTags = Object.values(tagCategories).flat();

interface TagSelectorProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  disabled?: boolean;
}

function TagSelector({
  selectedTags,
  onTagToggle,
  disabled = false,
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
            placeholder="Search tags..."
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
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
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
                {tag}
              </Label>
            </div>
          ))}
        </div>

        {filteredTags.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            No tags found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected
      </div>
    </div>
  );
}

export function RecipeEditForm({
  recipe,
  onSave,
  loading = false,
}: RecipeEditFormProps) {
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
    season: recipe.season || "none",
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
      (formData.season === "none" ? undefined : formData.season) !==
        recipe.season;


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
      season: formData.season === "none" ? undefined : formData.season,
    };

    try {
      await onSave(updateData);
      // Success - trigger the hidden close button
      closeButtonRef.current?.click();
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

  return (
    <div className="space-y-4 sm:space-y-6 p-0">
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
      <Card>
        <CardContent className="space-y-3 sm:space-y-4">
          <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
          <div className="space-y-2">
            <Label htmlFor="title">Recipe Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter recipe title"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_CATEGORIES.map((category) => (
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

            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Select
                value={formData.season}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, season: value }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select season (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {RECIPE_SEASONS.map((season) => (
                    <SelectItem
                      key={season}
                      value={season}
                      className="capitalize"
                    >
                      {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Serving Size */}
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
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
          <h3 className="text-lg font-semibold mb-3">Ingredients</h3>
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
          <h3 className="text-lg font-semibold mb-3">Instructions</h3>
          <div className="space-y-2">
            <Label htmlFor="description">Cooking Instructions</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter detailed cooking instructions..."
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
          />
        </CardContent>
      </Card>

      {/* Hidden close button for programmatic closing */}
      <SheetClose asChild>
        <button ref={closeButtonRef} className="hidden" aria-hidden="true" />
      </SheetClose>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <SheetClose asChild>
          <Button variant="outline" disabled={loading} className="flex-1">
            Cancel
          </Button>
        </SheetClose>
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}