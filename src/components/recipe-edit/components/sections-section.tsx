"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { RecipeSection, RecipeIngredient } from "@/types/recipe";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StructuredIngredientInput } from "@/components/ingredient-input";

interface SectionsSectionProps {
  sections: RecipeSection[];
  onChange: (sections: RecipeSection[]) => void;
  onAddSection: () => void;
  disabled?: boolean;
}

export function SectionsSection({
  sections,
  onChange,
  onAddSection,
  disabled = false,
}: SectionsSectionProps) {
  const t = useTranslations("recipeForm");

  const handleTitleChange = (id: string, title: string) => {
    onChange(
      sections.map((section) =>
        section.id === id ? { ...section, title } : section
      )
    );
  };

  const handleInstructionsChange = (id: string, instructions: string) => {
    onChange(
      sections.map((section) =>
        section.id === id ? { ...section, instructions } : section
      )
    );
  };

  const handleIngredientsChange = (
    id: string,
    ingredients: RecipeIngredient[]
  ) => {
    onChange(
      sections.map((section) =>
        section.id === id ? { ...section, ingredients } : section
      )
    );
  };

  const handleRemoveSection = (id: string) => {
    if (sections.length <= 1) return;
    onChange(sections.filter((section) => section.id !== id));
  };

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <Card key={section.id}>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium leading-none">
                  {t("sectionTitle")}{" "}
                  {sections.length > 1 ? `#${index + 1}` : ""}
                </label>
                <Input
                  value={section.title}
                  onChange={(e) =>
                    handleTitleChange(section.id, e.target.value)
                  }
                  placeholder={t("sectionTitle")}
                  disabled={disabled}
                />
              </div>
              {sections.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveSection(section.id)}
                  disabled={disabled}
                  className="mt-8"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t("removeSection")}</span>
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">
                {t("sectionIngredients")}
              </p>
              <StructuredIngredientInput
                ingredients={section.ingredients}
                onChange={(ingredients) =>
                  handleIngredientsChange(section.id, ingredients)
                }
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t("sectionInstructions")}
              </label>
              <Textarea
                value={section.instructions}
                onChange={(e) =>
                  handleInstructionsChange(section.id, e.target.value)
                }
                placeholder={t("sectionInstructionsPlaceholder")}
                className="min-h-[120px]"
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={onAddSection}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("addSection")}
      </Button>
    </div>
  );
}
