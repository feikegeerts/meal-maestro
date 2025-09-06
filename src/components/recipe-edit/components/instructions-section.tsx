"use client";

import { useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

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
      const currentHeight = textarea.clientHeight;
      const scrollHeight = textarea.scrollHeight;
      
      if (scrollHeight > currentHeight) {
        textarea.style.height = scrollHeight + "px";
      } else if (scrollHeight < currentHeight) {
        textarea.style.height = Math.max(160, scrollHeight) + "px";
      }
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
            className="min-h-[160px] max-h-[80vh] resize-none overflow-y-auto text-sm sm:text-base"
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
