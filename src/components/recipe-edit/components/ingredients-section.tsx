"use client";

import { RecipeIngredient } from "@/types/recipe";
import { Card, CardContent } from "@/components/ui/card";
import { StructuredIngredientInput } from "@/components/ingredient-input";
import { useTranslations } from "next-intl";

interface IngredientsSectionProps {
  ingredients: RecipeIngredient[];
  onIngredientsChange: (ingredients: RecipeIngredient[]) => void;
  loading?: boolean;
}

export function IngredientsSection({
  ingredients,
  onIngredientsChange,
  loading = false,
}: IngredientsSectionProps) {
  const t = useTranslations("recipeForm");

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-3">{t("ingredients")}</h3>
        <StructuredIngredientInput
          key="ingredients-input"
          ingredients={ingredients}
          onChange={onIngredientsChange}
          disabled={loading}
        />
      </CardContent>
    </Card>
  );
}