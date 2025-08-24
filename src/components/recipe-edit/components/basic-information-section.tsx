"use client";

import { RecipeInput, RECIPE_CATEGORIES, RECIPE_SEASONS } from "@/types/recipe";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { FORM_CONFIG, SPACING_CONFIG } from "../config/form-constants";

interface BasicInformationSectionProps {
  formData: RecipeInput;
  onFormDataChange: (updates: Partial<RecipeInput>) => void;
  loading?: boolean;
}

export function BasicInformationSection({
  formData,
  onFormDataChange,
  loading = false,
}: BasicInformationSectionProps) {
  const t = useTranslations("recipeForm");
  const tCategories = useTranslations("categories");
  const tSeasons = useTranslations("seasons");
  const tServing = useTranslations("servingSelector");

  const handleServingsChange = (value: string) => {
    const numValue = parseInt(value);
    if (
      !isNaN(numValue) &&
      numValue >= FORM_CONFIG.MIN_SERVINGS &&
      numValue <= FORM_CONFIG.MAX_SERVINGS
    ) {
      onFormDataChange({ servings: numValue });
    }
  };

  return (
    <Card data-form-start>
      <CardContent className={SPACING_CONFIG.SECTION_SPACING}>
        <h3 className="text-lg font-semibold mb-3">{t("basicInformation")}</h3>

        <div className={SPACING_CONFIG.INPUT_SPACING}>
          <Label htmlFor="title">{t("title")}</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => onFormDataChange({ title: e.target.value })}
            placeholder={t("titlePlaceholder")}
            disabled={loading}
            className="h-8 text-sm sm:h-9 sm:text-base"
          />
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-[auto_auto_auto] md:gap-6 gap-4 md:justify-start`}
        >
          <div className={SPACING_CONFIG.INPUT_SPACING}>
            <Label htmlFor="category">{t("category")}</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => onFormDataChange({ category: value })}
              disabled={loading}
            >
              <SelectTrigger className="h-8 text-sm sm:h-9 sm:text-sm w-40">
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

          <div className={SPACING_CONFIG.INPUT_SPACING}>
            <Label htmlFor="season">{t("season")}</Label>
            <Select
              value={formData.season}
              onValueChange={(value) => onFormDataChange({ season: value })}
              disabled={loading}
            >
              <SelectTrigger className="h-8 text-sm sm:h-9 sm:text-sm w-40">
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

          <div className={SPACING_CONFIG.INPUT_SPACING}>
            <Label htmlFor="servings">{t("servings")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="servings"
                type="number"
                min={FORM_CONFIG.MIN_SERVINGS}
                max={FORM_CONFIG.MAX_SERVINGS}
                value={formData.servings}
                onChange={(e) => handleServingsChange(e.target.value)}
                placeholder={FORM_CONFIG.DEFAULT_SERVINGS.toString()}
                disabled={loading}
                className="w-16 h-8 text-sm sm:w-20 sm:h-9 sm:text-base"
              />
              <span className="text-sm text-muted-foreground">
                {tServing("people")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
