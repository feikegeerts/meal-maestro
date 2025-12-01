"use client";

import { RecipeInput } from "@/types/recipe";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { SPACING_CONFIG } from "../config/form-constants";

interface MetadataSectionProps {
  formData: RecipeInput;
  onFormDataChange: (updates: Partial<RecipeInput>) => void;
  loading?: boolean;
}

export function MetadataSection({
  formData,
  onFormDataChange,
  loading = false,
}: MetadataSectionProps) {
  const t = useTranslations("recipeForm");

  const handleTimeChange = (key: "prep_time" | "total_time", value: string) => {
    if (value === "") {
      onFormDataChange({ [key]: null });
      return;
    }

    const parsed = Number(value);
    onFormDataChange({
      [key]: Number.isNaN(parsed) ? null : Math.max(0, Math.floor(parsed)),
    });
  };

  return (
    <Card>
      <CardContent className={SPACING_CONFIG.SECTION_SPACING}>
        <h3 className="text-lg font-semibold mb-3">
          {t("metadataSectionTitle")}
        </h3>

        <div className={SPACING_CONFIG.INPUT_SPACING}>
          <Label htmlFor="reference">{t("reference")}</Label>
          <Input
            id="reference"
            value={formData.reference || ""}
            onChange={(e) => onFormDataChange({ reference: e.target.value })}
            placeholder={t("referencePlaceholder")}
            disabled={loading}
            className="h-8 text-sm sm:h-9 sm:text-base"
          />
          <p className="text-xs text-muted-foreground">
            {t("referenceHelper")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={SPACING_CONFIG.INPUT_SPACING}>
            <Label htmlFor="prep-time">{t("prepTime")}</Label>
            <Input
              id="prep-time"
              type="number"
              min={0}
              value={
                typeof formData.prep_time === "number"
                  ? formData.prep_time
                  : ""
              }
              onChange={(e) => handleTimeChange("prep_time", e.target.value)}
              placeholder="0"
              disabled={loading}
              className="h-8 text-sm sm:h-9 sm:text-base"
            />
          </div>
          <div className={SPACING_CONFIG.INPUT_SPACING}>
            <Label htmlFor="total-time">{t("totalTime")}</Label>
            <Input
              id="total-time"
              type="number"
              min={0}
              value={
                typeof formData.total_time === "number"
                  ? formData.total_time
                  : ""
              }
            onChange={(e) => handleTimeChange("total_time", e.target.value)}
            placeholder="0"
            disabled={loading}
            className="h-8 text-sm sm:h-9 sm:text-base"
          />
          </div>
        </div>

        <div className={SPACING_CONFIG.INPUT_SPACING}>
          <Label htmlFor="pairing-wine">{t("pairingWine")}</Label>
          <Input
            id="pairing-wine"
            value={formData.pairing_wine || ""}
            onChange={(e) =>
              onFormDataChange({ pairing_wine: e.target.value })
            }
            placeholder={t("pairingWinePlaceholder")}
            disabled={loading}
            className="h-8 text-sm sm:h-9 sm:text-base"
          />
        </div>

        <div className={SPACING_CONFIG.INPUT_SPACING}>
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            value={formData.notes || ""}
            onChange={(e) => onFormDataChange({ notes: e.target.value })}
            placeholder={t("notesPlaceholder")}
            disabled={loading}
            className="min-h-[120px] text-sm sm:text-base"
          />
        </div>
      </CardContent>
    </Card>
  );
}
