"use client";

import { useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { FORM_CONFIG } from "../config/form-constants";

interface InstructionsSectionProps {
  description: string;
  onDescriptionChange: (description: string) => void;
  loading?: boolean;
}

export function InstructionsSection({
  description,
  onDescriptionChange,
  loading = false,
}: InstructionsSectionProps) {
  const t = useTranslations("recipeForm");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [description, autoResizeTextarea]);

  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(value);
    setTimeout(autoResizeTextarea, 0);
  };

  return (
    <Card>
      <CardContent>
        <h3 className="text-lg font-semibold mb-3">{t("instructions")}</h3>
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            id="description"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            className={`min-h-[${FORM_CONFIG.MIN_TEXTAREA_HEIGHT}px] resize-none overflow-hidden text-sm sm:text-base`}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}