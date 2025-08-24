"use client";

import { RecipeInput } from "@/types/recipe";
import {
  CUISINE_TYPES,
  DIET_TYPES,
  COOKING_METHOD_TYPES,
  DISH_TYPES,
  PROTEIN_TYPES,
  OCCASION_TYPES,
  CHARACTERISTIC_TYPES,
} from "@/types/recipe";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { GRID_CONFIG, SPACING_CONFIG } from "../config/form-constants";

interface CategorizedTagSelectorProps {
  formData: RecipeInput;
  onFormDataChange: (updates: Partial<RecipeInput>) => void;
  disabled?: boolean;
}

export function CategorizedTagSelector({
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
    onFormDataChange({
      cuisine: cuisine === formData.cuisine ? undefined : cuisine,
    });
  };

  const handleArrayTagToggle = (
    fieldName: keyof Pick<
      RecipeInput,
      | "diet_types"
      | "cooking_methods"
      | "dish_types"
      | "proteins"
      | "occasions"
      | "characteristics"
    >,
    tag: string
  ) => {
    const currentArray = formData[fieldName] || [];
    const newArray = currentArray.includes(tag)
      ? currentArray.filter((t) => t !== tag)
      : [...currentArray, tag];
    onFormDataChange({ [fieldName]: newArray });
  };

  const getSelectedTags = () => {
    const selectedTags: Array<{ value: string; label: string; type: string }> = [];

    if (formData.cuisine) {
      selectedTags.push({
        value: formData.cuisine,
        label: tCuisines(formData.cuisine),
        type: "cuisine",
      });
    }

    (formData.diet_types || []).forEach((tag) => {
      selectedTags.push({
        value: tag,
        label: tDietTypes(tag),
        type: "diet_types",
      });
    });

    (formData.cooking_methods || []).forEach((tag) => {
      selectedTags.push({
        value: tag,
        label: tCookingMethods(tag),
        type: "cooking_methods",
      });
    });

    (formData.dish_types || []).forEach((tag) => {
      selectedTags.push({
        value: tag,
        label: tDishTypes(tag),
        type: "dish_types",
      });
    });

    (formData.proteins || []).forEach((tag) => {
      selectedTags.push({
        value: tag,
        label: tProteinTypes(tag),
        type: "proteins",
      });
    });

    (formData.occasions || []).forEach((tag) => {
      selectedTags.push({
        value: tag,
        label: tOccasionTypes(tag),
        type: "occasions",
      });
    });

    (formData.characteristics || []).forEach((tag) => {
      selectedTags.push({
        value: tag,
        label: tCharacteristicTypes(tag),
        type: "characteristics",
      });
    });

    return selectedTags;
  };

  const removeTag = (tagValue: string, tagType: string) => {
    if (tagType === "cuisine") {
      handleCuisineChange(tagValue);
    } else {
      handleArrayTagToggle(
        tagType as keyof Pick<
          RecipeInput,
          | "diet_types"
          | "cooking_methods"
          | "dish_types"
          | "proteins"
          | "occasions"
          | "characteristics"
        >,
        tagValue
      );
    }
  };

  const selectedTags = getSelectedTags();

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="tags" className="border-0">
        <AccordionTrigger
          className="px-6 py-6 hover:no-underline"
          disabled={disabled}
        >
          <div className="flex items-center justify-between w-full">
            <h3 className="text-lg pb-6 font-semibold">Tags</h3>
          </div>
        </AccordionTrigger>

        {selectedTags.length > 0 && (
          <div className="px-6 pt-4 pb-4">
            <div className="flex flex-wrap gap-2 leading-relaxed">
              {selectedTags.map((tag, index) => (
                <Badge
                  key={`${tag.type}-${tag.value}-${index}`}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1 text-xs py-1.5 px-2.5"
                >
                  <span className="leading-none">{tag.label}</span>
                  <span
                    className="h-auto w-auto p-0.5 cursor-pointer hover:bg-accent/50 rounded-sm transition-colors flex items-center justify-center ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) {
                        removeTag(tag.value, tag.type);
                      }
                    }}
                    aria-label="Remove tag"
                    role="button"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/50">
          <div className={SPACING_CONFIG.TAG_SPACING}>
            {/* Cuisine (Single Selection) */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("cuisine")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
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
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("dietTypes")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
                {DIET_TYPES.map((dietType) => (
                  <div key={dietType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`diet-${dietType}`}
                      checked={(formData.diet_types || []).includes(dietType)}
                      onCheckedChange={() =>
                        handleArrayTagToggle("diet_types", dietType)
                      }
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
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("cookingMethods")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
                {COOKING_METHOD_TYPES.map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cooking-${method}`}
                      checked={(formData.cooking_methods || []).includes(method)}
                      onCheckedChange={() =>
                        handleArrayTagToggle("cooking_methods", method)
                      }
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
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("dishTypes")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
                {DISH_TYPES.map((dishType) => (
                  <div key={dishType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dish-${dishType}`}
                      checked={(formData.dish_types || []).includes(dishType)}
                      onCheckedChange={() =>
                        handleArrayTagToggle("dish_types", dishType)
                      }
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
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("proteinTypes")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
                {PROTEIN_TYPES.map((protein) => (
                  <div key={protein} className="flex items-center space-x-2">
                    <Checkbox
                      id={`protein-${protein}`}
                      checked={(formData.proteins || []).includes(protein)}
                      onCheckedChange={() =>
                        handleArrayTagToggle("proteins", protein)
                      }
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
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("occasionTypes")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
                {OCCASION_TYPES.map((occasion) => (
                  <div key={occasion} className="flex items-center space-x-2">
                    <Checkbox
                      id={`occasion-${occasion}`}
                      checked={(formData.occasions || []).includes(occasion)}
                      onCheckedChange={() =>
                        handleArrayTagToggle("occasions", occasion)
                      }
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
              <Label className="text-sm font-medium mb-2 block">
                {tHeaders("characteristicTypes")}
              </Label>
              <div className={`grid ${GRID_CONFIG.TAG_COLUMNS} gap-2`}>
                {CHARACTERISTIC_TYPES.map((characteristic) => (
                  <div
                    key={characteristic}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`char-${characteristic}`}
                      checked={(formData.characteristics || []).includes(
                        characteristic
                      )}
                      onCheckedChange={() =>
                        handleArrayTagToggle("characteristics", characteristic)
                      }
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}