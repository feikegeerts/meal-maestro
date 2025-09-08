"use client";

import * as React from "react";
import { ChevronDown, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { DateSelectionPopover } from "@/components/ui/date-selection-popover";
import { cn } from "@/lib/utils";

interface MarkAsEatenSplitButtonProps {
  onMarkAsEatenToday: () => void;
  onMarkAsEatenOnDate: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

export function MarkAsEatenSplitButton({
  onMarkAsEatenToday,
  onMarkAsEatenOnDate,
  disabled = false,
  className,
}: MarkAsEatenSplitButtonProps) {
  const t = useTranslations("recipes");

  return (
    <div className={cn("flex", className)}>
      <Button
        onClick={onMarkAsEatenToday}
        disabled={disabled}
        variant="default"
        className="rounded-r-none border-r-0"
      >
        <Utensils className="mr-2 h-4 w-4" />
        {t("markAsEatenDetail")}
      </Button>

      <DateSelectionPopover
        onDateSelect={onMarkAsEatenOnDate}
        disabled={disabled}
        customTrigger={
          <Button
            variant="default"
            size="default"
            className="px-2 rounded-l-none border-l border-primary-foreground/20"
            disabled={disabled}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}